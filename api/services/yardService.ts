import { ContainerState, YardLayout, YardStats, YardBlockStats, AlarmEvent } from '../../shared/types.js'

let cachedContainers: ContainerState[] | null = null

export function generateContainerStates(layout: YardLayout): ContainerState[] {
  if (cachedContainers) {
    return cachedContainers
  }

  const containers: ContainerState[] = []
  const sizes: ContainerState['size'][] = ['20ft', '40ft', '45ft']

  for (const block of layout.blocks) {
    for (let bay = 0; bay < block.bayCount; bay++) {
      for (let row = 0; row < block.rowCount; row++) {
        for (let tier = 0; tier < block.tierCount; tier++) {
          const occupied = Math.random() < 0.7
          containers.push({
            bay: bay,
            row: row,
            tier: tier,
            occupied: occupied,
            containerId: occupied
              ? block.id.toUpperCase().replace('BLOCK-', 'B') + '-' + bay + '-' + row + '-' + tier
              : undefined,
            size: occupied ? sizes[Math.floor(Math.random() * sizes.length)] : undefined
          })
        }
      }
    }
  }

  cachedContainers = containers
  return containers
}

export function getYardStats(containers: ContainerState[], layout: YardLayout): YardStats {
  let totalSlots = 0
  let occupiedSlots = 0
  const blockStats: YardBlockStats[] = []

  let offset = 0
  for (const block of layout.blocks) {
    const blockSize = block.bayCount * block.rowCount * block.tierCount
    const blockContainers = containers.slice(offset, offset + blockSize)
    let blockOccupied = 0

    for (const c of blockContainers) {
      if (c.occupied) {
        blockOccupied++
      }
    }

    totalSlots += blockSize
    occupiedSlots += blockOccupied

    blockStats.push({
      id: block.id,
      utilizationRate: blockOccupied / blockSize,
      bayCount: block.bayCount,
      maxTier: block.tierCount
    })

    offset += blockSize
  }

  return {
    totalSlots: totalSlots,
    occupiedSlots: occupiedSlots,
    utilizationRate: occupiedSlots / totalSlots,
    blocks: blockStats
  }
}

export function getAlarms(): AlarmEvent[] {
  return [
    {
      id: 'alarm-001',
      deviceId: 'rmg-1',
      level: 'warning',
      message: 'RMG-1 motor current exceeds threshold',
      timestamp: Date.now() - 120000
    },
    {
      id: 'alarm-002',
      deviceId: 'rmg-2',
      level: 'critical',
      message: 'RMG-2 spreader communication timeout',
      timestamp: Date.now() - 60000
    },
    {
      id: 'alarm-003',
      deviceId: 'rmg-3',
      level: 'info',
      message: 'RMG-3 position calibration completed',
      timestamp: Date.now() - 30000
    },
    {
      id: 'alarm-004',
      deviceId: 'substation-1',
      level: 'warning',
      message: 'Substation voltage fluctuation detected',
      timestamp: Date.now() - 15000
    }
  ]
}
