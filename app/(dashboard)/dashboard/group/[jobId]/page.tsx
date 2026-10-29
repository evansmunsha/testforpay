'use client'

import { use } from 'react'
import { GroupChat } from '@/components/group/group-chat'

export default function GroupChatPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  return <GroupChat jobId={jobId} />
}
