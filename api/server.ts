import http from 'http'
import app from './app.js'
import { modbusService } from './services/modbusService.js'
import { websocketService } from './services/websocketService.js'
import { yardLayout } from './config/yardLayout.js'
import { generateContainerStates, getAlarms } from './services/yardService.js'
import { PLCDataFrame } from '../shared/types.js'

const PORT = process.env.PORT || 3001

const server = http.createServer(app)

let broadcastTimer: ReturnType<typeof setInterval> | null = null

async function start() {
  try {
    await modbusService.connect()
  } catch (_e) {
    // continue with simulation data
  }

  modbusService.startPolling()

  websocketService.init(server)

  const containers = generateContainerStates(yardLayout)

  broadcastTimer = setInterval(() => {
    const frame: PLCDataFrame = {
      timestamp: Date.now(),
      rmgDevices: modbusService.getAllStates(),
      containers: containers,
      alarms: getAlarms()
    }
    websocketService.broadcast(frame)
  }, 20)

  server.listen(PORT, () => {
    console.log('Server ready on port ' + PORT)
  })
}

start()

function gracefulShutdown() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer)
    broadcastTimer = null
  }
  modbusService.close()
  websocketService.close()
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  gracefulShutdown()
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  gracefulShutdown()
})

export { modbusService, websocketService }
