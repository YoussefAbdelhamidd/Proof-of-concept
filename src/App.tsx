import { useEffect, useRef, useState } from 'react'
import type { ComponentType, RefObject } from 'react'
import type { Group } from 'three'
import { Vector3 } from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls, TransformControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Model as Office } from './assets/Models/Untitled.tsx'
import { Model as Desk } from './assets/Models/DeskModule.tsx'
import { Model as Chair } from './assets/Models/chair.tsx'
import { Model as Tv } from './assets/Models/tv.tsx'
import { Model as Board } from './assets/Models/whhiteBoard.tsx'
import { Model as DisplayStand } from './assets/Models/DisplayStand_mobile.tsx'
import { Model as AirCon } from './assets/Models/AirCon_mobile.tsx'
import { Model as BdaiatLogo } from './assets/Models/bdaiatLogo-v5.tsx'
import { Model as Astro } from './assets/Models/astro.tsx'
import { Sticker1201, Sticker1202, Sticker1203 } from './assets/Models/Stickers.tsx'
import './App.css'

RectAreaLightUniformsLib.init()

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
  physics?: 'fixed' | 'dynamic' | 'none'
  chairBodies?: RefObject<Map<string, RapierRigidBody>>
}

const deskPositions: [number, number, number][] = [
  [0.092, 0.496, -2.85],
  [0.079, 0.5, 3.002],
  [0.081, 0.497, -1.39],
  [0.08, 0.501, 0.074],
  [0.081, 0.502, 1.53],
]

const deskScale: [number, number, number] = [0.586, 0.586, 0.586]
const boardPosition: [number, number, number] = [-1.695, 0.5, -4.303]
const boardRotation: [number, number, number] = [0, 0.822, 0]
const boardColliderSize: [number, number, number] = [0.574, 0.9, 0.187]

const chairPositions: [number, number, number][] = deskPositions.flatMap(([, , z]) => [
  [-0.7, 0.613, z],
  [0.7, 0.613, z],
] as [number, number, number][])

const displayStandPositions: [number, number, number][] = deskPositions.map(([, , z]) => [0.097, 1.406, z + 0.026])
const displayStandRotation: [number, number, number] = [3.142, -1.554, 3.142]
const displayStandScale: [number, number, number] = [0.574, 0.489, 0.8]

const chairRotations: [number, number, number][] = [
  [0, 1.375, 0],
  [3.142, -1.458, 3.142],
  [-3.141, 1.512, 3.141],
  [3.142, -1.458, 3.142],
  [-0.003, 1.553, 0.003],
  [3.142, -1.458, 3.142],
  [-3.141, 1.469, 3.141],
  [3.142, -1.458, 3.142],
  [-3.141, 1.46, 3.141],
  [3.142, -1.458, 3.142],
]

// Two rows of three, joined by one light across the front of the room.
const ceilingLightPositions: [number, number, number][] = [
  [-1.25, 3.43, 2.251],
  [-1.25, 3.43, 0],
  [-1.25, 3.43, -3.2],
  [0, 3.43, 3.2],
  [1.25, 3.43, -3.2],
  [1.25, 3.43, 0],
  [1.25, 3.427, 2.341],
]

const ceilingLightRotations: [number, number, number][] = ceilingLightPositions.map((_, index) =>
  index === 3 ? [3.142, -1.542, 3.142] : [0, 0, 0]
)

type CeilingBulbProps = Pick<SceneItemProps, 'name' | 'position' | 'rotation' | 'scale' | 'selected' | 'mode' | 'onSelect' | 'onChange'>

function CeilingBulb({ name, position, rotation, scale, selected, mode, onSelect, onChange }: CeilingBulbProps) {
  const ref = useRef<Group>(null)

  return (
    <>
      <group ref={ref} name={name} position={position} rotation={rotation} scale={scale} onClick={(event) => {
        event.stopPropagation()
        if (ref.current) onSelect(name, ref.current)
      }}>
        <mesh>
          <boxGeometry args={[0.1, 0.045, 0.85]} />
          <meshStandardMaterial color="#111111" roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.026, 0]}>
          <boxGeometry args={[0.065, 0.012, 0.8]} />
          <meshStandardMaterial color="#fff1d6" emissive="#fff1d6" emissiveIntensity={2} toneMapped={false} roughness={0.65} />
        </mesh>
        <rectAreaLight
          position={[0, -0.034, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          width={0.065}
          height={0.8}
          color="#fff1d6"
          // Area lights use brightness per surface area, unlike point lights.
          intensity={100}
        />
      </group>
      {selected === name && ref.current && (
        <TransformControls object={ref.current} mode={mode} onObjectChange={() => {
          if (ref.current) onChange(name, ref.current)
        }} />
      )}
    </>
  )
}

