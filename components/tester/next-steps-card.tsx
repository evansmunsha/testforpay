'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const COMMUNITY_URL = 'https://www.facebook.com/groups/1466852055303500/'
const JOINED_KEY = 'tfp_joined_community'
const DISMISSED_KEY = 'tfp_next_steps_dismissed'

export function TesterNextSteps() {
  const [joinedCommunity, setJoinedCommunity] = useState(false)
  const [hasDeviceInfo, setHasDeviceInfo] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setJoinedCommunity(localStorage.getItem(JOINED_KEY) === '1')
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')

    const load = async () => {
      try {
        const [deviceResponse, applicationsResponse] = await Promise.all([
          fetch('/api/user/device-info'),
          fetch('/api/applications'),
        ])
        if (deviceResponse.ok) setHasDeviceInfo(Boolean(await deviceResponse.json()))
        if (applicationsResponse.ok) {
          const data = await applicationsResponse.json()
          setHasApplied((data.applications || []).length > 0)
        }
      } catch (error) {
        console.error('Failed to load next steps:', error)
      } finally {
        setReady(true)
      }
    }
    void load()
  }, [])

  const steps = [
    {
      key: 'community',
      title: 'Join the tester group',
      text: 'Get job alerts and help from other testers.',
      done: joinedCommunity,
      action: (
        <a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            localStorage.setItem(JOINED_KEY, '1')
            setJoinedCommunity(true)
          }}
        >
          <Button size="sm" className="gap-2">Join the group <ArrowRight className="h-4 w-4" /></Button>
        </a>
      ),
    },
    {
      key: 'device',
      title: 'Add your country and phone details',
      text: 'Developers need these to know the app will work on your phone. You cannot apply without them.',
      done: hasDeviceInfo,
      action: (
        <Link href="/dashboard/settings">
          <Button size="sm" className="gap-2">Add details <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      ),
    },
    {
      key: 'browse',
      title: 'Find a job and apply',
      text: 'Pick an app you can test and send your application.',
      done: hasApplied,
      action: (
        <Link href="/dashboard/browse">
          <Button size="sm" className="gap-2">Browse jobs <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      ),
    },
  ]

  const allDone = steps.every((step) => step.done)
  if (!ready || dismissed || allDone) return null

  const firstOpen = steps.find((step) => !step.done)?.key

  return (
    <Card className="border-purple-200 bg-purple-50/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-purple-950">Your next steps</CardTitle>
        <CardDescription className="text-purple-900/80">
          Do these three things to start earning. {steps.filter((step) => step.done).length} of {steps.length} done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between ${
              step.key === firstOpen ? 'border-purple-400' : 'border-purple-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {step.done
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />}
              <div>
                <p className="text-sm font-semibold text-gray-900">{index + 1}. {step.title}</p>
                <p className="text-sm text-gray-600">{step.text}</p>
              </div>
            </div>
            {!step.done && <div className="shrink-0">{step.action}</div>}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, '1')
            setDismissed(true)
          }}
          className="text-xs text-purple-800 underline"
        >
          Hide these steps
        </button>
      </CardContent>
    </Card>
  )
}
