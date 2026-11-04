import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { Group } from 'three'
import { Vector3 } from 'three'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls, TransformControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Model as Office } from './assets/Models/Untitled.tsx'
import { Model as Desk } from './assets/Models/DeskModule.tsx'
import { Model as Tv } from './assets/Models/tv.tsx'
import { Model as Board } from './assets/Models/whhiteBoard.tsx'
import { Model as DisplayStand } from './assets/Models/DisplayStand_mobile.tsx'
import { Model as AirCon } from './assets/Models/AirCon_mobile.tsx'
import './App.css'

type SceneItemProps = {
  name: string
  component: ComponentType<any>
  position: [number, number, number]
  scale?: number | [number, number, number]
  rotation?: [number, number, number]
  selected: string | null
  mode: 'translate' | 'rotate' | 'scale'
  onSelect: (name: string, object: Group) => void
  onChange: (name: string, object: Group) => void
}

const deskPositions: [number, number, number][] = [
  [0.092, 0.496, -2.85],
  [0.079, 0.5, 3.002],
  [0.081, 0.497, -1.39],
  [0.08, 0.501, 0.074],
  [0.081, 0.502, 1.53],
]

const deskScale: [number, number, number] = [0.586, 0.586, 0.586]

function SceneItem({ name, component: Component, position, scale = 1, rotation = [0, 0, 0], selected, mode, onSelect, onChange }: SceneItemProps) {
  const ref = useRef<Group>(null)

  return (
    <>
      <group ref={ref} position={position} rotation={rotation} scale={scale} onClick={(event) => { event.stopPropagation(); if (ref.current) onSelect(name, ref.current) }}>
        <Component />
      </group>
      {selected === name && ref.current && <TransformControls object={ref as any} mode={mode} onObjectChange={() => ref.current && onChange(name, ref.current)} />}
    </>
  )
}

function FirstPersonController() {
  const controls = useRef<any>(null)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())
  const movement = useRef(new Vector3())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { keys.current[event.key.toLowerCase()] = true }
    const onKeyUp = (event: KeyboardEvent) => { keys.current[event.key.toLowerCase()] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!controls.current?.isLocked) return

    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.crossVectors(forward.current, camera.up).normalize()
    movement.current.set(0, 0, 0)

    if (keys.current.w) movement.current.add(forward.current)
    if (keys.current.s) movement.current.sub(forward.current)
    if (keys.current.d) movement.current.add(right.current)
    if (keys.current.a) movement.current.sub(right.current)

    if (movement.current.lengthSq() > 0) {
      movement.current.normalize().multiplyScalar(2.5 * Math.min(delta, 0.05))
      camera.position.add(movement.current)
      camera.position.x = Math.max(-1.8, Math.min(1.8, camera.position.x))
      camera.position.z = Math.max(-4.6, Math.min(4.6, camera.position.z))
    }
    camera.position.y = 1.7
  })

  return <PointerLockControls ref={controls} />
}

function App() {
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [selectedCode, setSelectedCode] = useState('')

  const updateTransformCode = (name: string, object: Group) => {
    const f = (value: number) => Number(value.toFixed(3))
    const position = object.position.toArray().map(f)
    const rotation = [object.rotation.x, object.rotation.y, object.rotation.z].map(f)
    const scale = [object.scale.x, object.scale.y, object.scale.z].map(f)
    const tag = name.startsWith('Desk')
      ? 'Desk'
      : ({ TV: 'Tv', Whiteboard: 'Board', 'Display stand': 'DisplayStand', 'Air conditioner': 'AirCon' } as Record<string, string>)[name]
    setSelectedCode(`{/* ${name} */}<${tag} position={[${position.join(', ')}]} rotation={[${rotation.join(', ')}]} scale={[${scale.join(', ')}]} />`)
  }

  const selectObject = (name: string, object: Group) => {
    setSelected(name)
    updateTransformCode(name, object)
  }

  return (
    <main id="scene">
      <Canvas camera={{ position: [0, 1.7, 3.5], fov: 75 }}>
        <color attach="background" args={['#20242b']} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 5]} intensity={3} castShadow />
        <group onClick={() => setSelected(null)}>
          <Office />
        </group>
        {deskPositions.map((position, index) => (
          <SceneItem key={`desk-${index + 1}`} name={`Desk ${index + 1}`} component={Desk} position={position} rotation={[0, 0, 0]} scale={deskScale} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        ))}
        <SceneItem name="TV" component={Tv} position={[0.085, 2.275, 4.514]} rotation={[-3.142, -0.018, -3.142]} scale={[1.353, 1.234, 0.8]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <SceneItem name="Whiteboard" component={Board} position={[0.085, 2.275, 4.514]}  scale={0.8} rotation={[0, Math.PI / 2, 0]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <SceneItem name="Display stand" component={DisplayStand} position={[2.3, 0.5, 1]} scale={0.8} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <SceneItem name="Air conditioner" component={AirCon} position={[0.085, 2.275, 4.514]} scale={0.7} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <FirstPersonController />
      </Canvas>
      <div className="scene-tools">
        <button onClick={() => setMode('translate')} className={mode === 'translate' ? 'active' : ''}>Move</button>
        <button onClick={() => setMode('rotate')} className={mode === 'rotate' ? 'active' : ''}>Rotate</button>
        <button onClick={() => setMode('scale')} className={mode === 'scale' ? 'active' : ''}>Scale</button>
        {selectedCode && <input className="transform-code" value={selectedCode} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="Generated JSX transform" />}
      </div>
      <div className="scene-crosshair" aria-hidden="true" />
    </main>
  )
}

export default App