function CeilingLights(props: Pick<SceneItemProps, 'selected' | 'mode' | 'onSelect' | 'onChange'>) {
  return (
    <group name="Warm white ceiling lights">
      {/* A continuous, thin black U-shaped mounting rail. */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 3.46, 0]}>
          <boxGeometry args={[0.025, 0.025, 6.4]} />
          <meshStandardMaterial color="#111111" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 3.46, 3.2]}>
        <boxGeometry args={[2.5, 0.025, 0.025]} />
        <meshStandardMaterial color="#111111" roughness={0.7} />
      </mesh>
      {ceilingLightPositions.map((position, index) => (
        <CeilingBulb key={index} name={`Ceiling light ${index + 1}`} position={position} rotation={ceilingLightRotations[index]} {...props} />
      ))}
    </group>
  )
}

function SceneItem({ name, component: Component, position, scale = 1, rotation = [0, 0, 0], selected, mode, onSelect, onChange, physics = 'fixed', chairBodies }: SceneItemProps) {
  const ref = useRef<Group>(null)
  const isChair = name.startsWith('Chair')
  const colliderSize: [number, number, number] = name.startsWith('Chair') ? [0.28, 0.1, 0.28] : name === 'Whiteboard' ? boardColliderSize : name.startsWith('Desk') ? [0.5, 0.55, 0.45] : [0.5, 0.5, 0.5]
  const localPosition: [number, number, number] = name.startsWith('Chair') ? [0, -0.1, 0] : [0, 0, 0]

  if (physics === 'none') {
    return (
      <>
        <group ref={ref} position={position} rotation={rotation} scale={scale} onClick={(event) => {
          event.stopPropagation()
          if (ref.current) onSelect(name, ref.current)
        }}>
          <Component />
        </group>
        {selected === name && ref.current && <TransformControls object={ref.current} mode={mode} onObjectChange={() => ref.current && onChange(name, ref.current)} />}
      </>
    )
  }

  return (
    <>
      <RigidBody
        ref={isChair ? (body) => {
          if (body) chairBodies?.current.set(name, body)
          else chairBodies?.current.delete(name)
        } : undefined}
        type={physics} position={position} rotation={rotation} colliders={false}
        friction={1} restitution={0}
        mass={!isChair && physics === 'dynamic' ? 8 : undefined}
        linearDamping={physics === 'dynamic' ? (isChair ? 10 : 7) : undefined}
        angularDamping={physics === 'dynamic' ? (isChair ? 16 : 12) : undefined}
        enabledTranslations={isChair ? [true, false, true] : [true, true, true]}
        enabledRotations={isChair ? [false, false, false] : [false, true, false]}
        additionalSolverIterations={isChair ? 4 : 0}
        ccd={isChair}
      >
        <CuboidCollider args={colliderSize} position={name === 'Whiteboard' ? [0, 0.9, 0] : [0, 0, 0]} mass={isChair ? 25 : undefined} />
        <group ref={ref} position={localPosition} scale={scale} onClick={(event) => { event.stopPropagation(); if (ref.current) onSelect(name, ref.current) }}>
          <Component />
        </group>
      </RigidBody>
      {selected === name && ref.current && <TransformControls object={ref as any} mode={mode} onObjectChange={() => ref.current && onChange(name, ref.current)} />}
    </>
  )
}

