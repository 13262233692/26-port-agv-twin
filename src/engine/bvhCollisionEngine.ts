import * as THREE from 'three'

export interface AABB {
  min: THREE.Vector3
  max: THREE.Vector3
  center: THREE.Vector3
  halfExtents: THREE.Vector3
}

export interface Collidable {
  id: string
  type: 'container' | 'spreader' | 'rmg_body'
  parentId?: string
  aabb: AABB
  userData?: Record<string, unknown>
}

export interface BVHNode {
  aabb: AABB
  left: BVHNode | null
  right: BVHNode | null
  collidable: Collidable | null
  isLeaf: boolean
}

export interface CollisionResult {
  a: Collidable
  b: Collidable
  distance: number
  closestPointA: THREE.Vector3
  closestPointB: THREE.Vector3
  penetrationDepth: number
}

const _tmpVecA = new THREE.Vector3()
const _tmpVecB = new THREE.Vector3()
const _tmpMin = new THREE.Vector3()
const _tmpMax = new THREE.Vector3()

export function createAABB(
  centerX: number,
  centerY: number,
  centerZ: number,
  halfX: number,
  halfY: number,
  halfZ: number
): AABB {
  const center = new THREE.Vector3(centerX, centerY, centerZ)
  const halfExtents = new THREE.Vector3(halfX, halfY, halfZ)
  return {
    min: new THREE.Vector3(centerX - halfX, centerY - halfY, centerZ - halfZ),
    max: new THREE.Vector3(centerX + halfX, centerY + halfY, centerZ + halfZ),
    center,
    halfExtents,
  }
}

export function createAABBFromMinMax(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number
): AABB {
  const min = new THREE.Vector3(minX, minY, minZ)
  const max = new THREE.Vector3(maxX, maxY, maxZ)
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)
  const halfExtents = new THREE.Vector3().subVectors(max, min).multiplyScalar(0.5)
  return { min, max, center, halfExtents }
}

export function expandAABB(aabb: AABB, margin: number): AABB {
  return createAABB(
    aabb.center.x,
    aabb.center.y,
    aabb.center.z,
    aabb.halfExtents.x + margin,
    aabb.halfExtents.y + margin,
    aabb.halfExtents.z + margin
  )
}

export function aabbIntersect(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  )
}

export function aabbSquaredDistance(a: AABB, b: AABB): number {
  let sqDist = 0

  for (const axis of ['x', 'y', 'z'] as const) {
    if (a.max[axis] < b.min[axis]) {
      const d = b.min[axis] - a.max[axis]
      sqDist += d * d
    } else if (b.max[axis] < a.min[axis]) {
      const d = a.min[axis] - b.max[axis]
      sqDist += d * d
    }
  }

  return sqDist
}

export function aabbDistance(a: AABB, b: AABB): number {
  return Math.sqrt(aabbSquaredDistance(a, b))
}

export function closestPointsBetweenAABBs(a: AABB, b: AABB): [THREE.Vector3, THREE.Vector3] {
  const pointA = new THREE.Vector3()
  const pointB = new THREE.Vector3()

  for (const axis of ['x', 'y', 'z'] as const) {
    if (a.max[axis] < b.min[axis]) {
      pointA[axis] = a.max[axis]
      pointB[axis] = b.min[axis]
    } else if (b.max[axis] < a.min[axis]) {
      pointA[axis] = a.min[axis]
      pointB[axis] = b.max[axis]
    } else {
      const mid = (a.center[axis] + b.center[axis]) / 2
      pointA[axis] = mid
      pointB[axis] = mid
    }
  }

  return [pointA, pointB]
}

function computeBoundingAABB(collidables: Collidable[]): AABB {
  _tmpMin.set(Infinity, Infinity, Infinity)
  _tmpMax.set(-Infinity, -Infinity, -Infinity)

  for (const c of collidables) {
    _tmpMin.min(c.aabb.min)
    _tmpMax.max(c.aabb.max)
  }

  return createAABBFromMinMax(
    _tmpMin.x, _tmpMin.y, _tmpMin.z,
    _tmpMax.x, _tmpMax.y, _tmpMax.z
  )
}

function sahCost(collidables: Collidable[], splitAxis: 'x' | 'y' | 'z', splitPos: number): number {
  const left: Collidable[] = []
  const right: Collidable[] = []

  for (const c of collidables) {
    if (c.aabb.center[splitAxis] < splitPos) {
      left.push(c)
    } else {
      right.push(c)
    }
  }

  if (left.length === 0 || right.length === 0) return Infinity

  const leftAABB = computeBoundingAABB(left)
  const rightAABB = computeBoundingAABB(right)

  const leftArea = 2 * (
    leftAABB.halfExtents.x * leftAABB.halfExtents.y +
    leftAABB.halfExtents.y * leftAABB.halfExtents.z +
    leftAABB.halfExtents.z * leftAABB.halfExtents.x
  )
  const rightArea = 2 * (
    rightAABB.halfExtents.x * rightAABB.halfExtents.y +
    rightAABB.halfExtents.y * rightAABB.halfExtents.z +
    rightAABB.halfExtents.z * rightAABB.halfExtents.x
  )

  return left.length * leftArea + right.length * rightArea
}

