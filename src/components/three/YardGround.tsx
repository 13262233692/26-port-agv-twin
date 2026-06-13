import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { YardLayout, YardBlock } from '@shared/types'
import { useTwinStore } from '@/stores/twinStore'
import { getBlockBounds } from '@/utils/yardUtils'

function BlockBoundary({ block, layout }: { block: YardBlock; layout: YardLayout }) {
  const points = useMemo(() => {
    const bounds = getBlockBounds(block, layout)
    const pts: THREE.Vector3[] = []
    pts.push(new THREE.Vector3(bounds.min.x, bounds.min.y, 0.01))
    pts.push(new THREE.Vector3(bounds.max.x, bounds.min.y, 0.01))
    pts.push(new THREE.Vector3(bounds.max.x, bounds.max.y, 0.01))
    pts.push(new THREE.Vector3(bounds.min.x, bounds.max.y, 0.01))
    pts.push(new THREE.Vector3(bounds.min.x, bounds.min.y, 0.01))
    return pts
  }, [block, layout])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  const centerX = useMemo(() => {
    const bounds = getBlockBounds(block, layout)
    return (bounds.min.x + bounds.max.x) / 2
  }, [block, layout])

  const centerY = useMemo(() => {
    const bounds = getBlockBounds(block, layout)
    return (bounds.min.y + bounds.max.y) / 2
  }, [block, layout])

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#00E5FF" transparent opacity={0.5} linewidth={2} />
      </lineSegments>
      <Text
        position={[centerX, centerY, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3}
        color="#00E5FF"
        anchorX="center"
        anchorY="middle"
      >
        {block.name}
      </Text>
    </group>
  )
}

export default function YardGround() {
  const yardLayout = useTwinStore((state) => state.yardLayout)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#152030" metalness={0.1} roughness={0.9} />
      </mesh>

      <gridHelper
        args={[500, 50, '#2A3A4A', '#1E2E3E']}
        position={[0, 0, 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {yardLayout &&
        yardLayout.blocks.map((block) => (
          <BlockBoundary key={block.id} block={block} layout={yardLayout} />
        ))}
    </group>
  )
}
