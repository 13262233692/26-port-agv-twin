import { useEffect, useRef, useCallback } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import type {
  PLCDataFrame,
  CollisionInterceptCommand,
  CollisionInterceptAck,
  InterceptClearedMessage,
  YardLayout,
  YardStats,
  AlarmEvent,
} from '../../shared/types'

type WSSendQueueItem = CollisionInterceptCommand

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)
  const fpsTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const sendQueueRef = useRef<WSSendQueueItem[]>([])
  const updateFrame = useTwinStore((s) => s.updateFrame)
  const setConnected = useTwinStore((s) => s.setConnected)
  const setFps = useTwinStore((s) => s.setFps)
  const setYardLayout = useTwinStore((s) => s.setYardLayout)
  const setYardStats = useTwinStore((s) => s.setYardStats)
  const addAlarm = useTwinStore((s) => s.addAlarm)
  const addIntercept = useTwinStore((s) => s.addIntercept)
  const removeIntercept = useTwinStore((s) => s.removeIntercept)

  const flushSendQueue = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    while (sendQueueRef.current.length > 0) {
      const msg = sendQueueRef.current.shift()
      if (msg) {
        try {
          wsRef.current.send(JSON.stringify(msg))
        } catch (_e) {}
      }
    }
  }, [])

  const sendCollisionIntercept = useCallback((
    rmgId: string,
    collisionId: string,
    distanceMm: number,
    reason: string,
    level: 'critical' | 'warning'
  ) => {
    const msg: CollisionInterceptCommand = {
      type: 'collision_intercept',
      timestamp: Date.now(),
      rmgId,
      reason,
      collisionId,
      distanceMm,
      level,
    }
    sendQueueRef.current.push(msg)
    flushSendQueue()
  }, [flushSendQueue])

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname || 'localhost'
    const url = protocol + '//' + host + ':3001'

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) {
        setConnected(true)
        flushSendQueue()
      }
    }

    ws.onclose = () => {
      if (mountedRef.current) {
        setConnected(false)
        reconnectTimerRef.current = window.setTimeout(() => {
          if (mountedRef.current) {
            connect()
          }
        }, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.timestamp !== undefined && data.rmgDevices && data.containers) {
          updateFrame(data as PLCDataFrame)
          frameCountRef.current += 1
        } else if (data.type === 'yard_layout') {
          setYardLayout(data.payload as YardLayout)
        } else if (data.type === 'yard_stats') {
          setYardStats(data.payload as YardStats)
        } else if (data.type === 'alarm_event') {
          addAlarm(data.payload as AlarmEvent)
        } else if (data.type === 'collision_ack') {
          const ack = data as CollisionInterceptAck
          if (ack.success) {
            addIntercept(ack.rmgId)
          }
        } else if (data.type === 'intercept_cleared') {
          const cleared = data as InterceptClearedMessage
          removeIntercept(cleared.rmgId)
        }
      } catch (_err) {}
    }
  }, [updateFrame, setConnected, setYardLayout, setYardStats, addAlarm, addIntercept, removeIntercept, flushSendQueue])

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()

    fpsTimerRef.current = window.setInterval(() => {
      if (mountedRef.current) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
      }
    }, 1000)

    return () => {
      mountedRef.current = false
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (fpsTimerRef.current !== null) {
        clearInterval(fpsTimerRef.current)
      }
    }
  }, [connect, setFps])

  const connected = useTwinStore((s) => s.connected)

  return { connected, reconnect, sendCollisionIntercept }
}

