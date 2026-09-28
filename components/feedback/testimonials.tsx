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
  category: string
  isVerified: boolean
  createdAt: string
  user: {
    name: string | null
    role: string
  }
}

interface TestimonialsProps {
  limit?: number
  type?: 'developer' | 'tester'
  onStateChange?: (state: { loading: boolean; hasContent: boolean }) => void
}

export function Testimonials({
  limit = 12,
  type,
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

  if (loading) {
    return null
  }

  // Categorize feedback dynamically
  const developerFeedback = testimonials.filter(
    item => item.type === 'developer'
  )

  const verifiedTestingFeedback = testimonials.filter(
    item =>
      item.category === 'JOB_COMPLETION' &&
      item.isVerified === true &&
      item.type === 'tester'
  )

  const earlyUserFeedback = testimonials.filter(
    item =>
      item.category === 'PLATFORM' &&
      item.type === 'tester' &&
      !item.isVerified
  )

  // Don't render if no feedback at all
  if (testimonials.length === 0) {
    return null
  }

  return (
    <div className="space-y-16">
      {/* Developer Testimonials Section */}
      {developerFeedback.length > 0 && (
        <div className="space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">What Developers Say</h2>
            <p className="mt-4 text-center text-gray-600 text-lg">
              Feedback from developers and teams using TestForPay
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {developerFeedback.map(testimonial => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>
      )}

      {/* Verified Testing Feedback Section */}
      {verifiedTestingFeedback.length > 0 && (
        <div className="space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">What Testers Say</h2>
            <p className="mt-4 text-center text-gray-600 text-lg">
              Verified feedback from testers who completed testing experiences through TestForPay
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {verifiedTestingFeedback.map(testimonial => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>
      )}

      {/* Early User Feedback Section */}
      {earlyUserFeedback.length > 0 && (
        <div className="space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">What Early Users Say</h2>
            <p className="mt-4 text-center text-gray-600 text-lg">
              Real feedback from people who have joined and explored TestForPay
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {earlyUserFeedback.map(testimonial => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable testimonial card component
function TestimonialCard({ testimonial }: { testimonial: Feedback }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition">
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

        {/* Verification Badge - Only when server confirms it */}
        {testimonial.isVerified && (
          <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified test completion
          </p>
        )}

        {/* Early user label */}
        {testimonial.category === 'PLATFORM' && testimonial.type === 'tester' && !testimonial.isVerified && (
          <p className="text-xs text-gray-500 mt-2">
            Early TestForPay feedback
          </p>
        )}
      </div>
    </div>
  )
}
