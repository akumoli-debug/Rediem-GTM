import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAgenticCommerceScore,
  calculateCommunityReadinessScore,
  calculateLoyaltyPainScore,
  calculateMigrationPainScore,
  calculateRediemFitScore,
  classifyRediemTier,
  scoreRediemFit,
  type RediemBrandProfileInput,
  type RediemCompetitorToolDetectionInput,
  type RediemSignalInput
} from "../src/server/scoring/rediem";

const launchSignal: RediemSignalInput = {
  type: "PRODUCT_LAUNCH",
  title: "New product drop with creator community campaign",
  description: "The brand is promoting UGC, ambassadors, and retail expansion.",
  totalScore: 90
};

test("beauty brand with points loyalty and high UGC is Tier 1", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    ecommercePlatformScore: 92,
    shopifyDetected: true,
    shopifyPlusLikely: true,
    productCategory: "Skincare",
    brandCategory: "Beauty",
    pricePoint: "Premium accessible",
    targetCustomer: "Gen Z skincare enthusiasts",
    hasSubscription: true,
    subscriptionProvider: "Recharge",
    hasLoyaltyProgram: true,
    loyaltyProvider: "Legacy points app",
    loyaltyProgramType: "Points and VIP tiers",
    hasReferralProgram: true,
    hasReviews: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/example",
    tiktokUrl: "https://tiktok.com/@example",
    socialCommunityScore: 88,
    hasRetailPresence: true,
    migrationPainScore: 40,
    missionDrivenAngle: "Ingredient education"
  };
  const detections: RediemCompetitorToolDetectionInput[] = [
    {
      category: "loyalty",
      vendor: "Legacy points app",
      confidence: 0.82,
      evidence: "Rewards page references points, VIP tiers, and referrals."
    }
  ];
  const score = calculateRediemFitScore(profile, [launchSignal], detections);

  assert.equal(classifyRediemTier(score), "Tier 1");
  assert.ok(score >= 85);
  assert.equal(calculateLoyaltyPainScore(profile, detections), 100);
  assert.equal(calculateCommunityReadinessScore(profile, [launchSignal]), 100);
});

test("B2B SaaS company is low fit", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "B2B SaaS",
    brandCategory: "Software",
    targetCustomer: "Enterprise operations teams",
    hasSubscription: true,
    hasLoyaltyProgram: false,
    hasUGC: false,
    hasReviews: false
  };
  const score = calculateRediemFitScore(profile, [], []);

  assert.equal(classifyRediemTier(score), "Disqualify");
  assert.ok(score < 40);
});

test("brand with social participation but no commerce or retail is low-priority, not core ICP", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Apparel",
    brandCategory: "Consumer apparel",
    hasUGC: true,
    instagramUrl: "https://instagram.com/example",
    socialCommunityScore: 80
  };
  const score = calculateRediemFitScore(profile, [launchSignal], []);

  assert.equal(classifyRediemTier(score), "Tier 3");
  assert.ok(score < 60);
});

test("subscription brand with reviews but no community is a nurture fit", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    ecommercePlatformScore: 84,
    shopifyDetected: true,
    productCategory: "Functional beverage",
    brandCategory: "Beverage",
    pricePoint: "Mid-market",
    hasSubscription: true,
    subscriptionProvider: "Skio",
    hasLoyaltyProgram: false,
    hasReviews: true,
    hasUGC: false,
    socialCommunityScore: 45
  };
  const score = calculateRediemFitScore(
    profile,
    [{ type: "PRODUCT_LAUNCH", title: "New flavor drop", totalScore: 72 }],
    []
  );

  assert.ok(score >= 50);
  assert.notEqual(classifyRediemTier(score), "Disqualify");
});

test("existing points loyalty provider increases migration pain", () => {
  const baseProfile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    shopifyDetected: true,
    productCategory: "Skincare",
    brandCategory: "Beauty",
    hasReviews: true
  };
  const pointsProfile: RediemBrandProfileInput = {
    ...baseProfile,
    hasLoyaltyProgram: true,
    loyaltyProvider: "Legacy points app",
    loyaltyProgramType: "Points and VIP tiers"
  };
  const detections: RediemCompetitorToolDetectionInput[] = [
    {
      category: "loyalty",
      vendor: "Legacy points app",
      evidence: "Rewards page promotes points and VIP tiers."
    }
  ];

  assert.ok(
    calculateMigrationPainScore(pointsProfile, detections) >
      calculateMigrationPainScore(baseProfile, [])
  );
});

