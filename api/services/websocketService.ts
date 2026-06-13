import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'

class WebSocketService {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private aliveMap: Map<WebSocket, boolean> = new Map()
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  init(server: Server): void {
    this.wss = new WebSocketServer({ server })

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)
      this.aliveMap.set(ws, true)

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
