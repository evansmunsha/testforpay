import { after } from 'next/server'
import prisma from '@/lib/prisma'
import { sendJobPostedEmail } from '@/lib/email'
import { communityPostPath, createJobPost, notifyUsers } from '@/lib/community'

/**
 * Makes a paid job live: status ACTIVE, developer email, community post, tester alerts.
 * Safe to call twice for the same payment: only a DRAFT job is changed.
 * Call this from a request handler (it uses `after`).
 */
export async function activateJobAfterPayment(jobId: string, paymentReference: string): Promise<boolean> {
  const claimed = await prisma.testingJob.updateMany({
    where: { id: jobId, status: 'DRAFT' },
    data: { status: 'ACTIVE', publishedAt: new Date(), stripePaymentIntent: paymentReference },
  })
  if (claimed.count === 0) return false

  const job = await prisma.testingJob.findUnique({
    where: { id: jobId },
    include: { developer: { select: { email: true, name: true } } },
  })
  if (!job) return false

  try {
    await sendJobPostedEmail(job.developer.email, {
      developerName: job.developer.name,
      appName: job.appName,
      testersNeeded: job.testersNeeded,
      paymentPerTesterCents: job.paymentPerTester,
      jobId: job.id,
    })
  } catch (emailError) {
    console.error('Job posted email failed:', emailError)
  }

  try {
    const jobPost = await createJobPost(job)
    if (jobPost) {
      const testers = await prisma.user.findMany({
        where: { role: 'TESTER', suspended: false },
        select: { id: true },
      })
      after(() =>
        notifyUsers(testers.map((tester) => tester.id), {
          title: '🚀 New job available',
          body: `${job.appName} needs testers.`,
          url: communityPostPath(jobPost.id),
          type: 'community_job',
        }).catch((notifyError) => console.error('Job post notification failed:', notifyError))
      )
    }
  } catch (postError) {
    console.error('Failed to create community job post:', postError)
  }

  return true
}
