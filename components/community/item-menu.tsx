'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MenuProps {
  postId: string
  commentId?: string
  authorId?: string
  authorRole: string
  mine: boolean
  isAdmin: boolean
  pinned?: boolean
  status?: string
  isPost?: boolean
  onChanged: () => void
}

const itemClass = 'flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-muted'

export function CommunityItemMenu({ postId, commentId, authorId, authorRole, mine, isAdmin, pinned, status, isPost, onChanged }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const call = async (url: string, init: RequestInit) => {
    setOpen(false)
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } }).catch(() => null)
    const json = await response?.json().catch(() => ({}))
    if (!response?.ok) {
      setMessage(json?.error || 'Something went wrong.')
      return false
    }
    setMessage('')
    return true
  }

  const report = async () => {
    const reason = window.prompt('Why are you reporting this? (at least 5 characters)')
    if (!reason) return
    if (await call(`/api/community/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason, commentId }) })) {
      setMessage('Thank you. An admin will review it.')
    }
  }

  const block = async () => {
    if (!authorId || !window.confirm('Block this person? You will no longer see their posts or comments.')) return
    if (await call('/api/community/block', { method: 'POST', body: JSON.stringify({ userId: authorId }) })) onChanged()
  }

  const moderate = async (action: string) => {
    const reason = window.prompt('Reason (at least 10 characters)')
    if (!reason) return
    if (await call('/api/admin/community', { method: 'POST', body: JSON.stringify({ action, reason, postId, commentId }) })) onChanged()
  }

  const canBlock = !mine && authorRole !== 'ADMIN' && !!authorId

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="More options" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border bg-card shadow-md" role="menu">
          {!mine && <button role="menuitem" className={itemClass} onClick={report}>Report</button>}
          {canBlock && <button role="menuitem" className={itemClass} onClick={block}>Block this person</button>}
          {isAdmin && isPost && (
            <button role="menuitem" className={itemClass} onClick={() => moderate(pinned ? 'UNPIN_POST' : 'PIN_POST')}>{pinned ? 'Unpin' : 'Pin'}</button>
          )}
          {isAdmin && isPost && (
            <button role="menuitem" className={itemClass} onClick={() => moderate(status === 'HIDDEN' ? 'UNHIDE_POST' : 'HIDE_POST')}>{status === 'HIDDEN' ? 'Unhide' : 'Hide'}</button>
          )}
          {isAdmin && !isPost && commentId && status !== 'HIDDEN' && (
            <button role="menuitem" className={itemClass} onClick={() => moderate('HIDE_COMMENT')}>Hide comment</button>
          )}
          {mine && !isAdmin && <p className="px-3 py-2 text-xs text-muted-foreground">No actions for your own content.</p>}
        </div>
      )}
      {message && <p role="status" className="absolute right-0 z-10 mt-1 w-56 rounded-md border bg-card p-2 text-xs shadow-md">{message}</p>}
    </div>
  )
}
