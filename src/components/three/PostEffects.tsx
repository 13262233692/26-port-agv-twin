import { EffectComposer, Bloom, SSAO, Vignette } from '@react-three/postprocessing'

export default function PostEffects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <SSAO
        intensity={0.5}
        luminanceInfluence={0.6}
        radius={4}
        samples={16}
        worldDistanceThreshold={10}
        worldDistanceFalloff={10}
        worldProximityThreshold={0.5}
        worldProximityFalloff={0.5}
      />
      <Vignette
        offset={0.5}
        darkness={0.3}
      />
    </EffectComposer>
  )
}
