import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTwinStore } from '@/stores/twinStore'
import { lerp } from '@/utils/mathUtils'

interface RMGModelProps {
  deviceId: string
}

export default function RMGModel({ deviceId }: RMGModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const trolleyRef = useRef<THREE.Mesh>(null)
  const spreaderRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const spreaderEdgesRef = useRef<THREE.LineSegments>(null)
  const currentPos = useRef({ x: 0, y: 0, z: 0 })
  const currentTrolleyX = useRef(0)
  const currentSpreaderZ = useRef(0)
  const flickerTime = useRef(0)

  const rmgDevices = useTwinStore((state) => state.rmgDevices)
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId)
  const selectDevice = useTwinStore((state) => state.selectDevice)

  const device = useMemo(() => {
    return rmgDevices.find((d) => d.id === deviceId)
  }, [rmgDevices, deviceId])

  const isSelected = selectedDeviceId === deviceId
  const isFault = device?.status === 'fault'
  const isOverload = device && device.spreader.loadCurrent > 40

  const mainColor = isFault ? '#FF1744' : '#2A3A4A'
  const edgeColor = isFault ? '#FF1744' : '#00E5FF'

  useFrame((state, delta) => {
    if (!groupRef.current || !device) return

    flickerTime.current += delta

    const targetX = device.position.x
    const targetY = device.position.y
    const targetZ = device.position.z

    currentPos.current.x = lerp(currentPos.current.x, targetX, 0.1)
    currentPos.current.y = lerp(currentPos.current.y, targetY, 0.1)
    currentPos.current.z = lerp(currentPos.current.z, targetZ, 0.1)

    groupRef.current.position.set(
      currentPos.current.x,
      currentPos.current.y,
      currentPos.current.z + 15
    )

    const targetTrolleyX = device.spreader.position.x - device.position.x
    currentTrolleyX.current = lerp(currentTrolleyX.current, targetTrolleyX, 0.1)
    if (trolleyRef.current) {
      trolleyRef.current.position.x = currentTrolleyX.current
    }

    const targetSpreaderZ = device.spreader.position.z - device.position.z
    currentSpreaderZ.current = lerp(currentSpreaderZ.current, targetSpreaderZ, 0.15)
    if (spreaderRef.current) {
      spreaderRef.current.position.x = currentTrolleyX.current
      spreaderRef.current.position.z = currentSpreaderZ.current - 15
    }

    if (edgesRef.current) {
      edgesRef.current.visible = isSelected
    }

    if (spreaderEdgesRef.current) {
      if (isOverload) {
        const visible = Math.sin(flickerTime.current * 8) > 0
        spreaderEdgesRef.current.visible = visible
        const material = spreaderEdgesRef.current.material as THREE.LineBasicMaterial
        material.color.set('#FF9100')
      } else {
        spreaderEdgesRef.current.visible = isSelected
        const material = spreaderEdgesRef.current.material as THREE.LineBasicMaterial
        material.color.set(edgeColor)
      }
    }
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    selectDevice(deviceId)
  }

  if (!device) return null

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh position={[0, 0, 12]}>
        <boxGeometry args={[40, 2, 1]} />
        <meshStandardMaterial color={mainColor} metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[-18, -1.5, 5]}>
        <boxGeometry args={[1, 1.5, 10]} />
        <meshStandardMaterial color={mainColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[18, -1.5, 5]}>
        <boxGeometry args={[1, 1.5, 10]} />
        <meshStandardMaterial color={mainColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-18, 1.5, 5]}>
        <boxGeometry args={[1, 1.5, 10]} />
        <meshStandardMaterial color={mainColor} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[18, 1.5, 5]}>
        <boxGeometry args={[1, 1.5, 10]} />
        <meshStandardMaterial color={mainColor} metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[-18, 0, -5]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color="#1A2A3A" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[18, 0, -5]}>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color="#1A2A3A" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-18, -3, -5]}>
        <boxGeometry args={[3, 1, 3]} />
        <meshStandardMaterial color="#0A1628" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[18, -3, -5]}>
        <boxGeometry args={[3, 1, 3]} />
        <meshStandardMaterial color="#0A1628" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh ref={trolleyRef} position={[0, 0, 13]}>
        <boxGeometry args={[4, 1.5, 2]} />
        <meshStandardMaterial color="#3A4A5A" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh ref={spreaderRef} position={[0, 0, -5]}>
        <boxGeometry args={[6.5, 0.5, 1.5]} />
        <meshStandardMaterial
          color={isOverload ? '#FF9100' : '#4A5A6A'}
          metalness={0.5}
          roughness={0.5}
          emissive={isOverload ? '#FF9100' : '#000000'}
          emissiveIntensity={isOverload ? 0.3 : 0}
        />
      </mesh>

      <lineSegments ref={edgesRef} visible={false}>
        <edgesGeometry args={[new THREE.BoxGeometry(42, 18, 4)]} />
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineSegments>

      <lineSegments ref={spreaderEdgesRef} visible={false}>
        <edgesGeometry args={[new THREE.BoxGeometry(7, 1, 2)]} />
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineSegments>
    </group>
  )
}
