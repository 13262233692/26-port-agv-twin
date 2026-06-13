import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Box, TrendingUp, HardDrive, AlertTriangle } from 'lucide-react';
import { useTwinStore } from '@/stores/twinStore';
import TrendLine from './TrendLine';

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trendColor: string;
  valueColor?: string;
}

const generateMockData = (baseValue: number, variance: number): number[] => {
  const data: number[] = [];
  for (let i = 0; i < 20; i++) {
    data.push(baseValue + (Math.random() - 0.5) * variance);
  }
  return data;
};

const KPICard: React.FC<KPICardProps> = ({ icon, label, value, subValue, color, trendColor, valueColor }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animate, setAnimate] = useState(false);
  const trendData = useMemo(() => generateMockData(50, 20), []);

  useEffect(() => {
    if (displayValue !== value) {
      setAnimate(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setAnimate(false), 400);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <div className="p-3 rounded-lg bg-steel-gray/30 border border-steel-gray/50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-ice-blue">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div
            className={`font-mono text-3xl font-bold ${valueColor || 'text-white'} ${animate ? 'flip-number' : ''}`}
          >
            {displayValue}
          </div>
          {subValue && (
            <div className="font-mono text-xs text-steel-gray mt-0.5">
              {subValue}
            </div>
          )}
        </div>
        <TrendLine data={trendData} color={trendColor} width={80} height={30} />
      </div>
    </div>
  );
};

const KPIPanel: React.FC = () => {
  const rmgDevices = useTwinStore((state) => state.rmgDevices);
  const alarms = useTwinStore((state) => state.alarms);
  const yardStats = useTwinStore((state) => state.yardStats);
  const modelStats = useTwinStore((state) => state.modelStats);
  const collisionStats = useTwinStore((state) => state.collisionStats);
  const activeCollisions = useTwinStore((state) => state.activeCollisions);
  const activeIntercepts = useTwinStore((state) => state.activeIntercepts);

  const onlineCount = rmgDevices.filter((d) => d.status === 'online').length;
  const activeAlarmCount = alarms.filter(
    (a) => a.level === 'critical' || a.level === 'warning'
  ).length;
  const hasCriticalAlarm = alarms.some((a) => a.level === 'critical');

  const activeCriticalCount = activeCollisions.filter((c) => c.level === 'critical').length;
  const activeWarningCount = activeCollisions.filter((c) => c.level === 'warning').length;
  const activeInterceptCount = activeIntercepts.length;

  return (
    <div
      className="fixed right-0 top-12 w-[280px] glass-panel glow-border z-20 p-3 overflow-y-auto"
      style={{ height: 'calc(100vh - 48px - 36px)' }}
    >
      <h2 className="font-display text-lg font-semibold text-tech-cyan mb-3">
        运行指标
      </h2>
      <div className="space-y-2">
        <KPICard
          icon={<Layers className="w-3.5 h-3.5 text-tech-cyan" />}
          label="总箱位数"
          value={yardStats?.totalSlots || 0}
          subValue="Total Slots"
          color="bg-tech-cyan/20"
          trendColor="#00E5FF"
        />
        <KPICard
          icon={<Box className="w-3.5 h-3.5 text-ice-blue" />}
          label="占用箱位"
          value={yardStats?.occupiedSlots || 0}
          subValue="Occupied"
          color="bg-ice-blue/20"
          trendColor="#80D8FF"
        />
        <KPICard
          icon={<TrendingUp className="w-3.5 h-3.5 text-tech-cyan" />}
          label="利用率"
          value={`${(yardStats?.utilizationRate || 0).toFixed(1)}%`}
          subValue="Utilization"
          color="bg-tech-cyan/20"
          trendColor="#00E5FF"
          valueColor="text-tech-cyan text-2xl"
        />
        <KPICard
          icon={<HardDrive className="w-3.5 h-3.5 text-ice-blue" />}
          label="在线设备"
          value={onlineCount}
          subValue="Online Devices"
          color="bg-ice-blue/20"
          trendColor="#80D8FF"
        />
        <KPICard
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-orange" />}
          label="告警数量"
          value={activeAlarmCount}
          subValue="Active Alarms"
          color="bg-amber-orange/20"
          trendColor={hasCriticalAlarm ? '#FF1744' : '#FF9100'}
          valueColor={hasCriticalAlarm ? 'text-dark-red' : 'text-amber-orange'}
        />
      </div>

      {modelStats && (
        <div className="mt-4 pt-4 border-t border-steel-gray/50">
          <h3 className="font-display text-sm font-semibold text-tech-cyan mb-2">
            几何合并性能
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">原始 Mesh</p>
              <p className="font-mono text-sm text-white">
                {modelStats.originalMeshCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">合并后 Mesh</p>
              <p className="font-mono text-sm text-tech-cyan">
                {modelStats.mergedMeshCount}
              </p>
            </div>
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">材质分组</p>
              <p className="font-mono text-sm text-ice-blue">
                {modelStats.materialCount}
              </p>
            </div>
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">Draw Call</p>
              <p className="font-mono text-sm text-amber-orange">
                {modelStats.mergedMeshCount + 3}
              </p>
            </div>
            <div className="col-span-2 bg-steel-gray/30 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-ice-blue">合并优化率</span>
                <span className="font-mono text-xs text-tech-cyan">
                  {modelStats.originalMeshCount > 0
                    ? ((1 - modelStats.mergedMeshCount / modelStats.originalMeshCount) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-steel-gray/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-tech-cyan to-ice-blue"
                  style={{
                    width: modelStats.originalMeshCount > 0
                      ? `${(1 - modelStats.mergedMeshCount / modelStats.originalMeshCount) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
            <div className="col-span-2 bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue mb-1">总顶点数 / 三角形</p>
              <p className="font-mono text-xs text-white">
                {modelStats.totalVertices.toLocaleString()} / {modelStats.totalTriangles.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {collisionStats && (
        <div className="mt-4 pt-4 border-t border-steel-gray/50">
          <h3 className="font-display text-sm font-semibold text-dark-red mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            碰撞预警系统
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded p-2 ${activeCriticalCount > 0 ? 'bg-dark-red/30' : 'bg-steel-gray/30'}`}>
              <p className="text-xs text-ice-blue">严重碰撞</p>
              <p className={`font-mono text-xl font-bold ${activeCriticalCount > 0 ? 'text-dark-red animate-pulse' : 'text-steel-gray'}`}>
                {activeCriticalCount}
              </p>
            </div>
            <div className={`rounded p-2 ${activeWarningCount > 0 ? 'bg-amber-orange/30' : 'bg-steel-gray/30'}`}>
              <p className="text-xs text-ice-blue">接近预警</p>
              <p className={`font-mono text-xl font-bold ${activeWarningCount > 0 ? 'text-amber-orange' : 'text-steel-gray'}`}>
                {activeWarningCount}
              </p>
            </div>
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">拦截次数</p>
              <p className="font-mono text-sm text-dark-red">
                {collisionStats.interceptionsSent}
              </p>
            </div>
            <div className="bg-steel-gray/30 rounded p-2">
              <p className="text-xs text-ice-blue">检测耗时</p>
              <p className="font-mono text-sm text-tech-cyan">
                {collisionStats.avgCheckTimeMs.toFixed(2)}ms
              </p>
            </div>
            <div className="col-span-2 bg-steel-gray/30 rounded p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-ice-blue">BVH 检测节点</span>
                <span className="font-mono text-xs text-white">
                  {collisionStats.totalChecks.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-ice-blue">激活拦截</span>
                <span className={`font-mono text-xs ${activeInterceptCount > 0 ? 'text-dark-red' : 'text-steel-gray'}`}>
                  {activeInterceptCount} 台
                </span>
              </div>
            </div>
          </div>

          {activeCriticalCount > 0 && (
            <div className="mt-2 px-3 py-2 bg-dark-red/20 border border-dark-red/50 rounded animate-pulse">
              <p className="text-xs text-dark-red font-semibold">
                ⚠️ 安全距离已突破 200mm 红线
              </p>
              <p className="text-xs text-ice-blue mt-0.5">
                PLC 反向熔断已触发
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KPIPanel;
