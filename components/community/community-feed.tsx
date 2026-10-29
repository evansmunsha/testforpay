'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Pin, Users, Megaphone, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export interface CommunityPostView {
  id: string
  kind: 'POST' | 'ANNOUNCEMENT' | 'JOB'
  title: string | null
  body: string
  pinned: boolean
  status: string
  likeCount: number
  commentCount: number
  createdAt: string
  author: { name: string; role: string }
  mine: boolean
  liked: boolean
  job: { id: string; appName: string } | null
}

const FACEBOOK_GROUP = 'https://www.facebook.com/groups/1466852055303500/'
const TABS = [
  { key: 'feed', label: 'Feed' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'mine', label: 'My posts' },
] as const
const roleLabel: Record<string, string> = { ADMIN: 'Admin', DEVELOPER: 'Developer', TESTER: 'Tester' }

export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function CommunityFeed() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('feed')
  const [posts, setPosts] = useState<CommunityPostView[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [canWrite, setCanWrite] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [announce, setAnnounce] = useState(false)
  const [busy, setBusy] = useState(false)
  const [postError, setPostError] = useState('')

  const load = useCallback(async (nextTab: string, after?: string | null) => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ tab: nextTab })
      if (after) query.set('cursor', after)
      const response = await fetch(`/api/community?${query}`, { cache: 'no-store' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(json.error || 'Could not load the community.')
        return
      }
      setError('')
      setPosts((current) => (after ? [...current, ...json.posts] : json.posts))
      setCursor(json.nextCursor)
      if (typeof json.memberCount === 'number') setMemberCount(json.memberCount)
      setCanWrite(!!json.canWrite)
      setIsAdmin(!!json.isAdmin)
    } catch {
      setError('No connection. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(tab) }, [load, tab])

  const publish = async () => {
    setBusy(true)
    setPostError('')
    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, title: title || undefined, kind: announce ? 'ANNOUNCEMENT' : 'POST' }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setPostError(json.error || 'Could not publish your post.')
        return
      }
      setBody('')
      setTitle('')
      setAnnounce(false)
      void load(tab)
    } catch {
      setPostError('No connection. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const toggleLike = async (post: CommunityPostView) => {
    const response = await fetch(`/api/community/${post.id}/like`, { method: 'POST' }).catch(() => null)
    if (!response?.ok) return
    const json = await response.json()
    setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, liked: json.liked, likeCount: json.likeCount } : item)))
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" /> Community</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {memberCount !== null ? `${memberCount.toLocaleString()} members` : 'Loading members...'} · Share tips and ask questions. Never share emails or phone numbers.
        </p>
        <a href={FACEBOOK_GROUP} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline">
          Also join our Facebook group
        </a>
      </div>

      <div className="flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((item) => (
          <Button key={item.key} role="tab" aria-selected={tab === item.key} variant={tab === item.key ? 'default' : 'outline'} className="min-h-11 shrink-0" onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </div>

      {canWrite ? (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {isAdmin && announce && (
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Title" aria-label="Title" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" />
          )}
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Write something..." aria-label="Write something" />
          {postError && <p role="alert" className="text-sm text-red-600">{postError}</p>}
          <div className="flex items-center justify-between gap-2">
            {isAdmin ? (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={announce} onChange={(event) => setAnnounce(event.target.checked)} /> Announcement
              </label>
            ) : <span />}
            <Button className="min-h-11" disabled={busy || !body.trim()} onClick={publish}>{busy ? 'Posting...' : 'Post'}</Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">You can read the community but cannot post right now.</p>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {posts.map((post) => (
        <article key={post.id} className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{post.author.name}</span>
            <Badge variant="outline">{roleLabel[post.author.role] ?? post.author.role}</Badge>
            {post.kind === 'ANNOUNCEMENT' && <Badge><Megaphone className="mr-1 h-3 w-3" />Announcement</Badge>}
            {post.kind === 'JOB' && <Badge variant="secondary"><Briefcase className="mr-1 h-3 w-3" />New job</Badge>}
            {post.pinned && <Pin className="h-4 w-4 text-primary" aria-label="Pinned" />}
            {post.status === 'HIDDEN' && <Badge variant="destructive">Hidden</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>
          {post.title && <h3 className="font-semibold">{post.title}</h3>}
          <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
          {post.job && (
            <Link href={`/dashboard/browse`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline">
              See {post.job.appName}
            </Link>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="min-h-11" aria-pressed={post.liked} onClick={() => toggleLike(post)}>
              <Heart className={`mr-1 h-4 w-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`} />{post.likeCount}
            </Button>
            <Button variant="ghost" className="min-h-11" asChild>
              <Link href={`/dashboard/community/${post.id}`}><MessageCircle className="mr-1 h-4 w-4" />{post.commentCount}</Link>
            </Button>
          </div>
        </article>
      ))}

      {!loading && posts.length === 0 && !error && <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet. Be the first to post!</p>}
      {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>}
      {cursor && !loading && <Button variant="outline" className="min-h-11 w-full" onClick={() => load(tab, cursor)}>Load more</Button>}
    </div>
  )
}
