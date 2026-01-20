'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-provider'
import { ArrowLeft, AlertCircle, Save } from 'lucide-react'
import Link from 'next/link'

interface Job {
  id: string
  appName: string
  appDescription: string
  packageName: string | null
  googlePlayLink: string
  appCategory: string | null
  testersNeeded: number
  testDuration: number
  minAndroidVersion: string | null
  paymentPerTester: number
  status: string
}

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [formData, setFormData] = useState({
    appName: '',
    appDescription: '',
    packageName: '',
    googlePlayLink: '',
    appCategory: '',
    minAndroidVersion: '',
  })

  useEffect(() => {
    fetchJob()
  }, [])

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setJob(data.job)
        setFormData({
          appName: data.job.appName || '',
          appDescription: data.job.appDescription || '',
          packageName: data.job.packageName || '',
          googlePlayLink: data.job.googlePlayLink || '',
          appCategory: data.job.appCategory || '',
          minAndroidVersion: data.job.minAndroidVersion || '',
        })
      } else {
        toast({ title: 'Error', description: 'Job not found', variant: 'destructive' })
        router.push('/dashboard/jobs')
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load job', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: 'Saved', description: 'Job updated successfully', variant: 'success' })
        router.push(`/dashboard/jobs/${params.id}`)
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update job', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!job) {
    return null
  }

  const isActive = job.status === 'ACTIVE' || job.status === 'IN_PROGRESS'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/jobs/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Edit Job</h2>
          <p className="text-gray-600 mt-1">Update your testing job details</p>
        </div>
      </div>

      {isActive && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Limited Editing</p>
            <p className="text-sm">This job is active. You can only edit app details, not payment or tester settings.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Information</CardTitle>
                <CardDescription>Update your app details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">App Name *</Label>
                  <Input
                    id="appName"
                    placeholder="My Awesome App"
                    value={formData.appName}
                    onChange={(e) => handleChange('appName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appDescription">App Description *</Label>
                  <Textarea
                    id="appDescription"
                    placeholder="Describe your app and what testers should focus on..."
                    rows={5}
                    value={formData.appDescription}
                    onChange={(e) => handleChange('appDescription', e.target.value)}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageName">Package Name</Label>
                    <Input
                      id="packageName"
                      placeholder="com.example.app"
                      value={formData.packageName}
                      onChange={(e) => handleChange('packageName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appCategory">Category</Label>
                    <Select
                      value={formData.appCategory}
                      onValueChange={(value) => handleChange('appCategory', value)}
                    >
                      <SelectTrigger id="appCategory">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="googlePlayLink">Google Play Closed Test Link *</Label>
                  <Input
                    id="googlePlayLink"
                    type="url"
                    placeholder="https://play.google.com/apps/testing/..."
                    value={formData.googlePlayLink}
                    onChange={(e) => handleChange('googlePlayLink', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAndroidVersion">Minimum Android Version</Label>
                  <Select
                    value={formData.minAndroidVersion}
                    onValueChange={(value) => handleChange('minAndroidVersion', value)}
                  >
                    <SelectTrigger id="minAndroidVersion">
                      <SelectValue placeholder="Select minimum version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">Android 14</SelectItem>
                      <SelectItem value="13">Android 13</SelectItem>
                      <SelectItem value="12">Android 12</SelectItem>
                      <SelectItem value="11">Android 11</SelectItem>
                      <SelectItem value="10">Android 10</SelectItem>
                      <SelectItem value="9">Android 9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Job Settings</CardTitle>
                <CardDescription>Current configuration (read-only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium">{job.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Testers Needed</span>
                    <span className="font-medium">{job.testersNeeded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Test Duration</span>
                    <span className="font-medium">{job.testDuration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment per Tester</span>
                    <span className="font-medium">${job.paymentPerTester}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    type="submit"
                    className="w-full" 
                    size="lg"
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>

                  <Link href={`/dashboard/jobs/${params.id}`} className="block">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
