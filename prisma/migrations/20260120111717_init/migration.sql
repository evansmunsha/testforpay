-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fraudScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastIpAddress" TEXT,
ADD COLUMN     "signupIp" TEXT;

-- CreateTable
CREATE TABLE "FraudLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudLog_userId_idx" ON "FraudLog"("userId");

-- CreateIndex
CREATE INDEX "FraudLog_type_idx" ON "FraudLog"("type");

-- CreateIndex
CREATE INDEX "FraudLog_severity_idx" ON "FraudLog"("severity");

-- CreateIndex
CREATE INDEX "FraudLog_resolved_idx" ON "FraudLog"("resolved");

-- CreateIndex
CREATE INDEX "FraudLog_ipAddress_idx" ON "FraudLog"("ipAddress");

-- CreateIndex
CREATE INDEX "Application_ipAddress_idx" ON "Application"("ipAddress");

-- AddForeignKey
ALTER TABLE "FraudLog" ADD CONSTRAINT "FraudLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
