import { useMemo, useState } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import TopNav from '@/components/ui/TopNav'
import TrendLine from '@/components/ui/TrendLine'
import {
  BarChart3,
  Layers,
  Box,
  TrendingUp,
  Clock,
  Truck,
  Target,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Calendar,
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useYardData } from '@/hooks/useYardData'

function UtilizationBarChart() {
  const yardStats = useTwinStore((state) => state.yardStats)

  const blocks = yardStats?.blocks || []

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-tech-cyan" />
        <h3 className="font-display text-lg font-semibold text-tech-cyan">各区块利用率</h3>
      </div>
      <div className="space-y-3">
        {blocks.map((block) => (
          <div key={block.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-ice-blue">{block.id.toUpperCase()}</span>
              <span className="font-mono text-sm text-white">
                {(block.utilizationRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-steel-gray/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${block.utilizationRate * 100}%`,
                  background: block.utilizationRate > 0.9
                    ? 'linear-gradient(90deg, #FF1744, #FF9100)'
                    : block.utilizationRate > 0.7
                      ? 'linear-gradient(90deg, #FF9100, #00E5FF)'
                      : 'linear-gradient(90deg, #00E5FF, #80D8FF)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-steel-gray">
              <span>{block.bayCount} Bays</span>
              <span>Max {block.maxTier} Tiers</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function YardHeatmap() {
  const yardLayout = useTwinStore((state) => state.yardLayout)
  const containers = useTwinStore((state) => state.containers)
  const [viewMode, setViewMode] = useState<'heatmap' | 'list'>('heatmap')

  const blockStats = useMemo(() => {
    if (!yardLayout) return []
    return yardLayout.blocks.map((block) => {
      const blockContainers = containers.filter(() => true)
      const total = block.bayCount * block.rowCount * block.tierCount
      const occupied = Math.floor(total * (0.5 + Math.random() * 0.4))
      return {
        id: block.id,
        name: block.name,
        utilization: occupied / total,
        occupied,
        total,
      }
    })
  }, [yardLayout, containers])

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-tech-cyan" />
          <h3 className="font-display text-lg font-semibold text-tech-cyan">堆场热力图</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              viewMode === 'heatmap' ? 'bg-tech-cyan text-white' : 'bg-steel-gray text-ice-blue'
            }`}
          >
            热力图
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              viewMode === 'list' ? 'bg-tech-cyan text-white' : 'bg-steel-gray text-ice-blue'
            }`}
          >
            列表
          </button>
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <div className="grid grid-cols-3 gap-3">
          {blockStats.map((block) => (
            <div
              key={block.id}
              className="aspect-square rounded-lg p-3 flex flex-col justify-between"
              style={{
                background: `linear-gradient(135deg, rgba(0, 229, 255, ${block.utilization * 0.8}), rgba(10, 22, 40, 0.9))`,
                border: `1px solid rgba(0, 229, 255, ${block.utilization * 0.5})`,
              }}
            >
              <div>
                <p className="font-display text-lg font-bold text-white">{block.name}</p>
                <p className="text-xs text-ice-blue">{block.occupied}/{block.total}</p>
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                {(block.utilization * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-auto max-h-64">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ice-blue border-b border-steel-gray/50">
                <th className="py-2 px-3">区块</th>
                <th className="py-2 px-3">利用率</th>
                <th className="py-2 px-3">已占用</th>
                <th className="py-2 px-3">总量</th>
              </tr>
            </thead>
            <tbody>
              {blockStats.map((block) => (
                <tr key={block.id} className="border-b border-steel-gray/30">
                  <td className="py-2 px-3 font-medium text-white">{block.name}</td>
                  <td className="py-2 px-3 font-mono text-tech-cyan">
                    {(block.utilization * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 font-mono text-ice-blue">{block.occupied}</td>
                  <td className="py-2 px-3 font-mono text-steel-gray">{block.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TaskBoard() {
  const tasks = useMemo(() => [
    { id: 'TK-2024', type: '卸船', container: 'MSKU-1234567', from: '船边', to: 'A-12-03-02', status: 'in-progress', device: 'RMG-1', eta: '14:25' },
    { id: 'TK-2025', type: '装船', container: 'MSKU-7654321', from: 'B-08-02-01', to: '船边', status: 'pending', device: 'RMG-2', eta: '14:32' },
    { id: 'TK-2026', type: '转堆', container: 'CMAU-9876543', from: 'C-15-04-03', to: 'A-22-01-05', status: 'pending', device: 'RMG-3', eta: '14:45' },
    { id: 'TK-2027', type: '提箱', container: 'OOLU-1112223', from: 'A-05-03-04', to: '集卡通道', status: 'in-progress', device: 'RMG-1', eta: '14:18' },
    { id: 'TK-2028', type: '进箱', container: 'MAEU-4445556', from: '集卡通道', to: 'B-18-05-02', status: 'completed', device: 'RMG-2', eta: '14:10' },
  ], [])

  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')

  const filteredTasks = tasks.filter((t) => filter === 'all' ? true : t.status === filter)

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return 'bg-tech-cyan/20 text-tech-cyan'
    if (status === 'in-progress') return 'bg-amber-orange/20 text-amber-orange'
    return 'bg-steel-gray/50 text-ice-blue'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5" />
    if (status === 'in-progress') return <Loader2 className="w-3.5 h-3.5 animate-spin" />
    return <Clock className="w-3.5 h-3.5" />
  }

  const getStatusText = (status: string) => {
    if (status === 'completed') return '已完成'
    if (status === 'in-progress') return '进行中'
    return '待处理'
  }

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-tech-cyan" />
          <h3 className="font-display text-lg font-semibold text-tech-cyan">作业调度看板</h3>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                filter === f ? 'bg-tech-cyan text-white' : 'bg-steel-gray text-ice-blue'
              }`}
            >
              {f === 'all' ? '全部' : getStatusText(f)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 max-h-80 overflow-auto">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-steel-gray/30 rounded-lg p-3 hover:bg-steel-gray/40 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{task.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {getStatusText(task.status)}
                  </span>
                </div>
                <p className="text-xs text-ice-blue mt-0.5">
                  {task.type} · {task.container}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-white">{task.device}</p>
                <p className="text-xs text-steel-gray">ETA {task.eta}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Box className="w-3 h-3 text-ice-blue" />
              <span className="text-ice-blue">{task.from}</span>
              <ArrowUpRight className="w-3 h-3 text-tech-cyan" />
              <span className="text-white">{task.to}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeviceStats() {
  const rmgDevices = useTwinStore((state) => state.rmgDevices)

  const stats = useMemo(() => {
    const totalTasks = 156
    const completedTasks = 142
    const avgCycleTime = 3.8
    const totalMoves = 2847

    const deviceStats = rmgDevices.map((d) => ({
      id: d.id,
      name: d.name,
      tasksToday: Math.floor(30 + Math.random() * 30),
      efficiency: 0.75 + Math.random() * 0.2,
      uptime: 0.95 + Math.random() * 0.05,
    }))

    return { totalTasks, completedTasks, avgCycleTime, totalMoves, deviceStats }
  }, [rmgDevices])

  const trendData = useMemo(() => {
    const data: number[] = []
    for (let i = 0; i < 24; i++) {
      data.push(80 + Math.random() * 40)
    }
    return data
  }, [])

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-tech-cyan" />
        <h3 className="font-display text-lg font-semibold text-tech-cyan">效率统计</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-steel-gray/30 rounded p-3">
          <p className="text-xs text-ice-blue">今日总作业</p>
          <p className="font-mono text-2xl font-bold text-white">{stats.totalTasks}</p>
          <p className="text-xs text-steel-gray">Total Moves</p>
        </div>
        <div className="bg-steel-gray/30 rounded p-3">
          <p className="text-xs text-ice-blue">已完成</p>
          <p className="font-mono text-2xl font-bold text-tech-cyan">{stats.completedTasks}</p>
          <p className="text-xs text-steel-gray">Completed</p>
        </div>
        <div className="bg-steel-gray/30 rounded p-3">
          <p className="text-xs text-ice-blue">平均循环时间</p>
          <p className="font-mono text-2xl font-bold text-amber-orange">{stats.avgCycleTime}<span className="text-sm ml-0.5">min</span></p>
          <p className="text-xs text-steel-gray">Avg Cycle Time</p>
        </div>
        <div className="bg-steel-gray/30 rounded p-3">
          <p className="text-xs text-ice-blue">累计作业量</p>
          <p className="font-mono text-2xl font-bold text-ice-blue">{stats.totalMoves}</p>
          <p className="text-xs text-steel-gray">Total Moves</p>
        </div>
      </div>

      <div className="bg-steel-gray/30 rounded p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-tech-cyan" />
          <span className="text-xs text-ice-blue">24小时作业量趋势</span>
        </div>
        <TrendLine data={trendData} color="#00E5FF" width={340} height={60} />
      </div>

      <div>
        <p className="text-xs text-ice-blue mb-2">设备工时统计</p>
        <div className="space-y-2">
          {stats.deviceStats.map((ds) => (
            <div key={ds.id} className="flex items-center gap-2">
              <span className="font-mono text-sm text-white w-12">{ds.name}</span>
              <div className="flex-1 h-2 bg-steel-gray/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-tech-cyan"
                  style={{ width: `${ds.efficiency * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-ice-blue w-12 text-right">
                {ds.tasksToday}次
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DispatchRecommendations() {
  const recommendations = useMemo(() => [
    { id: 1, priority: 'high', title: '优化 Block-B 转堆路径', desc: '当前路径拥堵，建议调整 RMG-2 作业顺序', impact: '预计节省 15% 作业时间' },
    { id: 2, priority: 'medium', title: '增加 RMG-3 卸船任务', desc: 'RMG-3 当前负载较低，可分配更多卸船任务', impact: '提升整体效率 8%' },
    { id: 3, priority: 'low', title: '堆场整理建议', desc: 'Block-A 堆位分布不均，建议空闲时整理', impact: '提升堆存能力 5%' },
  ], [])

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'bg-dark-red/20 border-dark-red/50 text-dark-red'
    if (p === 'medium') return 'bg-amber-orange/20 border-amber-orange/50 text-amber-orange'
    return 'bg-ice-blue/20 border-ice-blue/50 text-ice-blue'
  }

  const getPriorityText = (p: string) => {
    if (p === 'high') return '高'
    if (p === 'medium') return '中'
    return '低'
  }

  return (
    <div className="glass-panel glow-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-tech-cyan" />
        <h3 className="font-display text-lg font-semibold text-tech-cyan">智能调度建议</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-steel-gray/30 rounded-lg p-3 border border-steel-gray/50">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-white">{rec.title}</h4>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(rec.priority)}`}>
                {getPriorityText(rec.priority)}
              </span>
            </div>
            <p className="text-sm text-ice-blue mb-2">{rec.desc}</p>
            <p className="text-xs text-tech-cyan flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {rec.impact}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dispatch() {
  useWebSocket()
  useYardData()

  return (
    <div className="w-full h-full overflow-auto bg-deep-sea pt-12 pb-4">
      <TopNav />

      <div className="p-4 max-w-7xl mx-auto">
        <h1 className="font-display text-2xl font-bold text-tech-cyan mb-4">
          <Target className="w-6 h-6 inline-block mr-2" />
          数据驱动调度中心
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <UtilizationBarChart />
          <YardHeatmap />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TaskBoard />
          <div className="space-y-4">
            <DeviceStats />
            <DispatchRecommendations />
          </div>
        </div>
      </div>
    </div>
  )
}
