/*
  Warnings:

  - A unique constraint covering the columns `[stripeSessionId]` on the table `TestingJob` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntent]` on the table `TestingJob` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TestingJob" ADD COLUMN     "stripePaymentIntent" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TestingJob_stripeSessionId_key" ON "TestingJob"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestingJob_stripePaymentIntent_key" ON "TestingJob"("stripePaymentIntent");
