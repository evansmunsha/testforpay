CREATE TYPE "ApplicationIssueStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'INCOMPATIBLE');

ALTER TYPE "ApplicationStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'INELIGIBLE';

ALTER TABLE "User"
ADD COLUMN "countryCode" TEXT;

ALTER TABLE "TestingJob"
ADD COLUMN "supportedCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "scheduledStartAt" TIMESTAMP(3);

ALTER TABLE "Application"
ADD COLUMN "cohortSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contactReleasedAt" TIMESTAMP(3),
ADD COLUMN "screeningPassedAt" TIMESTAMP(3);

CREATE TABLE "ApplicationIssueReport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "ApplicationIssueStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicationIssueReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationIssueReport_applicationId_status_idx"
ON "ApplicationIssueReport"("applicationId", "status");

CREATE INDEX "ApplicationIssueReport_status_createdAt_idx"
ON "ApplicationIssueReport"("status", "createdAt");

ALTER TABLE "ApplicationIssueReport"
ADD CONSTRAINT "ApplicationIssueReport_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationIssueReport"
ADD CONSTRAINT "ApplicationIssueReport_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationIssueReport"
ADD CONSTRAINT "ApplicationIssueReport_testerId_fkey"
FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
