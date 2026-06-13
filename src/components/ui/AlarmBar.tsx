import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AlarmEvent } from '@shared/types';
import { useTwinStore } from '@/stores/twinStore';

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getLevelColor = (level: string): string => {
  switch (level) {
    case 'critical':
      return 'text-dark-red';
    case 'warning':
      return 'text-amber-orange';
    default:
      return 'text-ice-blue';
  }
};

const getLevelText = (level: string): string => {
  switch (level) {
    case 'critical':
      return '严重';
    case 'warning':
      return '警告';
    default:
      return '信息';
  }
};

const AlarmBar: React.FC = () => {
  const alarms = useTwinStore((state) => state.alarms);

  const alarmContent = useMemo(() => {
    if (alarms.length === 0) {
      return null;
    }
    return alarms.map((alarm: AlarmEvent) => (
      <span key={alarm.id} className="inline-block mr-12">
        <span className={`font-semibold ${getLevelColor(alarm.level)}`}>
          [{getLevelText(alarm.level)}]
        </span>{' '}
        <span className="text-white font-mono">{alarm.deviceId}</span> -{' '}
        <span className="text-ice-blue">{alarm.message}</span>{' '}
        <span className="text-steel-gray text-xs">({formatTime(alarm.timestamp)})</span>
      </span>
    ));
  }, [alarms]);

  return (
    <>
      <style>
        {`
          @keyframes scroll-left {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          .alarm-scroll {
            animation: scroll-left linear infinite;
            animation-duration: var(--scroll-duration, 30s);
            white-space: nowrap;
          }
        `}
      </style>
      <div className="fixed bottom-0 left-0 w-full h-9 bg-steel-gray border-t border-tech-cyan/30 z-30 flex items-center">
        <div className="h-full px-3 bg-amber-orange flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-white" />
          <span className="font-display font-semibold text-white">告警</span>
        </div>
        <div className="flex-1 overflow-hidden px-4">
          {alarms.length > 0 ? (
            <div className="alarm-scroll" style={{ '--scroll-duration': `${alarms.length * 3}s` } as React.CSSProperties}>
              {alarmContent}
            </div>
          ) : (
            <span className="text-tech-cyan font-medium">系统运行正常</span>
          )}
        </div>
      </div>
    </>
  );
};

export default AlarmBar;
