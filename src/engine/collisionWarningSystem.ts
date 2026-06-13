import * as THREE from 'three'
import {
  BVHTree,
  Collidable,
  CollisionResult,
  createAABB,
  AABB,
} from './bvhCollisionEngine'
import type { RMGDeviceState, ContainerState, YardLayout } from '../../shared/types'
import { bayRowTierToPosition } from '@/utils/yardUtils'

export const SAFETY_DISTANCE_CRITICAL = 0.2
export const SAFETY_DISTANCE_WARNING = 0.5
export const SAFETY_DISTANCE_CAUTION = 1.0

export const CONTAINER_HALF_X = 3.0
export const CONTAINER_HALF_Y = 1.2
export const CONTAINER_HALF_Z = 1.25

export const SPREADER_HALF_X = 3.5
export const SPREADER_HALF_Y = 2.0
export const SPREADER_HALF_Z = 0.3

export const RMG_BODY_HALF_X = 25.0
export const RMG_BODY_HALF_Y = 6.0
export const RMG_BODY_HALF_Z = 18.0

export type CollisionLevel = 'critical' | 'warning' | 'caution'

export interface ActiveCollision {
  id: string
  level: CollisionLevel
  distance: number
  result: CollisionResult
  detectedAt: number
  lastSeenAt: number
  interceptionSent: boolean
  visualEffectId: string
}

export interface CollisionStats {
  totalChecks: number
  activeCollisions: number
  criticalCount: number
  warningCount: number
  cautionCount: number
  interceptionsSent: number
  avgCheckTimeMs: number
  lastFrameCheckTime: number
}

export interface CollisionEngineCallbacks {
  onCriticalCollision?: (collision: ActiveCollision) => void
  onWarningCollision?: (collision: ActiveCollision) => void
  onCautionCollision?: (collision: ActiveCollision) => void
  onInterception?: (collision: ActiveCollision) => void
  onCollisionCleared?: (collisionId: string) => void
  onStatsUpdate?: (stats: CollisionStats) => void
  sendPlcIntercept?: (rmgId: string, reason: string) => void
}

type RMGSpreaderAction = 'idle' | 'grabbing' | 'dropping' | 'moving'

class CollisionWarningEngine {
  private bvh: BVHTree = new BVHTree()
  private activeCollisions: Map<string, ActiveCollision> = new Map()
  private collidables: Collidable[] = []
  private stats: CollisionStats = {
    totalChecks: 0,
    activeCollisions: 0,
    criticalCount: 0,
    warningCount: 0,
    cautionCount: 0,
    interceptionsSent: 0,
    avgCheckTimeMs: 0,
    lastFrameCheckTime: 0,
  }
  private callbacks: CollisionEngineCallbacks = {}
  private lastStatsTime: number = 0
  private checkTimes: number[] = []
  private rmgActions: Map<string, RMGSpreaderAction> = new Map()

