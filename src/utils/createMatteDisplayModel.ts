import { BufferAttribute, Color, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import type { BufferGeometry, MeshStandardMaterial } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Astro is static and matte: store soft shading in vertex colors rather than
// evaluating all seven rectangular lights for every screen pixel each frame.
export function createMatteDisplayModel(source: Group) {
  const parts: BufferGeometry[] = []
  const normal = new Vector3()
  const softKey = new Vector3(-0.4, 0.8, 0.3).normalize()
  const warmWhite = new Color('#fff1d6')
  source.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const geometry = object.geometry
    const normals = geometry.getAttribute('normal')
    const baseColor = (object.material as MeshStandardMaterial).color
    const colors = new Float32Array(normals.count * 3)
    for (let i = 0; i < normals.count; i++) {
      normal.fromBufferAttribute(normals, i).normalize()
      const brightness = Math.min(1, 0.3 + 0.5 * Math.max(0, normal.y) + 0.2 * Math.max(0, normal.dot(softKey)))
      colors[i * 3] = baseColor.r * brightness * warmWhite.r
      colors[i * 3 + 1] = baseColor.g * brightness * warmWhite.g
      colors[i * 3 + 2] = baseColor.b * brightness * warmWhite.b
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    parts.push(geometry)
  })

  const root = new Group()
  const material = new MeshBasicMaterial({ vertexColors: true })
  const merged = mergeGeometries(parts)
  if (merged) {
    root.add(new Mesh(merged, material))
    parts.forEach((geometry) => geometry.dispose())
  } else {
    parts.forEach((geometry) => root.add(new Mesh(geometry, material)))
  }
  return root
}
