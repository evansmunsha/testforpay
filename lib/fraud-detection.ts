import prisma from './prisma';

export type FraudType = 
  | 'duplicate_ip'
  | 'same_device'
  | 'rapid_applications'
  | 'suspicious_pattern'
  | 'new_account_spam'
  | 'collusion_suspected';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';

interface FraudCheckResult {
  isSuspicious: boolean;
  score: number;
  reasons: string[];
}

// Check for fraud indicators when user applies to a job
export async function checkApplicationFraud(
  testerId: string,
  jobId: string,
  ipAddress: string | null
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let score = 0;

  const tester = await prisma.user.findUnique({
    where: { id: testerId },
    include: {
      applications: {
        include: { job: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      deviceInfo: true,
    },
  });

  if (!tester) {
    return { isSuspicious: false, score: 0, reasons: [] };
  }

  const job = await prisma.testingJob.findUnique({
    where: { id: jobId },
    include: { developer: true },
  });

  if (!job) {
    return { isSuspicious: false, score: 0, reasons: [] };
  }

  // 1. Check if tester account is very new (< 1 hour) - potential spam
  const accountAge = Date.now() - new Date(tester.createdAt).getTime();
  const oneHour = 60 * 60 * 1000;
  if (accountAge < oneHour) {
    score += 20;
    reasons.push('Account created less than 1 hour ago');
  }

  // 2. Check rapid applications (> 5 in last hour)
  const oneHourAgo = new Date(Date.now() - oneHour);
  const recentApplications = tester.applications.filter(
    app => new Date(app.createdAt) > oneHourAgo
  );
  if (recentApplications.length > 5) {
    score += 30;
    reasons.push(`${recentApplications.length} applications in the last hour`);
  }

  // 3. Check if same IP applied to this job already
  if (ipAddress) {
    const sameIpApplications = await prisma.application.findMany({
      where: {
        jobId,
        ipAddress,
        testerId: { not: testerId },
      },
    });
    if (sameIpApplications.length > 0) {
      score += 40;
      reasons.push('Same IP address used by another applicant for this job');
      
      await logFraud({
        userId: testerId,
        type: 'duplicate_ip',
        severity: 'high',
        description: `Same IP (${ipAddress}) used by ${sameIpApplications.length + 1} testers for job ${job.appName}`,
        ipAddress,
        metadata: { jobId, otherTesters: sameIpApplications.map(a => a.testerId) },
      });
    }
  }

  // 4. Check if tester applied to multiple jobs from same developer
  const sameDevApps = tester.applications.filter(
    app => app.job.developerId === job.developerId
  );
  if (sameDevApps.length >= 3) {
    score += 25;
    reasons.push(`Applied to ${sameDevApps.length} jobs from the same developer`);
    
    await logFraud({
      userId: testerId,
      type: 'collusion_suspected',
      severity: 'medium',
      description: `Tester applied to ${sameDevApps.length} jobs from developer ${job.developer.email}`,
      metadata: { developerId: job.developerId, jobIds: sameDevApps.map(a => a.jobId) },
    });
  }

  // 5. Check device info duplication
  if (tester.deviceInfo) {
    const sameDeviceUsers = await prisma.deviceInfo.findMany({
      where: {
        deviceModel: tester.deviceInfo.deviceModel,
        androidVersion: tester.deviceInfo.androidVersion,
        userId: { not: testerId },
      },
      include: {
        user: {
          include: {
            applications: {
              where: { jobId },
            },
          },
        },
      },
    });
    
    const conflictingUsers = sameDeviceUsers.filter(
      d => d.user.applications.length > 0
    );
    
    if (conflictingUsers.length > 0) {
      score += 35;
      reasons.push('Same device info as another applicant');
      
      await logFraud({
        userId: testerId,
        type: 'same_device',
        severity: 'high',
        description: `Same device (${tester.deviceInfo.deviceModel}) used by multiple testers for job ${job.appName}`,
        metadata: { 
          device: tester.deviceInfo.deviceModel,
          otherUsers: conflictingUsers.map(d => d.userId),
        },
      });
    }
  }

  // Update user's fraud score
  const newFraudScore = Math.min(100, tester.fraudScore + score);
  const shouldFlag = newFraudScore >= 50;

  if (score > 0) {
    await prisma.user.update({
      where: { id: testerId },
      data: {
        fraudScore: newFraudScore,
        flagged: shouldFlag,
        lastIpAddress: ipAddress,
      },
    });
  }

  return {
    isSuspicious: score >= 30,
    score,
    reasons,
  };
}

// Log a fraud event
export async function logFraud({
  userId,
  type,
  severity,
  description,
  ipAddress,
  metadata,
}: {
  userId?: string;
  type: FraudType;
  severity: FraudSeverity;
  description: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.fraudLog.create({
    data: {
      userId,
      type,
      severity,
      description,
      ipAddress,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

// Get fraud statistics for admin dashboard
export async function getFraudStats() {
  const [
    totalFlagged,
    unresolvedLogs,
    recentHighSeverity,
    topSuspiciousUsers,
  ] = await Promise.all([
    prisma.user.count({ where: { flagged: true } }),
    prisma.fraudLog.count({ where: { resolved: false } }),
    prisma.fraudLog.count({
      where: {
        severity: { in: ['high', 'critical'] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.user.findMany({
      where: { fraudScore: { gt: 30 } },
      orderBy: { fraudScore: 'desc' },
      take: 10,
      select: {
        id: true,
        email: true,
        name: true,
        fraudScore: true,
        flagged: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    }),
  ]);

  return {
    totalFlagged,
    unresolvedLogs,
    recentHighSeverity,
    topSuspiciousUsers,
  };
}

// Get detailed fraud logs
export async function getFraudLogs(options: {
  resolved?: boolean;
  severity?: FraudSeverity;
  limit?: number;
}) {
  return prisma.fraudLog.findMany({
    where: {
      resolved: options.resolved,
      severity: options.severity,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
  });
}

// Resolve a fraud log
export async function resolveFraudLog(logId: string, adminId: string) {
  return prisma.fraudLog.update({
    where: { id: logId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: adminId,
    },
  });
}

// Clear fraud flags for a user (admin action)
export async function clearUserFraudFlags(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      fraudScore: 0,
      flagged: false,
    },
  });
}
