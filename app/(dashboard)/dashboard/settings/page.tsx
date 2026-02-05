'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { DollarSign, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const setup = searchParams?.get('setup')
  
  const [name, setName] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [androidVersion, setAndroidVersion] = useState('')
  const [screenSize, setScreenSize] = useState('')
  const [saving, setSaving] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [payoutInfo, setPayoutInfo] = useState<{
    hasStripeAccount: boolean
    country: string | null
    defaultCurrency: string | null
    hasEurExternalAccount: boolean
  } | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
    }
  }, [user])

  useEffect(() => {
    if (user?.role !== 'TESTER') return
    const fetchPayoutInfo = async () => {
      try {
        const response = await fetch('/api/payments/payout-requirements')
        const data = await response.json()
        if (response.ok) {
          setPayoutInfo(data)
        }
      } catch (error) {
        console.error('Failed to load payout requirements:', error)
      }
    }
    fetchPayoutInfo()
  }, [user?.role])

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

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordMessage('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setPasswordMessage('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordMessage(''), 3000)
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setPasswordError('Something went wrong')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')

    if (!deletePassword) {
      setDeleteError('Please enter your password')
      return
    }

    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword, confirmText: deleteConfirm }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to home after successful deletion
        window.location.href = '/'
      } else {
        setDeleteError(data.error || 'Failed to delete account')
      }
    } catch (error) {
      setDeleteError('Something went wrong')
    } finally {
      setDeleteLoading(false)
    }
  }

  const [onboardingError, setOnboardingError] = useState('')

  const handleStripeOnboarding = async () => {
    setOnboardingLoading(true)
    setOnboardingError('')
    try {
      const response = await fetch('/api/payments/onboard', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        setOnboardingError(data.error || 'Failed to start onboarding')
        setOnboardingLoading(false)
      }
    } catch (error) {
      setOnboardingError('Something went wrong. Please refresh and try again.')
      setOnboardingLoading(false)
    }
  }

  const payoutCountryLabel = payoutInfo?.country ? `Your Stripe country is ${payoutInfo.country}. ` : ''
  const hasEurPayout =
    !!payoutInfo?.hasStripeAccount &&
    (payoutInfo?.hasEurExternalAccount || payoutInfo?.defaultCurrency?.toLowerCase() === 'eur')
  const payoutBannerTitle = hasEurPayout ? 'EUR payout ready' : 'EUR payout required'
  const payoutBannerBody = payoutInfo?.hasStripeAccount
    ? (hasEurPayout
        ? `${payoutCountryLabel}Payouts are sent in EUR and your account is ready to receive EUR.`
        : `${payoutCountryLabel}Payouts are sent in EUR. Add a EUR payout method in Stripe to avoid failed transfers.`)
    : 'Payouts are sent in EUR. During Stripe setup, add a EUR payout method for your country to receive payments.'

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
          {passwordMessage && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-700 text-sm">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-red-600 text-sm">
              {passwordError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input 
              id="current-password" 
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password" 
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input 
              id="confirm-password" 
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button onClick={handlePasswordChange} disabled={passwordLoading}>
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </Button>
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
              <div
                className={`rounded-lg border p-3 text-sm ${
                  hasEurPayout ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {hasEurPayout ? <CheckCircle className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
                  <div>
                    <p className="font-medium">{payoutBannerTitle}</p>
                    <p className="text-xs mt-1">{payoutBannerBody}</p>
                  </div>
                </div>
              </div>

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
                  {onboardingError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                      <p className="text-red-600 font-medium">{onboardingError}</p>
                      <p className="text-sm text-red-500 mt-1">Please refresh the page and try again.</p>
                    </div>
                  )}

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

                  {/* Stripe Onboarding Guide */}
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-amber-900 mb-3">What to enter on Stripe:</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-amber-800">Business Type:</p>
                        <p className="text-amber-700">Select <strong>"Individual"</strong> (you're a freelance tester)</p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Business Name:</p>
                        <p className="text-amber-700">Use your <strong>full name</strong> (e.g., "John Smith")</p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Business Website:</p>
                        <p className="text-amber-700">Enter <strong>testforpay.com</strong> or leave blank if optional</p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Product Description:</p>
                        <p className="text-amber-700">Write: <strong>"App testing services for mobile developers"</strong></p>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Bank Details:</p>
                        <p className="text-amber-700">Enter your real bank account to receive payments</p>
                      </div>
                    </div>
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
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">Are you sure you want to delete your account?</p>
                <p className="text-xs text-red-600">This action cannot be undone. All your data will be permanently deleted.</p>
              </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-300 p-3 rounded-lg text-red-600 text-sm">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delete-password">Enter your password</Label>
                <Input 
                  id="delete-password" 
                  type="password"
                  placeholder="Your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input 
                  id="delete-confirm" 
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletePassword('')
                    setDeleteConfirm('')
                    setDeleteError('')
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
