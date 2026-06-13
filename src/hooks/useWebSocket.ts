import { useEffect, useRef, useCallback } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import type { PLCDataFrame } from '../../shared/types'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)
  const fpsTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const updateFrame = useTwinStore((s) => s.updateFrame)
  const setConnected = useTwinStore((s) => s.setConnected)
  const setFps = useTwinStore((s) => s.setFps)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname || 'localhost'
    const url = protocol + '//' + host + ':3001'

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) {
        setConnected(true)
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
        const data = JSON.parse(event.data) as PLCDataFrame
        updateFrame(data)
        frameCountRef.current += 1
      } catch (_err) {
      }
    }
  }, [updateFrame, setConnected])

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

  return { connected, reconnect }
}
