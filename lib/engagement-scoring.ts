/**
 * Engagement Scoring System
 * 
 * Calculates a 0-100 engagement score based on tester activities:
 * - Feedback Quality (25 points)
 * - Verification Completeness (20 points)
 * - Testing Duration (20 points)
 * - Response Time (15 points)
 * - Rating Submission (10 points)
 * - Screenshot Quality (10 points)
 */

interface EngagementInput {
  feedback?: string | null
  rating?: number | null
  verificationImage?: string | null
  verificationImage2?: string | null
  testingStartDate?: Date | string | null
  testingEndDate?: Date | string | null
  createdAt: Date | string
  feedbackSubmittedAt?: Date | string | null
  status: string
}

export function calculateEngagementScore(application: EngagementInput): number {
  let score = 0

  // 1. FEEDBACK QUALITY (25 points max)
  if (application.feedback) {
    const feedbackLength = application.feedback.trim().length
    
    if (feedbackLength >= 200) {
      score += 25 // Detailed feedback
    } else if (feedbackLength >= 100) {
      score += 18 // Moderate feedback
    } else if (feedbackLength >= 50) {
      score += 10 // Brief but present
    } else {
      score += 5 // Minimal feedback
    }
  } else if (application.status === 'COMPLETED' || application.status === 'TESTING') {
    // If testing is done/done but no feedback, penalize
    score += 0
  }

  // 2. VERIFICATION COMPLETENESS (20 points max)
  const verificationImages = [
    application.verificationImage,
    application.verificationImage2,
  ].filter(Boolean).length

  if (verificationImages === 2) {
    score += 20 // Both screenshots uploaded
  } else if (verificationImages === 1) {
    score += 10 // Only one screenshot
  } else {
    score += 0 // No screenshots
  }

  // 3. TESTING DURATION (20 points max)
  if (application.testingStartDate && application.testingEndDate) {
    const start = new Date(application.testingStartDate)
    const end = new Date(application.testingEndDate)
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (durationDays >= 7) {
      score += 20 // Full week or more
    } else if (durationDays >= 5) {
      score += 16 // 5-7 days
    } else if (durationDays >= 3) {
      score += 12 // 3-5 days
    } else if (durationDays >= 1) {
      score += 8 // 1-3 days
    } else {
      score += 4 // Less than 1 day
    }
  }

  // 4. RESPONSE TIME (15 points max)
  if (application.feedbackSubmittedAt) {
    const created = new Date(application.createdAt)
    const feedbackSubmitted = new Date(application.feedbackSubmittedAt)
    const responseTimeHours =
      (feedbackSubmitted.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (responseTimeHours <= 24) {
      score += 15 // Submitted within 24 hours
    } else if (responseTimeHours <= 48) {
      score += 12 // Within 2 days
    } else if (responseTimeHours <= 72) {
      score += 10 // Within 3 days
    } else {
      score += 5 // Longer than 3 days
    }
  }

  // 5. RATING SUBMISSION (10 points max)
  if (application.rating !== null && application.rating !== undefined) {
    score += 10 // Submitted a rating
  }

  // 6. SCREENSHOT QUALITY BONUS (up to 10 points, conditional)
  // This is a simple heuristic - in production, you'd want to analyze image size/clarity
  if (verificationImages === 2 && application.feedback && application.feedback.length >= 100) {
    score += 5 // Bonus for complete package
  }

  // Cap score at 100
  return Math.min(score, 100)
}

export function getEngagementLevel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Satisfactory'
  if (score >= 30) return 'Poor'
  return 'Minimal'
}

export function getEngagementColor(score: number): string {
  if (score >= 85) return 'bg-green-50 text-green-900'
  if (score >= 70) return 'bg-blue-50 text-blue-900'
  if (score >= 50) return 'bg-yellow-50 text-yellow-900'
  if (score >= 30) return 'bg-orange-50 text-orange-900'
  return 'bg-red-50 text-red-900'
}

