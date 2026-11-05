'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Play } from 'lucide-react'
import type { Guide } from '@/components/dashboard/guide-watch-list'
import { cleanTitle } from '@/components/dashboard/guide-feed'

/** One normal 16:9 player in a small centred box, with a list of titles to click. */
export function GuidePlayer({
  videos,
  onWatched,
}: {
  videos: Guide[]
  onWatched: (id: string) => void
}) {
  const [selectedId, setSelectedId] = useState(videos[0]?.id ?? '')
  const [autoPlay, setAutoPlay] = useState(false)
  const wasWatched = useRef(new Set<string>())

  const selected = videos.find((video) => video.id === selectedId) ?? videos[0]
  if (!selected) return null
  const selectedIndex = videos.findIndex((video) => video.id === selected.id)

  const markWatched = () => {
    if (selected.watchedByMe || wasWatched.current.has(selected.id)) return
    wasWatched.current.add(selected.id)
    onWatched(selected.id)
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-3">
        <video
          key={selected.id}
          src={`/api/guides?stream=${selected.id}#t=0.1`}
          controls
          playsInline
          preload="metadata"
          autoPlay={autoPlay}
          controlsList="nodownload"
          onTimeUpdate={(event) => {
            const player = event.currentTarget
            if (player.duration > 0 && player.currentTime / player.duration >= 0.9) markWatched()
          }}
          onEnded={markWatched}
          className="aspect-video w-full rounded-xl bg-black"
        />
        <div>
          <p className="text-xs font-medium text-gray-500">
            Video {selectedIndex + 1} of {videos.length}
          </p>
          <h3 className="text-lg font-semibold text-gray-900">{cleanTitle(selected.title)}</h3>
          {selected.description && <p className="mt-1 text-sm text-gray-600">{selected.description}</p>}
        </div>
      </div>

      <nav aria-label="All videos" className="max-h-[28rem] overflow-y-auto rounded-xl border bg-white">
        <ul className="divide-y">
          {videos.map((video, index) => {
            const isSelected = video.id === selected.id
            return (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAutoPlay(true)
                    setSelectedId(video.id)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${
                    isSelected ? 'bg-indigo-50 font-semibold text-indigo-800' : 'text-gray-800'
                  }`}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <span className="w-6 shrink-0 text-xs text-gray-500">{index + 1}</span>
                  <span className="min-w-0 flex-1">{cleanTitle(video.title)}</span>
                  {video.watchedByMe ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label="Watched" />
                  ) : isSelected ? (
                    <Play className="h-4 w-4 shrink-0" aria-label="Now showing" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
