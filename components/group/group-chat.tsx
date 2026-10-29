'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Users } from 'lucide-react'
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

interface GroupData {
  appName: string
  canAccess: boolean
  canJoin: boolean
  memberCount?: number
  hasMore?: boolean
  messages?: Message[]
}

const roleLabel: Record<string, string> = { ADMIN: 'Admin', DEVELOPER: 'Developer', TESTER: 'Tester' }

export function GroupChat({ jobId }: { jobId: string }) {
  const [data, setData] = useState<GroupData | null>(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/group`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(response.status === 404 ? 'This group chat was not found, or you are not allowed in it.' : json.error || 'Could not load the group chat.')
        return
      }
      setError('')
      setData(json)
    } catch {
      setError('No connection. Please check your internet and try again.')
    }
  }, [jobId])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 20000)
    return () => clearInterval(timer)
  }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [data?.messages?.length])

  const join = async () => {
    setBusy(true)
    setSendError('')
    try {
      const response = await fetch(`/api/jobs/${jobId}/group/join`, { method: 'POST' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) setSendError(json.error || 'Could not join. Please try again.')
      else await load()
    } catch {
      setSendError('No connection. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    setBusy(true)
    setSendError('')
    try {
      const response = await fetch(`/api/jobs/${jobId}/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSendError(json.error || 'Could not send. Please try again.')
        return
      }
      setBody('')
      await load()
    } catch {
      setSendError('No connection. Your message was not sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1 text-sm text-blue-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </Link>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Group chat · {data.appName}</h1>
            {data.canAccess && (
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="h-4 w-4" aria-hidden="true" /> {data.memberCount} members. Private messages are separate.
              </p>
            )}
          </div>

          {!data.canAccess && data.canJoin && (
            <div className="space-y-3 rounded-xl border bg-white p-4">
              <p className="text-sm text-gray-700">You are verified for this app. Join to chat with the developer and the other verified testers.</p>
              {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
              <Button type="button" className="min-h-11 w-full" onClick={join} disabled={busy}>
                {busy ? 'Joining…' : 'Join group chat'}
              </Button>
            </div>
          )}

          {data.canAccess && (
            <>
              {data.hasMore && <p className="text-center text-xs text-gray-500">Showing the latest messages.</p>}
              {data.messages?.length === 0 && <p className="text-sm text-gray-500">No messages yet. Say hello!</p>}
              <ol className="space-y-3" aria-label="Group conversation">
                {data.messages?.map((message) => (
                  <li key={message.id} className={message.mine ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${message.mine ? 'bg-blue-600 text-white' : 'border bg-white text-gray-900'}`}>
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold">{message.mine ? 'You' : message.authorName || roleLabel[message.authorRole]}</span>
                        {message.authorRole === 'ADMIN' && <Badge className="bg-amber-500 text-white">Admin</Badge>}
                        {message.authorRole === 'DEVELOPER' && !message.mine && <Badge variant="secondary">Developer</Badge>}
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
                <label htmlFor="group-message" className="sr-only">Your message</label>
                <Textarea
                  id="group-message"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Write to the group…"
                />
                {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
                <Button type="button" className="min-h-11 w-full" onClick={send} disabled={busy || body.trim().length < 2}>
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  {busy ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
