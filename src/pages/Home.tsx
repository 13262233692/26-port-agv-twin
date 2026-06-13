import { useWebSocket } from '@/hooks/useWebSocket'
import { useYardData } from '@/hooks/useYardData'
import TopNav from '@/components/ui/TopNav'
import DevicePanel from '@/components/ui/DevicePanel'
import KPIPanel from '@/components/ui/KPIPanel'
import AlarmBar from '@/components/ui/AlarmBar'
import CameraControls from '@/components/ui/CameraControls'
import MiniMap from '@/components/ui/MiniMap'
import YardScene from '@/components/three/YardScene'

export default function Home() {
  useWebSocket()
  useYardData()

  return (
    <div className="w-full h-full relative overflow-hidden bg-deep-sea">
      <div className="absolute inset-0">
        <YardScene />
      </div>

      <TopNav />
      <DevicePanel />
      <KPIPanel />
      <AlarmBar />
      <CameraControls />
      <MiniMap />
    </div>
  )
}
