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

  const onlineCount = rmgDevices.filter((d) => d.status === 'online').length;
  const activeAlarmCount = alarms.filter(
    (a) => a.level === 'critical' || a.level === 'warning'
  ).length;
  const hasCriticalAlarm = alarms.some((a) => a.level === 'critical');

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
    </div>
  );
};

export default KPIPanel;
