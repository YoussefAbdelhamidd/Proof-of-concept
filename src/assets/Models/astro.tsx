import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { Box3, Mesh, Vector3 } from 'three'
import { mergeStaticModel } from '../../utils/mergeStaticModel.ts'
import { createMatteDisplayModel } from '../../utils/createMatteDisplayModel.ts'

const modelUrl = new URL('./astro.glb', import.meta.url).href

export function Model(props: ThreeElements['group']) {
  const { scene } = useGLTF(modelUrl)
  const model = useMemo(() => {
    const root = createMatteDisplayModel(mergeStaticModel(scene))
    const bounds = new Box3().setFromObject(root)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const scale = size.y > 0 ? 1.2 / size.y : 1
    // Start at a visible size with the transform pivot at the feet.
    root.scale.setScalar(scale)
    root.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    return root
  }, [scene])

  useEffect(() => () => {
    model.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
        // Display-model materials are owned here, unlike cached GLTF materials.
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
        else object.material.dispose()
      }
    })
  }, [model])

  return <group {...props} dispose={null}><primitive object={model} /></group>
}

useGLTF.preload(modelUrl)
