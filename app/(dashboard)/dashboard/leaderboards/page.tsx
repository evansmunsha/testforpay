'use client'

import { useState } from 'react'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Trophy, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [page, setPage] = useState(0)
  const limit = 50
  const offset = page * limit

  const { data, loading, error } = useLeaderboard(limit, offset)

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          Top Testers Leaderboard
        </h1>
        <p className="text-gray-600">
          Ranked by average engagement score. These are our most thorough and reliable testers.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Testers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.pagination.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">🥇 Excellent Testers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.leaderboard.filter(t => (t.averageEngagementScore || 0) >= 85).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">🥈 Good Testers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.leaderboard.filter(t => (t.averageEngagementScore || 0) >= 70 && (t.averageEngagementScore || 0) < 85).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>
            Page {page + 1} of {data ? Math.ceil(data.pagination.total / limit) : 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <p>Loading leaderboard...</p>
            </div>
          ) : !data?.leaderboard.length ? (
            <div className="py-8 text-center text-gray-500">
              <p>No testers found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold">Tester</th>
                      <th className="text-right py-3 px-4 font-semibold">Engagement</th>
                      <th className="text-right py-3 px-4 font-semibold">Tests</th>
                      <th className="text-right py-3 px-4 font-semibold">Earned</th>
                      <th className="text-right py-3 px-4 font-semibold">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((tester) => (
                      <tr
                        key={tester.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          {tester.rank === 1 && <span className="text-2xl">🥇</span>}
                          {tester.rank === 2 && <span className="text-2xl">🥈</span>}
                          {tester.rank === 3 && <span className="text-2xl">🥉</span>}
                          {tester.rank > 3 && (
                            <span className="font-bold text-gray-700">#{tester.rank}</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Link
                            href={`/dashboard/testers/${tester.id}`}
                            className="hover:underline font-medium text-blue-600"
                          >
                            {tester.name || 'Anonymous Tester'}
                          </Link>
                          <p className="text-xs text-gray-500">{tester.email}</p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold">
                              {(tester.averageEngagementScore || 0).toFixed(0)}/100
                            </span>
                            <Badge className={getBadgeClass(tester.averageEngagementScore || 0)}>
                              {getBadgeText(tester.averageEngagementScore || 0)}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-medium">
                          {tester.totalTestsCompleted || 0}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-green-600">
                          ${(tester.totalEarnings || 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={i < Math.round(tester.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Showing {offset + 1}-{Math.min(offset + limit, data.pagination.total)} of{' '}
                  {data.pagination.total} testers
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={!data.pagination.hasMore}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            How Rankings Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-900">
          <p>
            <strong>Engagement Score (0-100):</strong> Automatically calculated based on testing quality:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>25 points - Quality of written feedback</li>
            <li>20 points - Verification screenshots</li>
            <li>20 points - Testing duration (longer = better)</li>
            <li>15 points - Response time (faster = better)</li>
            <li>10 points - App rating submission</li>
          </ul>
          <p className="mt-4">
            <strong>Badges:</strong> 🥇 Excellent (85+) · 🥈 Good (70-84) · 🥉 Satisfactory (50-69)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function getBadgeText(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Satisfactory'
  if (score >= 30) return 'Fair'
  return 'New'
}

function getBadgeClass(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800'
  if (score >= 70) return 'bg-blue-100 text-blue-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  if (score >= 30) return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-800'
}
