'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Volume2, VolumeX, X } from 'lucide-react'

export type FeedVideo = {
  id: string
  testerName: string
  dayNumber: number
  content: string
}

/** Full-screen, swipe-up feed of screen recordings (one per screen), like Shorts. */
export function VideoFeed({
  videos,
  startIndex = 0,
  onClose,
}: {
  videos: FeedVideo[]
  startIndex?: number
  onClose: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [active, setActive] = useState(startIndex)
  const [muted, setMuted] = useState(true)

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(videos.length - 1, index))
      scrollerRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth' })
    },
    [videos.length]
  )

  // Jump to the chosen video on open, and lock page scrolling behind the feed.
  useEffect(() => {
    scrollerRef.current?.children[startIndex]?.scrollIntoView()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [startIndex])

  // Play only the video that is mostly on screen.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index)
          const video = videoRefs.current[index]
          if (!video) return
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActive(index)
            video.play().catch(() => undefined)
          } else {
            video.pause()
          }
        })
      },
      { root, threshold: [0, 0.6, 1] }
    )
    Array.from(root.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [videos.length])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowDown') goTo(active + 1)
      if (event.key === 'ArrowUp') goTo(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, goTo, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true" aria-label="Screen recordings">
      <div ref={scrollerRef} className="h-full w-full snap-y snap-mandatory overflow-y-scroll">
        {videos.map((video, index) => (
          <section
            key={video.id}
            data-index={index}
            className="relative flex h-full w-full snap-start snap-always items-center justify-center"
          >
            <video
              ref={(element) => {
                videoRefs.current[index] = element
              }}
              src={Math.abs(index - active) <= 1 ? `/api/videos/${video.id}` : undefined}
              muted={muted}
              loop
              playsInline
              controls
              preload="metadata"
              className="h-full w-full max-w-[480px] bg-black object-contain"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-[480px] bg-gradient-to-b from-black/70 to-transparent p-4 pr-16 pt-14 text-white">
              <p className="text-sm font-semibold">
                {video.testerName} · Day {video.dayNumber}
              </p>
              {video.content && <p className="mt-1 line-clamp-3 text-xs text-white/85">{video.content}</p>}
              <p className="mt-1 text-[11px] text-white/60">
                {index + 1} of {videos.length}
              </p>
            </div>
            <a
              href={`/api/videos/${video.id}?download=1`}
              className="absolute bottom-24 right-3 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30 sm:right-[calc(50%-240px+12px)]"
              aria-label="Download this recording"
            >
              <Download className="h-5 w-5" />
            </a>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="absolute left-3 top-3 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
        aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30 disabled:opacity-30"
          aria-label="Previous recording"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === videos.length - 1}
          className="rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30 disabled:opacity-30"
          aria-label="Next recording"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
