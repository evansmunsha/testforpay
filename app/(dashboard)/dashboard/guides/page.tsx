'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, PlayCircle, Trash2, UploadCloud } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Audience = 'TESTER' | 'DEVELOPER' | 'ALL'
type Guide = {
  id: string
  title: string
  description: string
  audience: Audience
  hidden: boolean
  sortOrder: number
  sizeBytes: number
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  TESTER: 'Testers',
  DEVELOPER: 'Developers',
  ALL: 'Everyone',
}

async function send(body: Record<string, unknown>) {
  const res = await fetch('/api/guides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

export default function GuidesPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [videos, setVideos] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guides', { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load the videos. Refresh the page.')
      setVideos((await res.json()).videos ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the videos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading || loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{isAdmin ? 'Guide videos' : 'How it works'}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {isAdmin ? 'Upload, hide, reorder or delete the training videos.' : 'Watch these short videos. They show every step in simple English.'}
        </p>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {isAdmin && <AdminTools videos={videos} reload={load} setError={setError} />}
      {!isAdmin && videos.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-gray-600">No videos yet. Please check again soon.</CardContent></Card>
      )}
      {!isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <Card key={video.id}>
              <CardContent className="space-y-2 pt-4">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={`/api/guides?stream=${video.id}`}
                  className="aspect-video w-full rounded-lg bg-black"
                />
                <p className="font-medium text-gray-900">{video.title}</p>
                {video.description && <p className="text-sm text-gray-600">{video.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
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
    if (!file) return setError('Choose a video file first.')
    if (title.trim().length < 3) return setError('Write a title (at least 3 letters).')
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) return setError('Only MP4, MOV or WEBM videos are allowed.')
    if (file.size > 300 * 1024 * 1024) return setError('The video is bigger than 300 MB. Make it smaller and try again.')
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
      await send({ action: 'create', title: title.trim(), description: description.trim(), audience, pathname: blob.pathname })
      setTitle('')
      setDescription('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
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
          <Input placeholder="Title, for example: 1. Get started" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
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
            className="block w-full text-sm"
          />
          <Button onClick={handleAdd} disabled={busy || !file} className="w-full sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {busy ? `Uploading ${progress}%` : 'Upload video'}
          </Button>
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
                <Button size="sm" variant="outline" onClick={() => setPreview(preview === video.id ? null : video.id)}>
                  <PlayCircle className="mr-1 h-4 w-4" /> Watch
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
              {preview === video.id && (
                <video controls preload="metadata" playsInline src={`/api/guides?stream=${video.id}`} className="aspect-video w-full max-w-xl rounded-lg bg-black" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
