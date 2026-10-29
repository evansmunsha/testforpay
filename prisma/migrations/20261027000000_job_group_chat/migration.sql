-- CreateTable
CREATE TABLE "JobGroupMember" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobGroupMessage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobGroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobGroupMember_jobId_userId_key" ON "JobGroupMember"("jobId", "userId");

-- CreateIndex
CREATE INDEX "JobGroupMember_userId_idx" ON "JobGroupMember"("userId");

-- CreateIndex
CREATE INDEX "JobGroupMessage_jobId_createdAt_idx" ON "JobGroupMessage"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobGroupMessage_authorId_idx" ON "JobGroupMessage"("authorId");

-- AddForeignKey
ALTER TABLE "JobGroupMember" ADD CONSTRAINT "JobGroupMember_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobGroupMember" ADD CONSTRAINT "JobGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobGroupMessage" ADD CONSTRAINT "JobGroupMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobGroupMessage" ADD CONSTRAINT "JobGroupMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
