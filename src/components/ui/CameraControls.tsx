import React from 'react';
import { Eye, Crosshair, Move } from 'lucide-react';
import type { CameraMode } from '@shared/types';
import { useTwinStore } from '@/stores/twinStore';

const CameraControls: React.FC = () => {
  const cameraMode = useTwinStore((state) => state.cameraMode);
  const setCameraMode = useTwinStore((state) => state.setCameraMode);

  const buttons: { mode: CameraMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'overview', label: '鸟瞰', icon: <Eye className="w-4 h-4" /> },
    { mode: 'follow', label: '跟随', icon: <Crosshair className="w-4 h-4" /> },
    { mode: 'free', label: '自由', icon: <Move className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed top-[60px] left-1/2 -translate-x-1/2 glass-panel z-20 flex items-center gap-1 p-1 rounded-lg">
      {buttons.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => setCameraMode(mode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-display font-medium text-sm transition-all ${
            cameraMode === mode
              ? 'bg-tech-cyan text-white'
              : 'bg-steel-gray text-ice-blue hover:bg-steel-gray/80'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
};

export default CameraControls;
