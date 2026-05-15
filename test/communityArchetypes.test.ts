import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCommunityEnergyScore,
  calculateCommunityValueFitScore,
  calculateCreatorAmbassadorFit,
  calculateParticipationCaptureGap,
  calculateRetailToOwnedDataOpportunity,
  classifyCommunityArchetype
} from "../src/server/scoring/communityArchetypes";
import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "../src/server/scoring/rediem";

const productDropSignal: RediemSignalInput = {
  type: "PRODUCT_LAUNCH",
  title: "Limited edition flavor drop with creator tastings",
  description: "Community fans share UGC around a retail expansion and ambassador campaign.",
  totalScore: 86
};

test("Olipop-style functional beverage classifies as cult, ritual, and retail-to-DTC", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Functional beverage",
    brandCategory: "Beverage",
    targetCustomer: "Wellness-minded consumers",
    ecommercePlatform: "Shopify",
    ecommercePlatformScore: 80,
    hasSubscription: true,
    hasReviews: true,
    hasUGC: true,
    hasRetailPresence: true,
    retailSignals: { retailers: ["Target", "Whole Foods", "Sprouts", "Amazon"] },
    instagramUrl: "https://instagram.com/example",
    tiktokUrl: "https://tiktok.com/@example",
    socialCommunityScore: 84,
    missionDrivenAngle: "Gut health and better-for-you soda culture"
  };
  const result = classifyCommunityArchetype({
    profile,
    signals: [productDropSignal],
    detections: [
      { category: "subscription", vendor: "Recharge", confidence: 0.8 },
      { category: "reviews", vendor: "Okendo", confidence: 0.8 }
    ]
  });

  assert.ok(result.archetypes.includes("CULT_CONSUMER_BRAND"));
  assert.ok(result.archetypes.includes("RITUAL_REPEAT_USE_BRAND"));
  assert.ok(result.archetypes.includes("RETAIL_TO_DTC_BRIDGE_BRAND"));
  assert.ok(result.confidence >= 0.6);
});

test("mission-led skincare brand classifies as MISSION_LED_BRAND", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Skincare",
    brandCategory: "Beauty",
    ecommercePlatform: "Shopify",
    hasReviews: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/example",
    socialCommunityScore: 72,
    sustainabilityAngle: "Refillable packaging and lower-waste refills",
    missionDrivenAngle: "Clean ingredients and barrier-health education"
  };
  const result = classifyCommunityArchetype({ profile });

  assert.ok(result.archetypes.includes("MISSION_LED_BRAND"));
  assert.ok(result.scores.missionIdentityStrength.score >= 65);
});

test("commodity Shopify store with no social, reviews, or community scores low", () => {
  const profile: RediemBrandProfileInput = {
    ecommercePlatform: "Shopify",
    shopifyDetected: true,
    productCategory: "Commodity accessories",
    brandCategory: "Commodity",
    hasSubscription: false,
    hasLoyaltyProgram: false,
    hasReviews: false,
    hasUGC: false,
    socialCommunityScore: 12
  };
  const score = calculateCommunityValueFitScore(profile, [], []);
  const result = classifyCommunityArchetype({ profile });

  assert.ok(score.score < 45);
  assert.deepEqual(result.archetypes, ["LOW_COMMUNITY_COMMODITY_BRAND"]);
});

test("retail-heavy beverage brand with weak owned loyalty scores high", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Functional beverage",
    brandCategory: "Beverage",
    targetCustomer: "Health-conscious retail shoppers",
    hasRetailPresence: true,
    retailSignals: { retailers: ["Target", "Walmart", "Whole Foods"] },
    hasLoyaltyProgram: false,
    hasReviews: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/example",
    tiktokUrl: "https://tiktok.com/@example",
    socialCommunityScore: 79
  };

  assert.ok(calculateRetailToOwnedDataOpportunity(profile).score >= 75);
  assert.ok(calculateParticipationCaptureGap(profile).score >= 65);
  assert.ok(calculateCommunityValueFitScore(profile, [productDropSignal], []).score >= 70);
});

test("ambassador-led apparel brand scores high creator and ambassador fit", () => {
  const profile: RediemBrandProfileInput = {
    productCategory: "Apparel",
    brandCategory: "Lifestyle apparel",
    ecommercePlatform: "Shopify",
    hasUGC: true,
    hasReferralProgram: true,
    instagramUrl: "https://instagram.com/example",
    tiktokUrl: "https://tiktok.com/@example",
    socialCommunityScore: 76
  };
  const signals: RediemSignalInput[] = [
    {
      type: "OTHER",
      title: "Creator ambassador program and affiliate community",
      description: "Customers join ambassador challenges and post UGC.",
      totalScore: 78
    }
  ];
  const detections: RediemCompetitorToolDetectionInput[] = [
    { category: "referral", vendor: "Ambassador program", evidence: "Apply to be a creator ambassador.", confidence: 0.75 }
  ];

  assert.ok(calculateCreatorAmbassadorFit(profile, signals, detections).score >= 80);
  assert.ok(calculateCommunityEnergyScore(profile, signals, detections).score >= 80);
});
