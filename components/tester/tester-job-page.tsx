'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GroupChat } from '@/components/group/group-chat'
import { TesterJobMissions } from '@/components/tester/job-missions-panel'
import { getTesterNextStep } from '@/lib/application-next-step'

type Props = {
  jobId: string
  appName: string
  status: string
  hasVerificationImage: boolean
  paused: boolean
  hasFeedback: boolean
  googlePlayLink: string
}

/** The one page for a tester's job: what to do next, today's mission, past reports and videos, and the chat. */
export function TesterJobPage({ jobId, appName, status, hasVerificationImage, paused, hasFeedback, googlePlayLink }: Props) {
  const step = getTesterNextStep({ status, hasVerificationImage, paused, hasFeedback })
  const needsScreenshot = status === 'APPROVED' && !hasVerificationImage

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link href="/dashboard/applications" className="inline-flex min-h-11 items-center gap-1 text-sm text-blue-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to My Jobs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
        <p className="text-sm text-gray-600">Status: {status.replace('_', ' ')}</p>
      </div>

      <div
        className={`rounded-xl border p-4 ${step.actionNeeded ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
      >
        <p className="text-sm font-semibold text-gray-900">{step.actionNeeded ? 'Your next step' : 'What happens next'}</p>
        <p className="mt-1 text-sm text-gray-800">{step.text}</p>
        {needsScreenshot && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="min-h-11">
              <a href={googlePlayLink} target="_blank" rel="noopener noreferrer">Open in Play Store</a>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/dashboard/applications">Upload screenshot</Link>
            </Button>
          </div>
        )}
      </div>

      <TesterJobMissions jobId={jobId} hideBack />
      <GroupChat jobId={jobId} hideBack />
    </div>
  )
}
