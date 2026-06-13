import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useTwinStore } from '@/stores/twinStore'
import { lerp } from '@/utils/mathUtils'

import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export default function YardCamera() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const currentPos = useRef({ x: 0, y: 150, z: 200 })
  const currentTarget = useRef({ x: 0, y: 0, z: 0 })

  const cameraMode = useTwinStore((state) => state.cameraMode)
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId)
  const rmgDevices = useTwinStore((state) => state.rmgDevices)
  const { camera } = useThree()

  useFrame(() => {
    if (!controlsRef.current) return

    let targetX = 0
    let targetY = 0
    let targetZ = 200
    let targetLookX = 0
    let targetLookY = 0
    let targetLookZ = 0

    if (cameraMode === 'overview') {
      targetX = 91.5
      targetY = 7.2
      targetZ = 150
      targetLookX = 91.5
      targetLookY = 7.2
      targetLookZ = 0
    } else if (cameraMode === 'follow' && selectedDeviceId && !selectedDeviceId.startsWith('container-')) {
      const device = rmgDevices.find((d) => d.id === selectedDeviceId)
      if (device) {
        targetX = device.position.x
        targetY = device.position.y - 60
        targetZ = device.position.z + 80
        targetLookX = device.position.x
        targetLookY = device.position.y
        targetLookZ = device.position.z
      } else {
        targetX = 91.5
        targetY = 7.2
        targetZ = 150
        targetLookX = 91.5
        targetLookY = 7.2
        targetLookZ = 0
      }
    } else if (cameraMode === 'free') {
      return
    }

    currentPos.current.x = lerp(currentPos.current.x, targetX, 0.05)
    currentPos.current.y = lerp(currentPos.current.y, targetY, 0.05)
    currentPos.current.z = lerp(currentPos.current.z, targetZ, 0.05)

    currentTarget.current.x = lerp(currentTarget.current.x, targetLookX, 0.05)
    currentTarget.current.y = lerp(currentTarget.current.y, targetLookY, 0.05)
    currentTarget.current.z = lerp(currentTarget.current.z, targetLookZ, 0.05)

    camera.position.set(currentPos.current.x, currentPos.current.y, currentPos.current.z)
    controlsRef.current.target.set(currentTarget.current.x, currentTarget.current.y, currentTarget.current.z)
    controlsRef.current.update()
  })

  if (cameraMode === 'overview') {
    return (
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={50}
        maxDistance={500}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    )
  } else if (cameraMode === 'follow') {
    return (
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={30}
        maxDistance={200}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2 - 0.2}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
      />
    )
  } else {
    return (
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={500}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    )
  }
}
