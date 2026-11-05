import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { Box3, Group, Vector3 } from 'three'

const modelUrl = new URL('./astro.glb', import.meta.url).href

export function Model(props: ThreeElements['group']) {
  const { scene } = useGLTF(modelUrl)
  const model = useMemo(() => {
    const root = new Group()
    root.add(scene.clone(true))
    const bounds = new Box3().setFromObject(root)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const scale = size.y > 0 ? 1.2 / size.y : 1
    // Start at a visible size with the transform pivot at the feet.
    root.scale.setScalar(scale)
    root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    return root
  }, [scene])

  return <group {...props} dispose={null}><primitive object={model} /></group>
}

useGLTF.preload(modelUrl)
