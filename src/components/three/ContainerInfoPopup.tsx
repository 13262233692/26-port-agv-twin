import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useTwinStore } from '@/stores/twinStore'
import { bayRowTierToPosition } from '@/utils/yardUtils'

export default function ContainerInfoPopup() {
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId)
  const containers = useTwinStore((state) => state.containers)
  const yardLayout = useTwinStore((state) => state.yardLayout)

  const containerInfo = useMemo(() => {
    if (!selectedDeviceId || !selectedDeviceId.startsWith('container-') || !yardLayout) return null

    const parts = selectedDeviceId.split('-')
    if (parts.length < 6) return null

    const blockId = `${parts[1]}-${parts[2]}`
    const bay = parseInt(parts[3])
    const row = parseInt(parts[4])
    const tier = parseInt(parts[5])

    const container = containers.find(
      (c) => c.bay === bay && c.row === row && c.tier === tier && yardLayout.blocks.some((b) => b.id === blockId)
    )

    const block = yardLayout.blocks.find((b) => b.id === blockId)
    if (!block) return null

    const pos = bayRowTierToPosition(bay, row, tier, blockId, yardLayout)

    return {
      container,
      position: { x: pos.x, y: pos.y, z: pos.z + 5.5 },
      bay,
      row,
      tier,
      blockId,
    }
  }, [selectedDeviceId, containers, yardLayout])

  if (!containerInfo) return null

  const { container, position, bay, row, tier, blockId } = containerInfo

  return (
    <Html position={[position.x, position.y, position.z]} center>
      <div
        style={{
          background: 'rgba(10, 22, 40, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #00E5FF',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '180px',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ color: '#00E5FF', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
          {blockId.toUpperCase()}
        </div>
        <div style={{ color: '#FFFFFF', fontSize: '11px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#80D8FF' }}>Bay/Row/Tier:</span>
            <span>{bay}/{row}/{tier}</span>
          </div>
          {container?.containerId && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#80D8FF' }}>Container:</span>
              <span>{container.containerId}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#80D8FF' }}>Status:</span>
            <span style={{ color: container?.occupied ? '#00E5FF' : '#FF9100' }}>
              {container?.occupied ? 'OCCUPIED' : 'EMPTY'}
            </span>
          </div>
          {container?.size && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#80D8FF' }}>Size:</span>
              <span>{container.size}</span>
            </div>
          )}
        </div>
      </div>
    </Html>
  )
}
