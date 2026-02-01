'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Search, Loader } from 'lucide-react'

interface SearchResult {
  id: string
  name: string | null
  email: string
  averageEngagementScore: number | null
  totalTestsCompleted: number | null
  averageRating: number | null
}

export function TesterSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)

    if (q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/testers/search?q=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      setResults(data.testers || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search testers by name or email..."
          value={query}
          onChange={handleSearch}
          className="pl-10"
        />
        {loading && (
          <Loader className="absolute right-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {query.length < 2 && query.length > 0 && (
        <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
      )}

      {results.length === 0 && query.length >= 2 && !loading && (
        <p className="text-sm text-gray-500">No testers found</p>
      )}

      <div className="space-y-2">
        {results.map(tester => (
          <Link
            key={tester.id}
            href={`/dashboard/testers/${tester.id}`}
          >
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {tester.name || 'Anonymous'}
                  </h3>
                  <p className="text-sm text-gray-600">{tester.email}</p>
                </div>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </div>

              <div className="flex gap-4 text-sm mt-3 text-gray-600">
                <span>
                  📊 Score: <span className="font-semibold text-gray-900">
                    {tester.averageEngagementScore?.toFixed(0) || 'N/A'}/100
                  </span>
                </span>
                <span>
                  ✅ Tests: <span className="font-semibold text-gray-900">
                    {tester.totalTestsCompleted || 0}
                  </span>
                </span>
                <span>
                  ⭐ Rating: <span className="font-semibold text-gray-900">
                    {tester.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
