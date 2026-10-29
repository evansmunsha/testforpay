'use client'

import { use } from 'react'
import { CommunityPostDetail } from '@/components/community/community-post-detail'

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <CommunityPostDetail postId={id} />
}
