'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Target =
  | { kind: 'ISSUE_REPORT'; issueReportId: string }
  | { kind: 'MISSION_SUBMISSION'; taskSubmissionId: string }

/** Opens a small box, sends the first message, then goes to the conversation. Existing threads are reused by the server. */
export function StartThreadButton({ target, label = 'Reply' }: { target: Target; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const fieldId = `thread-body-${'issueReportId' in target ? target.issueReportId : target.taskSubmissionId}`

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, body }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Could not send. Please try again.')
        return
      }
      router.push(`/dashboard/messages/${data.threadId}`)
    } catch {
      setError('No connection. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        <MessageSquare className="mr-1 h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
    )
  }

  return (
    <div className="mt-2 w-full space-y-2">
      <label htmlFor={fieldId} className="sr-only">Your message</label>
      <Textarea
        id={fieldId}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={2000}
        placeholder="Write your message…"
        rows={3}
      />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" className="min-h-11 flex-1" onClick={send} disabled={sending || body.trim().length < 2}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
