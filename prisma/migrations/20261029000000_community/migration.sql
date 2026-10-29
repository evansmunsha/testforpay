-- CreateEnum
CREATE TYPE "CommunityPostKind" AS ENUM ('POST', 'ANNOUNCEMENT', 'JOB');

-- CreateEnum
CREATE TYPE "CommunityContentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "CommunityReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "CommunityPostKind" NOT NULL DEFAULT 'POST',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "jobId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityContentStatus" NOT NULL DEFAULT 'VISIBLE',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CommunityContentStatus" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "CommunityReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityModerationLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityStat" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityStat_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPost_jobId_key" ON "CommunityPost"("jobId");

-- CreateIndex
CREATE INDEX "CommunityPost_status_pinned_createdAt_idx" ON "CommunityPost"("status", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_kind_status_createdAt_idx" ON "CommunityPost"("kind", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_authorId_createdAt_idx" ON "CommunityComment"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLike_postId_userId_key" ON "CommunityLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityLike_userId_idx" ON "CommunityLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReport_reporterId_postId_key" ON "CommunityReport"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReport_reporterId_commentId_key" ON "CommunityReport"("reporterId", "commentId");

-- CreateIndex
CREATE INDEX "CommunityReport_status_createdAt_idx" ON "CommunityReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMute_userId_key" ON "CommunityMute"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityBlock_blockerId_blockedId_key" ON "CommunityBlock"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "CommunityBlock_blockedId_idx" ON "CommunityBlock"("blockedId");

-- CreateIndex
CREATE INDEX "CommunityModerationLog_createdAt_idx" ON "CommunityModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityModerationLog_targetType_targetId_idx" ON "CommunityModerationLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityLike" ADD CONSTRAINT "CommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityLike" ADD CONSTRAINT "CommunityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMute" ADD CONSTRAINT "CommunityMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityBlock" ADD CONSTRAINT "CommunityBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
