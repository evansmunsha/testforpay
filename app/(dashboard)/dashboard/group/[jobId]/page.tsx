'use client'

import { use } from 'react'
import { GroupChat } from '@/components/group/group-chat'
import { TesterJobMissions } from '@/components/tester/job-missions-panel'

export default function GroupChatPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  return (
    <div className="space-y-6">
      <TesterJobMissions jobId={jobId} />
      <GroupChat jobId={jobId} />
    </div>
  )
}
