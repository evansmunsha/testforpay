'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  authorName: string | null
  authorRole: string
  body: string
  createdAt: string
  mine: boolean
}

interface ThreadData {
  id: string
  subject: string
  appName: string | null
  testerName: string | null
  messages: Message[]
}

const roleLabel: Record<string, string> = { ADMIN: 'Admin', DEVELOPER: 'Developer', TESTER: 'Tester' }

export function ThreadView({ threadId }: { threadId: string }) {
  const [thread, setThread] = useState<ThreadData | null>(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(response.status === 404 ? 'This conversation was not found, or you do not have access to it.' : data.error || 'Could not load the conversation.')
        return
      }
      setThread(data.thread)
    } catch {
      setError('No connection. Please check your internet and try again.')
    }
  }, [threadId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [thread?.messages.length])

  const send = async () => {
    setSending(true)
    setSendError('')
    try {
      const response = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSendError(data.error || 'Could not send. Please try again.')
        return
      }
      setBody('')
      await load()
    } catch {
      setSendError('No connection. Your message was not sent.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/dashboard/messages" className="inline-flex min-h-11 items-center gap-1 text-sm text-blue-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All messages
      </Link>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!thread && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {thread && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{thread.subject}</h1>
            <p className="text-sm text-gray-500">
              {thread.appName ? `${thread.appName} · ` : 'Private · '}Tester: {thread.testerName || 'Unknown'}
            </p>
          </div>

          <ol className="space-y-3" aria-label="Conversation">
            {thread.messages.map((message) => (
              <li key={message.id} className={message.mine ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${message.mine ? 'bg-blue-600 text-white' : 'border bg-white text-gray-900'}`}>
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold">{message.mine ? 'You' : message.authorName || roleLabel[message.authorRole]}</span>
                    {message.authorRole === 'ADMIN' && <Badge className="bg-amber-500 text-white">Admin</Badge>}
                    {message.authorRole !== 'ADMIN' && !message.mine && <Badge variant="secondary">{roleLabel[message.authorRole]}</Badge>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                  <p className={`mt-1 text-[11px] ${message.mine ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div ref={endRef} />

          <div className="sticky bottom-0 space-y-2 rounded-xl border bg-white p-3 shadow-md">
            <label htmlFor="thread-reply" className="sr-only">Your reply</label>
            <Textarea
              id="thread-reply"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Write a reply…"
            />
            {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
            <Button type="button" className="min-h-11 w-full" onClick={send} disabled={sending || body.trim().length < 2}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              {sending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
