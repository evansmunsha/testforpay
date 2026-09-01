'use client'

import { useEffect, useState, useRef } from 'react'
import { Users, CheckCircle, TrendingUp, Activity } from 'lucide-react'

interface Stats {
  testerCount: number
  completedTests: number
  activeJobs: number
  todaySignups: number
}

// Animate a number counting up from 0 to target
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

function StatItem({
  icon: Icon,
  color,
  value,
  label,
  highlight,
}: {
  icon: React.ElementType
  color: string
  value: number
  label: string
  highlight?: boolean
}) {
  const animated = useCountUp(value)
  return (
    <div className={`flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl ${highlight ? 'bg-white/15 ring-1 ring-white/20' : ''}`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${color} bg-white/10`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
        {animated.toLocaleString()}
      </p>
      <p className="text-xs sm:text-sm font-medium text-center opacity-80 leading-tight">{label}</p>
    </div>
  )
}

export function LiveStats({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pulse, setPulse] = useState(false)

  const fetchStats = () => {
    fetch('/api/stats/public')
      .then(r => r.ok ? r.json() : null)
      .then((data: Stats | null) => {
        if (!data) return
        setStats(prev => {
          // Trigger pulse animation when today's count changes
          if (prev && data.todaySignups > prev.todaySignups) {
            setPulse(true)
            setTimeout(() => setPulse(false), 2000)
          }
          return data
        })
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchStats()
    // Refresh every 3 minutes
    const interval = setInterval(fetchStats, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  return (
    <section className={`bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white py-10 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-2 ${pulse ? 'animate-pulse' : ''}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Live — updates every 5 minutes
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Testers are ready. Your job fills in hours.
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <StatItem
            icon={Users}
            color="text-blue-200"
            value={stats.testerCount}
            label="Verified testers ready"
            highlight
          />
          {stats.todaySignups > 0 && (
            <StatItem
              icon={TrendingUp}
              color="text-green-300"
              value={stats.todaySignups}
              label={`Joined today`}
              highlight
            />
          )}
          {stats.completedTests > 0 && (
            <StatItem
              icon={CheckCircle}
              color="text-emerald-300"
              value={stats.completedTests}
              label="Tests completed"
            />
          )}
          {stats.activeJobs > 0 ? (
            <StatItem
              icon={Activity}
              color="text-purple-300"
              value={stats.activeJobs}
              label="Jobs active now"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-6 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full text-amber-300 bg-white/10">
                <Activity className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold">&lt;6h</p>
              <p className="text-xs sm:text-sm font-medium text-center opacity-80">Avg. fill time</p>
            </div>
          )}
        </div>

        {/* Today callout */}
        {stats.todaySignups > 0 && (
          <p className={`text-center text-sm font-medium mt-5 bg-white/10 rounded-full px-5 py-2 inline-flex items-center gap-2 mx-auto block w-fit ${pulse ? 'ring-2 ring-green-400' : ''}`}>
            🟢 {stats.todaySignups} tester{stats.todaySignups !== 1 ? 's' : ''} joined today — pool is growing
          </p>
        )}
      </div>
    </section>
  )
}