test("agentic commerce score rewards commerce stack and engagement signals", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    shopifyDetected: true,
    hasSubscription: true,
    hasLoyaltyProgram: true,
    hasReviews: true,
    hasUGC: true
  };

  assert.ok(calculateAgenticCommerceScore(profile, [launchSignal]) >= 80);
});

// --- Regression: re-scoring inflation ---

test("re-scoring an enriched profile does not inflate migration pain past fresh score", () => {
  // profile.migrationPainScore simulates a previously stored result written by
  // calculateMigrationPainScore. Re-running the scorer should produce the same
  // value regardless of what is stored in the profile field.
  const base: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: true,
    loyaltyProvider: "Smile.io",
    loyaltyProgramType: "Points and VIP tiers",
    hasReviews: true,
    shopifyPlusLikely: true
  };
  const detections: RediemCompetitorToolDetectionInput[] = [
    { category: "loyalty", vendor: "Smile.io", confidence: 0.8 }
  ];

  const freshScore = calculateMigrationPainScore(base, detections);
  // Simulate a profile that already has the previous run's result stored.
  const enrichedProfile = { ...base, migrationPainScore: freshScore };
  const rescoreResult = calculateMigrationPainScore(enrichedProfile, detections);

  assert.equal(rescoreResult, freshScore, "re-scoring should be idempotent");
});

test("re-scoring an enriched profile does not inflate agentic commerce past fresh score", () => {
  const base: RediemBrandProfileInput = {
    shopifyDetected: true,
    shopifyPlusLikely: true,
    hasSubscription: true,
    hasLoyaltyProgram: true,
    hasReviews: true,
    hasUGC: true
  };

  const freshScore = calculateAgenticCommerceScore(base, [launchSignal]);
  const enrichedProfile = { ...base, agenticCommerceScore: freshScore };
  const rescoreResult = calculateAgenticCommerceScore(enrichedProfile, [launchSignal]);

  assert.equal(rescoreResult, freshScore, "re-scoring should be idempotent");
});

// --- False positive: detection confidence ---

test("low-confidence loyalty detection does not trigger migration or loyalty bonus", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: false,
    hasReviews: false
  };
  const lowConfidenceDetection: RediemCompetitorToolDetectionInput[] = [
    { category: "loyalty", vendor: "Unknown app", confidence: 0.2 }
  ];
  const noDetections: RediemCompetitorToolDetectionInput[] = [];

  assert.equal(
    calculateMigrationPainScore(profile, lowConfidenceDetection),
    calculateMigrationPainScore(profile, noDetections),
    "sub-threshold confidence should not add migration bonus"
  );
  assert.equal(
    calculateLoyaltyPainScore(profile, lowConfidenceDetection),
    calculateLoyaltyPainScore(profile, noDetections),
    "sub-threshold confidence should not add loyalty pain bonus"
  );
});

test("detection without a confidence field passes (benefit of the doubt)", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: false,
    hasReviews: false
  };
  const unscoredDetection: RediemCompetitorToolDetectionInput[] = [
    { category: "loyalty", vendor: "Unknown app" }
  ];
  const noDetections: RediemCompetitorToolDetectionInput[] = [];

  assert.ok(
    calculateMigrationPainScore(profile, unscoredDetection) >
      calculateMigrationPainScore(profile, noDetections),
    "detection with no confidence field should still trigger the bonus"
  );
});

// --- False positive: ecommerce threshold ---

test("near-zero ecommercePlatformScore does not pass the ecommerce guard", () => {
  // A score of 5 might appear from a low-confidence scraper signal. It should
  // not unlock full scoring — that would make any partially-detected site look
  // like a Rediem fit.
  const profile: RediemBrandProfileInput = {
    ecommercePlatformScore: 5,
    hasLoyaltyProgram: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/example"
  };
  const score = calculateRediemFitScore(profile, [], []);

  assert.equal(classifyRediemTier(score), "Disqualify");
});

test("ecommercePlatformScore at threshold is only a filter, not enough for fit", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatformScore: 50,
    productCategory: "Skincare",
    brandCategory: "Beauty",
    hasLoyaltyProgram: true
  };
  const score = calculateRediemFitScore(profile, [], []);

  assert.equal(classifyRediemTier(score), "Disqualify");
  assert.ok(score < 50);
});

// --- Timing signal edge cases ---

