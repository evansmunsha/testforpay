'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { DollarSign, CheckCircle, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const setup = searchParams?.get('setup')
  
  const [name, setName] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [androidVersion, setAndroidVersion] = useState('')
  const [screenSize, setScreenSize] = useState('')
  const [saving, setSaving] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
    }
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setMessage('Profile updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to update profile')
      }
    } catch (error) {
      setMessage('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDeviceInfo = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/user/device-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceModel,
          androidVersion,
          screenSize,
        }),
      })

      if (response.ok) {
        setMessage('Device info saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Failed to save device info')
      }
    } catch (error) {
      setMessage('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleStripeOnboarding = async () => {
    setOnboardingLoading(true)
    try {
      const response = await fetch('/api/payments/onboard', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start onboarding')
        setOnboardingLoading(false)
      }
    } catch (error) {
      alert('Something went wrong. Please try again.')
      setOnboardingLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <Card className={message.includes('success') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="pt-6">
            <p className={message.includes('success') ? 'text-green-800' : 'text-red-800'}>{message}</p>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Success Message */}
      {setup === 'complete' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Payout setup complete!</p>
                <p className="text-sm text-green-700">You're now ready to receive payments.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              value={user?.email || ''} 
              disabled
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input 
              id="current-password" 
              type="password"
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password" 
              type="password"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input 
              id="confirm-password" 
              type="password"
              placeholder="••••••••"
            />
          </div>

          <Button disabled>Update Password</Button>
          <p className="text-xs text-gray-500">Password change coming soon</p>
        </CardContent>
      </Card>

      {user?.role === 'TESTER' && (
        <>
          {/* Payout Setup Card */}
          <Card className={user?.stripeAccountId ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className={user?.stripeAccountId ? 'h-5 w-5 text-green-600' : 'h-5 w-5 text-blue-600'} />
                Payout Settings
              </CardTitle>
              <CardDescription>
                {user?.stripeAccountId 
                  ? 'Your payout account is set up and active' 
                  : 'Set up how you want to receive payments'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.stripeAccountId ? (
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Stripe Connect Account Linked</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Your account (ID: {user.stripeAccountId}) is ready to receive payouts.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 w-full"
                    onClick={handleStripeOnboarding}
                    disabled={onboardingLoading}
                  >
                    Manage Stripe Account
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700 mb-4">
                      To receive payments for completed testing jobs, you need to set up your payout account with Stripe.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Secure payment processing
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Direct bank transfers
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        No setup fees
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Automatic payouts after testing
                      </li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleStripeOnboarding}
                    disabled={onboardingLoading}
                    size="lg"
                    className="w-full"
                  >
                    {onboardingLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Set Up Payout Account
                      </>
                    )}
                  </Button>
                </>
              )}

              <p className="text-xs text-center text-gray-500 mt-2">
                {user?.stripeAccountId 
                  ? 'You can update your payout details on Stripe'
                  : 'You\'ll be redirected to Stripe to securely set up your payout details'}
              </p>
            </CardContent>
          </Card>

          {/* Device Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
              <CardDescription>Add your device details for better job matching</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-model">Device Model</Label>
                <Input 
                  id="device-model"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  placeholder="e.g., Samsung Galaxy S23"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="android-version">Android Version</Label>
                <Input 
                  id="android-version"
                  value={androidVersion}
                  onChange={(e) => setAndroidVersion(e.target.value)}
                  placeholder="e.g., 14"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="screen-size">Screen Size (Optional)</Label>
                <Input 
                  id="screen-size"
                  value={screenSize}
                  onChange={(e) => setScreenSize(e.target.value)}
                  placeholder="e.g., 6.1 inches"
                />
              </div>

              <Button onClick={handleSaveDeviceInfo} disabled={saving}>
                {saving ? 'Saving...' : 'Save Device Info'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>Delete Account</Button>
          <p className="text-xs text-gray-500 mt-2">Account deletion coming soon</p>
        </CardContent>
      </Card>
    </div>
  )
}