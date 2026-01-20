'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Clock, 
  Users, 
  Smartphone,
  CheckCircle,
  ExternalLink
} from 'lucide-react'

interface JobCardProps {
  job: {
    id: string
    appName: string
    appDescription: string
    appCategory: string | null
    testersNeeded: number
    testDuration: number
    minAndroidVersion: string | null
    paymentPerTester: number
    googlePlayLink: string
    createdAt: string
    _count: {
      applications: number
    }
  }
  onApply?: (jobId: string) => void
  applied?: boolean
  loading?: boolean
}

export function JobCard({ job, onApply, applied = false, loading = false }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const spotsLeft = job.testersNeeded - job._count.applications
  const progressPercentage = (job._count.applications / job.testersNeeded) * 100

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex gap-4 flex-1">
            <Image 
              src="/images/default-app-icon.svg" 
              alt={job.appName} 
              width={56} 
              height={56}
              className="rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl truncate">{job.appName}</CardTitle>
                {job.appCategory && (
                  <Badge variant="outline" className="capitalize flex-shrink-0">
                    {job.appCategory}
                  </Badge>
                )}
              </div>
              <CardDescription className={expanded ? '' : 'line-clamp-2'}>
                {job.appDescription}
              </CardDescription>
              {job.appDescription.length > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment</p>
              <p className="font-bold text-green-600">${job.paymentPerTester}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold">{job.testDuration} days</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Spots Left</p>
              <p className="font-semibold">{spotsLeft}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Smartphone className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Min Android</p>
              <p className="font-semibold">{job.minAndroidVersion || 'Any'}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {job._count.applications} / {job.testersNeeded} testers
            </span>
            <span className="text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* What You'll Do */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold text-sm mb-2">What you'll do:</p>
          <ul className="space-y-1 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Opt-in to Google Play closed test
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Use the app naturally for {job.testDuration} days
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Provide honest feedback
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Get paid ${job.paymentPerTester}
            </li>
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {applied ? (
          <Button disabled className="flex-1" variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Already Applied
          </Button>
        ) : spotsLeft === 0 ? (
          <Button disabled className="flex-1" variant="outline">
            Job Full
          </Button>
        ) : (
          <Button 
            onClick={() => onApply?.(job.id)}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Applying...' : `Apply Now • $${job.paymentPerTester}`}
          </Button>
        )}
        <Button variant="outline" size="icon" asChild>
          <a 
            href={job.googlePlayLink} 
            target="_blank" 
            rel="noopener noreferrer"
            title="View on Google Play"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}