function FirstPersonController({ chairBodies }: { chairBodies: RefObject<Map<string, RapierRigidBody>> }) {
  const controls = useRef<any>(null)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})
  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())
  const movement = useRef(new Vector3())
  const jumpHeight = useRef(0)
  const jumpVelocity = useRef(0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true
      if (event.code === 'Space' && controls.current?.isLocked) {
        event.preventDefault()
        if (!event.repeat && jumpHeight.current === 0 && jumpVelocity.current === 0) {
          jumpVelocity.current = 3.6
        }
      }
    }
    const onKeyUp = (event: KeyboardEvent) => { keys.current[event.key.toLowerCase()] = false }
    const onBlur = () => { keys.current = {} }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
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
      const nextPosition = camera.position.clone().add(movement.current)
      nextPosition.x = Math.max(-1.8, Math.min(1.8, nextPosition.x))
      nextPosition.z = Math.max(-4.6, Math.min(4.6, nextPosition.z))
      const blockedByDesk = deskPositions.some(([x, , z]) => Math.abs(nextPosition.x - x) < 0.6 && Math.abs(nextPosition.z - z) < 0.7)
      // Test the player's footprint in the whiteboard's rotated local space.
      const boardDx = nextPosition.x - boardPosition[0]
      const boardDz = nextPosition.z - boardPosition[2]
      const boardCos = Math.cos(boardRotation[1])
      const boardSin = Math.sin(boardRotation[1])
      const blockedByBoard = Math.abs(boardCos * boardDx - boardSin * boardDz) < boardColliderSize[0] + 0.18
        && Math.abs(boardSin * boardDx + boardCos * boardDz) < boardColliderSize[2] + 0.18
      const blockedByFixedObject = blockedByDesk || blockedByBoard
      let movementFraction = 1
      if (!blockedByFixedObject) {
        for (const body of chairBodies.current.values()) {
          const chair = body.translation()
          // Use the live body position, so a moved chair no longer blocks its old spot.
          if (Math.abs(nextPosition.x - chair.x) >= 0.45 || Math.abs(nextPosition.z - chair.z) >= 0.45) continue
          const towardChair = (chair.x - camera.position.x) * movement.current.x
            + (chair.z - camera.position.z) * movement.current.z
          if (towardChair <= 0) continue
          // Advance right up to contact instead of dropping the entire movement
          // frame. This lets the player continuously follow a slowly sliding chair.
          let contactFraction = 0
          for (const axis of ['x', 'z'] as const) {
            const step = nextPosition[axis] - camera.position[axis]
            if (Math.abs(step) < 0.000001) continue
            const nearEdge = chair[axis] - Math.sign(step) * 0.45
            contactFraction = Math.max(contactFraction, (nearEdge - camera.position[axis]) / step)
          }
          movementFraction = Math.min(movementFraction, Math.max(0, Math.min(1, contactFraction)))
          const direction = movement.current.clone().normalize()
          const velocity = body.linvel()
          const speedAlongPush = velocity.x * direction.x + velocity.z * direction.z
          // A heavy, damped shove that stops as soon as the player stops pushing.
          const speedIncrease = Math.max(0, Math.min(0.35 - speedAlongPush, 3 * Math.min(delta, 0.05)))
          body.applyImpulse({ x: direction.x * body.mass() * speedIncrease, y: 0, z: direction.z * body.mass() * speedIncrease }, true)
        }
      }
      if (!blockedByFixedObject) {
        camera.position.lerp(nextPosition, movementFraction)
      }
    }
    const jumpStep = Math.min(delta, 0.05)
    if (jumpHeight.current > 0 || jumpVelocity.current > 0) {
      jumpHeight.current += jumpVelocity.current * jumpStep - 0.5 * 9.81 * jumpStep * jumpStep
      jumpVelocity.current -= 9.81 * jumpStep
      if (jumpHeight.current <= 0) {
        jumpHeight.current = 0
        jumpVelocity.current = 0
      }
    }
    camera.position.y = 1.7 + jumpHeight.current
  })

  return (
    <PointerLockControls ref={controls} />
  )
}

