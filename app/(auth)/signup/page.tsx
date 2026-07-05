'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone, Code2, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'TESTER' as 'DEVELOPER' | 'TESTER',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-select role from landing page choice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_type')
      if (stored === 'developer') {
        setFormData(f => ({ ...f, role: 'DEVELOPER' }))
      }
    }
  }, [])

  const roleInfo = {
    TESTER: {
      icon: Smartphone,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
      heading: 'You\'ll earn money testing Android apps',
      points: [
        'Browse available testing jobs',
        'Install the app and use it for 14 days',
        'Send daily check-ins to the developer',
        'Get paid €5–€15 straight to your bank',
      ],
      note: 'You need an Android phone and a Google account. No experience required.',
    },
    DEVELOPER: {
      icon: Code2,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      heading: 'You\'ll find verified testers for your app',
      points: [
        'Post your app and set a budget',
        'Testers apply and opt in to your Google Play test',
        'Monitor progress with daily check-ins',
        'Meet Google\'s 14-day requirement and publish',
      ],
      note: 'Payment is held in escrow. You only pay when testing is complete.',
    },
  }

  const info = roleInfo[formData.role]
  const InfoIcon = info.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Signup failed')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        email: data.user.email,
        sent: data.verificationEmailSent ? '1' : '0',
      })
      window.location.href = `/verify-email?${params.toString()}`
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">

        {/* Role context card — changes based on selection */}
        <div className={`rounded-xl border p-4 ${info.bg}`}>
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 ${info.color}`}>
              <InfoIcon className="h-5 w-5" />
            </div>
            <div>
              <p className={`font-semibold text-sm ${info.color}`}>{info.heading}</p>
              <ul className="mt-2 space-y-1">
                {info.points.map(point => (
                  <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500">{info.note}</p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 px-4 sm:px-6 pt-6">
            <CardTitle className="text-xl sm:text-2xl font-bold">Create an account</CardTitle>
            <CardDescription className="text-sm">
              Choose your account type and get started
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'TESTER' })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      formData.role === 'TESTER'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className={`h-5 w-5 mb-1 ${formData.role === 'TESTER' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${formData.role === 'TESTER' ? 'text-purple-700' : 'text-gray-700'}`}>Tester</p>
                    <p className="text-xs text-gray-500">I want to earn money</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'DEVELOPER' })}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      formData.role === 'DEVELOPER'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Code2 className={`h-5 w-5 mb-1 ${formData.role === 'DEVELOPER' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${formData.role === 'DEVELOPER' ? 'text-blue-700' : 'text-gray-700'}`}>Developer</p>
                    <p className="text-xs text-gray-500">I need testers for my app</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500">At least 8 characters</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : `Create ${formData.role === 'TESTER' ? 'Tester' : 'Developer'} Account`}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 px-4 sm:px-6 pb-6">
            <div className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-semibold">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

