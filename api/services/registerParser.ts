import { DeviceStatus, SpreaderStatus, AlarmLevel } from '../../shared/types.js'

export function parseFloat32(high: number, low: number): number {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setUint16(0, high & 0xFFFF, false)
  view.setUint16(2, low & 0xFFFF, false)
  return view.getFloat32(0, false)
}

export function parsePosition(registers: number[], offset: number): { x: number; y: number; z: number } {
  return {
    x: parseFloat32(registers[offset], registers[offset + 1]),
    y: parseFloat32(registers[offset + 2], registers[offset + 3]),
    z: parseFloat32(registers[offset + 4], registers[offset + 5])
  }
}

export function parseStatus(value: number): DeviceStatus {
  switch (value) {
    case 0: return 'online'
    case 1: return 'offline'
    case 2: return 'fault'
    default: return 'offline'
  }
}

export function parseSpreaderStatus(value: number): SpreaderStatus {
  switch (value) {
    case 0: return 'idle'
    case 1: return 'moving'
    case 2: return 'lifting'
    case 3: return 'fault'
    default: return 'idle'
  }
}

export function parseAlarmBits(value: number): { bit: number; level: AlarmLevel; description: string }[] {
  const descriptions = [
    'overcurrent',
    'overvoltage',
    'overtemperature',
    'communication_error',
    'position_limit',
    'speed_limit',
    'spreader_fault',
    'emergency_stop'
  ]
  const alarms: { bit: number; level: AlarmLevel; description: string }[] = []
  for (let i = 0; i < 8; i++) {
    if (value & (1 << i)) {
      alarms.push({
        bit: i,
        level: i < 2 ? 'critical' : i < 5 ? 'warning' : 'info',
        description: descriptions[i]
      })
    }
  }
  return alarms
}
