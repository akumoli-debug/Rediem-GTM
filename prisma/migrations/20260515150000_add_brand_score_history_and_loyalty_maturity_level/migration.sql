-- AlterTable
ALTER TABLE "BrandProfile" ADD COLUMN "loyaltyMaturityLevel" INTEGER;

-- CreateTable
CREATE TABLE "BrandScoreHistory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "rediemFitScore" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "ecommerceFit" DOUBLE PRECISION NOT NULL,
    "loyaltyPain" DOUBLE PRECISION NOT NULL,
    "communityReadiness" DOUBLE PRECISION NOT NULL,
    "retentionNeed" DOUBLE PRECISION NOT NULL,
    "migrationOpportunity" DOUBLE PRECISION NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandProfile_loyaltyMaturityLevel_idx" ON "BrandProfile"("loyaltyMaturityLevel");

-- CreateIndex
CREATE INDEX "BrandScoreHistory_workspaceId_idx" ON "BrandScoreHistory"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandScoreHistory_accountId_idx" ON "BrandScoreHistory"("accountId");

-- CreateIndex
CREATE INDEX "BrandScoreHistory_scoredAt_idx" ON "BrandScoreHistory"("scoredAt");

-- CreateIndex
CREATE INDEX "BrandScoreHistory_tier_idx" ON "BrandScoreHistory"("tier");

-- CreateIndex
CREATE INDEX "BrandScoreHistory_rediemFitScore_idx" ON "BrandScoreHistory"("rediemFitScore");

-- AddForeignKey
ALTER TABLE "BrandScoreHistory" ADD CONSTRAINT "BrandScoreHistory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandScoreHistory" ADD CONSTRAINT "BrandScoreHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
