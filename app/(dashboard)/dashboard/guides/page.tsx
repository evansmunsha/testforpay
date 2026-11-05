'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { ArrowDown, ArrowUp, Eye, EyeOff, FileVideo, Loader2, Pencil, Trash2, UploadCloud } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GuideFeed } from '@/components/dashboard/guide-feed'
import { GuidePlayer } from '@/components/dashboard/guide-player'
import { GuideWatchList, sendGuideAction as send, type Guide, type GuideAudience } from '@/components/dashboard/guide-watch-list'

type Audience = GuideAudience

const AUDIENCE_LABEL: Record<Audience, string> = {
  TESTER: 'Testers',
  DEVELOPER: 'Developers',
  ALL: 'Everyone',
}

const TITLE_SUGGESTIONS: Record<Audience, string[]> = {
  TESTER: [
    '1. Welcome to TestForPay',
    '2. Create your account',
    '3. Verify your email',
    '4. Set your country and payment method',
    '5. Add your phone details',
    '6. Find a job',
    '7. Apply and wait for the developer',
    '8. Join the test on Google Play',
    '9. Send your proof screenshot',
    '10. Your daily mission',
    '11. Record your screen',
    '12. Write and send your report',
    '13. Missed a day? Catch up',
    '14. Get paid',
    '15. Need help? Contact us',
  ],
  DEVELOPER: [
    '1. Welcome, developers',
    '2. Create your developer account',
    '3. Post a testing job',
    '4. Understand the cost',
    '5. Pay to publish your job',
    '6. Review applications',
    '7. Add testers on Google Play',
    '8. Check tester proof',
    '9. Watch the daily reports',
    '10. Confirm "Yes, this is my app"',
    '11. Cancel a job and refunds',
  ],
  ALL: [
    'Using Messages and Feedback',
    'Install TestForPay on your phone',
  ],
}

