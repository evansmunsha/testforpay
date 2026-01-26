-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "engagementScore" INTEGER DEFAULT 0,
ADD COLUMN     "feedbackSubmittedAt" TIMESTAMP(3);
