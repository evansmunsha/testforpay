'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobCard } from '@/components/jobs/job-card'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast-provider'

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
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [minPayment, setMinPayment] = useState('')

  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=ACTIVE')
      const data = await response.json()
      if (response.ok) {
        setJobs(data.jobs)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      if (response.ok) {
        setApplications(data.applications)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
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
        // Refresh applications and jobs
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

  // Check if user has applied to a job
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
      if (minPayment && job.paymentPerTester < parseFloat(minPayment)) {
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse Jobs</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Find testing opportunities and start earning</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="grid gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by app name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs sm:text-sm">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category" className="text-xs sm:text-sm">
                    <SelectValue placeholder="All" />
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
                <Label htmlFor="sort" className="text-xs sm:text-sm">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort" className="text-xs sm:text-sm">
                    <SelectValue placeholder="Sort" />
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
          </div>

          {/* Additional Filters */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="min-payment" className="whitespace-nowrap text-xs sm:text-sm">Min $:</Label>
              <Input
                id="min-payment"
                type="number"
                placeholder="$0"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                className="w-20"
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
              className="text-xs sm:text-sm"
            >
              Clear
            </Button>
            <div className="ml-auto text-xs sm:text-sm text-gray-600">
              {filteredJobs.length} found
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
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-900">
                  {filteredJobs.reduce((sum, job) => sum + job.testersNeeded - job._count.applications, 0)}
                </p>
                <p className="text-[10px] sm:text-sm text-blue-700">Spots</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-900">
                  ${Math.max(...filteredJobs.map(job => job.paymentPerTester)).toFixed(0)}
                </p>
                <p className="text-[10px] sm:text-sm text-blue-700">Highest</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-blue-900">
                  $
                  {(filteredJobs.reduce((sum, job) => sum + job.paymentPerTester, 0) / 
                    filteredJobs.length).toFixed(0)}
                </p>
                <p className="text-[10px] sm:text-sm text-blue-700">Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}