export default function GuidesPage() {
  const { isAdmin, isTester, isDeveloper, loading: authLoading } = useAuth()
  const [videos, setVideos] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guides', { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load the videos. Refresh the page.')
      setVideos((await res.json()).videos ?? [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the videos.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Live updates: refresh every 8 seconds while the tab is open, and when you come back to it.
  useEffect(() => {
    load()
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    const interval = setInterval(refreshIfVisible, 8000)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [load])

  const markWatched = (id: string) => {
    setVideos((current) => current.map((item) => (item.id === id ? { ...item, watchedByMe: true } : item)))
    send({ action: 'watched', id }).catch(() => undefined)
  }

  const toggleLike = (id: string) => {
    setVideos((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, likedByMe: !item.likedByMe, likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)) }
          : item
      )
    )
    send({ action: 'like', id }).catch(() => load())
  }

  // Each role sees only its own videos, in the same order as the admin set them.
  const ownVideos = isTester
    ? videos.filter((video) => video.audience === 'TESTER')
    : isDeveloper
      ? videos.filter((video) => video.audience === 'DEVELOPER')
      : []

  if (!authLoading && !loading && !isAdmin && ownVideos.length > 0) {
    if (isTester) return <GuideFeed videos={ownVideos} onWatched={markWatched} onLike={toggleLike} />
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How it works</h2>
          <p className="mt-1 text-sm text-gray-600">Click a video to watch it. Each one shows one step.</p>
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <GuidePlayer videos={ownVideos} onWatched={markWatched} />
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((key) => (
            <div key={key} className="overflow-hidden rounded-2xl border bg-white">
              <div className="aspect-video animate-pulse bg-gray-200" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{isAdmin ? 'Guide videos' : 'How it works'}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {isAdmin
            ? 'Upload, hide, reorder or delete the training videos. Below the tools you see what viewers see, with likes and comments.'
            : 'Watch these short videos in order. They show every step in simple English.'}
        </p>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {isAdmin && <AdminTools videos={videos} reload={load} setError={setError} />}
      {isAdmin && videos.length > 0 && <h3 className="pt-2 text-lg font-semibold text-gray-900">What viewers see</h3>}
      <GuideWatchList videos={videos} setVideos={(update) => setVideos(update)} reload={load} isAdmin={isAdmin} />
    </div>
  )
}

function AdminTools({ videos, reload, setError }: { videos: Guide[]; reload: () => Promise<void>; setError: (message: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState<Audience>('TESTER')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [addError, setAddError] = useState('')
  const [workingId, setWorkingId], setWorkingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const run = async (id: string, task: () => Promise<unknown>) => {
    setWorkingId(id)
    setError('')
    try {
      await task()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setWorkingId(null)
    }
  }

  const handleAdd = async () => {
    setAddError('')
    if (!file) return setAddError('Choose a video file first.')
    const finalTitle = title.trim() || file.name.replace(/\.[^.]+$/, '').trim()
    if (finalTitle.length < 3) return setAddError('Write a title (at least 3 letters).')
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) return setAddError('Only MP4, MOV or WEBM videos are allowed.')
    if (file.size > 300 * 1024 * 1024) return setAddError('The video is bigger than 300 MB. Make it smaller and try again.')
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const extension = file.type === 'video/quicktime' ? 'mov' : file.type === 'video/webm' ? 'webm' : 'mp4'
      const blob = await upload(`guides/${crypto.randomUUID()}.${extension}`, file, {
        access: 'private',
        handleUploadUrl: '/api/guides',
        contentType: file.type,
        multipart: true,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      })
      await send({ action: 'create', title: finalTitle, description: description.trim(), audience, pathname: blob.pathname })
      setTitle('')
      setDescription('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      await reload()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Upload failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a video</CardTitle>
          <CardDescription>Choose who will see it. MP4, MOV or WEBM, up to 300 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input list="guide-title-suggestions" placeholder="Title: tap here to pick a suggestion, or type your own" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
          <datalist id="guide-title-suggestions">
            {TITLE_SUGGESTIONS[audience].map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          <Input placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} />
          <div>
            <label htmlFor="guide-audience" className="text-sm font-medium text-gray-800">Who can watch it?</label>
            <select
              id="guide-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              disabled={busy}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="TESTER">Testers only</option>
              <option value="DEVELOPER">Developers only</option>
              <option value="ALL">Everyone (testers and developers)</option>
            </select>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()} className="w-full sm:w-auto">
            <FileVideo className="mr-2 h-4 w-4" /> {file ? 'Choose a different video' : 'Choose video file'}
          </Button>
          {file && <p className="text-xs text-green-700">Chosen: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</p>}
          <Button onClick={handleAdd} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {busy ? `Uploading ${progress}%` : 'Upload video'}
          </Button>
          {addError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{addError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All videos ({videos.length})</CardTitle>
          <CardDescription>The order here is the order people see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {videos.length === 0 && <p className="text-sm text-gray-600">No videos yet.</p>}
          {videos.map((video, index) => (
            <div key={video.id} className={`space-y-2 rounded-lg border p-3 ${video.hidden ? 'bg-gray-50 opacity-80' : ''}`}>
              {editingId === video.id ? (
                <div className="space-y-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={workingId === video.id} onClick={() => run(video.id, async () => {
                      await send({ action: 'update', id: video.id, title: editTitle, description: editDescription })
                      setEditingId(null)
                    })}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-900">
                    {video.title} {video.hidden && <span className="ml-1 rounded bg-gray-200 px-2 py-0.5 text-xs">Hidden</span>}
                  </p>
                  {video.description && <p className="text-sm text-gray-600">{video.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">{(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              )}

              <label className="block text-xs text-gray-700">
                Who can watch it:{' '}
                <select
                  value={video.audience}
                  disabled={workingId === video.id}
                  onChange={(e) => run(video.id, () => send({ action: 'update', id: video.id, audience: e.target.value }))}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                >
                  {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((value) => (
                    <option key={value} value={value}>{AUDIENCE_LABEL[value]}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={index === 0 || workingId === video.id} onClick={() => run(video.id, () => send({ action: 'move', id: video.id, direction: 'up' }))}>
                  <ArrowUp className="mr-1 h-4 w-4" /> Up
                </Button>
                <Button size="sm" variant="outline" disabled={index === videos.length - 1 || workingId === video.id} onClick={() => run(video.id, () => send({ action: 'move', id: video.id, direction: 'down' }))}>
                  <ArrowDown className="mr-1 h-4 w-4" /> Down
                </Button>
                <Button size="sm" variant="outline" disabled={workingId === video.id} onClick={() => run(video.id, () => send({ action: 'update', id: video.id, hidden: !video.hidden }))}>
                  {video.hidden ? <Eye className="mr-1 h-4 w-4" /> : <EyeOff className="mr-1 h-4 w-4" />}
                  {video.hidden ? 'Show' : 'Hide'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingId(video.id); setEditTitle(video.title); setEditDescription(video.description) }}>
                  <Pencil className="mr-1 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" disabled={workingId === video.id} onClick={() => {
                  if (window.confirm(`Delete "${video.title}"? This cannot be undone.`)) run(video.id, () => send({ action: 'delete', id: video.id }))
                }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
