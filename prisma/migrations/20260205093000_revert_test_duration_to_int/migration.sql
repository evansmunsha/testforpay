-- Revert testDuration back to an integer day count (minimum 14 days)
UPDATE "TestingJob"
SET "testDuration" = 14
WHERE "testDuration" IS NULL OR "testDuration" < 14;

ALTER TABLE "TestingJob"
ALTER COLUMN "testDuration" TYPE INTEGER
USING CEIL("testDuration")::INTEGER;

ALTER TABLE "TestingJob"
ALTER COLUMN "testDuration" SET DEFAULT 14;
