import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { GroupChat } from '@/components/group/group-chat'

// Testers are sent to their job page; developers and admins keep the group chat page.
export default async function GroupChatPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const user = await getCurrentUser()
  if (user?.role === 'TESTER') {
    const application = await prisma.application.findUnique({
      where: { jobId_testerId: { jobId, testerId: user.userId } },
      select: { id: true },
    })
    if (application) redirect(`/dashboard/applications/${application.id}`)
    redirect('/dashboard/applications')
  }
  return <GroupChat jobId={jobId} />
}
