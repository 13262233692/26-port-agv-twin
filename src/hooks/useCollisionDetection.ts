import { useEffect, useRef, useCallback } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import {
  collisionWarningEngine,
  type ActiveCollision,
} from '@/engine/collisionWarningSystem'
import { useWebSocket } from './useWebSocket'

export function useCollisionDetection() {
  const { sendCollisionIntercept } = useWebSocket()
  const setActiveCollisions = useTwinStore((s) => s.setActiveCollisions)
  const setCollisionStats = useTwinStore((s) => s.setCollisionStats)
  const addAlarm = useTwinStore((s) => s.addAlarm)
  const addIntercept = useTwinStore((s) => s.addIntercept)
  const rmgDevices = useTwinStore((s) => s.rmgDevices)
  const containers = useTwinStore((s) => s.containers)
  const yardLayout = useTwinStore((s) => s.yardLayout)
  const frameCountRef = useRef(0)
  const lastStatsUpdateRef = useRef(0)
  const sentInterceptsRef = useRef<Set<string>>(new Set())

  const handleCriticalCollision = useCallback((collision: ActiveCollision) => {
    if (sentInterceptsRef.current.has(collision.id)) return
    sentInterceptsRef.current.add(collision.id)

    const rmgId = collision.result.a.parentId || collision.result.b.parentId || 'unknown'

    addAlarm({
      id: `alarm-${collision.id}`,
      deviceId: rmgId,
      level: 'critical',
      message: `碰撞风险! ${collision.result.a.type} 与 ${collision.result.b.type} 距离 ${(collision.distance * 1000).toFixed(0)}mm`,
      timestamp: Date.now(),
    })

    sendCollisionIntercept(
      rmgId,
      collision.id,
      Math.round(collision.distance * 1000),
      `空间碰撞风险: 距离 ${(collision.distance * 1000).toFixed(0)}mm < 200mm 安全红线`,
      'critical'
    )

    addIntercept(rmgId)
  }, [sendCollisionIntercept, addAlarm, addIntercept])

  const handleWarningCollision = useCallback((collision: ActiveCollision) => {
    addAlarm({
      id: `warn-${collision.id}`,
      deviceId: collision.result.a.parentId || '',
      level: 'warning',
      message: `接近预警: 距离 ${(collision.distance * 1000).toFixed(0)}mm`,
      timestamp: Date.now(),
    })
  }, [addAlarm])

  const handleCollisionCleared = useCallback((collisionId: string) => {
    sentInterceptsRef.current.delete(collisionId)
  }, [])

  const rebuildBVH = useCallback(() => {
    if (!yardLayout) return 0
    return collisionWarningEngine.rebuildFromScene(rmgDevices, containers, yardLayout)
  }, [rmgDevices, containers, yardLayout])

  const detectFrame = useCallback((): ActiveCollision[] => {
    frameCountRef.current++
    if (frameCountRef.current % 3 === 0) {
      rebuildBVH()
    }

    const collisions = collisionWarningEngine.detectCollisions(rmgDevices)

    for (const collision of collisions) {
      if (collision.level === 'critical') {
        handleCriticalCollision(collision)
      } else if (collision.level === 'warning') {
        if (Math.random() < 0.1) {
          handleWarningCollision(collision)
        }
      }
    }

    const now = performance.now()
    if (now - lastStatsUpdateRef.current > 500) {
      lastStatsUpdateRef.current = now
      setActiveCollisions(collisions)
      setCollisionStats(collisionWarningEngine.getStats())
    }

    return collisions
  }, [rmgDevices, rebuildBVH, handleCriticalCollision, handleWarningCollision, setActiveCollisions, setCollisionStats])

  useEffect(() => {
    collisionWarningEngine.setCallbacks({
      onCollisionCleared: handleCollisionCleared,
    })

    return () => {
      collisionWarningEngine.clearAll()
      sentInterceptsRef.current.clear()
    }
  }, [handleCollisionCleared])

  return { detectFrame, activeCollisions: collisionWarningEngine.getActiveCollisions() }
}
