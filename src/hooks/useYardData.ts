import { useEffect, useRef } from 'react'
import { useTwinStore } from '@/stores/twinStore'
import type { YardLayout, YardStats } from '../../shared/types'

export function useYardData() {
  const setYardLayout = useTwinStore((s) => s.setYardLayout)
  const setYardStats = useTwinStore((s) => s.setYardStats)
  const timerRef = useRef<number | null>(null)

  const fetchLayout = () => {
    fetch('/api/yard/layout')
      .then((res) => res.json())
      .then((data: YardLayout) => {
        setYardLayout(data)
      })
      .catch(() => {})
  }

  const fetchStats = () => {
    fetch('/api/yard/stats')
      .then((res) => res.json())
      .then((data: YardStats) => {
        setYardStats(data)
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchLayout()
    fetchStats()

    timerRef.current = window.setInterval(fetchStats, 30000)

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { fetchLayout, fetchStats }
}
