import ModbusRTU from 'modbus-serial'
import { plcRegisterConfigs } from '../config/plcRegisters.js'
import { RMGDeviceState, PLCRegisterConfig, SpreaderStatus } from '../../shared/types.js'
import { parseFloat32, parseStatus, parseSpreaderStatus } from './registerParser.js'

class ModbusService {
  private clients: Map<string, any> = new Map()
  private connectionStatus: Map<string, boolean> = new Map()
  private deviceStates: Map<string, RMGDeviceState> = new Map()
  private simTime: number = 0
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private startTime: number = Date.now()

  async connect(): Promise<void> {
    for (const config of plcRegisterConfigs) {
      const client = new ModbusRTU()
      try {
        await client.connectTCP(config.ip, { port: config.port })
        client.setID(1)
        client.setTimeout(1000)
        this.clients.set(config.deviceId, client)
        this.connectionStatus.set(config.ip, true)
      } catch (_e) {
        this.connectionStatus.set(config.ip, false)
      }
    }
  }

  startPolling(): void {
    const poll = async () => {
      await this.pollAll()
      this.pollTimer = setTimeout(poll, 20)
    }
    poll()
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async pollAll(): Promise<void> {
    this.simTime = Date.now() - this.startTime

    for (const config of plcRegisterConfigs) {
      if (!config.deviceId.startsWith('rmg')) {
        continue
      }

      const client = this.clients.get(config.deviceId)
      const isConnected = this.connectionStatus.get(config.ip)

      if (client && isConnected) {
        try {
          const state = await this.readRegisters(client, config)
          this.deviceStates.set(config.deviceId, state)
        } catch (_e) {
          this.connectionStatus.set(config.ip, false)
          const state = this.generateSimData(config)
          this.deviceStates.set(config.deviceId, state)
        }
      } else {
        const state = this.generateSimData(config)
        this.deviceStates.set(config.deviceId, state)
      }
    }
  }

  private async readRegisters(client: any, device: PLCRegisterConfig): Promise<RMGDeviceState> {
    const result = await client.readHoldingRegisters(0, 20)
    const regs = result.data

    const position = {
      x: parseFloat32(regs[0], regs[1]),
      y: parseFloat32(regs[2], regs[3]),
      z: parseFloat32(regs[4], regs[5])
    }

    const spreaderPosition = {
      x: parseFloat32(regs[6], regs[7]),
      y: parseFloat32(regs[8], regs[9]),
      z: parseFloat32(regs[10], regs[11])
    }

    const motorCurrent = parseFloat32(regs[12], regs[13])
    const speed = parseFloat32(regs[14], regs[15])
    const spreaderLoadCurrent = parseFloat32(regs[16], regs[17])
    const statusRaw = regs[18] || 0
    const spreaderRaw = regs[19] || 0

    const idx = parseInt(device.deviceId.split('-')[1]) || 1

    return {
      id: device.deviceId,
      name: 'RMG-' + idx,
      position: position,
      spreader: {
        position: spreaderPosition,
        loadCurrent: spreaderLoadCurrent,
        status: parseSpreaderStatus(spreaderRaw) as SpreaderStatus
      },
      motorCurrent: motorCurrent,
      speed: speed,
      status: parseStatus(statusRaw)
    }
  }

  private generateSimData(device: PLCRegisterConfig): RMGDeviceState {
    const t = this.simTime * 0.001
    const idx = parseInt(device.deviceId.split('-')[1]) || 1
    const baseX = idx * 100
    const baseY = idx * 50

    const statuses: SpreaderStatus[] = ['idle', 'moving', 'lifting', 'idle']
    const spreaderIdx = Math.floor(t * 0.1 + idx) % statuses.length

    return {
      id: device.deviceId,
      name: 'RMG-' + idx,
      position: {
        x: baseX + Math.sin(t * 0.5 + idx) * 30,
        y: baseY + Math.cos(t * 0.3 + idx) * 10,
        z: Math.sin(t * 0.2 + idx * 2) * 5 + 10
      },
      spreader: {
        position: {
          x: baseX + Math.sin(t * 0.5 + idx) * 30,
          y: baseY + Math.cos(t * 0.3 + idx) * 10,
          z: Math.sin(t * 0.8 + idx) * 3 + 5
        },
        loadCurrent: Math.abs(Math.sin(t + idx)) * 50,
        status: statuses[spreaderIdx]
      },
      motorCurrent: 20 + Math.sin(t * 2 + idx) * 10,
      speed: Math.abs(Math.cos(t * 0.5 + idx)) * 3,
      status: 'online'
    }
  }

  getAllStates(): RMGDeviceState[] {
    return Array.from(this.deviceStates.values())
  }

  getConnectionStatus(): { ip: string; connected: boolean }[] {
    const result: { ip: string; connected: boolean }[] = []
    for (const config of plcRegisterConfigs) {
      result.push({
        ip: config.ip,
        connected: this.connectionStatus.get(config.ip) || false
      })
    }
    return result
  }

  async close(): Promise<void> {
    this.stopPolling()
    for (const [_id, client] of this.clients) {
      try {
        client.close()
      } catch (_e) {
        // ignore close errors
      }
    }
    this.clients.clear()
  }
}

export const modbusService = new ModbusService()
