'use client'

import { JobForm } from '@/components/jobs/job-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Create Testing Job</h2>
          <p className="text-gray-600 mt-1">Post a new testing job and find testers for your app</p>
        </div>
      </div>

      <JobForm />
    </div>
  )
}