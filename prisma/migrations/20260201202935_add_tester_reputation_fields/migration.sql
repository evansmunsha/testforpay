-- AlterTable
ALTER TABLE "User" ADD COLUMN     "averageEngagementScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalEarnings" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalTestsCompleted" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "FollowedTester" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedTester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedTester" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiedTester_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowedTester_developerId_idx" ON "FollowedTester"("developerId");

-- CreateIndex
CREATE INDEX "FollowedTester_testerId_idx" ON "FollowedTester"("testerId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowedTester_developerId_testerId_key" ON "FollowedTester"("developerId", "testerId");

-- CreateIndex
CREATE INDEX "VerifiedTester_developerId_idx" ON "VerifiedTester"("developerId");

-- CreateIndex
CREATE INDEX "VerifiedTester_testerId_idx" ON "VerifiedTester"("testerId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedTester_developerId_testerId_key" ON "VerifiedTester"("developerId", "testerId");

-- AddForeignKey
ALTER TABLE "FollowedTester" ADD CONSTRAINT "FollowedTester_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedTester" ADD CONSTRAINT "FollowedTester_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedTester" ADD CONSTRAINT "VerifiedTester_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedTester" ADD CONSTRAINT "VerifiedTester_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
