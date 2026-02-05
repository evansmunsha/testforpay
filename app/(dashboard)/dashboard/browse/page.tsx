'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobCard } from '@/components/jobs/job-card'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Briefcase, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { formatEur } from '@/lib/currency'


interface Job {
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

interface Application {
  jobId: string
}

export default function BrowsePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const { toast } = useToast()
  
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [minPayment, setMinPayment] = useState('')
  const parsedMinPayment = minPayment ? parseFloat(minPayment) : NaN
  const minPaymentValue = Number.isFinite(parsedMinPayment) ? parsedMinPayment : null

  // Initial fetch
  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [])

  // ✅ Auto-refresh every 5 seconds (real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobsSilently()
      fetchApplicationsSilently()
    }, 5000) // 5 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jobs?status=ACTIVE')
      const data = await response.json()
      
      if (response.ok) {
        setJobs(data.jobs || [])
      } else {
        console.error('Failed to fetch jobs:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Silent fetch (doesn't show loading state)
  const fetchJobsSilently = async () => {
    try {
      const response = await fetch('/api/jobs?status=ACTIVE')
      const data = await response.json()
      
      if (response.ok) {
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch jobs silently:', error)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      
      if (response.ok) {
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  // ✅ Silent fetch for applications
  const fetchApplicationsSilently = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      
      if (response.ok) {
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Failed to fetch applications silently:', error)
    }
  }

  // ✅ Manual refresh button
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchJobs(), fetchApplications()])
    setRefreshing(false)
  }

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId)
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh data immediately
        await fetchApplications()
        await fetchJobs()
        
        toast({ title: 'Applied!', description: 'Check your applications page for next steps', variant: 'success' })
        router.push('/dashboard/applications')
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to apply', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' })
    } finally {
      setApplyingJobId(null)
    }
  }

  const hasApplied = (jobId: string) => {
    return applications.some(app => app.jobId === jobId)
  }

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      // Search filter
      if (searchQuery && !job.appName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !job.appDescription.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Category filter
      if (categoryFilter !== 'all' && job.appCategory !== categoryFilter) {
        return false
      }

      // Minimum payment filter
      if (minPaymentValue !== null && job.paymentPerTester < minPaymentValue) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'highest-pay':
          return b.paymentPerTester - a.paymentPerTester
        case 'lowest-pay':
          return a.paymentPerTester - b.paymentPerTester
        case 'most-spots':
          return (b.testersNeeded - b._count.applications) - (a.testersNeeded - a._count.applications)
        default:
          return 0
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Browse Jobs</h2>
          <p className="text-gray-600 mt-1">
            Find testing opportunities and start earning €
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating...' : 'Refresh Now'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by app name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="games">Games</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="health">Health & Fitness</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="highest-pay">Highest Pay</SelectItem>
                  <SelectItem value="lowest-pay">Lowest Pay</SelectItem>
                  <SelectItem value="most-spots">Most Spots Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="min-payment" className="whitespace-nowrap">Min Payment:</Label>
              <Input
                id="min-payment"
                type="number"
                placeholder="€0"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                className="w-24"
                min="0"
                step="0.5"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setSortBy('newest')
                setMinPayment('')
              }}
            >
              Clear Filters
            </Button>
            <div className="ml-auto text-sm text-gray-600">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">No jobs found</p>
              <p className="text-sm">
                {jobs.length === 0 
                  ? 'No active testing jobs available right now. Check back soon!' 
                  : 'Try adjusting your filters to see more jobs'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={handleApply}
              applied={hasApplied(job.id)}
              loading={applyingJobId === job.id}
            />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && filteredJobs.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredJobs.reduce((sum, job) => sum + job.testersNeeded - job._count.applications, 0)}
                </p>
                <p className="text-sm text-blue-700">Total Spots Available</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatEur(Math.max(...filteredJobs.map(job => job.paymentPerTester)))}
                </p>
                <p className="text-sm text-blue-700">Highest Payment</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatEur(
                    filteredJobs.reduce((sum, job) => sum + job.paymentPerTester, 0) / 
                      filteredJobs.length
                  )}
                </p>
                <p className="text-sm text-blue-700">Average Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
