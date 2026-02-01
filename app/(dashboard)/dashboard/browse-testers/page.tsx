'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast-provider'
import { TesterSearch } from '@/components/applications/tester-search'
import { Bookmark, CheckCircle, Users } from 'lucide-react'
import Link from 'next/link'

interface TesterCard {
  id: string
  name: string | null
  email: string
  averageEngagementScore: number | null
  totalTestsCompleted: number | null
  averageRating: number | null
  bookmarkedAt?: string
  verificationNote?: string | null
  verifiedAt?: string
}

export default function TesterBrowserPage() {
  const { toast } = useToast()
  const [bookmarkedTesters, setBookmarkedTesters] = useState<TesterCard[]>([])
  const [verifiedTesters, setVerifiedTesters] = useState<TesterCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTesters()
  }, [])

  const fetchTesters = async () => {
    try {
      setLoading(true)
      const [bookmarksRes, verifiedRes] = await Promise.all([
        fetch('/api/developers/me/followed-testers'),
        fetch('/api/developers/me/verified-testers'),
      ])

      if (bookmarksRes.ok) {
        const data = await bookmarksRes.json()
        setBookmarkedTesters(data.followedTesters || [])
      }

      if (verifiedRes.ok) {
        const data = await verifiedRes.json()
        setVerifiedTesters(data.verifiedTesters || [])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load testers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const TesterCardComponent = ({ tester }: { tester: TesterCard }) => (
    <Link href={`/dashboard/testers/${tester.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg">{tester.name || 'Anonymous'}</h3>
              <p className="text-sm text-gray-600">{tester.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Engagement</p>
              <p className="font-bold text-lg">{tester.averageEngagementScore?.toFixed(0) || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Tests</p>
              <p className="font-bold text-lg">{tester.totalTestsCompleted || 0}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-gray-600 text-xs">Rating</p>
              <p className="font-bold text-lg">⭐ {tester.averageRating?.toFixed(1) || 'N/A'}</p>
            </div>
          </div>

          {tester.verificationNote && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              <p className="font-semibold mb-1">Your note:</p>
              <p>{tester.verificationNote}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Find Testers</h1>
        <p className="text-gray-600 mt-2">
          Search for qualified testers, bookmark your favorites, and verify top performers
        </p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search" className="flex gap-2">
            <Users className="w-4 h-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="bookmarked" className="flex gap-2">
            <Bookmark className="w-4 h-4" />
            Bookmarked ({bookmarkedTesters.length})
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex gap-2">
            <CheckCircle className="w-4 h-4" />
            Verified ({verifiedTesters.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Qualified Testers</CardTitle>
              <CardDescription>
                Search by name or email to find testers with proven track records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TesterSearch />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookmarked Testers</CardTitle>
              <CardDescription>
                {bookmarkedTesters.length === 0
                  ? 'Bookmark testers from search results for quick access'
                  : `You have ${bookmarkedTesters.length} bookmarked tester${bookmarkedTesters.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : bookmarkedTesters.length === 0 ? (
                <p className="text-gray-500">No bookmarked testers yet. Use the search tab to find and bookmark testers.</p>
              ) : (
                <div className="grid gap-4">
                  {bookmarkedTesters.map(tester => (
                    <TesterCardComponent key={tester.id} tester={tester} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verified Testers</CardTitle>
              <CardDescription>
                {verifiedTesters.length === 0
                  ? 'Verify testers who consistently deliver high-quality results'
                  : `You have verified ${verifiedTesters.length} tester${verifiedTesters.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : verifiedTesters.length === 0 ? (
                <p className="text-gray-500">No verified testers yet. Mark high-quality testers as verified from their profile.</p>
              ) : (
                <div className="grid gap-4">
                  {verifiedTesters.map(tester => (
                    <TesterCardComponent key={tester.id} tester={tester} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
