'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { timeAgo, type CommunityPostView } from '@/components/community/community-feed'

interface CommentView {
  id: string
  body: string
  status: string
  createdAt: string
  author: { name: string; role: string }
  mine: boolean
}

const roleLabel: Record<string, string> = { ADMIN: 'Admin', DEVELOPER: 'Developer', TESTER: 'Tester' }

export function CommunityPostDetail({ postId }: { postId: string }) {
  const router = useRouter()
  const [post, setPost] = useState<CommunityPostView | null>(null)
  const [comments, setComments] = useState<CommentView[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/community/${postId}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(response.status === 404 ? 'This post was not found.' : json.error || 'Could not load the post.')
        return
      }
      setError('')
      setPost(json.post)
      setComments(json.comments)
      setIsAdmin(!!json.isAdmin)
    } catch {
      setError('No connection. Please check your internet and try again.')
    }
  }, [postId])

  useEffect(() => { void load() }, [load])

  const comment = async () => {
    setBusy(true)
    setSendError('')
    try {
      const response = await fetch(`/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSendError(json.error || 'Could not send your comment.')
        return
      }
      setBody('')
      void load()
    } catch {
      setSendError('No connection. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const like = async () => {
    const response = await fetch(`/api/community/${postId}/like`, { method: 'POST' }).catch(() => null)
    if (!response?.ok || !post) return
    const json = await response.json()
    setPost({ ...post, liked: json.liked, likeCount: json.likeCount })
  }

  const remove = async () => {
    if (!post || !window.confirm('Delete this post?')) return
    let reason: string | undefined
    if (isAdmin && !post.mine) {
      reason = window.prompt('Reason for deleting (at least 10 characters)') ?? undefined
      if (!reason) return
    }
    const response = await fetch(`/api/community/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).catch(() => null)
    if (response?.ok) router.push('/dashboard/community')
    else setError((await response?.json().catch(() => ({})))?.error || 'Could not delete the post.')
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link href="/dashboard/community" className="inline-flex min-h-11 items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Community
      </Link>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {post && (
        <>
          <article className="space-y-2 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{post.author.name}</span>
              <Badge variant="outline">{roleLabel[post.author.role] ?? post.author.role}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
            </div>
            {post.title && <h2 className="font-semibold">{post.title}</h2>}
            <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="min-h-11" aria-pressed={post.liked} onClick={like}>
                <Heart className={`mr-1 h-4 w-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`} />{post.likeCount}
              </Button>
              {(post.mine || isAdmin) && (
                <Button variant="ghost" className="min-h-11" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
              )}
            </div>
          </article>

          <div className="space-y-2">
            {comments.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.author.name}</span>
                  <Badge variant="outline">{roleLabel[item.author.role] ?? item.author.role}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{item.body}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          </div>

          {post.status === 'VISIBLE' && (
            <div className="space-y-2 rounded-xl border bg-card p-4">
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="Write a comment..." aria-label="Write a comment" />
              {sendError && <p role="alert" className="text-sm text-red-600">{sendError}</p>}
              <Button className="min-h-11" disabled={busy || !body.trim()} onClick={comment}>{busy ? 'Sending...' : 'Comment'}</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
