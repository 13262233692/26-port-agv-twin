import type { Position3D, YardLayout, YardBlock } from '../../shared/types'

function getBlockOffset(blockIndex: number, layout: YardLayout): Position3D {
  let offsetY = 0
  for (let i = 0; i < blockIndex; i++) {
    offsetY += layout.blocks[i].rowCount * layout.blocks[i].rowSpacing + 6
  }
  return { x: 0, y: offsetY, z: 0 }
}

export function bayRowTierToPosition(
  bay: number,
  row: number,
  tier: number,
  block: string,
  layout: YardLayout
): Position3D {
  const blockIndex = layout.blocks.findIndex((b) => b.id === block)
  if (blockIndex < 0) {
    return { x: 0, y: 0, z: 0 }
  }
  const blk = layout.blocks[blockIndex]
  const offset = getBlockOffset(blockIndex, layout)
  return {
    x: layout.origin.x + offset.x + blk.baySpacing * bay,
    y: layout.origin.y + offset.y + blk.rowSpacing * row,
    z: layout.origin.z + offset.z + blk.tierHeight * tier,
  }
}

export function positionToBayRowTier(
  position: Position3D,
  layout: YardLayout
): { bay: number; row: number; tier: number; block: string } | null {
  for (let i = 0; i < layout.blocks.length; i++) {
    const blk = layout.blocks[i]
    const offset = getBlockOffset(i, layout)
    const bay = Math.round((position.x - layout.origin.x - offset.x) / blk.baySpacing)
    const row = Math.round((position.y - layout.origin.y - offset.y) / blk.rowSpacing)
    const tier = Math.round((position.z - layout.origin.z - offset.z) / blk.tierHeight)
    if (
      bay >= 0 && bay < blk.bayCount &&
      row >= 0 && row < blk.rowCount &&
      tier >= 0 && tier < blk.tierCount
    ) {
      return { bay, row, tier, block: blk.id }
    }
  }
  return null
}

export function getContainerColor(tier: number, maxTier: number, occupied: boolean): string {
  if (!occupied) {
    return '#3A4A5A'
  }
  if (tier > maxTier) {
    return '#FF9100'
  }
  const t = maxTier > 1 ? (tier - 1) / (maxTier - 1) : 0
  const r1 = 0, g1 = 229, b1 = 255
  const r2 = 0, g2 = 136, b2 = 170
  const r = Math.round(r2 + (r1 - r2) * t)
  const g = Math.round(g2 + (g1 - g2) * t)
  const b = Math.round(b2 + (b1 - b2) * t)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export function getBlockBounds(
  block: YardBlock,
  layout: YardLayout
): { min: Position3D; max: Position3D } {
  const blockIndex = layout.blocks.findIndex((b) => b.id === block.id)
  const offset = getBlockOffset(blockIndex >= 0 ? blockIndex : 0, layout)
  return {
    min: {
      x: layout.origin.x + offset.x,
      y: layout.origin.y + offset.y,
      z: layout.origin.z + offset.z,
    },
    max: {
      x: layout.origin.x + offset.x + block.baySpacing * block.bayCount,
      y: layout.origin.y + offset.y + block.rowSpacing * block.rowCount,
      z: layout.origin.z + offset.z + block.tierHeight * block.tierCount,
    },
  }
}
