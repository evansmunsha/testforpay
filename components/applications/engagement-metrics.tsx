'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Activity,
  BarChart3,
  Clock,
  Zap,
  MessageSquare,
  Target,
  TrendingUp,
  Loader,
} from 'lucide-react'

interface EngagementMetricsProps {
  applicationId: string
  jobId: string
}

interface Metrics {
  appLaunches: number
  featuresUsed: number
  feedbackSubmitted: number
  totalSessions: number
  avgSessionDuration: number
  daysSinceFistLog: number
  isActivelyTesting: boolean
  firstActivityAt: string | null
  lastActivityAt: string | null
}

export function EngagementMetrics({ applicationId, jobId }: EngagementMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchMetrics = async (showToast = false) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/usage`)
      const data = await res.json()

      if (data.metrics) {
        setMetrics(data.metrics)
        if (showToast) {
          toast({ title: 'Success', description: 'Metrics updated', variant: 'success' })
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load metrics', variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchMetrics(), 30000)
    return () => clearInterval(interval)
  }, [applicationId])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchMetrics(true)
  }

  if (loading) {
    return (
      <Card className="p-6 flex justify-center items-center">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>No engagement data available yet</p>
      </Card>
    )
  }

  const metricsCards = [
    {
      icon: Activity,
      label: 'App Launches',
      value: metrics.appLaunches,
      color: 'blue',
    },
    {
      icon: Zap,
      label: 'Features Used',
      value: metrics.featuresUsed,
      color: 'purple',
    },
    {
      icon: MessageSquare,
      label: 'Feedback Submitted',
      value: metrics.feedbackSubmitted,
      color: 'green',
    },
    {
      icon: BarChart3,
      label: 'Sessions',
      value: metrics.totalSessions,
      color: 'orange',
    },
    {
      icon: Clock,
      label: 'Avg Session (sec)',
      value: metrics.avgSessionDuration,
      color: 'cyan',
    },
    {
      icon: TrendingUp,
      label: 'Days Active',
      value: metrics.daysSinceFistLog,
      color: 'pink',
    },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    cyan: 'bg-cyan-50 border-cyan-200',
    pink: 'bg-pink-50 border-pink-200',
  }

  const iconColorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    cyan: 'text-cyan-600',
    pink: 'text-pink-600',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Engagement Metrics</h3>
        </div>
        <div className="flex items-center gap-2">
          {metrics.isActivelyTesting && (
            <Badge variant="default" className="bg-green-600">
              Active Testing
            </Badge>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {refreshing ? (
              <Loader className="w-4 h-4 animate-spin inline" />
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsCards.map((metric) => (
          <Card
            key={metric.label}
            className={`p-4 border-2 ${colorClasses[metric.color]}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metric.value}
                </p>
              </div>
              <metric.icon
                className={`w-5 h-5 ${iconColorClasses[metric.color]}`}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>First Activity:</span>
            <span className="font-medium">
              {metrics.firstActivityAt
                ? new Date(metrics.firstActivityAt).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last Activity:</span>
            <span className="font-medium">
              {metrics.lastActivityAt
                ? new Date(metrics.lastActivityAt).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span>Testing Status:</span>
            <span className={`font-medium ${metrics.isActivelyTesting ? 'text-green-600' : 'text-gray-500'}`}>
              {metrics.isActivelyTesting ? '✓ Actively Testing' : '○ Not Active'}
            </span>
          </div>
        </div>
      </Card>

      <p className="text-xs text-gray-500 text-center">
        Metrics auto-refresh every 30 seconds
      </p>
    </div>
  )
}
