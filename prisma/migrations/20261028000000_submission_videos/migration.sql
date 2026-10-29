-- CreateTable
CREATE TABLE "SubmissionVideo" (
    "id" TEXT NOT NULL,
    "taskSubmissionId" TEXT,
    "applicationId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionVideo_taskSubmissionId_key" ON "SubmissionVideo"("taskSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionVideo_blobPathname_key" ON "SubmissionVideo"("blobPathname");

-- CreateIndex
CREATE INDEX "SubmissionVideo_applicationId_idx" ON "SubmissionVideo"("applicationId");

-- CreateIndex
CREATE INDEX "SubmissionVideo_deletedAt_idx" ON "SubmissionVideo"("deletedAt");

-- AddForeignKey
ALTER TABLE "SubmissionVideo" ADD CONSTRAINT "SubmissionVideo_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionVideo" ADD CONSTRAINT "SubmissionVideo_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
