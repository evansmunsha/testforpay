'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'

interface Feedback {
  id: string
  rating: number
  title: string
  message: string
  displayName: string | null
  companyName: string | null
  type: string
  createdAt: string
  user: {
    name: string | null
    role: string
  }
}

interface TestimonialsProps {
  limit?: number
  type?: 'developer' | 'tester'
  title?: string
  intro?: string
  onStateChange?: (state: { loading: boolean; hasContent: boolean }) => void
}

export function Testimonials({
  limit = 6,
  type,
  title = 'What Our Users Say',
  intro = 'Real feedback from developers and testers using TestForPay',
  onStateChange,
}: TestimonialsProps) {
  const [testimonials, setTestimonials] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    onStateChange?.({ loading: true, hasContent: true })

    const fetchTestimonials = async () => {
      try {
        const params = new URLSearchParams()
        if (limit) params.append('limit', limit.toString())
        if (type) params.append('type', type)

        const response = await fetch(`/api/feedback?${params}`)
        const data = await response.json()

        if (data.success) {
          const nextTestimonials = data.feedback || []
          setTestimonials(nextTestimonials)
          onStateChange?.({ loading: false, hasContent: nextTestimonials.length > 0 })
        } else {
          onStateChange?.({ loading: false, hasContent: false })
        }
      } catch (error) {
        console.error('Failed to fetch testimonials:', error)
        onStateChange?.({ loading: false, hasContent: false })
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [limit, type])

  if (loading || testimonials.length === 0) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold">{title}</h2>
        <p className="mt-4 text-center text-gray-600 text-lg">{intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map(testimonial => (
          <div
            key={testimonial.id}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition"
          >
            {/* Rating */}
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < testimonial.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Title */}
            <h3 className="font-bold text-lg mb-2 text-gray-900">{testimonial.title}</h3>

            {/* Message */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{testimonial.message}</p>

            {/* Author */}
            <div className="border-t pt-4">
              <p className="font-semibold text-sm text-gray-900">
                {testimonial.displayName || testimonial.user.name || 'Anonymous'}
              </p>
              {testimonial.companyName && (
                <p className="text-xs text-gray-500">{testimonial.companyName}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {testimonial.type === 'developer' ? '👨‍💻 Developer' : '📱 Tester'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