function buildBVHRecursive(collidables: Collidable[], depth: number): BVHNode {
  const aabb = computeBoundingAABB(collidables)

  if (collidables.length <= 4 || depth > 20) {
    return {
      aabb,
      left: null,
      right: null,
      collidable: collidables.length === 1 ? collidables[0] : null,
      isLeaf: collidables.length === 1,
    }
  }

  let bestAxis: 'x' | 'y' | 'z' = 'x'
  let bestPos = 0
  let bestCost = Infinity

  for (const axis of ['x', 'y', 'z'] as const) {
    const centers = collidables.map((c) => c.aabb.center[axis]).sort((a, b) => a - b)

    for (let i = 1; i < centers.length; i++) {
      const split = (centers[i - 1] + centers[i]) / 2
      const cost = sahCost(collidables, axis, split)
      if (cost < bestCost) {
        bestCost = cost
        bestAxis = axis
        bestPos = split
      }
    }
  }

  const left: Collidable[] = []
  const right: Collidable[] = []

  for (const c of collidables) {
    if (c.aabb.center[bestAxis] < bestPos) {
      left.push(c)
    } else {
      right.push(c)
    }
  }

  if (left.length === 0 || right.length === 0) {
    return {
      aabb,
      left: null,
      right: null,
      collidable: collidables[0],
      isLeaf: true,
    }
  }

  return {
    aabb,
    left: buildBVHRecursive(left, depth + 1),
    right: buildBVHRecursive(right, depth + 1),
    collidable: null,
    isLeaf: false,
  }
}

export class BVHTree {
  private root: BVHNode | null = null
  private collidables: Collidable[] = []

  build(collidables: Collidable[]): void {
    this.collidables = collidables
    if (collidables.length === 0) {
      this.root = null
      return
    }
    this.root = buildBVHRecursive(collidables, 0)
  }

  getCollidables(): Collidable[] {
    return this.collidables
  }

  query(queryAABB: AABB, results: Collidable[] = []): Collidable[] {
    if (!this.root) return results
    this.queryRecursive(this.root, queryAABB, results)
    return results
  }

  private queryRecursive(node: BVHNode, queryAABB: AABB, results: Collidable[]): void {
    if (!aabbIntersect(node.aabb, queryAABB)) return

    if (node.isLeaf && node.collidable) {
      results.push(node.collidable)
      return
    }

    if (node.left) this.queryRecursive(node.left, queryAABB, results)
    if (node.right) this.queryRecursive(node.right, queryAABB, results)
  }

  findCollisions(
    target: Collidable,
    safetyDistance: number = 0,
    results: CollisionResult[] = []
  ): CollisionResult[] {
    if (!this.root) return results
    this.findCollisionsRecursive(this.root, target, safetyDistance, results)
    return results
  }

  private findCollisionsRecursive(
    node: BVHNode,
    target: Collidable,
    safetyDistance: number,
    results: CollisionResult[]
  ): void {
    const expandedTarget = safetyDistance > 0 ? expandAABB(target.aabb, safetyDistance) : target.aabb
    if (!aabbIntersect(node.aabb, expandedTarget)) return

    if (node.isLeaf && node.collidable) {
      if (node.collidable.id === target.id) return
      if (node.collidable.parentId && node.collidable.parentId === target.parentId) return

      const dist = aabbDistance(target.aabb, node.collidable.aabb)
      const [closestA, closestB] = closestPointsBetweenAABBs(target.aabb, node.collidable.aabb)

      const intersecting = aabbIntersect(target.aabb, node.collidable.aabb)
      const penetration = intersecting ? -dist : 0

      results.push({
        a: target,
        b: node.collidable,
        distance: dist,
        closestPointA: closestA,
        closestPointB: closestB,
        penetrationDepth: penetration,
      })
      return
    }

    if (node.left) this.findCollisionsRecursive(node.left, target, safetyDistance, results)
    if (node.right) this.findCollisionsRecursive(node.right, target, safetyDistance, results)
  }

  traverse(callback: (node: BVHNode, depth: number) => void): void {
    if (!this.root) return
    this.traverseRecursive(this.root, callback, 0)
  }

  private traverseRecursive(
    node: BVHNode,
    callback: (node: BVHNode, depth: number) => void,
    depth: number
  ): void {
    callback(node, depth)
    if (node.left) this.traverseRecursive(node.left, callback, depth + 1)
    if (node.right) this.traverseRecursive(node.right, callback, depth + 1)
  }
}

export function getLeafNodeCount(root: BVHNode): number {
  if (root.isLeaf) return 1
  let count = 0
  if (root.left) count += getLeafNodeCount(root.left)
  if (root.right) count += getLeafNodeCount(root.right)
  return count
}

export function getTreeHeight(root: BVHNode): number {
  if (root.isLeaf) return 1
  const leftH = root.left ? getTreeHeight(root.left) : 0
  const rightH = root.right ? getTreeHeight(root.right) : 0
  return Math.max(leftH, rightH) + 1
}
