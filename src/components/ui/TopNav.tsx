import React from 'react';
import { NavLink } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useTwinStore } from '@/stores/twinStore';

const TopNav: React.FC = () => {
  const connected = useTwinStore((state) => state.connected);
  const fps = useTwinStore((state) => state.fps);

  return (
    <div className="fixed top-0 left-0 w-full h-12 glass-panel z-30 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-tech-cyan/20 flex items-center justify-center">
          <Radio className="w-5 h-5 text-tech-cyan" />
        </div>
        <h1 className="font-display text-2xl font-bold text-tech-cyan">
          港口堆场数字孪生系统
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-4 py-1.5 rounded font-display font-medium transition-all ${
              isActive
                ? 'bg-tech-cyan text-white'
                : 'bg-steel-gray text-ice-blue hover:bg-steel-gray/80'
            }`
          }
        >
          全景大屏
        </NavLink>
        <NavLink
          to="/monitor"
          className={({ isActive }) =>
            `px-4 py-1.5 rounded font-display font-medium transition-all ${
              isActive
                ? 'bg-tech-cyan text-white'
                : 'bg-steel-gray text-ice-blue hover:bg-steel-gray/80'
            }`
          }
        >
          设备监控
        </NavLink>
        <NavLink
          to="/dispatch"
          className={({ isActive }) =>
            `px-4 py-1.5 rounded font-display font-medium transition-all ${
              isActive
                ? 'bg-tech-cyan text-white'
                : 'bg-steel-gray text-ice-blue hover:bg-steel-gray/80'
            }`
          }
        >
          调度中心
        </NavLink>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            connected ? 'bg-tech-cyan animate-pulse' : 'bg-dark-red'
          }`}
        />
        <span className="font-mono text-sm text-ice-blue">
          WS {fps.toFixed(0)}Hz
        </span>
      </div>
    </div>
  );
};

export default TopNav;
