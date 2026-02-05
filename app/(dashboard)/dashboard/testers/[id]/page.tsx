'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Star, TrendingUp, Briefcase, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'
import { TesterActions } from '@/components/applications/tester-actions'
import { formatEur } from '@/lib/currency'

interface TesterProfile {
  id: string
  name: string | null
  email: string
  averageEngagementScore: number | null
  totalTestsCompleted: number | null
  totalEarnings: number | null
  averageRating: number | null
  createdAt: string
}

export default function TesterProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<TesterProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/testers/${params.id}/profile`)

        if (!res.ok) {
          throw new Error('Profile not found')
        }

        const data = await res.json()
        setProfile(data.profile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-gray-500">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error: {error || 'Profile not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const engagementScore = profile.averageEngagementScore || 0
  const engagementLevel = getEngagementLevel(engagementScore)
  const engagementColor = getEngagementColor(engagementScore)
  const memberDays = Math.floor(
    (new Date().getTime() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/leaderboards">
        <Button variant="ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-8">
          <div className="space-y-6">
            {/* Name and Engagement */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{profile.name || 'Anonymous Tester'}</h1>
                <p className="text-gray-600">{profile.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Member for {memberDays} days
                </p>
              </div>
              <div className={`p-6 rounded-lg text-right ${engagementColor}`}>
                <p className="text-sm font-medium opacity-75">Engagement Score</p>
                <p className="text-4xl font-bold">{engagementScore.toFixed(0)}</p>
                <Badge className={`mt-2 ${getBadgeClass(engagementScore)}`}>
                  {engagementLevel}
                </Badge>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm font-medium">Tests Completed</span>
                </div>
                <p className="text-2xl font-bold">{profile.totalTestsCompleted || 0}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Earned</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatEur(profile.totalEarnings || 0)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Average Rating</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < Math.round(profile.averageRating || 0)
                          ? 'text-yellow-400 text-lg'
                          : 'text-gray-300 text-lg'
                      }
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-gray-600 ml-2">
                    ({profile.averageRating?.toFixed(1) || 'N/A'}/5)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Avg Earnings/Test</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatEur(
                    profile.totalTestsCompleted
                      ? (profile.totalEarnings || 0) / profile.totalTestsCompleted
                      : 0
                  )}
                </p>
              </div>
            </div>

            {/* Tester Actions - Bookmark & Verify */}
            <div className="pt-6 border-t">
              <TesterActions testerId={profile.id} testerName={profile.name || 'this tester'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Engagement Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Feedback Quality</span>
                <span className="text-sm text-gray-600">25 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Verification</span>
                <span className="text-sm text-gray-600">20 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Testing Duration</span>
                <span className="text-sm text-gray-600">20 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Response Time</span>
                <span className="text-sm text-gray-600">15 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Rating Submission</span>
                <span className="text-sm text-gray-600">10 pts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t text-sm text-gray-600">
            <p>
              This tester's engagement score is calculated based on their testing activities. Higher scores
              indicate more thorough and responsive testing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {engagementScore >= 85 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="font-semibold text-green-900">Excellent Tester</p>
                  <p className="text-xs text-green-700">Score 85+</p>
                </div>
              </div>
            )}
            {engagementScore >= 70 && engagementScore < 85 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-2xl">🥈</span>
                <div>
                  <p className="font-semibold text-blue-900">Good Tester</p>
                  <p className="text-xs text-blue-700">Score 70-84</p>
                </div>
              </div>
            )}
            {(profile.totalTestsCompleted || 0) >= 5 && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="font-semibold text-purple-900">Experienced Tester</p>
                  <p className="text-xs text-purple-700">5+ completed tests</p>
                </div>
              </div>
            )}
            {(profile.averageRating || 0) >= 4.5 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-semibold text-yellow-900">Highly Rated</p>
                  <p className="text-xs text-yellow-700">4.5+ average rating</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getEngagementLevel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Satisfactory'
  if (score >= 30) return 'Fair'
  return 'New'
}

function getEngagementColor(score: number): string {
  if (score >= 85) return 'bg-green-50'
  if (score >= 70) return 'bg-blue-50'
  if (score >= 50) return 'bg-yellow-50'
  if (score >= 30) return 'bg-orange-50'
  return 'bg-gray-50'
}

function getBadgeClass(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800'
  if (score >= 70) return 'bg-blue-100 text-blue-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  if (score >= 30) return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-800'
}
