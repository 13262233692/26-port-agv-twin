import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useTwinStore } from '@/stores/twinStore'
import YardLights from './YardLights'
import YardModelLoader from './YardModelLoader'
import ContainerInstancedMesh from './ContainerInstancedMesh'
import RMGModel from './RMGModel'
import YardCamera from './YardCamera'
import PostEffects from './PostEffects'
import ContainerInfoPopup from './ContainerInfoPopup'

export default function YardScene() {
  const rmgDevices = useTwinStore((state) => state.rmgDevices)
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId)
  const modelUrl = import.meta.env.VITE_YARD_MODEL_URL as string | undefined

  const hasSelectedContainer = selectedDeviceId?.startsWith('container-') || false

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
      camera={{ position: [91.5, 7.2, 150], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl, scene }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        scene.background = new THREE.Color('#0A1628')
        scene.fog = new THREE.Fog('#0A1628', 200, 500)
      }}
    >
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 200, 500]} />

      <YardLights />
      <YardModelLoader modelUrl={modelUrl} useWorker />
      <ContainerInstancedMesh />

      {rmgDevices.map((device) => (
        <RMGModel key={device.id} deviceId={device.id} />
      ))}

      <YardCamera />
      <PostEffects />

      {hasSelectedContainer && <ContainerInfoPopup />}
    </Canvas>
  )
}
