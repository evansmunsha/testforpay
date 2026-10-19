ALTER TABLE "Application"
ADD COLUMN "testingPausedAt" TIMESTAMP(3),
ADD COLUMN "testingPausedDurationMs" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "ApplicationPause" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL,
    "pauseReason" TEXT NOT NULL,
    "pausedById" TEXT NOT NULL,
    "resumeScheduledAt" TIMESTAMP(3),
    "resumeReason" TEXT,
    "resumeInitiatedById" TEXT,
    "resumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationPause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationPause_applicationId_resumedAt_idx"
ON "ApplicationPause"("applicationId", "resumedAt");

ALTER TABLE "ApplicationPause"
ADD CONSTRAINT "ApplicationPause_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ApplicationPause_pausedById_fkey"
FOREIGN KEY ("pausedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ApplicationPause_resumeInitiatedById_fkey"
FOREIGN KEY ("resumeInitiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
