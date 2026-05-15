import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCommunityFlywheelRatio,
  classifyCfrTier,
  detectCommunityFlywheelLeaks,
  estimateEarnedCommunityGrowth,
  estimateSubsidizedTransactionalGrowth,
  recommendCommunityFlywheelPlays
} from "../src/server/scoring/communityFlywheel";
import type { RediemBrandProfileInput } from "../src/server/scoring/rediem";

test("points-only loyalty brand with high social presence has high upside but low current CFR", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    ecommercePlatformScore: 90,
    shopifyDetected: true,
    brandCategory: "Beauty",
    hasLoyaltyProgram: true,
    loyaltyProgramType: "points",
    hasReviews: true,
    hasUGC: false,
    hasReferralProgram: false,
    hasSubscription: false,
    socialCommunityScore: 88,
    instagramUrl: "https://instagram.com/example",
    rediemFitScore: 86
  };
  const snapshot = calculateCommunityFlywheelRatio({
    profile,
    evidence: [
      {
        id: "evidence_rewards",
        sourceUrl: "https://brand.example/rewards",
        rawExcerpt: "Earn points for purchases and redeem points for dollars off."
      },
      {
        id: "evidence_social",
        sourceUrl: "https://instagram.com/example",
        rawExcerpt: "Large social community with regular customer content."
      }
    ]
  });

  assert.ok(snapshot.estimatedCfr < 1);
  assert.ok(snapshot.plays.length > 0);
  assert.equal(snapshot.primaryLeak, "POINTS_ONLY_LOYALTY");
  assert.equal(snapshot.recommendedPlay, "VIP_TIER_MIGRATION");
  assert.ok(snapshot.leaks.some((leak) => leak.leakType === "UGC_NOT_VERIFIED"));
});

test("brand with strong referrals, reviews, and subscription loops has higher CFR", () => {
  const baseline = calculateCommunityFlywheelRatio({
    profile: {
      ecommercePlatform: "Shopify",
      ecommercePlatformScore: 85,
      shopifyDetected: true,
      brandCategory: "Beverage",
      hasLoyaltyProgram: true,
      loyaltyProgramType: "points",
      hasReviews: true,
      hasUGC: false,
      hasReferralProgram: false,
      socialCommunityScore: 72
    },
    evidence: [{ id: "points", sourceUrl: "https://brand.example/rewards", rawExcerpt: "Earn points." }]
  });
  const mature = calculateCommunityFlywheelRatio({
    profile: {
      ecommercePlatform: "Shopify Plus",
      ecommercePlatformScore: 96,
      shopifyDetected: true,
      shopifyPlusLikely: true,
      brandCategory: "Beverage",
      hasSubscription: true,
      hasLoyaltyProgram: true,
      loyaltyProgramType: "VIP challenges",
      hasReviews: true,
      hasUGC: true,
      hasReferralProgram: true,
      socialCommunityScore: 86
    },
    evidence: [
      {
        id: "verified_review",
        sourceUrl: "https://brand.example/reviews",
        rawExcerpt: "Verified reviews unlock referrals and subscriber perks."
      },
      {
        id: "subscription",
        sourceUrl: "https://brand.example/subscribe",
        rawExcerpt: "Subscribers earn renewal rewards and referral bonuses."
      }
    ]
  });

  assert.ok(mature.estimatedCfr > baseline.estimatedCfr);
  assert.ok(mature.estimatedCfr >= 1);
  assert.match(mature.cfrTier, /Healthy|Iconic/);
});

test("brand with no ecommerce signals has low CFR confidence", () => {
  const snapshot = calculateCommunityFlywheelRatio({
    profile: {
      brandCategory: "B2B software",
      hasReviews: null,
      hasUGC: null,
      hasLoyaltyProgram: null
    }
  });

  assert.ok(snapshot.cfrConfidence <= 0.34);
  assert.ok(snapshot.explanation.some((line) => line.includes("prospecting estimate")));
});

test("discount-heavy brand shows Transactional Trap", () => {
  const snapshot = calculateCommunityFlywheelRatio({
    profile: {
      ecommercePlatform: "Shopify",
      ecommercePlatformScore: 82,
      shopifyDetected: true,
      brandCategory: "Apparel",
      hasLoyaltyProgram: false,
      hasReviews: false,
      hasUGC: false,
      hasReferralProgram: false,
      hasSubscription: false,
      socialCommunityScore: 28
    },
    evidence: [
      {
        id: "discounts",
        sourceUrl: "https://brand.example/sale",
        rawExcerpt: "Use promo code for 40% off, clearance sale, coupon and winback discount."
      }
    ]
  });

  assert.equal(snapshot.cfrTier, "Transactional Trap");
  assert.ok(snapshot.estimatedCfr < 0.5);
  assert.ok(snapshot.leaks.some((leak) => leak.leakType === "DISCOUNT_HEAVY_RETENTION"));
});

test("missing data is conservative and does not produce fake precision", () => {
  const snapshot = calculateCommunityFlywheelRatio({ profile: {} });

  assert.equal(Number.isInteger(snapshot.earnedCommunityGrowth), true);
  assert.equal(Number.isInteger(snapshot.subsidizedTransactionalGrowth), true);
  assert.equal(Number.isNaN(snapshot.estimatedCfr), false);
  assert.equal(snapshot.estimatedCfr, Number(snapshot.estimatedCfr.toFixed(2)));
  assert.ok(snapshot.cfrConfidence < 0.35);
});

test("CFR helpers expose tiering, estimates, leaks, and play recommendations", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    shopifyDetected: true,
    brandCategory: "Wellness",
    hasSubscription: true,
    hasReviews: true,
    hasUGC: false,
    hasReferralProgram: false,
    socialCommunityScore: 75
  };
  const evidence = [
    {
      id: "quiz",
      sourceUrl: "https://brand.example/quiz",
      rawExcerpt: "Take our routine quiz and subscribe."
    }
  ];
  const earned = estimateEarnedCommunityGrowth(profile, [], evidence);
  const subsidized = estimateSubsidizedTransactionalGrowth(profile, [], evidence);
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], evidence);
  const plays = recommendCommunityFlywheelPlays(profile, leaks, []);

  assert.equal(classifyCfrTier(2.1), "Iconic Brand Flywheel");
  assert.ok(earned.zeroPartyCompletionRate > 10);
  assert.ok(subsidized.churnRecoveryCost > 0);
  assert.ok(leaks.length > 0);
  assert.ok(plays.length > 0);
});
