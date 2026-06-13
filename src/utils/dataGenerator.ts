import type {
  PLCDataFrame,
  RMGDeviceState,
  ContainerState,
  AlarmEvent,
  DeviceStatus,
  SpreaderStatus,
  ContainerSize,
  AlarmLevel,
} from '../../shared/types'

const DEVICE_NAMES = ['RMG-01', 'RMG-02', 'RMG-03', 'RMG-04']

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateMockFrame(timestamp: number): PLCDataFrame {
  const rmgDevices: RMGDeviceState[] = []
  const t = timestamp / 1000

  for (let i = 0; i < 4; i++) {
    const status: DeviceStatus =
      Math.random() > 0.05
        ? 'online'
        : Math.random() > 0.5
          ? 'fault'
          : 'offline'
    const spreaderStatus: SpreaderStatus = randomItem<SpreaderStatus>([
      'idle',
      'moving',
      'lifting',
      'fault',
    ])
    const posX = 10 + i * 30 + Math.sin(t * 0.3 + i) * 5
    const posY = 20 + Math.cos(t * 0.2 + i * 1.5) * 8

    rmgDevices.push({
      id: 'rmg-' + String(i + 1).padStart(2, '0'),
      name: DEVICE_NAMES[i],
      position: { x: posX, y: posY, z: 0 },
      spreader: {
        position: {
          x: posX,
          y: posY,
          z: 8 + Math.sin(t * 0.5 + i * 2) * 4,
        },
        loadCurrent:
          spreaderStatus === 'lifting'
            ? randomInRange(50, 100)
            : randomInRange(0, 15),
        status: spreaderStatus,
      },
      motorCurrent: randomInRange(20, 80),
      speed: randomInRange(0, 3),
      status: status,
    })
  }

  const containers: ContainerState[] = []
  for (let bay = 0; bay < 6; bay++) {
    for (let row = 0; row < 6; row++) {
      for (let tier = 0; tier < 4; tier++) {
        const occupied = Math.random() < 0.7
        containers.push({
          bay: bay,
          row: row,
          tier: tier,
          occupied: occupied,
          containerId: occupied
            ? 'CTNU' + String(Math.floor(Math.random() * 9000000 + 1000000))
            : undefined,
          size: occupied
            ? randomItem<ContainerSize>(['20ft', '40ft', '45ft'])
            : undefined,
        })
      }
    }
  }

  const alarms: AlarmEvent[] = []
  if (Math.random() < 0.15) {
    const deviceIndex = Math.floor(Math.random() * 4)
    alarms.push({
      id: 'alarm-' + timestamp + '-' + Math.floor(Math.random() * 1000),
      deviceId: 'rmg-' + String(deviceIndex + 1).padStart(2, '0'),
      level: randomItem<AlarmLevel>(['critical', 'warning', 'info']),
      message: randomItem([
        '电机过载',
        '接近限位',
        '通信超时',
        '传感器异常',
        '速度偏差',
      ]),
      timestamp: timestamp,
    })
  }

  return {
    timestamp: timestamp,
    rmgDevices: rmgDevices,
    containers: containers,
    alarms: alarms,
  }
}
