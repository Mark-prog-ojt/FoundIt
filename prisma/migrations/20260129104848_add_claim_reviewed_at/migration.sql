-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "reviewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "claims_reviewed_at_idx" ON "claims"("reviewed_at");
