import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import type { CollisionInterceptCommand, CollisionInterceptAck, InterceptClearedMessage } from '../../shared/types'

interface InterceptRecord {
  rmgId: string
  collisionId: string
  startedAt: number
  reason: string
}

class WebSocketService {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private aliveMap: Map<WebSocket, boolean> = new Map()
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private activeIntercepts: Map<string, InterceptRecord> = new Map()
  private onInterceptCallback: ((cmd: CollisionInterceptCommand) => void) | null = null
  private interceptClearTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  setOnInterceptCallback(cb: (cmd: CollisionInterceptCommand) => void): void {
    this.onInterceptCallback = cb
  }

  getActiveIntercepts(): InterceptRecord[] {
    return Array.from(this.activeIntercepts.values())
  }

  private handleCollisionIntercept(ws: WebSocket, cmd: CollisionInterceptCommand): void {
    const ack: CollisionInterceptAck = {
      type: 'collision_ack',
      timestamp: Date.now(),
      rmgId: cmd.rmgId,
      success: true,
      ackId: `ack-${cmd.collisionId}-${Date.now()}`,
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(ack))
    }

    this.activeIntercepts.set(cmd.rmgId, {
      rmgId: cmd.rmgId,
      collisionId: cmd.collisionId,
      startedAt: Date.now(),
      reason: cmd.reason,
    })

    this.onInterceptCallback?.(cmd)

    const existingTimer = this.interceptClearTimers.get(cmd.rmgId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const clearTimer = setTimeout(() => {
      if (this.activeIntercepts.has(cmd.rmgId)) {
        this.activeIntercepts.delete(cmd.rmgId)
        this.interceptClearTimers.delete(cmd.rmgId)
        const cleared: InterceptClearedMessage = {
          type: 'intercept_cleared',
          timestamp: Date.now(),
          rmgId: cmd.rmgId,
        }
        this.broadcast(cleared)
      }
    }, 3000)
    this.interceptClearTimers.set(cmd.rmgId, clearTimer)

    console.log(`[COLLISION-INTERCEPT] RMG-${cmd.rmgId}: ${cmd.reason} (distance=${cmd.distanceMm}mm)`)
  }

  init(server: Server): void {
    this.wss = new WebSocketServer({ server })

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      this.aliveMap.set(ws, true)

      ws.on('message', (rawData: Buffer) => {
        try {
          const data = JSON.parse(rawData.toString('utf-8'))
          if (data.type === 'collision_intercept') {
            this.handleCollisionIntercept(ws, data as CollisionInterceptCommand)
          }
        } catch (_err) {}
      })

      ws.on('pong', () => {
        this.aliveMap.set(ws, true)
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        this.aliveMap.delete(ws)
      })
    })

    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        const isAlive = this.aliveMap.get(ws)
        if (!isAlive) {
          ws.terminate()
          this.clients.delete(ws)
          this.aliveMap.delete(ws)
          return
        }
        this.aliveMap.set(ws, false)
        ws.ping()
      })
    }, 30000)
  }

  broadcast(data: any): void {
    if (this.clients.size === 0) return
    const json = JSON.stringify(data)
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json)
      }
    })
  }

  getClientCount(): number {
    return this.clients.size
  }

  close(): void {
    for (const timer of this.interceptClearTimers.values()) {
      clearTimeout(timer)
    }
    this.interceptClearTimers.clear()
    this.activeIntercepts.clear()
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.clients.forEach((ws) => {
      ws.terminate()
    })
    this.clients.clear()
    this.aliveMap.clear()
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }
}

export const websocketService = new WebSocketService()

