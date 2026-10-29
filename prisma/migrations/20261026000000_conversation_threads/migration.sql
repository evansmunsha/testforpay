-- CreateEnum
CREATE TYPE "ThreadKind" AS ENUM ('ISSUE_REPORT', 'MISSION_SUBMISSION', 'ADMIN_MESSAGE');

-- CreateTable
CREATE TABLE "ConversationThread" (
    "id" TEXT NOT NULL,
    "kind" "ThreadKind" NOT NULL,
    "testerId" TEXT NOT NULL,
    "jobId" TEXT,
    "issueReportId" TEXT,
    "taskSubmissionId" TEXT,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationThread_issueReportId_key" ON "ConversationThread"("issueReportId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationThread_taskSubmissionId_key" ON "ConversationThread"("taskSubmissionId");

-- CreateIndex
CREATE INDEX "ConversationThread_testerId_lastMessageAt_idx" ON "ConversationThread"("testerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationThread_jobId_lastMessageAt_idx" ON "ConversationThread"("jobId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationThread_kind_lastMessageAt_idx" ON "ConversationThread"("kind", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ThreadMessage_threadId_createdAt_idx" ON "ThreadMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ThreadMessage_authorId_idx" ON "ThreadMessage"("authorId");

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_issueReportId_fkey" FOREIGN KEY ("issueReportId") REFERENCES "ApplicationIssueReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
