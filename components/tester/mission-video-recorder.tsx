'use client'

import { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { Camera, Loader2, Play, Square, UploadCloud, X } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { VIDEO_ALLOWED_TYPES, VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS, validateVideoMeta, videoPathPrefix } from '@/lib/video-rules'

export interface UploadedMissionVideo {
  pathname: string
  contentType: string
  sizeBytes: number
  durationSeconds: number
}

interface MissionVideoRecorderProps {
  taskId: string
  onUploaded: (video: UploadedMissionVideo | null) => void
  onUploadingChange: (uploading: boolean) => void
}

const MIME_CANDIDATES = ['video/mp4', 'video/quicktime']

export function MissionVideoRecorder({ taskId, onUploaded, onUploadingChange }: MissionVideoRecorderProps) {
  const { user } = useAuth()
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const objectUrlRef = useRef<string | null>(null)
  const startedAtRef = useRef(0)
  const [recording, setRecording] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')

  const clearPreview = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    onUploaded(null)
  }

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    stopTracks()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const setVideoFile = (nextFile: File, lengthSeconds: number) => {
    const result = validateVideoMeta({
      contentType: nextFile.type,
      sizeBytes: nextFile.size,
      durationSeconds: lengthSeconds,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }

    clearPreview()
    setError('')
    setUploaded(false)
    setFile(nextFile)
    setDurationSeconds(Math.ceil(lengthSeconds))
    objectUrlRef.current = URL.createObjectURL(nextFile)
  }

  const startRecording = async () => {
    setError('')
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      setError('Screen recording is not supported in this browser. Record with your device, then choose the MP4 or MOV file below.')
      return
    }

    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) {
      setError('This browser records in a format we cannot accept. Use your device screen recorder, then choose its MP4 or MOV file below.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      streamRef.current = stream
      chunksRef.current = []
      startedAtRef.current = Date.now()
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('The recording stopped because of a browser error.')
        setRecording(false)
        stopTracks()
      }
      recorder.onstop = () => {
        const seconds = Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        stopTracks()
        setRecording(false)
        if (blob.size > VIDEO_MAX_BYTES) {
          setError('This video is larger than 100 MB. Please make a shorter or smaller recording.')
          return
        }
        const extension = mimeType === 'video/quicktime' ? 'mov' : 'mp4'
        setVideoFile(new File([blob], `mission.${extension}`, { type: mimeType }), seconds)
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorder.state === 'recording') recorder.stop()
      }, { once: true })
      recorder.start(1000)
      setRecording(true)
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, VIDEO_MAX_SECONDS * 1000)
    } catch (recordError) {
      stopTracks()
      setError(recordError instanceof Error ? recordError.message : 'Could not start screen recording.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return
    const video = document.createElement('video')
    const temporaryUrl = URL.createObjectURL(selected)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const seconds = video.duration
      URL.revokeObjectURL(temporaryUrl)
      setVideoFile(selected, seconds)
    }
    video.onerror = () => {
      URL.revokeObjectURL(temporaryUrl)
      setError('The video could not be opened. Please choose an MP4 or MOV file.')
    }
    video.src = temporaryUrl
  }

  const uploadVideo = async () => {
    if (!file || !user?.id) {
      setError('Please sign in again before uploading.')
      return
    }
    setBusy(true)
    onUploadingChange(true)
    setProgress(0)
    setError('')
    try {
      const extension = file.type === 'video/quicktime' ? 'mov' : 'mp4'
      const pathname = `${videoPathPrefix(user.id, taskId)}${crypto.randomUUID()}.${extension}`
      const blob = await upload(pathname, file, {
        access: 'private',
        handleUploadUrl: '/api/videos/upload',
        clientPayload: JSON.stringify({ taskId }),
        contentType: file.type,
        multipart: true,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      })
      onUploaded({
        pathname: blob.pathname,
        contentType: file.type,
        sizeBytes: file.size,
        durationSeconds,
      })
      setUploaded(true)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Video upload failed. Please try again.')
    } finally {
      setBusy(false)
      onUploadingChange(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3" aria-label="Optional screen recording">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <Camera className="h-4 w-4 text-indigo-600" /> Screen recording <span className="font-normal text-gray-500">(optional)</span>
        </p>
        <p className="mt-1 text-xs text-gray-600">Up to 2 minutes and 100 MB. Only MP4 or MOV. The developer can view it after you submit.</p>
      </div>

      {!recording && !file && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="min-h-11" onClick={startRecording}>
            <Play className="mr-2 h-4 w-4" /> Record screen
          </Button>
          <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border bg-white px-4 text-sm font-medium text-gray-700">
            Choose MP4 or MOV
            <input
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {recording && (
        <Button type="button" variant="destructive" className="min-h-11 w-full" onClick={stopRecording}>
          <Square className="mr-2 h-4 w-4" /> Stop recording and preview
        </Button>
      )}

      {file && objectUrlRef.current && (
        <div className="space-y-2">
          <video className="max-h-64 w-full rounded-md bg-black" src={objectUrlRef.current} controls playsInline />
          <p className="text-xs text-gray-600">
            {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB · {durationSeconds} seconds
          </p>
          <div className="flex gap-2">
            <Button type="button" className="min-h-11 flex-1" onClick={uploadVideo}             disabled={busy || uploaded}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {busy ? `Uploading ${progress}%` : uploaded ? 'Video uploaded' : 'Upload recording'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                clearPreview()
                setFile(null)
                setProgress(0)
                setUploaded(false)
              }}
              aria-label="Remove recording"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {uploaded && <p className="text-sm text-green-700">Video uploaded. It will be attached when you submit your mission.</p>}
    </section>
  )
}
