import { useTexture } from '@react-three/drei'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { DoubleSide, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import type { ThreeElements } from '@react-three/fiber'

const stickerUrls = [
  new URL('./IMG_1201-removebg-preview.png', import.meta.url).href,
  new URL('./IMG_1202-removebg-preview.png', import.meta.url).href,
  new URL('./IMG_1203-removebg-preview.png', import.meta.url).href,
]

function Sticker({ url, ...props }: ThreeElements['group'] & { url: string }) {
  const gl = useThree((state) => state.gl)
  const texture = useTexture(url)

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    // Preserve detail at grazing angles instead of blurring across the wall.
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.magFilter = LinearFilter
    texture.minFilter = LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }, [gl, texture])

  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[0.6, 0.8]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    </group>
  )
}

export function Sticker1201(props: ThreeElements['group']) {
  return <Sticker url={stickerUrls[0]} {...props} />
}

export function Sticker1202(props: ThreeElements['group']) {
  return <Sticker url={stickerUrls[1]} {...props} />
}

export function Sticker1203(props: ThreeElements['group']) {
  return <Sticker url={stickerUrls[2]} {...props} />
}

stickerUrls.forEach((url) => useTexture.preload(url))
