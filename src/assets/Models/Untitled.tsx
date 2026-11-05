import * as THREE from 'three'
import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'

// The replacement includes the whole building. Align its office wall bounds
// with the original room, keeping all independently placed scene objects fixed.
const modelUrl = new URL('./glb_model_editor (2).glb', import.meta.url).href
const officeScale = [4 / 6.866599731445312, 3 / 5.1, 10 / 16.766300048828124] as const
const officePosition: [number, number, number] = [
  -0.081 - 7.384722763836985 * officeScale[0],
  0.497 - 0.8283 * officeScale[1],
  0.219 + 21.17978764263251 * officeScale[2],
]

const wallTextureUrl = new URL('./Texturelabs_wall_278S.jpg', import.meta.url).href
const woodTextureUrl = new URL('./Texturelabs_Wood_206S.jpg', import.meta.url).href

function repeatingTexture(source: THREE.Texture) {
  const texture = source.clone()
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function carpetTexture() {
  // Small, deterministic woven tile: no external download or large texture asset.
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  let seed = 1201
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const weave = (x % 4 < 2 ? 5 : -5) + (y % 4 < 2 ? 3 : -3)
      const shade = 65 + weave + (seed % 23) - 11
      const offset = (y * size + x) * 4
      pixels.set([shade, shade + 2, shade + 5, 255], offset)
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function mappedGeometry(mesh: THREE.Mesh, tileSize: number) {
  // Per-face planar UVs also work on walls and doors exported without UVs.
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
  const positions = geometry.getAttribute('position')
  const uv = new Float32Array(positions.count * 2)
  const transform = new THREE.Matrix4().makeScale(...officeScale).multiply(mesh.matrixWorld)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const edge = new THREE.Vector3()
  for (let i = 0; i < positions.count; i += 3) {
    a.fromBufferAttribute(positions, i).applyMatrix4(transform)
    b.fromBufferAttribute(positions, i + 1).applyMatrix4(transform)
    c.fromBufferAttribute(positions, i + 2).applyMatrix4(transform)
    normal.subVectors(b, a).cross(edge.subVectors(c, a))
    const nx = Math.abs(normal.x), ny = Math.abs(normal.y), nz = Math.abs(normal.z)
    ;[a, b, c].forEach((point, vertex) => {
      const offset = (i + vertex) * 2
      uv[offset] = (ny >= nx && ny >= nz ? point.x : nx > nz ? point.z : point.x) / tileSize
      uv[offset + 1] = (ny >= nx && ny >= nz ? point.z : point.y) / tileSize
    })
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}

export function Model(props: any) {
  const { scene } = useGLTF(modelUrl)
  const [wallSource, woodSource] = useTexture([wallTextureUrl, woodTextureUrl])
  const materials = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({
      map: repeatingTexture(wallSource), roughness: 0.95, side: THREE.DoubleSide,
      emissive: '#fff1d6', emissiveIntensity: 0.045,
    }),
    wood: new THREE.MeshStandardMaterial({ map: repeatingTexture(woodSource), roughness: 0.7 }),
    carpet: new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({
      color: '#d4e8ed', roughness: 0.12, metalness: 0.05,
      transparent: true, opacity: 0.22, depthWrite: false,
      side: THREE.DoubleSide, forceSinglePass: true,
    }),
    frame: new THREE.MeshStandardMaterial({ color: '#30343a', roughness: 0.45, metalness: 0.65 }),
    handle: new THREE.MeshStandardMaterial({ color: '#afb4bb', roughness: 0.28, metalness: 0.85 }),
    deck: new THREE.MeshStandardMaterial({ color: '#8b8d90', roughness: 0.95 }),
  }), [wallSource, woodSource])
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.updateMatrixWorld(true)
    // Keep the application's existing lighting and camera setup.
    const embeddedSceneObjects: THREE.Object3D[] = []
    clone.traverse((object) => {
      if (object instanceof THREE.Light || object instanceof THREE.Camera) {
        embeddedSceneObjects.push(object)
      }
      if (!(object instanceof THREE.Mesh)) return
      const name = object.name.toLowerCase()
      if (name.includes('glass') && !name.includes('frame') || name.includes('railing')) {
        object.material = materials.glass
      } else if (name.includes('handle')) {
        object.material = materials.handle
      } else if (name.includes('frame')) {
        object.material = materials.frame
      } else if (name.includes('wood') && name.includes('body')) {
        object.material = materials.wood
        object.geometry = mappedGeometry(object, 1.2)
      } else if (name.includes('floor')) {
        object.material = materials.carpet
        object.geometry = mappedGeometry(object, 0.35)
      } else if (name.includes('deck')) {
        object.material = materials.deck
      } else {
        object.material = materials.wall
        object.geometry = mappedGeometry(object, 1.5)
      }
    })
    embeddedSceneObjects.forEach((object) => object.removeFromParent())
    return clone
  }, [scene, materials])
  const ceilingGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(4, 10)
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4 / 1.5, uv.getY(i) * 10 / 1.5)
    return geometry
  }, [])
  return (
    <group {...props} name="Building collision geometry" dispose={null}>
      <group position={officePosition} scale={[...officeScale]}>
        <primitive object={model} />
      </group>
      {/* Subtle ceiling-only fill: visible evenly, without casting light onto walls. */}
      <mesh name="Ceiling" position={[-0.081, 3.49, 0.219]} rotation={[Math.PI / 2, 0, 0]}>
        <primitive attach="geometry" object={ceilingGeometry} />
        <primitive attach="material" object={materials.wall} />
      </mesh>
      {/* Full-height raised panels on the left wall. */}
      <group position={[-0.081, 0.497, 0.219]}>
        {[-2.5, 2.5].map((z) => (
          <mesh key={z} name={`Left wall panel ${z < 0 ? 'back' : 'front'}`} position={[-1.91, 1.5, z]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.2, 3, 0.2]} />
            <meshStandardMaterial attach="material-0" color="#2463cc" roughness={0.8} />
            <meshStandardMaterial attach="material-1" color="#2463cc" roughness={0.8} />
            <meshStandardMaterial attach="material-2" color="#2463cc" roughness={0.8} />
            <meshStandardMaterial attach="material-3" color="#2463cc" roughness={0.8} />
            <primitive attach="material-4" object={materials.wall} />
            <primitive attach="material-5" object={materials.wall} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

useGLTF.preload(modelUrl)
