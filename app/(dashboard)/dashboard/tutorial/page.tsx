'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TesterTutorialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Tester Tutorial</h2>
        <p className="text-gray-600 mt-1">Step-by-step guide to complete tests correctly and get paid</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Steps</CardTitle>
          <CardDescription>Follow these in order for every job</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold">1. Set up payouts</p>
            <p>Go to Settings and connect Stripe. Make sure your payout method supports EUR.</p>
          </div>
          <div>
            <p className="font-semibold">2. Apply to a job</p>
            <p>Browse jobs and apply. Wait for the developer to approve you.</p>
          </div>
          <div>
            <p className="font-semibold">3. Opt-in on Google Play</p>
            <p>Use the link provided by the developer to join the closed test.</p>
          </div>
          <div>
            <p className="font-semibold">4. Upload 2 verification screenshots</p>
            <p>Upload both screenshots:</p>
            <p>- Play Store page showing the app with the Install button</p>
            <p>- Your phone home screen showing the app installed</p>
          </div>
          <div>
            <p className="font-semibold">5. Test for 14 days</p>
            <p>Use the app naturally. Open it multiple times and explore key features.</p>
          </div>
          <div>
            <p className="font-semibold">6. Submit feedback</p>
            <p>Use the feedback form to share what you liked, what broke, and one improvement idea.</p>
          </div>
          <div>
            <p className="font-semibold">7. Get paid</p>
            <p>After completion, payouts are processed automatically.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/dashboard/browse">
          <Button>Browse Jobs</Button>
        </Link>
        <Link href="/dashboard/applications">
          <Button variant="outline">My Applications</Button>
        </Link>
      </div>
    </div>
  )
}
