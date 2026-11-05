import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useAfterPhysicsStep, useBeforePhysicsStep } from '@react-three/rapier'
import { Light } from 'three'

type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export function PerformanceDiagnostics({ fpsOutput, output }: {
  fpsOutput: RefObject<HTMLSpanElement | null>
  output: RefObject<HTMLPreElement | null>
}) {
  const { gl, scene } = useThree()
  const frameStart = useRef(0)
  const physicsStart = useRef(0)
  const metrics = useRef({
    cpu: 0, submit: 0, physics: 0, renders: 0, steps: 0,
    gpu: 0, gpuSamples: 0, gpuAvailable: false, calls: 0, triangles: 0,
  })
  const samples = useRef<number[]>([])
  const elapsed = useRef(0)

  useBeforePhysicsStep(() => { physicsStart.current = performance.now() })
  useAfterPhysicsStep(() => {
    metrics.current.physics += performance.now() - physicsStart.current
    metrics.current.steps++
  })

  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext
    const timer = context.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null
    metrics.current.gpuAvailable = !!timer
    let pending: WebGLQuery | null = null
    let frame = 0
    const originalRender = gl.render

    const instrumentedRender: typeof gl.render = function (renderScene, camera) {
      if (pending && timer) {
        const available = context.getQueryParameter(pending, context.QUERY_RESULT_AVAILABLE)
        const disjoint = context.getParameter(timer.GPU_DISJOINT_EXT)
        if (disjoint || available) {
          if (available && !disjoint) {
            metrics.current.gpu += Number(context.getQueryParameter(pending, context.QUERY_RESULT)) / 1e6
            metrics.current.gpuSamples++
          }
          context.deleteQuery(pending)
          pending = null
        }
      }

      // Sample asynchronously, without waiting for the GPU or blocking a frame.
      let query: WebGLQuery | null = null
      if (timer && !pending && ++frame % 15 === 0
        && !context.getQuery(timer.TIME_ELAPSED_EXT, context.CURRENT_QUERY)) {
        query = context.createQuery()
        if (query) context.beginQuery(timer.TIME_ELAPSED_EXT, query)
      }
      const start = performance.now()
      try {
        originalRender.call(gl, renderScene, camera)
      } finally {
        const end = performance.now()
        metrics.current.submit += end - start
        if (frameStart.current) metrics.current.cpu += end - frameStart.current
        metrics.current.renders++
        metrics.current.calls = gl.info.render.calls
        metrics.current.triangles = gl.info.render.triangles
        if (query && timer) {
          context.endQuery(timer.TIME_ELAPSED_EXT)
          pending = query
        }
      }
    }
    gl.render = instrumentedRender
    return () => {
      if (gl.render === instrumentedRender) gl.render = originalRender
      if (pending) context.deleteQuery(pending)
    }
  }, [gl])

  useFrame((_, delta) => {
    frameStart.current = performance.now()
    samples.current.push(delta * 1000)
    elapsed.current += delta
    if (elapsed.current < 1) return

    const m = metrics.current
    const fps = Math.round(samples.current.length / elapsed.current)
    const sorted = samples.current.toSorted((a, b) => a - b)
    const average = elapsed.current * 1000 / samples.current.length
    const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
    const cpu = m.cpu / Math.max(1, m.renders)
    const gpu = m.gpu / Math.max(1, m.gpuSamples)
    const physics = m.physics / Math.max(1, m.renders)
    let areaLights = 0
    scene.traverseVisible((object) => {
      if (object instanceof Light && object.type === 'RectAreaLight') areaLights++
    })
    let hint = 'Compare L (lighting) and R (resolution) from the same viewpoint.'
    if (m.gpuSamples && gpu > 12 && gpu > cpu) hint = 'Likely GPU load: compare L for lights and R for pixel cost.'
    else if (cpu > 12) hint = physics > cpu * 0.4
      ? 'Likely CPU load; physics is a large part of measured frame work.'
      : 'Likely CPU / render submission load. Check draw calls.'
    else if (fps < 50) hint = 'Low measured scene work: browser scheduling, GC, or unmeasured work may contribute.'

    if (fpsOutput.current) fpsOutput.current.textContent = `${fps} FPS`
    if (output.current) output.current.textContent = [
      `Frame: ${average.toFixed(1)} ms avg / ${p95.toFixed(1)} ms p95`,
      `CPU scene + render: ${cpu.toFixed(1)} ms`,
      `  Render submission: ${(m.submit / Math.max(1, m.renders)).toFixed(1)} ms`,
      `  Physics steps: ${physics.toFixed(2)} ms/frame`,
      `GPU render: ${!m.gpuAvailable ? 'unavailable in this browser' : m.gpuSamples ? `${gpu.toFixed(1)} ms (sampled)` : 'waiting for sample…'}`,
      `Draw calls: ${m.calls} | Triangles: ${m.triangles.toLocaleString()}`,
      `Buffers: ${gl.info.memory.geometries} geometries / ${gl.info.memory.textures} textures`,
      `Resolution: ${gl.domElement.width} × ${gl.domElement.height} / DPR ${gl.getPixelRatio().toFixed(2)}`,
      `Area lights: ${areaLights} | Shadows: ${gl.shadowMap.enabled ? 'ON' : 'OFF'}`,
      '', hint,
      '16.7 ms/frame = 60 FPS. Timings are partial, not a full browser profile.',
    ].join('\n')

    samples.current = []
    elapsed.current = 0
    m.cpu = m.submit = m.physics = m.renders = m.steps = m.gpu = m.gpuSamples = 0
  }, -100)

  return null
}
