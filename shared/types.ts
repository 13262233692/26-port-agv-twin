export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export type DeviceStatus = 'online' | 'offline' | 'fault';
export type SpreaderStatus = 'idle' | 'moving' | 'lifting' | 'fault';
export type AlarmLevel = 'critical' | 'warning' | 'info';
export type ContainerSize = '20ft' | '40ft' | '45ft';
export type CameraMode = 'overview' | 'follow' | 'free';

export type WSMessageType =
  | 'plc_data_frame'
  | 'yard_layout'
  | 'yard_stats'
  | 'collision_intercept'
  | 'collision_ack'
  | 'intercept_cleared'
  | 'alarm_event'
  | 'health_ping';

export interface WSMessageBase {
  type: WSMessageType;
  timestamp: number;
}

export interface CollisionInterceptCommand extends WSMessageBase {
  type: 'collision_intercept';
  rmgId: string;
  reason: string;
  collisionId: string;
  distanceMm: number;
  level: 'critical' | 'warning';
}

export interface CollisionInterceptAck extends WSMessageBase {
  type: 'collision_ack';
  rmgId: string;
  success: boolean;
  ackId: string;
}

export interface InterceptClearedMessage extends WSMessageBase {
  type: 'intercept_cleared';
  rmgId: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  modbusConnections: { ip: string; connected: boolean }[];
  wsClients: number;
  uptime: number;
  activeIntercepts: number;
}


export interface SpreaderState {
  position: Position3D;
  loadCurrent: number;
  status: SpreaderStatus;
}

export interface RMGDeviceState {
  id: string;
  name: string;
  position: Position3D;
  spreader: SpreaderState;
  motorCurrent: number;
  speed: number;
  status: DeviceStatus;
}

export interface ContainerState {
  bay: number;
  row: number;
  tier: number;
  occupied: boolean;
  containerId?: string;
  size?: ContainerSize;
}

export interface AlarmEvent {
  id: string;
  deviceId: string;
  level: AlarmLevel;
  message: string;
  timestamp: number;
}

export interface PLCDataFrame {
  timestamp: number;
  rmgDevices: RMGDeviceState[];
  containers: ContainerState[];
  alarms: AlarmEvent[];
}

export interface YardBlock {
  id: string;
  name: string;
  bayCount: number;
  rowCount: number;
  tierCount: number;
  baySpacing: number;
  rowSpacing: number;
  tierHeight: number;
}

export interface YardLayout {
  origin: Position3D;
  blocks: YardBlock[];
}

export interface YardBlockStats {
  id: string;
  utilizationRate: number;
  bayCount: number;
  maxTier: number;
}

export interface YardStats {
  totalSlots: number;
  occupiedSlots: number;
  utilizationRate: number;
  blocks: YardBlockStats[];
}

export interface PLCRegisterConfig {
  ip: string;
  port: number;
  deviceId: string;
  registers: {
    name: string;
    address: number;
    length: number;
    type: 'holding' | 'input';
  }[];
}

