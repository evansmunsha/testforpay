/*
  Warnings:

  - You are about to alter the column `testDuration` on the `TestingJob` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "TestingJob" ALTER COLUMN "testDuration" SET DEFAULT 14,
ALTER COLUMN "testDuration" SET DATA TYPE INTEGER;
