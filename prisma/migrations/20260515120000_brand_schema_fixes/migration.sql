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

-- AlterTable: BrandActivationIdea.type TEXT -> ActivationIdeaType enum
ALTER TABLE "BrandActivationIdea"
  ADD COLUMN "type_new" "ActivationIdeaType";

UPDATE "BrandActivationIdea"
  SET "type_new" = CASE "type"
    WHEN 'ugc_challenge'                         THEN 'UGC_SOCIAL_CHALLENGE'::"ActivationIdeaType"
    WHEN 'subscription_referral'                 THEN 'REFERRAL_CHALLENGE'::"ActivationIdeaType"
    WHEN 'mission_community'                     THEN 'SUSTAINABILITY_OR_MISSION_CHALLENGE'::"ActivationIdeaType"
    WHEN 'review_reward_series'                  THEN 'REVIEW_REWARD_SERIES'::"ActivationIdeaType"
    WHEN 'referral_challenge'                    THEN 'REFERRAL_CHALLENGE'::"ActivationIdeaType"
    WHEN 'subscription_renewal_series'           THEN 'SUBSCRIPTION_RENEWAL_SERIES'::"ActivationIdeaType"
    WHEN 'ugc_social_challenge'                  THEN 'UGC_SOCIAL_CHALLENGE'::"ActivationIdeaType"
    WHEN 'receipt_upload_challenge'              THEN 'RECEIPT_UPLOAD_CHALLENGE'::"ActivationIdeaType"
    WHEN 'product_drop_loyalty_campaign'         THEN 'PRODUCT_DROP_LOYALTY_CAMPAIGN'::"ActivationIdeaType"
    WHEN 'sustainability_or_mission_challenge'   THEN 'SUSTAINABILITY_OR_MISSION_CHALLENGE'::"ActivationIdeaType"
    WHEN 'vip_tier_migration'                    THEN 'VIP_TIER_MIGRATION'::"ActivationIdeaType"
    WHEN 'retail_to_dtc_bridge'                  THEN 'RETAIL_TO_DTC_BRIDGE'::"ActivationIdeaType"
    WHEN 'zero_party_preference_challenge'       THEN 'ZERO_PARTY_PREFERENCE_CHALLENGE'::"ActivationIdeaType"
    ELSE 'OTHER'::"ActivationIdeaType"
  END;

ALTER TABLE "BrandActivationIdea" DROP COLUMN "type";
ALTER TABLE "BrandActivationIdea" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "BrandActivationIdea" ALTER COLUMN "type" SET NOT NULL;

-- AlterTable: CompetitorToolDetection.category TEXT -> ToolCategory enum
ALTER TABLE "CompetitorToolDetection"
  ADD COLUMN "category_new" "ToolCategory";

UPDATE "CompetitorToolDetection"
  SET "category_new" = CASE "category"
    WHEN 'loyalty'      THEN 'LOYALTY'::"ToolCategory"
    WHEN 'reviews'      THEN 'REVIEWS'::"ToolCategory"
    WHEN 'subscription' THEN 'SUBSCRIPTION'::"ToolCategory"
    WHEN 'referral'     THEN 'REFERRAL'::"ToolCategory"
    WHEN 'email'        THEN 'EMAIL'::"ToolCategory"
    WHEN 'sms'          THEN 'SMS'::"ToolCategory"
    ELSE 'OTHER'::"ToolCategory"
  END;

ALTER TABLE "CompetitorToolDetection" DROP COLUMN "category";
ALTER TABLE "CompetitorToolDetection" RENAME COLUMN "category_new" TO "category";
ALTER TABLE "CompetitorToolDetection" ALTER COLUMN "category" SET NOT NULL;

-- AlterTable: BrandProfile add lastScoredAt
ALTER TABLE "BrandProfile" ADD COLUMN "lastScoredAt" TIMESTAMP(3);

-- CreateIndex: composite for primary Rediem sort query
CREATE INDEX "BrandProfile_workspaceId_rediemFitScore_idx" ON "BrandProfile"("workspaceId", "rediemFitScore");

-- RecreateIndex: CompetitorToolDetection.category_idx must be rebuilt after column type change
DROP INDEX IF EXISTS "CompetitorToolDetection_category_idx";
CREATE INDEX "CompetitorToolDetection_category_idx" ON "CompetitorToolDetection"("category");

-- RecreateIndex: BrandActivationIdea.type_idx must be rebuilt after column type change
DROP INDEX IF EXISTS "BrandActivationIdea_type_idx";
CREATE INDEX "BrandActivationIdea_type_idx" ON "BrandActivationIdea"("type");