export function getEngagementBadgeColor(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800'
  if (score >= 70) return 'bg-blue-100 text-blue-800'
  if (score >= 50) return 'bg-yellow-100 text-yellow-800'
  if (score >= 30) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export function explainEngagementScore(application: EngagementInput): {
  total: number
  breakdown: Array<{ category: string; points: number; explanation: string }>
} {
  const breakdown = []
  let total = 0

  // Feedback quality
  let feedbackPoints = 0
  let feedbackExplanation = ''
  if (application.feedback) {
    const length = application.feedback.trim().length
    if (length >= 200) {
      feedbackPoints = 25
      feedbackExplanation = `Detailed feedback (${length} characters)`
    } else if (length >= 100) {
      feedbackPoints = 18
      feedbackExplanation = `Moderate feedback (${length} characters)`
    } else if (length >= 50) {
      feedbackPoints = 10
      feedbackExplanation = `Brief feedback (${length} characters)`
    } else {
      feedbackPoints = 5
      feedbackExplanation = `Minimal feedback (${length} characters)`
    }
  } else {
    feedbackExplanation = 'No feedback submitted'
  }
  breakdown.push({
    category: 'Feedback Quality',
    points: feedbackPoints,
    explanation: feedbackExplanation,
  })
  total += feedbackPoints

  // Verification
  const imageCount = [
    application.verificationImage,
    application.verificationImage2,
  ].filter(Boolean).length
  const verificationPoints = imageCount === 2 ? 20 : imageCount === 1 ? 10 : 0
  breakdown.push({
    category: 'Verification',
    points: verificationPoints,
    explanation: `${imageCount}/2 screenshots uploaded`,
  })
  total += verificationPoints

  // Duration
  let durationPoints = 0
  let durationExplanation = ''
  if (application.testingStartDate && application.testingEndDate) {
    const start = new Date(application.testingStartDate)
    const end = new Date(application.testingEndDate)
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (days >= 7) {
      durationPoints = 20
      durationExplanation = `Tested for ${days.toFixed(1)} days (excellent duration)`
    } else if (days >= 5) {
      durationPoints = 16
      durationExplanation = `Tested for ${days.toFixed(1)} days (good duration)`
    } else if (days >= 3) {
      durationPoints = 12
      durationExplanation = `Tested for ${days.toFixed(1)} days (fair duration)`
    } else if (days >= 1) {
      durationPoints = 8
      durationExplanation = `Tested for ${days.toFixed(1)} days (brief)`
    } else {
      durationPoints = 4
      durationExplanation = `Tested for less than 1 day`
    }
  } else {
    durationExplanation = 'Testing dates not yet recorded'
  }
  breakdown.push({
    category: 'Testing Duration',
    points: durationPoints,
    explanation: durationExplanation,
  })
  total += durationPoints

  // Response time
  let responsePoints = 0
  let responseExplanation = ''
  if (application.feedbackSubmittedAt) {
    const created = new Date(application.createdAt)
    const submitted = new Date(application.feedbackSubmittedAt)
    const hours = (submitted.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (hours <= 24) {
      responsePoints = 15
      responseExplanation = `Submitted within 24 hours (${hours.toFixed(1)}h)`
    } else if (hours <= 48) {
      responsePoints = 12
      responseExplanation = `Submitted within 2 days (${hours.toFixed(1)}h)`
    } else if (hours <= 72) {
      responsePoints = 10
      responseExplanation = `Submitted within 3 days (${hours.toFixed(1)}h)`
    } else {
      responsePoints = 5
      responseExplanation = `Submitted after 3+ days (${hours.toFixed(1)}h)`
    }
  } else {
    responseExplanation = 'Feedback not yet submitted'
  }
  breakdown.push({
    category: 'Response Time',
    points: responsePoints,
    explanation: responseExplanation,
  })
  total += responsePoints

  // Rating
  const ratingPoints = application.rating !== null && application.rating !== undefined ? 10 : 0
  breakdown.push({
    category: 'Rating Submission',
    points: ratingPoints,
    explanation: application.rating ? `Submitted ${application.rating}/5 rating` : 'No rating submitted',
  })
  total += ratingPoints

  return {
    total: Math.min(total, 100),
    breakdown,
  }
}
