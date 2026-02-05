'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Download,
  Eye,
  Loader,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface TestingReportViewerProps {
  jobId: string
}

interface ReportData {
  jobId: string
  appName: string
  recruitment: {
    totalTestersRecruited: number
    approvedTesters: number
    activeTesters: number
    completedTesters: number
    rejectedTesters: number
  }
  engagement: {
    totalAppLaunches: number
    uniqueFeaturesUsed: number
    totalFeedbackSubmitted: number
    totalSessions: number
    avgSessionDuration: number
    testingCoverage: string
    avgEngagementScore?: number
    excellentTesters?: number
    goodTesters?: number
  }
  feedback: {
    testedWithFeedback: number
    avgRating: number | string
    feedbackThemes: Record<string, number>
  }
  complianceCheck: {
    meetsMinDuration: boolean
    minTestersMet: boolean
    feedbackCollected: boolean
    status: string
  }
  generatedAt?: string
}

export function TestingReportViewer({ jobId }: TestingReportViewerProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/testing-report`)
        const data = await res.json()

        if (data.report) {
          setReport(data.report)
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load testing report', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [jobId, toast])

  const handleExportJSON = () => {
    if (!report) return

    try {
      setExporting(true)
      const json = JSON.stringify(report, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.appName}-testing-report-${Date.now()}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: 'Success', description: 'Report exported as JSON', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = () => {
    if (!report) return

    try {
      setExporting(true)
      let csv = `Testing Report for ${report.appName}\n`
      csv += `Generated: ${new Date().toISOString()}\n\n`

      csv += 'RECRUITMENT\n'
      csv += `Total Recruited,${report.recruitment.totalTestersRecruited}\n`
      csv += `Approved,${report.recruitment.approvedTesters}\n`
      csv += `Active,${report.recruitment.activeTesters}\n`
      csv += `Completed,${report.recruitment.completedTesters}\n\n`

      csv += 'ENGAGEMENT\n'
      csv += `App Launches,${report.engagement.totalAppLaunches}\n`
      csv += `Unique Features,${report.engagement.uniqueFeaturesUsed}\n`
      csv += `Feedback Submitted,${report.engagement.totalFeedbackSubmitted}\n`
      csv += `Sessions,${report.engagement.totalSessions}\n`
      csv += `Avg Session Duration (sec),${report.engagement.avgSessionDuration}\n\n`

      csv += 'FEEDBACK\n'
      csv += `With Feedback,${report.feedback.testedWithFeedback}\n`
      csv += `Avg Rating,${report.feedback.avgRating}\n`

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.appName}-testing-report-${Date.now()}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: 'Success', description: 'Report exported as CSV', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-8 flex justify-center items-center">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>No testing report available yet</p>
      </Card>
    )
  }

  const isReady = report.complianceCheck.status === 'READY_FOR_PRODUCTION'
  const completedTesters = report.recruitment.completedTesters || 0
  const feedbackCount = report.feedback.testedWithFeedback || 0
  const feedbackCoverage = completedTesters > 0 ? Math.round((feedbackCount / completedTesters) * 100) : 0
  const topThemes = Object.entries(report.feedback.feedbackThemes || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const avgRatingValue = typeof report.feedback.avgRating === 'number' ? report.feedback.avgRating : null
  const needsMoreFeedback = completedTesters > 0 && feedbackCount / completedTesters < 0.6
  const summaryHint = needsMoreFeedback
    ? 'Consider asking testers to submit feedback so you get stronger, more reliable insights.'
    : avgRatingValue !== null && avgRatingValue < 3.5
      ? 'Ratings are lower than expected. Focus on the top issues before the next release.'
      : 'Feedback volume looks healthy. Use the themes below to prioritize improvements.'

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Testing Report
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {report.appName} • Generated {report.generatedAt ? new Date(report.generatedAt as string).toLocaleDateString() : 'Just now'}
          </p>
        </div>
        <div>
          {isReady ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Ready for Production</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">In Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Developer Summary */}
      <Card className="p-4 border-emerald-200 bg-emerald-50">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-emerald-700" />
          <h4 className="font-semibold text-emerald-900">Developer Summary</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-emerald-800">Feedback Coverage</p>
            <p className="text-2xl font-bold text-emerald-900">
              {feedbackCoverage}%
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              {feedbackCount} of {completedTesters} completed
            </p>
          </div>
          <div>
            <p className="text-sm text-emerald-800">Average Rating</p>
            <p className="text-2xl font-bold text-emerald-900">
              {report.feedback.avgRating}
              {report.feedback.avgRating !== 'N/A' && <span className="text-lg">/5</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-emerald-800">Top Themes</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {topThemes.length === 0 ? (
                <span className="text-xs text-emerald-800">No themes yet</span>
              ) : (
                topThemes.map(([theme, count]) => (
                  <span
                    key={theme}
                    className="px-2 py-1 bg-white text-emerald-800 text-xs rounded border border-emerald-200"
                  >
                    {theme} ({count})
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-emerald-800">{summaryHint}</p>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleExportJSON}
          disabled={exporting}
          variant="outline"
          className="flex items-center gap-2"
        >
          {exporting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export as JSON
        </Button>
        <Button
          onClick={handleExportCSV}
          disabled={exporting}
          variant="outline"
          className="flex items-center gap-2"
        >
          {exporting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export as CSV
        </Button>
      </div>

      {/* Recruitment Section */}
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Recruitment</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-blue-700">Recruited</p>
            <p className="text-2xl font-bold text-blue-900">
              {report.recruitment.totalTestersRecruited}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Approved</p>
            <p className="text-2xl font-bold text-blue-900">
              {report.recruitment.approvedTesters}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Active</p>
            <p className="text-2xl font-bold text-blue-900">
              {report.recruitment.activeTesters}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Completed</p>
            <p className="text-2xl font-bold text-blue-900">
              {report.recruitment.completedTesters}
            </p>
          </div>
        </div>
      </Card>

      {/* Engagement Section */}
      <Card className="p-4 border-purple-200 bg-purple-50">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-purple-900">Engagement Metrics</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-purple-700">Average Engagement Score</p>
            <p className="text-2xl font-bold text-purple-900">
              {report.engagement.avgEngagementScore || 'N/A'}
              {typeof report.engagement.avgEngagementScore === 'number' && (
                <span className="text-sm">/100</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-700">Excellent Testers</p>
            <p className="text-2xl font-bold text-purple-900">
              {report.engagement.excellentTesters || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-700">Good Testers</p>
            <p className="text-2xl font-bold text-purple-900">
              {report.engagement.goodTesters || 0}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm text-purple-700 font-medium mb-2">Engagement Breakdown</p>
          <p className="text-xs text-purple-700">
            Scores are calculated based on: feedback quality, verification screenshots, testing duration, response time, and rating submission.
          </p>
        </div>
      </Card>

      {/* Feedback Section */}
      <Card className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-green-900">Feedback Analysis</h4>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-green-700">With Feedback</p>
              <p className="text-2xl font-bold text-green-900">
                {report.feedback.testedWithFeedback}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">Avg Rating</p>
              <p className="text-2xl font-bold text-green-900">
                {report.feedback.avgRating}
                {report.feedback.avgRating !== 'N/A' && (
                  <span className="text-lg">/5</span>
                )}
              </p>
            </div>
          </div>
          {Object.keys(report.feedback.feedbackThemes).length > 0 && (
            <div>
              <p className="text-sm text-green-700 font-medium mb-2">Feedback Themes</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.feedback.feedbackThemes).map(([theme, count]) => (
                  <span
                    key={theme}
                    className="px-2 py-1 bg-white text-green-700 text-xs rounded border border-green-200"
                  >
                    {theme} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Compliance Section */}
      <Card className="p-4 border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Compliance Check</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {report.complianceCheck.meetsMinDuration ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-sm">
              Minimum 14-day duration:{' '}
              {report.complianceCheck.meetsMinDuration ? '✓ Met' : '○ Not met'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {report.complianceCheck.minTestersMet ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-sm">
              Minimum testers recruited: {report.complianceCheck.minTestersMet ? '✓ Met' : '○ Not met'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {report.complianceCheck.feedbackCollected ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-sm">
              Feedback collected: {report.complianceCheck.feedbackCollected ? '✓ Yes' : '○ No'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
