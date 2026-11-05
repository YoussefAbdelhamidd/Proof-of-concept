import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'

const modelUrl = new URL('./bdaiatLogo-v5.glb', import.meta.url).href

export function Model(props: ThreeElements['group']) {
  const { scene } = useGLTF(modelUrl)
  const model = useMemo(() => scene.clone(true), [scene])

  return (
    <group {...props} dispose={null}>
      <primitive object={model} />
    </group>
  )
}

useGLTF.preload(modelUrl)
