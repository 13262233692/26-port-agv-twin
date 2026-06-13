import React from 'react';

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  color: string;
  unit?: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, max, label, color, unit = '' }) => {
  const width = 120;
  const height = 70;
  const centerX = width / 2;
  const centerY = height - 5;
  const radius = 50;
  const startAngle = Math.PI;
  const endAngle = 0;

  const percentage = Math.min(Math.max(value / max, 0), 1);
  const valueAngle = startAngle + percentage * (endAngle - startAngle);

  const createArcPath = (startA: number, endA: number, r: number): string => {
    const startX = centerX + r * Math.cos(startA);
    const startY = centerY + r * Math.sin(startA);
    const endX = centerX + r * Math.cos(endA);
    const endY = centerY + r * Math.sin(endA);
    const largeArc = endA - startA > Math.PI ? 1 : 0;
    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 0 ${endX} ${endY}`;
  };

  const dashArray = (Math.PI * radius) / 20;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={createArcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke="#2A3A4A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashArray / 2}
        />
        {percentage > 0 && (
          <path
            d={createArcPath(startAngle, valueAngle, radius)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + (radius - 12) * Math.cos(valueAngle)}
          y2={centerY + (radius - 12) * Math.sin(valueAngle)}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="4" fill={color} />
      </svg>
      <div className="text-center -mt-2">
        <div className="font-mono text-xl font-bold text-white">
          {value.toFixed(0)}
          <span className="text-sm text-steel-gray ml-0.5">{unit}</span>
        </div>
        <div className="text-xs text-ice-blue mt-0.5">{label}</div>
      </div>
    </div>
  );
};

export default Gauge;
