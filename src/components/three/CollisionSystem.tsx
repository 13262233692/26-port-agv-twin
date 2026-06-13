import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CollisionLightning from './CollisionLightning'
import { useCollisionDetection } from '@/hooks/useCollisionDetection'
import { useTwinStore } from '@/stores/twinStore'
import type { CollisionLevel } from '@/engine/collisionWarningSystem'

export default function CollisionSystem() {
  const { detectFrame } = useCollisionDetection()
  const activeCollisions = useTwinStore((s) => s.activeCollisions)
  const activeIntercepts = useTwinStore((s) => s.activeIntercepts)
  const rmgDevices = useTwinStore((s) => s.rmgDevices)
  const warningSphereRef = useRef<THREE.Mesh>(null)
  const warningRingRef = useRef<THREE.Mesh>(null)

  const criticalCount = activeCollisions.filter((c) => c.level === 'critical').length
  const hasCritical = criticalCount > 0

  useFrame((state, delta) => {
    detectFrame()

    if (warningSphereRef.current && hasCritical) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 12)
      warningSphereRef.current.visible = true
      warningSphereRef.current.scale.setScalar(0.8 + pulse * 0.6)
      const mat = warningSphereRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + pulse * 0.25
    } else if (warningSphereRef.current) {
      warningSphereRef.current.visible = false
    }

    if (warningRingRef.current && hasCritical) {
      const ringPulse = (state.clock.elapsedTime * 3) % 1
      warningRingRef.current.visible = true
      warningRingRef.current.scale.setScalar(1 + ringPulse * 3)
      const mat = warningRingRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.8 * (1 - ringPulse)
    } else if (warningRingRef.current) {
      warningRingRef.current.visible = false
    }
  })

  const getLevelColor = (level: CollisionLevel): string => {
    if (level === 'critical') return '#FF1744'
    if (level === 'warning') return '#FF9100'
    return '#FFD54F'
  }

  const sortedCollisions = useMemo(() => {
    return [...activeCollisions].sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, caution: 2 }
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level]
      }
      return a.distance - b.distance
    })
  }, [activeCollisions])

  const centerPoint = useMemo(() => {
    if (sortedCollisions.length === 0) return new THREE.Vector3(0, 20, 0)
    const first = sortedCollisions[0]
    const mid = new THREE.Vector3()
      .addVectors(first.result.closestPointA, first.result.closestPointB)
      .multiplyScalar(0.5)
    return mid
  }, [sortedCollisions])

  return (
    <group>
      <mesh ref={warningSphereRef} position={centerPoint} visible={false}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial
          color={0xff1744}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={warningRingRef} position={centerPoint} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[2.5, 3, 64]} />
        <meshBasicMaterial
          color={0xff1744}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <CollisionLightning collisions={sortedCollisions} />

      {activeIntercepts.map((rmgId) => {
        const device = rmgDevices.find((d) => d.id === rmgId)
        if (!device) return null
        return (
          <mesh
            key={`intercept-${rmgId}`}
            position={[device.position.x, device.position.z + 25, device.position.y]}
          >
            <torusGeometry args={[4, 0.3, 8, 64]} />
            <meshBasicMaterial
              color={0xff1744}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
