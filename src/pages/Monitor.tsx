import { useEffect, useState } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import TopNav from '@/components/ui/TopNav'
import Gauge from '@/components/ui/Gauge'
import TrendLine from '@/components/ui/TrendLine'
import { AlertCircle, AlertTriangle, Info, Activity, Zap, Gauge as GaugeIcon } from 'lucide-react'
import type { RMGDeviceState } from '@shared/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useYardData } from '@/hooks/useYardData'

function DeviceDetailCard({ device }: { device: RMGDeviceState }) {
  const [trendData, setTrendData] = useState<number[]>(new Array(30).fill(25))
  const [spreaderTrend, setSpreaderTrend] = useState<number[]>(new Array(30).fill(20))

  useEffect(() => {
    setTrendData((prev) => {
      const next = [...prev.slice(1), device.motorCurrent]
      return next
    })
    setSpreaderTrend((prev) => {
      const next = [...prev.slice(1), device.spreader.loadCurrent]
      return next
    })
  }, [device])

  const statusColor = device.status === 'online' ? 'bg-tech-cyan' : device.status === 'fault' ? 'bg-dark-red' : 'bg-steel-gray'
  const statusText = device.status === 'online' ? '在线运行' : device.status === 'fault' ? '设备故障' : '离线'

  const spreaderStatusText = device.spreader.status === 'idle' ? '待机' : device.spreader.status === 'moving' ? '移动' : device.spreader.status === 'lifting' ? '起升' : '故障'

  return (
    <div className="glass-panel glow-border p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-white">{device.name}</h3>
          <p className="text-xs text-ice-blue">轨道式集装箱门式起重机</p>
        </div>
        <span className={`px-3 py-1 rounded text-xs text-white font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-ice-blue mb-2">电机电流</p>
          <Gauge
            value={device.motorCurrent} max={60} label="A" color="#00E5FF"
          />
        </div>
        <div>
          <p className="text-xs text-ice-blue mb-2">吊具负载</p>
          <Gauge
            value={device.spreader.loadCurrent} max={80} label="A" color="#FF9100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-ice-blue mb-2">运行速度</p>
          <div className="bg-steel-gray/30 rounded p-3">
            <div className="font-mono text-2xl font-bold text-white">
              {device.speed.toFixed(2)}
              <span className="text-sm text-ice-blue ml-1">m/s</span>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs text-ice-blue mb-2">吊具状态</p>
          <div className="bg-steel-gray/30 rounded p-3">
            <div className="font-mono text-2xl font-bold text-white">
              {spreaderStatusText}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-steel-gray/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-tech-cyan" />
            <span className="text-xs text-ice-blue">电机电流趋势 (30s)</span>
          </div>
          <TrendLine data={trendData} color="#00E5FF" width={320} height={60} />
        </div>
        <div className="bg-steel-gray/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-orange" />
            <span className="text-xs text-ice-blue">吊具负载趋势 (30s)</span>
          </div>
          <TrendLine data={spreaderTrend} color="#FF9100" width={320} height={60} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-steel-gray/30 rounded p-2 text-center">
          <p className="text-xs text-ice-blue">X 坐标</p>
          <p className="font-mono text-sm text-white">{device.position.x.toFixed(2)}</p>
        </div>
        <div className="bg-steel-gray/30 rounded p-2 text-center">
          <p className="text-xs text-ice-blue">Y 坐标</p>
          <p className="font-mono text-sm text-white">{device.position.y.toFixed(2)}</p>
        </div>
        <div className="bg-steel-gray/30 rounded p-2 text-center">
          <p className="text-xs text-ice-blue">Z 坐标</p>
          <p className="font-mono text-sm text-white">{device.position.z.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

function AlarmTable() {
  const alarms = useTwinStore((state) => state.alarms)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')

  const filteredAlarms = alarms.filter((a) => filter === 'all' ? true : a.level === filter)

  const getLevelBadge = (level: string) => {
    if (level === 'critical') return 'bg-dark-red text-white'
    if (level === 'warning') return 'bg-amber-orange text-white'
    return 'bg-ice-blue text-deep-sea'
  }

  const getLevelIcon = (level: string) => {
    if (level === 'critical') return <AlertCircle className="w-4 h-4" />
    if (level === 'warning') return <AlertTriangle className="w-4 h-4" />
    return <Info className="w-4 h-4" />
  }

  const getLevelText = (level: string) => {
    if (level === 'critical') return '严重'
    if (level === 'warning') return '警告'
    return '信息'
  }

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-tech-cyan">告警管理</h3>
        <div className="flex gap-2">
          {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filter === f ? 'bg-tech-cyan text-white' : 'bg-steel-gray text-ice-blue hover:bg-steel-gray/80'
              }`}
            >
              {f === 'all' ? '全部' : getLevelText(f)}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto max-h-96">
        <table className="w-full text-sm">
          <thead>
          <tr className="text-left text-ice-blue border-b border-steel-gray/50">
            <th className="py-2 px-3">级别</th>
            <th className="py-2 px-3">设备</th>
            <th className="py-2 px-3">消息</th>
            <th className="py-2 px-3">时间</th>
          </tr>
          </thead>
          <tbody>
            {filteredAlarms.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-steel-gray">
                  暂无告警
                </td>
              </tr>
            ) : (
              filteredAlarms.map((alarm) => (
                <tr key={alarm.id} className="border-b border-steel-gray/30 hover:bg-steel-gray/20">
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getLevelBadge(alarm.level)}`}>
                      {getLevelIcon(alarm.level)}
                      {getLevelText(alarm.level)}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-white">{alarm.deviceId}</td>
                  <td className="py-2 px-3 text-ice-blue">{alarm.message}</td>
                  <td className="py-2 px-3 text-steel-gray text-xs">
                    {new Date(alarm.timestamp).toLocaleTimeString('zh-CN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Monitor() {
  const rmgDevices = useTwinStore((state) => state.rmgDevices)

  useWebSocket()
  useYardData()

  return (
    <div className="w-full h-full overflow-auto bg-deep-sea pt-12 pb-4">
      <TopNav />

      <div className="p-4 max-w-7xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-tech-cyan mb-4">
          <GaugeIcon className="w-6 h-6 inline-block mr-2" />
          设备实时监控
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {rmgDevices.map((device) => (
            <DeviceDetailCard key={device.id} device={device} />
          ))}
        </div>

        <AlarmTable />
      </div>
    </div>
  )
}
