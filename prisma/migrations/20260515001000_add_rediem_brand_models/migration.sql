-- CreateEnum
CREATE TYPE "ActivationIdeaType" AS ENUM (
    'REVIEW_REWARD_SERIES',
    'REFERRAL_CHALLENGE',
    'SUBSCRIPTION_RENEWAL_SERIES',
    'UGC_SOCIAL_CHALLENGE',
    'RECEIPT_UPLOAD_CHALLENGE',
    'PRODUCT_DROP_LOYALTY_CAMPAIGN',
    'SUSTAINABILITY_OR_MISSION_CHALLENGE',
    'VIP_TIER_MIGRATION',
    'RETAIL_TO_DTC_BRIDGE',
    'ZERO_PARTY_PREFERENCE_CHALLENGE',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "ToolCategory" AS ENUM ('LOYALTY', 'REVIEWS', 'SUBSCRIPTION', 'REFERRAL', 'EMAIL', 'SMS', 'OTHER');

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ecommercePlatform" TEXT,
    "ecommercePlatformScore" DOUBLE PRECISION,
    "shopifyDetected" BOOLEAN,
    "shopifyPlusLikely" BOOLEAN,
    "productCategory" TEXT,
    "brandCategory" TEXT,
    "pricePoint" TEXT,
    "targetCustomer" TEXT,
    "hasSubscription" BOOLEAN,
    "subscriptionProvider" TEXT,
    "hasLoyaltyProgram" BOOLEAN,
    "loyaltyProvider" TEXT,
    "loyaltyProgramUrl" TEXT,
    "loyaltyProgramType" TEXT,
    "hasReferralProgram" BOOLEAN,
    "hasReviews" BOOLEAN,
    "reviewProvider" TEXT,
    "hasUGC" BOOLEAN,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "socialCommunityScore" DOUBLE PRECISION,
    "hasRetailPresence" BOOLEAN,
    "retailSignals" JSONB,
    "sustainabilityAngle" TEXT,
    "missionDrivenAngle" TEXT,
    "rediemFitScore" DOUBLE PRECISION,
    "loyaltyMaturityScore" DOUBLE PRECISION,
    "communityReadinessScore" DOUBLE PRECISION,
    "migrationPainScore" DOUBLE PRECISION,
    "agenticCommerceScore" DOUBLE PRECISION,
    "lastScoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandActivationIdea" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "ActivationIdeaType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetBehavior" TEXT,
    "expectedImpact" TEXT,
    "confidence" DOUBLE PRECISION,
    "evidenceIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandActivationIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorToolDetection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "category" "ToolCategory" NOT NULL,
    "vendor" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorToolDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_accountId_key" ON "BrandProfile"("accountId");

-- CreateIndex
CREATE INDEX "BrandProfile_workspaceId_rediemFitScore_idx" ON "BrandProfile"("workspaceId", "rediemFitScore");

-- CreateIndex
CREATE INDEX "BrandProfile_rediemFitScore_idx" ON "BrandProfile"("rediemFitScore");

-- CreateIndex
CREATE INDEX "BrandProfile_brandCategory_idx" ON "BrandProfile"("brandCategory");

-- CreateIndex
CREATE INDEX "BrandProfile_ecommercePlatform_idx" ON "BrandProfile"("ecommercePlatform");

-- CreateIndex
CREATE INDEX "BrandActivationIdea_workspaceId_idx" ON "BrandActivationIdea"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandActivationIdea_accountId_idx" ON "BrandActivationIdea"("accountId");

-- CreateIndex
CREATE INDEX "BrandActivationIdea_type_idx" ON "BrandActivationIdea"("type");

-- CreateIndex
CREATE INDEX "CompetitorToolDetection_workspaceId_idx" ON "CompetitorToolDetection"("workspaceId");

-- CreateIndex
CREATE INDEX "CompetitorToolDetection_accountId_idx" ON "CompetitorToolDetection"("accountId");

-- CreateIndex
CREATE INDEX "CompetitorToolDetection_category_idx" ON "CompetitorToolDetection"("category");

-- CreateIndex
CREATE INDEX "CompetitorToolDetection_vendor_idx" ON "CompetitorToolDetection"("vendor");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandActivationIdea" ADD CONSTRAINT "BrandActivationIdea_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandActivationIdea" ADD CONSTRAINT "BrandActivationIdea_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorToolDetection" ADD CONSTRAINT "CompetitorToolDetection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorToolDetection" ADD CONSTRAINT "CompetitorToolDetection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
