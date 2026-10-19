CREATE TABLE "PaymentAllocationHistory" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "fromApplicationId" TEXT NOT NULL,
    "toApplicationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocationHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentAllocationHistory_jobId_createdAt_idx"
ON "PaymentAllocationHistory"("jobId", "createdAt");
CREATE INDEX "PaymentAllocationHistory_paymentId_createdAt_idx"
ON "PaymentAllocationHistory"("paymentId", "createdAt");
CREATE INDEX "PaymentAllocationHistory_fromApplicationId_idx"
ON "PaymentAllocationHistory"("fromApplicationId");
CREATE INDEX "PaymentAllocationHistory_toApplicationId_idx"
ON "PaymentAllocationHistory"("toApplicationId");

ALTER TABLE "PaymentAllocationHistory"
ADD CONSTRAINT "PaymentAllocationHistory_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PaymentAllocationHistory_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "TestingJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PaymentAllocationHistory_fromApplicationId_fkey"
FOREIGN KEY ("fromApplicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PaymentAllocationHistory_toApplicationId_fkey"
FOREIGN KEY ("toApplicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "PaymentAllocationHistory_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
