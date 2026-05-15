-- CreateTable
CREATE TABLE "CommunityFlywheelSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "estimatedCfr" DOUBLE PRECISION NOT NULL,
    "cfrConfidence" DOUBLE PRECISION NOT NULL,
    "cfrTier" TEXT NOT NULL,
    "verifiedParticipationValue" DOUBLE PRECISION,
    "repeatParticipationRate" DOUBLE PRECISION,
    "advocacyConversionRate" DOUBLE PRECISION,
    "zeroPartyCompletionRate" DOUBLE PRECISION,
    "retentionLiftValue" DOUBLE PRECISION,
    "discountDependency" DOUBLE PRECISION,
    "rewardCostRatio" DOUBLE PRECISION,
    "paidCacDependency" DOUBLE PRECISION,
    "churnRecoveryCost" DOUBLE PRECISION,
    "earnedCommunityGrowth" DOUBLE PRECISION NOT NULL,
    "subsidizedTransactionalGrowth" DOUBLE PRECISION NOT NULL,
    "primaryLeak" TEXT,
    "secondaryLeak" TEXT,
    "recommendedPlay" TEXT,
    "explanation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFlywheelSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFlywheelLeak" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "leakType" TEXT NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceIds" JSONB,
    "sourceUrls" JSONB,
    "recommendedFix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFlywheelLeak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFlywheelPlay" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "playType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetBehavior" TEXT,
    "expectedCfrImpact" DOUBLE PRECISION,
    "expectedTimeToImpact" TEXT,
    "confidence" DOUBLE PRECISION,
    "evidenceIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFlywheelPlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityFlywheelSnapshot_workspaceId_idx" ON "CommunityFlywheelSnapshot"("workspaceId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelSnapshot_accountId_idx" ON "CommunityFlywheelSnapshot"("accountId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelSnapshot_snapshotDate_idx" ON "CommunityFlywheelSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "CommunityFlywheelSnapshot_estimatedCfr_idx" ON "CommunityFlywheelSnapshot"("estimatedCfr");

-- CreateIndex
CREATE INDEX "CommunityFlywheelSnapshot_cfrTier_idx" ON "CommunityFlywheelSnapshot"("cfrTier");

-- CreateIndex
CREATE INDEX "CommunityFlywheelLeak_workspaceId_idx" ON "CommunityFlywheelLeak"("workspaceId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelLeak_accountId_idx" ON "CommunityFlywheelLeak"("accountId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelLeak_snapshotId_idx" ON "CommunityFlywheelLeak"("snapshotId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelLeak_leakType_idx" ON "CommunityFlywheelLeak"("leakType");

-- CreateIndex
CREATE INDEX "CommunityFlywheelLeak_severity_idx" ON "CommunityFlywheelLeak"("severity");

-- CreateIndex
CREATE INDEX "CommunityFlywheelPlay_workspaceId_idx" ON "CommunityFlywheelPlay"("workspaceId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelPlay_accountId_idx" ON "CommunityFlywheelPlay"("accountId");

-- CreateIndex
CREATE INDEX "CommunityFlywheelPlay_playType_idx" ON "CommunityFlywheelPlay"("playType");

-- CreateIndex
CREATE INDEX "CommunityFlywheelPlay_confidence_idx" ON "CommunityFlywheelPlay"("confidence");

-- AddForeignKey
ALTER TABLE "CommunityFlywheelSnapshot" ADD CONSTRAINT "CommunityFlywheelSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelSnapshot" ADD CONSTRAINT "CommunityFlywheelSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelLeak" ADD CONSTRAINT "CommunityFlywheelLeak_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelLeak" ADD CONSTRAINT "CommunityFlywheelLeak_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelLeak" ADD CONSTRAINT "CommunityFlywheelLeak_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CommunityFlywheelSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelPlay" ADD CONSTRAINT "CommunityFlywheelPlay_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFlywheelPlay" ADD CONSTRAINT "CommunityFlywheelPlay_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
