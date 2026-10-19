'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  applicationId: string
  disabled?: boolean
}

export function ApplicationIssueReportForm({ applicationId, disabled = false }: Props) {
  const [category, setCategory] = useState('INSTALL_UNAVAILABLE')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}/issue-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, details }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not submit this report')
        return
      }
      setDetails('')
      setMessage('Your private report was sent to the support team and developer. Confirmed incompatibility will not count against you.')
    } catch (cause) {
      console.error('Failed to submit application issue report:', cause)
      setError('Could not submit this report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="font-medium text-amber-950">Can’t install this app?</p>
        <p className="text-sm text-amber-900">
          If Google Play says the app is unavailable in your country or your device is incompatible, tell us what happened here. Checking availability does not start your testing period. Support can review the report and, if incompatibility is confirmed, remove you from this cohort without counting it against your tester record.
        </p>
      </div>
      <select
        aria-label="Issue type"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        disabled={disabled || submitting}
        className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
      >
        <option value="INSTALL_UNAVAILABLE">App or install link unavailable</option>
        <option value="COUNTRY_RESTRICTION">Google Play says app is unavailable in my country</option>
        <option value="DEVICE_INCOMPATIBLE">Google Play says my device is incompatible</option>
        <option value="OTHER">Other testing problem</option>
      </select>
      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        disabled={disabled || submitting}
        minLength={10}
        maxLength={2000}
        rows={3}
        placeholder="Tell us what Google Play showed and which step failed."
        className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-800">{message}</p>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={submit}
        disabled={disabled || submitting || details.trim().length < 10}
      >
        {submitting ? 'Sending…' : 'Submit private report'}
      </Button>
    </div>
  )
}
