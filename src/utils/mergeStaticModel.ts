import { Group, Mesh } from 'three'
import type { BufferGeometry, Material, Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Bake static node transforms and combine geometry sharing the same material.
export function mergeStaticModel(scene: Object3D) {
  scene.updateMatrixWorld(true)
  const batches = new Map<Material, BufferGeometry[]>()
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone()
    geometry.applyMatrix4(object.matrixWorld)
    const material = object.material as Material
    const batch = batches.get(material) ?? []
    batch.push(geometry)
    batches.set(material, batch)
  })

  const root = new Group()
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries)
    if (geometry) root.add(new Mesh(geometry, material))
    else {
      // Keep every part visible if a future model uses incompatible attributes.
      for (const part of geometries) root.add(new Mesh(part, material))
      continue
    }
    geometries.forEach((part) => part.dispose())
  }
  return root
}
