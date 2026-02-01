'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// This page has been moved to the parent directory
// Redirecting to the new location for backwards compatibility
export default function ProfileRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/testers/${params.id}`)
  }, [params.id, router])

  return null
}
