import { PLCRegisterConfig } from '../../shared/types.js'

const rmgRegisters: PLCRegisterConfig['registers'] = [
  { name: 'positionX', address: 0, length: 2, type: 'holding' },
  { name: 'positionY', address: 2, length: 2, type: 'holding' },
  { name: 'positionZ', address: 4, length: 2, type: 'holding' },
  { name: 'spreaderX', address: 6, length: 2, type: 'holding' },
  { name: 'spreaderY', address: 8, length: 2, type: 'holding' },
  { name: 'spreaderZ', address: 10, length: 2, type: 'holding' },
  { name: 'motorCurrent', address: 12, length: 2, type: 'holding' },
  { name: 'speed', address: 14, length: 2, type: 'holding' },
  { name: 'spreaderLoadCurrent', address: 16, length: 2, type: 'holding' },
  { name: 'spreaderStatus', address: 18, length: 1, type: 'holding' }
]

const substationRegisters: PLCRegisterConfig['registers'] = [
  { name: 'voltage', address: 0, length: 2, type: 'holding' },
  { name: 'current', address: 2, length: 2, type: 'holding' },
  { name: 'power', address: 4, length: 2, type: 'holding' },
  { name: 'frequency', address: 6, length: 2, type: 'holding' },
  { name: 'temperature', address: 8, length: 2, type: 'holding' }
]

export const plcRegisterConfigs: PLCRegisterConfig[] = [
  {
    ip: '192.168.1.101',
    port: 502,
    deviceId: 'rmg-1',
    registers: rmgRegisters
  },
  {
    ip: '192.168.1.102',
    port: 502,
    deviceId: 'rmg-2',
    registers: rmgRegisters
  },
  {
    ip: '192.168.1.103',
    port: 502,
    deviceId: 'rmg-3',
    registers: rmgRegisters
  },
  {
    ip: '192.168.1.104',
    port: 502,
    deviceId: 'substation-1',
    registers: substationRegisters
  }
]
