import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import deviceRoutes from './routes/devices.js'
import alarmRoutes from './routes/alarms.js'
import yardRoutes from './routes/yard.js'
import { modbusService } from './services/modbusService.js'
import { websocketService } from './services/websocketService.js'
import { HealthResponse } from '../shared/types.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/devices', deviceRoutes)
app.use('/api/alarms', alarmRoutes)
app.use('/api/yard', yardRoutes)

app.get('/api/health', (_req: Request, res: Response) => {
  const connections = modbusService.getConnectionStatus()
  const allConnected = connections.every((c) => c.connected)
  const health: HealthResponse = {
    status: allConnected ? 'ok' : 'degraded',
    modbusConnections: connections,
    wsClients: websocketService.getClientCount(),
    uptime: process.uptime()
  }
  res.json(health)
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'API not found' })
})

export default app
