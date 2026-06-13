import React from 'react';
import { Map } from 'lucide-react';
import { useTwinStore } from '@/stores/twinStore';

const MiniMap: React.FC = () => {
  const rmgDevices = useTwinStore((state) => state.rmgDevices);
  const yardStats = useTwinStore((state) => state.yardStats);
  const yardLayout = useTwinStore((state) => state.yardLayout);
  const selectedDeviceId = useTwinStore((state) => state.selectedDeviceId);

  const width = 200;
  const height = 150;
  const padding = 15;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2 - 15;

  const blocks = yardStats?.blocks || [
    { id: 'A', utilizationRate: 65 },
    { id: 'B', utilizationRate: 45 },
    { id: 'C', utilizationRate: 80 },
  ];

  const blockWidth = (innerWidth - 10) / 3;
  const blockHeight = innerHeight * 0.7;

  const getUtilizationColor = (rate: number): string => {
    const alpha = Math.min(0.1 + rate * 0.008, 0.7);
    return `rgba(0, 229, 255, ${alpha})`;
  };

  const getDevicePosition = (device: { position: { x: number; y: number } }) => {
    const layout = yardLayout;
    if (!layout) {
      return {
        x: padding + Math.random() * innerWidth,
        y: padding + 15 + blockHeight + 10 + Math.random() * (innerHeight - blockHeight - 10),
      };
    }
    const maxX = Math.max(...rmgDevices.map((d) => d.position.x), 100);
    const maxY = Math.max(...rmgDevices.map((d) => d.position.y), 50);
    const scaleX = innerWidth / maxX;
    const scaleY = (innerHeight - blockHeight - 15) / maxY;
    return {
      x: padding + device.position.x * scaleX,
      y: padding + 15 + blockHeight + 10 + device.position.y * scaleY,
    };
  };

  return (
    <div
      className="fixed bottom-12 right-3 glass-panel glow-border z-20 p-2"
      style={{ width: 200, height: 150 }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Map className="w-3 h-3 text-tech-cyan" />
        <span className="font-display text-xs text-tech-cyan">堆场俯视图</span>
      </div>
      <svg width={width - 16} height={height - 30} className="block mx-auto">
        {blocks.map((block, index) => {
          const x = padding + index * (blockWidth + 5);
          const y = padding;
          return (
            <g key={block.id}>
              <rect
                x={x}
                y={y}
                width={blockWidth}
                height={blockHeight}
                fill={getUtilizationColor(block.utilizationRate)}
                stroke="#00E5FF"
                strokeWidth="1"
                rx="2"
              />
              <text
                x={x + blockWidth / 2}
                y={y + blockHeight / 2 + 4}
                textAnchor="middle"
                className="fill-tech-cyan"
                style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {block.id}
              </text>
            </g>
          );
        })}

        {rmgDevices.map((device) => {
          const pos = getDevicePosition(device);
          const isSelected = selectedDeviceId === device.id;
          return (
            <g key={device.id}>
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="6"
                  fill="none"
                  stroke="#FF9100"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill={isSelected ? '#FF9100' : '#00E5FF'}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default MiniMap;