test("signals that all score zero do not contribute a timing bonus", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: true
  };
  const zeroScoredSignals: RediemSignalInput[] = [
    { type: "NEWS", title: "Brand mentions", totalScore: 0 },
    { type: "OTHER", title: "Generic mention", totalScore: 0 }
  ];

  const scoreWithZeroSignals = calculateRediemFitScore(profile, zeroScoredSignals, []);
  const scoreWithNoSignals = calculateRediemFitScore(profile, [], []);

  // Zero-scored signals should not inflate above having no signals at all.
  assert.ok(
    scoreWithZeroSignals <= scoreWithNoSignals,
    "zero-scored signals should not add a timing bonus"
  );
});

test("unscored signals (totalScore absent) receive neutral timing baseline", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: true
  };
  const unscoredSignals: RediemSignalInput[] = [
    { type: "NEWS", title: "Brand news" }
  ];

  const scoreWithUnscored = calculateRediemFitScore(profile, unscoredSignals, []);
  const scoreWithNone = calculateRediemFitScore(profile, [], []);

  // Unscored signals should give at least the same score as no signals (neutral,
  // not penalised for missing the score).
  assert.ok(scoreWithUnscored >= scoreWithNone);
});

// --- Community readiness: sustainability-only angle ---

test("sustainability angle alone (no missionDrivenAngle) still boosts community readiness", () => {
  const withAngle: RediemBrandProfileInput = {
    shopifyDetected: true,
    socialCommunityScore: 50,
    sustainabilityAngle: "Refillable packaging across product range."
  };
  const withoutAngle: RediemBrandProfileInput = {
    shopifyDetected: true,
    socialCommunityScore: 50
  };

  assert.ok(
    calculateCommunityReadinessScore(withAngle) >
      calculateCommunityReadinessScore(withoutAngle),
    "sustainabilityAngle alone should boost community readiness"
  );
});

// --- scoreRediemFit breakdown ---

test("scoreRediemFit returns all component scores and a reasons array", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    shopifyPlusLikely: true,
    hasLoyaltyProgram: true,
    loyaltyProvider: "Legacy points app",
    loyaltyProgramType: "Points and VIP tiers",
    hasSubscription: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/example",
    tiktokUrl: "https://tiktok.com/@example",
    productCategory: "Beauty",
    brandCategory: "Beauty"
  };

  const result = scoreRediemFit(profile, [launchSignal], []);

  assert.ok(typeof result.score === "number");
  assert.ok(["Tier 1", "Tier 2", "Tier 3", "Disqualify"].includes(result.tier));
  assert.ok(result.score === calculateRediemFitScore(profile, [launchSignal], []),
    "score in breakdown must match calculateRediemFitScore"
  );

  // The new Rediem ICP components must be present and in range.
  const keys = [
    "communityEnergy",
    "participationCaptureGap",
    "ritualRepeatPurchaseFit",
    "retailToOwnedDataOpportunity",
    "missionIdentityStrength",
    "stackMigrationOpportunity",
    "timingSignal",
    "communityValueFit"
  ] as const;
  for (const key of keys) {
    assert.ok(
      result.components[key] >= 0 && result.components[key] <= 100,
      `${key} must be clamped to [0, 100]`
    );
  }

  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.length > 0, "should produce at least one reason for a Shopify Plus brand");
});

test("scoreRediemFit reasons frame Shopify Plus as supporting evidence only", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    shopifyPlusLikely: true,
    hasLoyaltyProgram: false
  };

  const { reasons } = scoreRediemFit(profile, [], []);
  const combined = reasons.join(" ").toLowerCase();

  assert.ok(combined.includes("shopify plus"), "reasons should name Shopify Plus");
  assert.ok(combined.includes("supporting"), "Shopify should be framed as a supporting signal");
});

test("scoreRediemFit reasons mention greenfield when no loyalty program exists", () => {
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    hasLoyaltyProgram: false
  };

  const { reasons } = scoreRediemFit(profile, [], []);
  const combined = reasons.join(" ").toLowerCase();

  assert.ok(combined.includes("greenfield"), "reasons should call out greenfield when no loyalty program");
});

test("scoreRediemFit reasons keep no-commerce brands conservative", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Apparel",
    hasUGC: true
  };

  const { reasons } = scoreRediemFit(profile, [], []);

  assert.ok(reasons.some((reason) => reason.toLowerCase().includes("conservative")));
});
