import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { TesterJobPage } from '@/components/tester/tester-job-page'

// The tester's job page. Notifications and the My Jobs list link here with the application id.
export default async function ApplicationJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      jobId: true,
      testerId: true,
      status: true,
      verificationImage: true,
      testingPausedAt: true,
      feedback: true,
      job: { select: { appName: true, googlePlayLink: true } },
    },
  })

  if (user.role !== 'TESTER') {
    // Developers and admins use the group page for the job.
    redirect(application ? `/dashboard/group/${application.jobId}` : '/dashboard')
  }
  if (!application || application.testerId !== user.userId) redirect('/dashboard/applications')

  return (
    <TesterJobPage
      jobId={application.jobId}
      appName={application.job.appName}
      status={application.status}
      hasVerificationImage={Boolean(application.verificationImage)}
      paused={Boolean(application.testingPausedAt)}
      hasFeedback={Boolean(application.feedback)}
      googlePlayLink={application.job.googlePlayLink}
    />
  )
}
