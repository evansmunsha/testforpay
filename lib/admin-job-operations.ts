import prisma from '@/lib/prisma'
import { COHORT_BLOCKER_MESSAGES, evaluateCohortReadiness } from '@/lib/cohort-readiness'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'

export const OPERATIONS_PAGE_SIZE = 25

export function readPageParam(value: string | null): number {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/**
 * Everything an admin needs to oversee one job: group readiness, every tester with their
 * checks and uploads, reports, and daily mission screenshots. Lists are paged.
 */
export async function loadJobOperations(
  jobId: string,
  pages: { applications: number; submissions: number; reports: number }
) {
  const pageSize = OPERATIONS_PAGE_SIZE
  const job = await prisma.testingJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      appName: true,
      status: true,
      testersNeeded: true,
      testDuration: true,
      supportedCountries: true,
      minAndroidVersion: true,
      googlePlayLink: true,
      startedAt: true,
      developer: { select: { id: true, name: true, email: true } },
      applications: {
        orderBy: [{ createdAt: 'asc' }],
        select: {
          id: true,
          status: true,
          cohortSelected: true,
          optInVerified: true,
          verificationImage: true,
          verificationImage2: true,
          verifiedAt: true,
          testingStartDate: true,
          testingEndDate: true,
          testingPausedAt: true,
          createdAt: true,
          payment: { select: { status: true, transferId: true } },
          tester: {
            select: {
              id: true,
              name: true,
              email: true,
              countryCode: true,
              deviceInfo: { select: { deviceModel: true, androidVersion: true, screenSize: true } },
            },
          },
          issueReports: {
            where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'INCOMPATIBLE'] } },
            select: { id: true },
          },
        },
      },
    },
  })
  if (!job) return null

  const readiness = evaluateCohortReadiness({
    testersNeeded: job.testersNeeded,
    supportedCountries: job.supportedCountries,
    minAndroidVersion: job.minAndroidVersion,
    activeTestingCount: job.applications.filter((application) =>
      application.status === 'TESTING' && application.testingPausedAt === null
    ).length,
    completedSelectedCount: job.applications.filter((application) =>
      application.cohortSelected && application.status === 'COMPLETED'
    ).length,
    applications: job.applications.map((application) => ({
      id: application.id,
      status: application.status,
      cohortSelected: application.cohortSelected,
      optInVerified: application.optInVerified,
      testingPausedAt: application.testingPausedAt,
      openIssueCount: application.issueReports.length,
      payment: application.payment
        ? { status: application.payment.status, transferId: application.payment.transferId }
        : null,
      tester: {
        countryCode: application.tester.countryCode,
        androidVersion: application.tester.deviceInfo?.androidVersion,
      },
    })),
  })

  const statusCounts: Record<string, number> = {}
  for (const application of job.applications) {
    statusCounts[application.status] = (statusCounts[application.status] ?? 0) + 1
  }

  const pagedApplications = job.applications.slice(
    (pages.applications - 1) * pageSize,
    pages.applications * pageSize
  )
  const testerIds = pagedApplications.map((application) => application.tester.id)

  const submissionCounts: Array<{ testerId: string; count: number }> = testerIds.length
    ? (await prisma.taskSubmission.groupBy({
        by: ['testerId'],
        where: { testerId: { in: testerIds }, task: { jobId } },
        _count: { _all: true },
      })).map((row) => ({ testerId: row.testerId, count: row._count._all }))
    : []

  const [reportsTotal, reports, submissionsTotal, submissions] = await Promise.all([
    prisma.applicationIssueReport.count({ where: { jobId } }),
    prisma.applicationIssueReport.findMany({
      where: { jobId },
      orderBy: [{ createdAt: 'desc' }],
      skip: (pages.reports - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        applicationId: true,
        category: true,
        details: true,
        attachmentUrls: true,
        status: true,
        adminNote: true,
        createdAt: true,
        tester: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.taskSubmission.count({ where: { task: { jobId } } }),
    prisma.taskSubmission.findMany({
      where: { task: { jobId } },
      orderBy: [{ completedAt: 'desc' }],
      skip: (pages.submissions - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        content: true,
        screenshotUrl: true,
        completedAt: true,
        task: { select: { dayNumber: true } },
        tester: { select: { id: true, name: true, email: true } },
      },
    }),
  ])
  const missionsByTester = new Map(submissionCounts.map((row) => [row.testerId, row.count]))

  return {
    job: {
      id: job.id,
      appName: job.appName,
      status: job.status,
      testersNeeded: job.testersNeeded,
      testDuration: job.testDuration,
      supportedCountries: job.supportedCountries,
      minAndroidVersion: job.minAndroidVersion,
      googlePlayLink: job.googlePlayLink,
      startedAt: job.startedAt,
      developer: job.developer,
    },
    readiness: {
      canStart: readiness.canStart,
      verifiedCount: readiness.verifiedCount,
      pausedToResume: readiness.pausedIds.length,
      blockers: readiness.blockers.map((blocker) => ({ code: blocker, message: COHORT_BLOCKER_MESSAGES[blocker] })),
    },
    statusCounts,
    applications: {
      page: pages.applications,
      pageSize,
      total: job.applications.length,
      items: pagedApplications.map((application) => ({
        id: application.id,
        status: application.status,
        optInVerified: application.optInVerified,
        verificationImage: application.verificationImage,
        verificationImage2: application.verificationImage2,
        verifiedAt: application.verifiedAt,
        testingStartDate: application.testingStartDate,
        testingEndDate: application.testingEndDate,
        testingPausedAt: application.testingPausedAt,
        createdAt: application.createdAt,
        paymentStatus: application.payment?.status ?? null,
        hasUnresolvedIssue: application.issueReports.length > 0,
        passesScreening: passesDeclaredJobScreening({
          testerCountryCode: application.tester.countryCode,
          testerAndroidVersion: application.tester.deviceInfo?.androidVersion,
          supportedCountries: job.supportedCountries,
          minimumAndroidVersion: job.minAndroidVersion,
        }),
        missionSubmissions: missionsByTester.get(application.tester.id) ?? 0,
        tester: application.tester,
      })),
    },
    reports: { page: pages.reports, pageSize, total: reportsTotal, items: reports },
    missionSubmissions: { page: pages.submissions, pageSize, total: submissionsTotal, items: submissions },
  }
}
