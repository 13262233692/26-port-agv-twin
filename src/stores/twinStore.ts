import { create } from 'zustand'
import type { PLCDataFrame, RMGDeviceState, ContainerState, AlarmEvent, YardLayout, YardStats, CameraMode } from '../../shared/types'
import type { ActiveCollision, CollisionStats } from '@/engine/collisionWarningSystem'

interface ModelStats {
  originalMeshCount: number
  mergedMeshCount: number
  materialCount: number
  totalVertices: number
  totalTriangles: number
}

interface TwinState {
  rmgDevices: RMGDeviceState[]
  containers: ContainerState[]
  alarms: AlarmEvent[]
  yardLayout: YardLayout | null
  yardStats: YardStats | null
  modelStats: ModelStats | null
  activeCollisions: ActiveCollision[]
  collisionStats: CollisionStats | null
  activeIntercepts: string[]
  selectedDeviceId: string | null
  cameraMode: CameraMode
  connected: boolean
  fps: number
}

interface TwinActions {
  updateFrame: (data: PLCDataFrame) => void
  setYardLayout: (layout: YardLayout) => void
  setYardStats: (stats: YardStats) => void
  setModelStats: (stats: ModelStats) => void
  setActiveCollisions: (collisions: ActiveCollision[]) => void
  setCollisionStats: (stats: CollisionStats) => void
  addIntercept: (rmgId: string) => void
  removeIntercept: (rmgId: string) => void
  addAlarm: (alarm: AlarmEvent) => void
  selectDevice: (id: string | null) => void
  setCameraMode: (mode: CameraMode) => void
  setConnected: (value: boolean) => void
  setFps: (fps: number) => void
}

export const useTwinStore = create<TwinState & TwinActions>((set) => ({
  rmgDevices: [],
  containers: [],
  alarms: [],
  yardLayout: null,
  yardStats: null,
  modelStats: null,
  activeCollisions: [],
  collisionStats: null,
  activeIntercepts: [],
  selectedDeviceId: null,
  cameraMode: 'overview',
  connected: false,
  fps: 0,
  updateFrame: (data) =>
    set({
      rmgDevices: data.rmgDevices,
      containers: data.containers,
      alarms: data.alarms,
    }),
  setYardLayout: (layout) => set({ yardLayout: layout }),
  setYardStats: (stats) => set({ yardStats: stats }),
  setModelStats: (stats) => set({ modelStats: stats }),
  setActiveCollisions: (collisions) => set({ activeCollisions: collisions }),
  setCollisionStats: (stats) => set({ collisionStats: stats }),
  addIntercept: (rmgId) => set((state) => ({
    activeIntercepts: state.activeIntercepts.includes(rmgId)
      ? state.activeIntercepts
      : [...state.activeIntercepts, rmgId],
  })),
  removeIntercept: (rmgId) => set((state) => ({
    activeIntercepts: state.activeIntercepts.filter((id) => id !== rmgId),
  })),
  addAlarm: (alarm) => set((state) => ({
    alarms: [alarm, ...state.alarms].slice(0, 100),
  })),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setConnected: (value) => set({ connected: value }),
  setFps: (fps) => set({ fps }),
}))
