import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ContainerState, YardLayout, YardBlock } from '@shared/types'
import { useTwinStore } from '@/stores/twinStore'
import { bayRowTierToPosition, getContainerColor } from '@/utils/yardUtils'

function BlockInstancedMesh({ block, layout }: { block: YardBlock; layout: YardLayout }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const highlightRef = useRef<THREE.LineSegments>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const containers = useTwinStore((state) => state.containers)
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId)
  const selectDevice = useTwinStore((state) => state.selectDevice)

  const blockContainers = useMemo(() => {
    const result: (ContainerState | null)[] = new Array(block.bayCount * block.rowCount * block.tierCount).fill(null)
    for (const c of containers) {
      const idx = c.bay * block.rowCount * block.tierCount + c.row * block.tierCount + c.tier
      if (idx >= 0 && idx < result.length) {
        result[idx] = c
      }
    }
    return result
  }, [containers, block])

  const colors = useMemo(() => {
    const result = new Float32Array(blockContainers.length * 3)
    for (let i = 0; i < blockContainers.length; i++) {
      const c = blockContainers[i]
      const tier = c ? c.tier : Math.floor(i / (block.rowCount * block.tierCount))
      const color = new THREE.Color(getContainerColor(tier, block.tierCount, c?.occupied || false))
      result[i * 3] = color.r
      result[i * 3 + 1] = color.g
      result[i * 3 + 2] = color.b
    }
    return result
  }, [blockContainers, block])

  useFrame(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current
    for (let i = 0; i < blockContainers.length; i++) {
      const c = blockContainers[i]
      if (c) {
        const pos = bayRowTierToPosition(c.bay, c.row, c.tier, block.id, layout)
        dummy.position.set(pos.x, pos.y, pos.z + 1.25)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      } else {
        const bay = Math.floor(i / (block.rowCount * block.tierCount))
        const row = Math.floor((i % (block.rowCount * block.tierCount)) / block.tierCount)
        const tier = i % block.tierCount
        const pos = bayRowTierToPosition(bay, row, tier, block.id, layout)
        dummy.position.set(pos.x, pos.y, pos.z + 1.25)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true

    if (highlightRef.current && selectedDeviceId && selectedDeviceId.startsWith('container-')) {
      const parts = selectedDeviceId.split('-')
      if (parts.length >= 6 && parts[1] === block.id.split('-')[1]) {
        const bay = parseInt(parts[3])
        const row = parseInt(parts[4])
        const tier = parseInt(parts[5])
        const c = blockContainers.find(cc => cc && cc.bay === bay && cc.row === row && cc.tier === tier)
        if (c) {
          const pos = bayRowTierToPosition(c.bay, c.row, c.tier, block.id, layout)
          highlightRef.current.position.set(pos.x, pos.y, pos.z + 1.25)
          highlightRef.current.visible = true
        } else {
          highlightRef.current.visible = false
        }
      } else {
        highlightRef.current.visible = false
      }
    } else if (highlightRef.current) {
      highlightRef.current.visible = false
    }
  })

  const handleClick = (event: { instanceId?: number; stopPropagation: () => void }) => {
    event.stopPropagation()
    const instanceId = event.instanceId
    if (instanceId !== undefined) {
      const c = blockContainers[instanceId]
      if (c) {
        selectDevice(`container-${block.id}-${c.bay}-${c.row}-${c.tier}`)
      }
    }
  }

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, blockContainers.length]}
        onClick={handleClick}
      >
        <boxGeometry args={[6, 2.4, 2.5]} />
        <meshStandardMaterial
          metalness={0.4}
          roughness={0.6}
          vertexColors
        />
        <instancedBufferAttribute
          attach="instanceColor"
          args={[colors, 3]}
        />
      </instancedMesh>
      <lineSegments ref={highlightRef} visible={false}>
        <edgesGeometry args={[new THREE.BoxGeometry(6.1, 2.5, 2.6)]} />
        <lineBasicMaterial color="#00E5FF" linewidth={2} />
      </lineSegments>
    </group>
  )
}

export default function ContainerInstancedMesh() {
  const yardLayout = useTwinStore((state) => state.yardLayout)

  if (!yardLayout) return null

  return (
    <group>
      {yardLayout.blocks.map((block) => (
        <BlockInstancedMesh key={block.id} block={block} layout={yardLayout} />
      ))}
    </group>
  )
}
