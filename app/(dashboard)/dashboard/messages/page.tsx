'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ThreadSummary {
  id: string
  kind: 'ISSUE_REPORT' | 'MISSION_SUBMISSION' | 'ADMIN_MESSAGE'
  subject: string
  appName: string | null
  testerName: string | null
  lastMessageAt: string
  messageCount: number
  lastMessage: { body: string; authorRole: string; createdAt: string } | null
}

const kindLabel = { ISSUE_REPORT: 'Issue report', MISSION_SUBMISSION: 'Daily mission', ADMIN_MESSAGE: 'Private to admin' }

export default function MessagesPage() {
  const router = useRouter()
  const { user, isTester } = useAuth()
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [composing, setComposing] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const load = useCallback(async (nextPage: number) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/threads?page=${nextPage}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Could not load your messages.')
        return
      }
      setThreads((current) => (nextPage === 1 ? data.threads : [...current, ...data.threads]))
      setHasMore(Boolean(data.hasMore))
      setPage(nextPage)
    } catch {
      setError('No connection. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(1) }, [load])

  const sendToAdmin = async () => {
    setSending(true)
    setSendError('')
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'ADMIN_MESSAGE', subject, body }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSendError(data.error || 'Could not send. Please try again.')
        return
      }
      router.push(`/dashboard/messages/${data.threadId}`)
    } catch {
      setSendError('No connection. Your message was not sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-600">Conversations about reports and daily missions.</p>
        </div>
        {isTester && !composing && (
          <Button className="min-h-11" onClick={() => setComposing(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Message admin
          </Button>
        )}
      </div>

      {composing && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-gray-600">Only the TestForPay admin can read this. Developers cannot see it.</p>
            <label htmlFor="admin-subject" className="text-sm font-medium">What is it about?</label>
            <Input id="admin-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="For example: I cannot install the app" />
            <label htmlFor="admin-body" className="text-sm font-medium">Your message</label>
            <Textarea id="admin-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={4} />
            {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
            <div className="flex gap-2">
              <Button className="min-h-11 flex-1" onClick={sendToAdmin} disabled={sending || subject.trim().length < 3 || body.trim().length < 2}>
                {sending ? 'Sending…' : 'Send to admin'}
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setComposing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && threads.length === 0 && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && !error && threads.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-600">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-400" aria-hidden="true" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm">{user?.role === 'TESTER' ? 'Use “Message admin” if you need help.' : 'Replies about reports and missions will show up here.'}</p>
        </div>
      )}

      <ul className="space-y-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link href={`/dashboard/messages/${thread.id}`} className="block min-h-11 rounded-xl border bg-white p-4 shadow-sm transition hover:border-blue-300">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-900">{thread.subject}</p>
                <span className="shrink-0 text-xs text-gray-500">{new Date(thread.lastMessageAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-gray-500">
                {kindLabel[thread.kind]}{thread.appName ? ` · ${thread.appName}` : ''}{user?.role !== 'TESTER' && thread.testerName ? ` · ${thread.testerName}` : ''}
              </p>
              {thread.lastMessage && <p className="mt-1 line-clamp-2 text-sm text-gray-700">{thread.lastMessage.body}</p>}
            </Link>
          </li>
        ))}
      </ul>

      {hasMore && (
        <Button variant="outline" className="min-h-11 w-full" disabled={loading} onClick={() => load(page + 1)}>
          {loading ? 'Loading…' : 'Show more'}
        </Button>
      )}
    </div>
  )
}
