'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, ChevronUp, Heart, Volume2, VolumeX, X } from 'lucide-react'
import type { Guide } from '@/components/dashboard/guide-watch-list'

export function cleanTitle(title: string) {
  return title.replace(/^\d+\.\s*/, '')
}

/** Full-screen, swipe-up feed of guide videos (one per screen), like Shorts. */
export function GuideFeed({
  videos,
  onWatched,
  onLike,
}: {
  videos: Guide[]
  onWatched: (id: string) => void
  onLike: (id: string) => void
}) {
  const router = useRouter()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(videos.length - 1, index))
      scrollerRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth' })
    },
    [videos.length]
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Find which video is mostly on screen.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActive(Number((entry.target as HTMLElement).dataset.index))
            setProgress(0)
            setPaused(false)
          }
        })
      },
      { root, threshold: [0.6, 1] }
    )
    Array.from(root.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [videos.length])

  // Only the video on screen plays. If sound is blocked by the phone, start muted.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video && index !== active) video.pause()
    })
    const current = videoRefs.current[active]
    if (!current) return
    current.muted = muted
    current.play().catch(() => {
      if (!muted) setMuted(true)
    })
  }, [active, muted])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') router.push('/dashboard')
      if (event.key === 'ArrowDown') goTo(active + 1)
      if (event.key === 'ArrowUp') goTo(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, goTo, router])

  const togglePlay = (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return
    if (video.paused) video.play().catch(() => undefined)
    else video.pause()
  }

  const btn = 'rounded-full bg-white/20 p-2.5 text-white backdrop-blur hover:bg-white/30 disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true" aria-label="How it works videos">
      <div ref={scrollerRef} className="h-full w-full snap-y snap-mandatory overflow-y-scroll">
        {videos.map((video, index) => (
          <section
            key={video.id}
            data-index={index}
            className="relative flex h-full w-full snap-start snap-always items-center justify-center"
          >
            <div className="relative h-full w-full max-w-[min(480px,56.25dvh)] bg-gray-900">
              {index === active ? (
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element
                  }}
                  src={`/api/guides?stream=${video.id}#t=0.1`}
                  muted={muted}
                  playsInline
                  preload="auto"
                  onClick={() => togglePlay(index)}
                  onPlay={() => setPaused(false)}
                  onPause={() => setPaused(true)}
                  onTimeUpdate={(event) => {
                    const player = event.currentTarget
                    if (player.duration > 0) {
                      setProgress(player.currentTime / player.duration)
                      if (player.currentTime / player.duration >= 0.9) onWatched(video.id)
                    }
                  }}
                  onEnded={() => {
                    onWatched(video.id)
                    goTo(index + 1)
                  }}
                  className="h-full w-full bg-black object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950">
                  <span className="text-6xl font-bold text-white/20">{index + 1}</span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 pl-16 pr-16 pt-5 text-white">
                <p className="text-xs font-medium text-white/70">
                  Video {index + 1} of {videos.length}
                </p>
                <p className="mt-0.5 text-base font-semibold leading-snug">{cleanTitle(video.title)}</p>
              </div>

              {index === active && paused && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white">Tap to play</span>
                </div>
              )}

              <div className="absolute bottom-6 right-3 flex flex-col items-center gap-3">
                {video.watchedByMe && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Watched
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onLike(video.id)}
                  className={btn}
                  aria-label={video.likedByMe ? 'Remove your like' : 'Like this video'}
                >
                  <Heart className={`h-5 w-5 ${video.likedByMe ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
                <span className="-mt-2 text-xs text-white">{video.likeCount}</span>
              </div>

              {index === active && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                  <div className="h-full bg-white" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <button type="button" onClick={() => router.push('/dashboard')} className={`absolute right-3 top-3 ${btn}`} aria-label="Close videos">
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className={`absolute left-3 top-3 ${btn}`}
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute bottom-6 left-3 flex flex-col gap-2 sm:left-auto sm:right-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
        <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} className={`${btn} flex items-center gap-1 text-xs font-medium`} aria-label="Back">
          <ChevronUp className="h-5 w-5" /> <span className="pr-1">Back</span>
        </button>
        <button type="button" onClick={() => goTo(active + 1)} disabled={active === videos.length - 1} className={`${btn} flex items-center gap-1 text-xs font-medium`} aria-label="Next">
          <ChevronDown className="h-5 w-5" /> <span className="pr-1">Next</span>
        </button>
      </div>
    </div>
  )
}