function App() {
  const chairBodies = useRef(new Map<string, RapierRigidBody>())
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [selectedCode, setSelectedCode] = useState('')

  const updateTransformCode = (name: string, object: Group) => {
    const f = (value: number) => Number(value.toFixed(3))
    const position = object.position.toArray().map(f)
    const rotation = [object.rotation.x, object.rotation.y, object.rotation.z].map(f)
    const scale = [object.scale.x, object.scale.y, object.scale.z].map(f)
    const tag = name.startsWith('Ceiling light')
      ? 'CeilingBulb'
      : name.startsWith('Desk')
      ? 'Desk'
      : name.startsWith('Chair')
        ? 'Chair'
      : name.startsWith('Display stand')
        ? 'DisplayStand'
      : name.startsWith('Air conditioner')
        ? 'AirCon'
        : ({ TV: 'Tv', Whiteboard: 'Board', 'Air conditioner': 'AirCon', 'Bdaiat logo': 'BdaiatLogo', Astro: 'Astro', 'Sticker 1201': 'Sticker1201', 'Sticker 1202': 'Sticker1202', 'Sticker 1203': 'Sticker1203' } as Record<string, string>)[name]
    setSelectedCode(`{/* ${name} */}<${tag} position={[${position.join(', ')}]} rotation={[${rotation.join(', ')}]} scale={[${scale.join(', ')}]} />`)
  }

  const selectObject = (name: string, object: Group) => {
    setSelected(name)
    updateTransformCode(name, object)
  }

  return (
    <main id="scene">
      <Canvas camera={{ position: [-1.5, 1.7, 4.2], fov: 75 }}>
        <Physics gravity={[0, -9.81, 0]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[2.4, 0.15, 5.2]} position={[0, 0.35, 0]} />
          {/* Room walls match the Untitled model's world-space boundaries. */}
          <CuboidCollider args={[0.1, 1.5, 5.2]} position={[-2.181, 1.997, 0.219]} />
          <CuboidCollider args={[0.1, 1.5, 5.2]} position={[2.019, 1.997, 0.219]} />
          <CuboidCollider args={[2, 1.5, 0.1]} position={[-0.081, 1.997, -4.881]} />
          <CuboidCollider args={[2, 1.5, 0.1]} position={[-0.081, 1.997, 5.319]} />
          {[-2.5, 2.5].map((z) => (
            <CuboidCollider key={z} args={[0.1, 1.5, 0.6]} position={[-1.991, 1.997, z + 0.219]} />
          ))}
        </RigidBody>
        <color attach="background" args={['#20242b']} />
        <CeilingLights selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <group onClick={() => setSelected(null)}>
          <Office />
        </group>
        {deskPositions.map((position, index) => (
          <SceneItem key={`desk-${index + 1}`} name={`Desk ${index + 1}`} component={Desk} position={position} rotation={[0, 0, 0]} scale={deskScale} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="fixed" />
        ))}
        {chairPositions.map((position, index) => (
          <SceneItem key={`chair-${index + 1}`} name={`Chair ${index + 1}`} component={Chair} position={position} rotation={chairRotations[index]} scale={[0.8, 0.8, 0.8]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="dynamic" chairBodies={chairBodies} />
        ))}
        <SceneItem name="TV" component={Tv} position={[0.085, 2.275, 4.514]} rotation={[-3.142, -0.018, -3.142]} scale={[1.353, 1.234, 0.8]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        <SceneItem name="Whiteboard" component={Board} position={boardPosition} scale={[1.074, 0.976, 1.013]} rotation={boardRotation} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="fixed" />
        {displayStandPositions.map((position, index) => (
          <SceneItem key={`display-stand-${index + 1}`} name={`Display stand ${index + 1}`} component={DisplayStand} position={position} rotation={displayStandRotation} scale={displayStandScale} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        ))}
        <group position={[0.085, 2.275, 4.514]}>
          <SceneItem name="Air conditioner" component={AirCon} position={[-2.089, 0.665, -8.236]} rotation={[0, 1.567, 0]} scale={[1.128, 1.274, 0.7]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        </group>
        <group position={[1.842, 2.94, -3.722]} rotation={[0, 1.567 - Math.PI, 0]}>
          <SceneItem name="Air conditioner opposite" component={AirCon} position={[1.755, 0, -0.007]} rotation={[0, 0, 0]} scale={[1.128, 1.274, 0.7]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} />
        </group>
        <SceneItem name="Bdaiat logo" component={BdaiatLogo} position={[-2.071, 2, 0.204]} rotation={[-3.142, 1.562, -3.142]} scale={[3, 3, 3]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="none" />
        <SceneItem name="Sticker 1201" component={Sticker1201} position={[1.9, 1.9, 0.091]} rotation={[0, -1.571, 0]} scale={[3.28, 3.816, 9.985]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="none" />
        <SceneItem name="Sticker 1202" component={Sticker1202} position={[-1.865, 2.061, -2.288]} rotation={[0, 1.558, 0]} scale={[3.522, 3.522, 3.522]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="none" />
        <SceneItem name="Sticker 1203" component={Sticker1203} position={[-1.884, 1.9, 2.737]} rotation={[-3.142, 1.555, -3.142]} scale={[2.623, 2.623, 2.623]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="none" />
        <SceneItem name="Astro" component={Astro} position={[1.25, 0.5, 4.1]} selected={selected} mode={mode} onSelect={selectObject} onChange={updateTransformCode} physics="none" />
        <FirstPersonController chairBodies={chairBodies} />
        </Physics>
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
