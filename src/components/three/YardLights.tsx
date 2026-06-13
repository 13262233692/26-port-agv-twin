import { useMemo } from 'react'

export default function YardLights() {
  const lightPositions = useMemo(() => {
    return [
      [-100, -100, 30],
      [283, -100, 30],
      [-100, 60, 30],
      [283, 60, 30],
    ]
  }, [])

  return (
    <group>
      <ambientLight intensity={0.15} color="#8090A0" />

      <directionalLight
        position={[100, 200, 100]}
        intensity={0.3}
        color="#B0D0FF"
        castShadow={false}
      />

      {lightPositions.map((pos, idx) => (
        <pointLight
          key={idx}
          position={pos as [number, number, number]}
          intensity={0.8}
          color="#FFF0E0"
          distance={300}
          castShadow={true}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={300}
        />
      ))}
    </group>
  )
}