  setCallbacks(callbacks: CollisionEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  setRMGSprederAction(rmgId: string, action: RMGSpreaderAction): void {
    this.rmgActions.set(rmgId, action)
  }

  rebuildFromScene(
    rmgDevices: RMGDeviceState[],
    containers: ContainerState[],
    yardLayout: YardLayout
  ): number {
    this.collidables = []

    for (const device of rmgDevices) {
      const spreaderAABB = createAABB(
        device.spreader.position.x,
        device.spreader.position.y,
        device.spreader.position.z,
        SPREADER_HALF_X,
        SPREADER_HALF_Y,
        SPREADER_HALF_Z
      )
      this.collidables.push({
        id: `spreader-${device.id}`,
        type: 'spreader',
        parentId: device.id,
        aabb: spreaderAABB,
        userData: { rmgId: device.id },
      })

      const bodyAABB = createAABB(
        device.position.x,
        device.position.y,
        device.position.z + RMG_BODY_HALF_Z,
        RMG_BODY_HALF_X,
        RMG_BODY_HALF_Y,
        RMG_BODY_HALF_Z
      )
      this.collidables.push({
        id: `body-${device.id}`,
        type: 'rmg_body',
        parentId: device.id,
        aabb: bodyAABB,
        userData: { rmgId: device.id },
      })
    }

    for (let i = 0; i < containers.length; i++) {
      const c = containers[i]
      if (!c.occupied) continue
      const pos = bayRowTierToPosition(c.bay, c.row, c.tier, c.containerId?.split('-')[0] || 'A', yardLayout)
      const containerAABB = createAABB(
        pos.x,
        pos.y,
        pos.z + CONTAINER_HALF_Z,
        CONTAINER_HALF_X,
        CONTAINER_HALF_Y,
        CONTAINER_HALF_Z
      )
      this.collidables.push({
        id: `container-${c.bay}-${c.row}-${c.tier}`,
        type: 'container',
        aabb: containerAABB,
        userData: { bay: c.bay, row: c.row, tier: c.tier, containerId: c.containerId },
      })
    }

    this.bvh.build(this.collidables)
    return this.collidables.length
  }

  detectCollisions(rmgDevices: RMGDeviceState[]): ActiveCollision[] {
    const startTime = performance.now()
    const currentFrameCollisions = new Set<string>()

    const activeSpreaderIds: string[] = []
    for (const device of rmgDevices) {
      const spreaderId = `spreader-${device.id}`
      const action = this.rmgActions.get(device.id) || 'moving'
      activeSpreaderIds.push(spreaderId)

      const spreaderCollidable = this.collidables.find((c) => c.id === spreaderId)
      if (!spreaderCollidable) continue

      const detectionDistance = action === 'grabbing' || action === 'dropping'
        ? SAFETY_DISTANCE_CAUTION
        : SAFETY_DISTANCE_CAUTION

      const results: CollisionResult[] = []
      this.bvh.findCollisions(spreaderCollidable, detectionDistance, results)

      const bodyId = `body-${device.id}`
      const filteredResults = results.filter((r) => r.b.id !== bodyId)

      for (const result of filteredResults) {
        const collisionId = this.getCollisionId(result)
        currentFrameCollisions.add(collisionId)

        let level: CollisionLevel
        if (result.distance < SAFETY_DISTANCE_CRITICAL || result.penetrationDepth < 0) {
          level = 'critical'
        } else if (result.distance < SAFETY_DISTANCE_WARNING) {
          level = 'warning'
        } else {
          level = 'caution'
        }

        let existing = this.activeCollisions.get(collisionId)

        if (!existing) {
          existing = {
            id: collisionId,
            level,
            distance: result.distance,
            result,
            detectedAt: startTime,
            lastSeenAt: startTime,
            interceptionSent: false,
            visualEffectId: `lightning-${collisionId}`,
          }
          this.activeCollisions.set(collisionId, existing)
          this.notifyCollisionDetected(existing)
        } else {
          existing.level = level
          existing.distance = result.distance
          existing.lastSeenAt = startTime
        }

        if (level === 'critical' && !existing.interceptionSent) {
          this.triggerInterception(existing, device.id)
        }
      }
    }

    for (let i = 0; i < rmgDevices.length; i++) {
      for (let j = i + 1; j < rmgDevices.length; j++) {
        const bodyA = this.collidables.find((c) => c.id === `body-${rmgDevices[i].id}`)
        const bodyB = this.collidables.find((c) => c.id === `body-${rmgDevices[j].id}`)
        if (!bodyA || !bodyB) continue

        const distResult: CollisionResult = {
          a: bodyA,
          b: bodyB,
          distance: new THREE.Vector3().subVectors(
            bodyA.aabb.center,
            bodyB.aabb.center
          ).length(),
          closestPointA: bodyA.aabb.center.clone(),
          closestPointB: bodyB.aabb.center.clone(),
          penetrationDepth: 0,
        }

        const collisionId = `rmg-${rmgDevices[i].id}-${rmgDevices[j].id}`
        currentFrameCollisions.add(collisionId)

        const safetyDist = 5.0
        if (distResult.distance < safetyDist) {
          let level: CollisionLevel
          if (distResult.distance < 1.0) {
            level = 'critical'
          } else if (distResult.distance < 3.0) {
            level = 'warning'
          } else {
            level = 'caution'
          }

          let existing = this.activeCollisions.get(collisionId)
          if (!existing) {
            existing = {
              id: collisionId,
              level,
              distance: distResult.distance,
              result: distResult,
              detectedAt: startTime,
              lastSeenAt: startTime,
              interceptionSent: false,
              visualEffectId: `lightning-${collisionId}`,
            }
            this.activeCollisions.set(collisionId, existing)
            this.notifyCollisionDetected(existing)
          } else {
            existing.level = level
            existing.distance = distResult.distance
            existing.lastSeenAt = startTime
          }

          if (level === 'critical' && !existing.interceptionSent) {
            this.triggerRMGInterception(existing, rmgDevices[i].id, rmgDevices[j].id)
          }
        }
      }
    }

    for (const [collisionId, collision] of this.activeCollisions) {
      if (!currentFrameCollisions.has(collisionId)) {
        if (startTime - collision.lastSeenAt > 500) {
          this.activeCollisions.delete(collisionId)
          this.callbacks.onCollisionCleared?.(collisionId)
        }
      }
    }

    const checkTime = performance.now() - startTime
    this.checkTimes.push(checkTime)
    if (this.checkTimes.length > 60) this.checkTimes.shift()

    this.stats.totalChecks++
    this.stats.lastFrameCheckTime = checkTime
    this.stats.avgCheckTimeMs =
      this.checkTimes.reduce((a, b) => a + b, 0) / this.checkTimes.length
    this.stats.activeCollisions = this.activeCollisions.size
    this.stats.criticalCount = 0
    this.stats.warningCount = 0
    this.stats.cautionCount = 0

    for (const collision of this.activeCollisions.values()) {
      if (collision.level === 'critical') this.stats.criticalCount++
      else if (collision.level === 'warning') this.stats.warningCount++
      else this.stats.cautionCount++
    }

    if (startTime - this.lastStatsTime > 1000) {
      this.lastStatsTime = startTime
      this.callbacks.onStatsUpdate?.({ ...this.stats })
    }

    return Array.from(this.activeCollisions.values())
  }

  private getCollisionId(result: CollisionResult): string {
    const ids = [result.a.id, result.b.id].sort()
    return `${ids[0]}__${ids[1]}`
  }

  private notifyCollisionDetected(collision: ActiveCollision): void {
    if (collision.level === 'critical') {
      this.callbacks.onCriticalCollision?.(collision)
    } else if (collision.level === 'warning') {
      this.callbacks.onWarningCollision?.(collision)
    } else {
      this.callbacks.onCautionCollision?.(collision)
    }
  }

  private triggerInterception(collision: ActiveCollision, rmgId: string): void {
    collision.interceptionSent = true
    this.stats.interceptionsSent++

    const targetType = collision.result.b.type
    const reason = targetType === 'container'
      ? `碰撞风险: 吊具与集装箱距离 ${(collision.distance * 1000).toFixed(0)}mm < 200mm 红线`
      : targetType === 'spreader'
        ? `碰撞风险: 吊具交叉冲突 距离 ${(collision.distance * 1000).toFixed(0)}mm`
        : `空间侵入: 距 ${targetType} ${(collision.distance * 1000).toFixed(0)}mm`

    this.callbacks.sendPlcIntercept?.(rmgId, reason)
    this.callbacks.onInterception?.(collision)
  }

  private triggerRMGInterception(
    collision: ActiveCollision,
    rmgIdA: string,
    rmgIdB: string
  ): void {
    collision.interceptionSent = true
    this.stats.interceptionsSent++

    const reason = `场桥交叉冲突: RMG-${rmgIdA} 与 RMG-${rmgIdB} 距离 ${(collision.distance).toFixed(2)}m < 安全距离 5m`

    this.callbacks.sendPlcIntercept?.(rmgIdA, reason)
    this.callbacks.sendPlcIntercept?.(rmgIdB, reason)
    this.callbacks.onInterception?.(collision)
  }

  getActiveCollisions(): ActiveCollision[] {
    return Array.from(this.activeCollisions.values())
  }

  getStats(): CollisionStats {
    return { ...this.stats }
  }

  clearAll(): void {
    this.activeCollisions.clear()
    this.collidables = []
    this.bvh.build([])
  }

  getCollidableAABB(id: string): AABB | null {
    const c = this.collidables.find((col) => col.id === id)
    return c ? c.aabb : null
  }
}

export const collisionWarningEngine = new CollisionWarningEngine()
export default collisionWarningEngine
