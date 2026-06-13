import { create } from 'zustand'
import type { PLCDataFrame, RMGDeviceState, ContainerState, AlarmEvent, YardLayout, YardStats, CameraMode } from '../../shared/types'

interface TwinState {
  rmgDevices: RMGDeviceState[]
  containers: ContainerState[]
  alarms: AlarmEvent[]
  yardLayout: YardLayout | null
  yardStats: YardStats | null
  selectedDeviceId: string | null
  cameraMode: CameraMode
  connected: boolean
  fps: number
}

interface TwinActions {
  updateFrame: (data: PLCDataFrame) => void
  setYardLayout: (layout: YardLayout) => void
  setYardStats: (stats: YardStats) => void
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
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setConnected: (value) => set({ connected: value }),
  setFps: (fps) => set({ fps }),
}))
