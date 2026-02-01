'use client'

import { useEffect, useState } from 'react'

interface TesterRank {
  id: string
  name: string | null
  email: string
  averageEngagementScore: number | null
  totalTestsCompleted: number | null
  totalEarnings: number | null
  averageRating: number | null
  rank: number
  badge: string
}

interface LeaderboardData {
  leaderboard: TesterRank[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export function useLeaderboard(limit = 50, offset = 0) {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/leaderboards/top-testers?limit=${limit}&offset=${offset}`)
        
        if (!res.ok) {
          throw new Error('Failed to fetch leaderboard')
        }
        
        const result = await res.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit, offset])

  return { data, loading, error }
}
