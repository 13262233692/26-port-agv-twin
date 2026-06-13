import React from 'react';
import { Zap, Activity } from 'lucide-react';
import type { RMGDeviceState } from '@shared/types';
import { useTwinStore } from '@/stores/twinStore';

interface DeviceCardProps {
  device: RMGDeviceState;
  isSelected: boolean;
  onClick: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, isSelected, onClick }) => {
  const statusColor = device.status === 'online' ? 'bg-tech-cyan' : device.status === 'fault' ? 'bg-dark-red' : 'bg-steel-gray';
  const statusText = device.status === 'online' ? '在线' : device.status === 'fault' ? '故障' : '离线';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-tech-cyan/10 ${
        isSelected ? 'glow-border bg-tech-cyan/5' : 'bg-steel-gray/30 border border-steel-gray/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-lg font-bold text-white">
          {device.name}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs text-white font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-ice-blue">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs">电流</span>
          </div>
          <span className="font-mono text-sm text-white">
            {device.motorCurrent.toFixed(1)}A
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-ice-blue">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs">速度</span>
          </div>
          <span className="font-mono text-sm text-white">
            {device.speed.toFixed(2)}m/s
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-steel-gray/50">
          <span className="font-mono text-xs text-steel-gray">
            X:{device.position.x.toFixed(1)}
          </span>
          <span className="font-mono text-xs text-steel-gray">
            Y:{device.position.y.toFixed(1)}
          </span>
          <span className="font-mono text-xs text-steel-gray">
            Z:{device.position.z.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

const DevicePanel: React.FC = () => {
  const rmgDevices = useTwinStore((state) => state.rmgDevices);
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId);
  const selectDevice = useTwinStore((state) => state.selectDevice);

  const displayDevices = rmgDevices.slice(0, 6);

  return (
    <div
      className="fixed left-0 top-12 w-[280px] glass-panel glow-border z-20 p-3 overflow-y-auto"
      style={{ height: 'calc(100vh - 48px - 36px)' }}
    >
      <h2 className="font-display text-lg font-semibold text-tech-cyan mb-3">
        设备列表
      </h2>
      <div className="space-y-2">
        {displayDevices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isSelected={selectedDeviceId === device.id}
            onClick={() => selectDevice(selectedDeviceId === device.id ? null : device.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default DevicePanel;
