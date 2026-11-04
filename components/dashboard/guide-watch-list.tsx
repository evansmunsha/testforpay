'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Heart, Loader2, MessageCircle, Trash2, Volume2 } from 'lucide-react'

export type GuideAudience = 'TESTER' | 'DEVELOPER' | 'ALL'

export type GuideComment = {
  id: string
  text: string
  updatedAt: string
  mine: boolean
  authorName: string
  authorRole: string
}

export type Guide = {
  id: string
  title: string
  description: string
  audience: GuideAudience
  hidden: boolean
  sortOrder: number
  sizeBytes: number
  likeCount: number
  likedByMe: boolean
  watchedByMe: boolean
  commentCount: number
  comments: GuideComment[]
}

export async function sendGuideAction(body: Record<string, unknown>) {
  const res = await fetch('/api/guides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

const AUDIENCE_LABEL: Record<GuideAudience, string> = { TESTER: 'Testers', DEVELOPER: 'Developers', ALL: 'Everyone' }

function timeAgo(value: string) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

/** Training videos for viewers. Only one video plays at a time; likes and comments update live. */
export function GuideWatchList({
  videos,
  setVideos,
  reload,
  isAdmin,
}: {
  videos: Guide[]
  setVideos: (update: (current: Guide[]) => Guide[]) => void
  reload: () => Promise<void>
  isAdmin: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const handlePlay = (id: string, player: HTMLVideoElement) => {
    containerRef.current?.querySelectorAll('video').forEach((other) => {
      if (other !== player && !other.paused) other.pause()
    })
    setPlayingId(id)
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center">
        <p className="text-base font-medium text-gray-800">No videos yet</p>
        <p className="mt-1 text-sm text-gray-500">New videos show up here by themselves. You do not need to refresh.</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="grid gap-5 lg:grid-cols-2">
      {videos.map((video, index) => (
        <GuideCard
          key={video.id}
          video={video}
          step={index + 1}
          isPlaying={playingId === video.id}
          isAdmin={isAdmin}
          onPlay={(player) => handlePlay(video.id, player)}
          onStop={() => setPlayingId((current) => (current === video.id ? null : current))}
          setVideos={setVideos}
          reload={reload}
        />
      ))}
    </div>
  )
}

function GuideCard({
  video, step, isPlaying, isAdmin, onPlay, onStop, setVideos, reload,
}: {
  video: Guide
  step: number
  isPlaying: boolean
  isAdmin: boolean
  onPlay: (player: HTMLVideoElement) => void
  onStop: () => void
  setVideos: (update: (current: Guide[]) => Guide[]) => void
  reload: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const watchedSent = useRef(false)
  const mine = video.comments.find((comment) => comment.mine)
  const others = video.comments.filter((comment) => !comment.mine)

  const patch = (change: (current: Guide) => Guide) =>
    setVideos((current) => current.map((item) => (item.id === video.id ? change(item) : item)))

  const markWatched = () => {
    if (video.watchedByMe || watchedSent.current) return
    watchedSent.current = true
    patch((item) => ({ ...item, watchedByMe: true }))
    sendGuideAction({ action: 'watched', id: video.id }).catch(() => {
      watchedSent.current = false
      patch((item) => ({ ...item, watchedByMe: false }))
    })
  }

  const toggleLike = async () => {
    setError('')
    patch((item) => ({
      ...item,
      likedByMe: !item.likedByMe,
      likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)),
    }))
    try {
      await sendGuideAction({ action: 'like', id: video.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your like.')
      await reload()
    }
  }

  const saveComment = async () => {
    if (draft.trim().length < 2) return setError('Write at least 2 letters.')
    setBusy(true)
    setError('')
    try {
      await sendGuideAction({ action: 'comment', id: video.id, text: draft.trim() })
      setDraft('')
      setEditing(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your comment.')
    } finally {
      setBusy(false)
    }
  }

  const removeComment = async (commentId: string) => {
    setBusy(true)
    setError('')
    try {
      await sendGuideAction({ action: 'removeComment', commentId })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the comment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
        isPlaying ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200'
      }`}
    >
      <video
        controls
        preload="metadata"
        playsInline
        controlsList="nodownload"
        src={`/api/guides?stream=${video.id}`}
        onPlay={(event) => onPlay(event.currentTarget)}
        onPause={onStop}
        onEnded={() => { markWatched(); onStop() }}
        onTimeUpdate={(event) => {
          const player = event.currentTarget
          if (!isAdmin && player.duration > 0 && player.currentTime / player.duration >= 0.9) markWatched()
        }}
        className="aspect-video w-full bg-black"
      />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">Step {step}</span>
              {!isAdmin && (
                video.watchedByMe ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" /> Watched
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">New</span>
                )
              )}
              {isPlaying && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Volume2 className="h-3 w-3" /> Playing now
                </span>
              )}
              {isAdmin && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {AUDIENCE_LABEL[video.audience]}{video.hidden ? ' · Hidden' : ''}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold leading-snug text-gray-900">{video.title}</h3>
            {video.description && <p className="mt-1 text-sm text-gray-600">{video.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={video.likedByMe}
            className={`flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
              video.likedByMe ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart className={`h-4 w-4 ${video.likedByMe ? 'fill-rose-500' : ''}`} />
            {video.likedByMe ? 'Liked' : 'Like'} · {video.likeCount}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" /> Comments · {video.commentCount}
          </button>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {open && (
          <div className="space-y-3 border-t pt-3">
            {mine && !editing ? (
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs font-medium text-indigo-700">Your comment · {timeAgo(mine.updatedAt)}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{mine.text}</p>
                <div className="mt-2 flex gap-3 text-xs font-medium">
                  <button type="button" className="text-indigo-700 underline" onClick={() => { setDraft(mine.text); setEditing(true) }}>
                    Change
                  </button>
                  <button type="button" disabled={busy} className="text-red-600 underline" onClick={() => removeComment(mine.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Was this video clear? Tell us what helped or what is missing."
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{draft.length}/300 · One comment each</span>
                  <div className="flex gap-2">
                    {editing && (
                      <button type="button" className="min-h-9 rounded-md border px-3 text-sm" onClick={() => { setEditing(false); setDraft('') }}>
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={saveComment}
                      className="flex min-h-9 items-center gap-1 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {editing ? 'Save change' : 'Post comment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {others.length === 0 && !mine && <p className="text-sm text-gray-500">No comments yet. Be the first.</p>}
            {others.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-800">{comment.authorName}</span>
                  {' · '}{comment.authorRole === 'DEVELOPER' ? 'Developer' : comment.authorRole === 'ADMIN' ? 'Admin' : 'Tester'}
                  {' · '}{timeAgo(comment.updatedAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{comment.text}</p>
                {isAdmin && (
                  <button type="button" disabled={busy} onClick={() => removeComment(comment.id)} className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <Trash2 className="h-3 w-3" /> Remove comment
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
