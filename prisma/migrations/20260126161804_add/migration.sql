-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('APP_LAUNCH', 'FEATURE_USED', 'FEEDBACK_SUBMITTED', 'SESSION_END');

-- CreateTable
CREATE TABLE "AppUsageLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "eventType" "UsageEventType" NOT NULL,
    "featureName" TEXT,
    "sessionDuration" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionQuestionnaire" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "recruiterEase" TEXT,
    "engagementSummary" TEXT,
    "feedbackSummary" TEXT,
    "targetAudience" TEXT,
    "valueProposition" TEXT,
    "expectedInstalls" TEXT,
    "changesApplied" TEXT,
    "readinessCriteria" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppUsageLog_applicationId_idx" ON "AppUsageLog"("applicationId");

-- CreateIndex
CREATE INDEX "AppUsageLog_testerId_idx" ON "AppUsageLog"("testerId");

-- CreateIndex
CREATE INDEX "AppUsageLog_eventType_idx" ON "AppUsageLog"("eventType");

-- CreateIndex
CREATE INDEX "AppUsageLog_createdAt_idx" ON "AppUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionQuestionnaire_jobId_key" ON "ProductionQuestionnaire"("jobId");

-- CreateIndex
CREATE INDEX "ProductionQuestionnaire_developerId_idx" ON "ProductionQuestionnaire"("developerId");

-- AddForeignKey
ALTER TABLE "AppUsageLog" ADD CONSTRAINT "AppUsageLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUsageLog" ADD CONSTRAINT "AppUsageLog_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionQuestionnaire" ADD CONSTRAINT "ProductionQuestionnaire_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
