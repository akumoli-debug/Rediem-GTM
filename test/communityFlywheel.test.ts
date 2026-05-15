import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCommunityFlywheelRatio,
  classifyCfrTier,
  detectCommunityFlywheelLeaks,
  estimateEarnedCommunityGrowth,
  estimateSubsidizedTransactionalGrowth,
  recommendCommunityFlywheelPlays,
  type CommunityFlywheelInput
} from "../src/server/scoring/communityFlywheel";
import type { RediemBrandProfileInput } from "../src/server/scoring/rediem";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function fullDtcProfile(): RediemBrandProfileInput {
  return {
    ecommercePlatform: "Shopify",
    ecommercePlatformScore: 90,
    shopifyDetected: true,
    brandCategory: "beverage",
    hasSubscription: true,
    hasLoyaltyProgram: true,
    loyaltyProvider: "Smile.io",
    loyaltyProgramType: "Points and VIP tiers",
    hasReferralProgram: true,
    hasReviews: true,
    reviewProvider: "Okendo",
    hasUGC: true,
    instagramUrl: "https://instagram.com/brand",
    tiktokUrl: "https://tiktok.com/@brand",
    hasRetailPresence: false,
    sustainabilityAngle: null,
    missionDrivenAngle: null
  };
}

function bareProfile(): RediemBrandProfileInput {
  return {};
}

// ─── classifyCfrTier ──────────────────────────────────────────────────────────

test("classifyCfrTier: tier boundaries are exact", () => {
  assert.equal(classifyCfrTier(0.49), "Transactional Trap");
  assert.equal(classifyCfrTier(0.5), "Emerging Community Loop");
  assert.equal(classifyCfrTier(0.99), "Emerging Community Loop");
  assert.equal(classifyCfrTier(1.0), "Healthy Community Flywheel");
  assert.equal(classifyCfrTier(1.99), "Healthy Community Flywheel");
  assert.equal(classifyCfrTier(2.0), "Iconic Brand Flywheel");
  assert.equal(classifyCfrTier(3.5), "Iconic Brand Flywheel");
});

test("classifyCfrTier: zero is Transactional Trap", () => {
  assert.equal(classifyCfrTier(0), "Transactional Trap");
});

// ─── estimateEarnedCommunityGrowth ────────────────────────────────────────────

test("estimateEarnedCommunityGrowth: full DTC brand scores higher than bare brand on all dimensions", () => {
  const strong = estimateEarnedCommunityGrowth(fullDtcProfile(), [], []);
  const bare = estimateEarnedCommunityGrowth(bareProfile(), [], []);

  assert.ok(strong.participationDepth > bare.participationDepth,
    `participationDepth: ${strong.participationDepth} vs ${bare.participationDepth}`);
  assert.ok(strong.repeatEngagementStrength > bare.repeatEngagementStrength,
    `repeatEngagementStrength: ${strong.repeatEngagementStrength} vs ${bare.repeatEngagementStrength}`);
  assert.ok(strong.advocacyPotential > bare.advocacyPotential,
    `advocacyPotential: ${strong.advocacyPotential} vs ${bare.advocacyPotential}`);
  assert.ok(strong.retentionProgramStrength > bare.retentionProgramStrength,
    `retentionProgramStrength: ${strong.retentionProgramStrength} vs ${bare.retentionProgramStrength}`);
});

test("estimateEarnedCommunityGrowth: all sub-scores are 0–100 integers", () => {
  const result = estimateEarnedCommunityGrowth(fullDtcProfile(), [], []);
  for (const [key, val] of Object.entries(result)) {
    assert.ok(Number.isInteger(val) && val >= 0 && val <= 100, `${key}=${val} out of range`);
  }
});

test("estimateEarnedCommunityGrowth: preference capture lifted by quiz evidence", () => {
  const withQuiz = estimateEarnedCommunityGrowth(bareProfile(), [], [
    { fieldName: "quiz", value: "skin type quiz", rawExcerpt: "take our quiz to find your routine" }
  ]);
  const bare = estimateEarnedCommunityGrowth(bareProfile(), [], []);
  assert.ok(
    withQuiz.preferenceCapturePotential > bare.preferenceCapturePotential,
    "quiz evidence should lift preferenceCapturePotential"
  );
});

// ─── estimateSubsidizedTransactionalGrowth ────────────────────────────────────

test("estimateSubsidizedTransactionalGrowth: discount-heavy text lifts discountDependency", () => {
  const withDiscounts = estimateSubsidizedTransactionalGrowth(bareProfile(), [], [
    { fieldName: "retention", value: "30% off", rawExcerpt: "use coupon SAVE30 for 30% off your next order" }
  ]);
  const bare = estimateSubsidizedTransactionalGrowth(bareProfile(), [], []);
  assert.ok(
    withDiscounts.discountDependency > bare.discountDependency,
    "discount text should lift discountDependency"
  );
});

test("estimateSubsidizedTransactionalGrowth: paid-acquisition text lifts paidCacDependency", () => {
  const withPaid = estimateSubsidizedTransactionalGrowth(bareProfile(), [], [
    { fieldName: "acquisition", value: "meta ads", rawExcerpt: "We scale via paid social and meta ads" }
  ]);
  const base = estimateSubsidizedTransactionalGrowth(bareProfile(), [], []);
  assert.ok(
    withPaid.paidCacDependency > base.paidCacDependency,
    "paid acquisition text should lift paidCacDependency"
  );
});

test("estimateSubsidizedTransactionalGrowth: referral program reduces paidCacDependency", () => {
  const withReferral = estimateSubsidizedTransactionalGrowth(
    { ...bareProfile(), hasReferralProgram: true },
    [], []
  );
  const bare = estimateSubsidizedTransactionalGrowth(bareProfile(), [], []);
  assert.ok(
    withReferral.paidCacDependency < bare.paidCacDependency,
    "referral program should reduce paidCacDependency"
  );
});

test("estimateSubsidizedTransactionalGrowth: all sub-scores are 0–100 integers", () => {
  const result = estimateSubsidizedTransactionalGrowth(fullDtcProfile(), [], []);
  for (const [key, val] of Object.entries(result)) {
    assert.ok(Number.isInteger(val) && val >= 0 && val <= 100, `${key}=${val} out of range`);
  }
});

// ─── isPointsOnly / POINTS_ONLY_LOYALTY leak detection ───────────────────────

test("detectCommunityFlywheelLeaks: POINTS_ONLY_LOYALTY fires from text evidence when profile fields are null", () => {
  const profile: RediemBrandProfileInput = {
    ...bareProfile(),
    shopifyDetected: true,
    hasLoyaltyProgram: true,
    loyaltyProvider: null,
    loyaltyProgramType: null
  };
  const evidence = [
    {
      id: "e1",
      fieldName: "loyalty",
      value: "earn points on every purchase",
      rawExcerpt: "Earn 1 point per $1 spent. Redeem points for store credit."
    }
  ];
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], evidence);
  assert.ok(
    leaks.some((l) => l.leakType === "POINTS_ONLY_LOYALTY"),
    "POINTS_ONLY_LOYALTY should fire from text evidence even when loyaltyProgramType is null"
  );
});

test("detectCommunityFlywheelLeaks: POINTS_ONLY_LOYALTY does not fire when community language is present", () => {
  const profile: RediemBrandProfileInput = {
    ...bareProfile(),
    hasLoyaltyProgram: true,
    loyaltyProvider: "Yotpo",
    loyaltyProgramType: "Points and community challenges"
  };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  assert.ok(
    !leaks.some((l) => l.leakType === "POINTS_ONLY_LOYALTY"),
    "POINTS_ONLY_LOYALTY should not fire when community language is present in loyaltyProgramType"
  );
});

// ─── detectCommunityFlywheelLeaks ────────────────────────────────────────────

test("detectCommunityFlywheelLeaks: bare brand gets NO_PARTICIPATION_CAPTURE as first leak", () => {
  const leaks = detectCommunityFlywheelLeaks(bareProfile(), [], [], []);
  assert.ok(leaks.length > 0, "should produce leaks");
  assert.equal(leaks[0]?.leakType, "NO_PARTICIPATION_CAPTURE");
});

test("detectCommunityFlywheelLeaks: retail brand without receipt gets RETAIL_NOT_CONNECTED_TO_DTC", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasRetailPresence: true };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  assert.ok(
    leaks.some((l) => l.leakType === "RETAIL_NOT_CONNECTED_TO_DTC"),
    "retail brand without receipt upload should have RETAIL_NOT_CONNECTED_TO_DTC leak"
  );
});

test("detectCommunityFlywheelLeaks: receipt upload evidence removes RETAIL_NOT_CONNECTED_TO_DTC", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasRetailPresence: true };
  const evidence = [
    { fieldName: "retail", value: "receipt upload", rawExcerpt: "Upload your retail receipt and earn rewards." }
  ];
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], evidence);
  assert.ok(
    !leaks.some((l) => l.leakType === "RETAIL_NOT_CONNECTED_TO_DTC"),
    "receipt upload evidence should suppress RETAIL_NOT_CONNECTED_TO_DTC"
  );
});

test("detectCommunityFlywheelLeaks: reviews without referral or loyalty gets REVIEWS_ISOLATED_FROM_REWARDS", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasReviews: true };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  assert.ok(
    leaks.some((l) => l.leakType === "REVIEWS_ISOLATED_FROM_REWARDS"),
    "reviews without referral program should produce REVIEWS_ISOLATED_FROM_REWARDS"
  );
});

test("detectCommunityFlywheelLeaks: max 6 leaks returned", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasRetailPresence: true, hasSubscription: true };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  assert.ok(leaks.length <= 6, `got ${leaks.length} leaks — should be at most 6`);
});

test("detectCommunityFlywheelLeaks: all leaks have a valid recommendedPlayType", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasRetailPresence: true, hasSubscription: true };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  const validPlayTypes = new Set([
    "REVIEW_TO_REFERRAL_CHALLENGE",
    "SUBSCRIPTION_REWARD_SERIES",
    "UGC_SOCIAL_CHALLENGE",
    "RECEIPT_UPLOAD_RETAIL_TO_DTC",
    "ZERO_PARTY_PREFERENCE_CHALLENGE",
    "VIP_TIER_MIGRATION",
    "PRODUCT_DROP_PARTICIPATION_CAMPAIGN",
    "SUSTAINABILITY_OR_MISSION_CHALLENGE"
  ]);
  for (const l of leaks) {
    assert.ok(validPlayTypes.has(l.recommendedPlayType), `unknown recommendedPlayType: ${l.recommendedPlayType}`);
  }
});

test("detectCommunityFlywheelLeaks: leaks are sorted by severity descending", () => {
  const profile: RediemBrandProfileInput = { ...bareProfile(), hasRetailPresence: true, hasSubscription: true };
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], []);
  for (let i = 1; i < leaks.length; i++) {
    assert.ok(
      (leaks[i - 1]?.severity ?? 0) >= (leaks[i]?.severity ?? 0),
      `leaks not sorted: index ${i - 1} severity ${leaks[i - 1]?.severity} < index ${i} severity ${leaks[i]?.severity}`
    );
  }
});

test("detectCommunityFlywheelLeaks: competitor loyalty detection boosts POINTS_ONLY_LOYALTY severity", () => {
  const profile: RediemBrandProfileInput = {
    ...bareProfile(),
    shopifyDetected: true,
    hasLoyaltyProgram: true,
    loyaltyProgramType: "Points program"
  };
  const withDetection = detectCommunityFlywheelLeaks(profile, [], [
    { id: "d1", workspaceId: "w1", accountId: "a1", category: "LOYALTY", vendor: "Yotpo", confidence: 0.8 }
  ], []);
  const withoutDetection = detectCommunityFlywheelLeaks(profile, [], [], []);

  const with_ = withDetection.find((l) => l.leakType === "POINTS_ONLY_LOYALTY")?.severity ?? 0;
  const without_ = withoutDetection.find((l) => l.leakType === "POINTS_ONLY_LOYALTY")?.severity ?? 0;
  assert.ok(with_ > without_, `POINTS_ONLY_LOYALTY severity should be boosted by competitor detection: ${with_} vs ${without_}`);
});

// ─── Mode distinction (prospecting vs customer) ───────────────────────────────

test("prospecting mode: CFR capped at 1.99 regardless of signal strength", () => {
  // Beauty/wellness brand with every community signal enabled — raw ratio could exceed 2
  const profile: RediemBrandProfileInput = {
    shopifyDetected: true,
    brandCategory: "beauty",
    hasSubscription: true,
    hasLoyaltyProgram: true,
    loyaltyProvider: "Yotpo",
    loyaltyProgramType: "Community challenges and tiers",
    hasReferralProgram: true,
    hasReviews: true,
    hasUGC: true,
    instagramUrl: "https://instagram.com/brand",
    tiktokUrl: "https://tiktok.com/@brand",
    hasRetailPresence: false,
    sustainabilityAngle: "B Corp certified",
    missionDrivenAngle: "1% for the planet",
    socialCommunityScore: 95
  };
  const result = calculateCommunityFlywheelRatio({ mode: "prospecting", profile });
  assert.ok(result.estimatedCfr <= 1.99, `prospecting CFR must be ≤ 1.99, got ${result.estimatedCfr}`);
  assert.notEqual(result.cfrTier, "Iconic Brand Flywheel", "prospecting should never claim Iconic Brand Flywheel");
});

test("customer mode: mode field is returned correctly and has no prospecting cap", () => {
  const result = calculateCommunityFlywheelRatio({ mode: "customer", profile: fullDtcProfile() });
  assert.equal(result.mode, "customer");
  if (result.estimatedCfr >= 2) {
    assert.equal(result.cfrTier, "Iconic Brand Flywheel");
  }
});

test("prospecting mode: confidence capped at 0.65 even with maximum evidence", () => {
  const evidence = Array.from({ length: 10 }, (_, i) => ({
    id: `e${i}`,
    fieldName: "field",
    value: "value",
    sourceUrl: `https://example.com/${i}`,
    rawExcerpt: "some excerpt"
  }));
  const signals = Array.from({ length: 6 }, (_, i) => ({
    id: `s${i}`,
    workspaceId: "w1",
    accountId: "a1",
    type: "NEWS" as const,
    title: `Signal ${i}`,
    totalScore: 80,
    sourceUrl: `https://example.com/signal/${i}`
  }));
  const result = calculateCommunityFlywheelRatio({
    mode: "prospecting",
    profile: fullDtcProfile(),
    evidence,
    signals,
    detections: []
  });
  assert.ok(
    result.cfrConfidence <= 0.65,
    `prospecting confidence must be ≤ 0.65, got ${result.cfrConfidence}`
  );
});

test("customer mode with strong evidence: confidence exceeds 0.65", () => {
  const evidence = Array.from({ length: 10 }, (_, i) => ({
    id: `e${i}`,
    fieldName: "field",
    value: "value",
    sourceUrl: `https://example.com/${i}`,
    rawExcerpt: "some excerpt"
  }));
  const result = calculateCommunityFlywheelRatio({
    mode: "customer",
    profile: fullDtcProfile(),
    evidence,
    detections: [
      { id: "d1", workspaceId: "w1", accountId: "a1", category: "LOYALTY", vendor: "Smile.io", confidence: 0.9 },
      { id: "d2", workspaceId: "w1", accountId: "a1", category: "REVIEWS", vendor: "Okendo", confidence: 0.9 }
    ]
  });
  assert.ok(
    result.cfrConfidence > 0.65,
    `customer mode with strong evidence should exceed 0.65, got ${result.cfrConfidence}`
  );
});

// ─── No-ecommerce confidence cap ─────────────────────────────────────────────

test("brand with no ecommerce signal caps confidence at 0.34", () => {
  const result = calculateCommunityFlywheelRatio({
    mode: "customer",
    profile: { brandCategory: "B2B software", hasReviews: null, hasUGC: null, hasLoyaltyProgram: null }
  });
  assert.ok(
    result.cfrConfidence <= 0.34,
    `no-ecommerce confidence must be ≤ 0.34, got ${result.cfrConfidence}`
  );
});

// ─── calculateCommunityFlywheelRatio: end-to-end ─────────────────────────────

test("calculateCommunityFlywheelRatio: default mode is prospecting", () => {
  const result = calculateCommunityFlywheelRatio({ profile: bareProfile() });
  assert.equal(result.mode, "prospecting");
});

test("calculateCommunityFlywheelRatio: result shape is complete", () => {
  const result = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: fullDtcProfile() });

  assert.ok(["prospecting", "customer"].includes(result.mode));
  assert.ok(result.estimatedCfr >= 0);
  assert.ok(result.cfrConfidence > 0 && result.cfrConfidence <= 1);
  assert.ok(
    ["Transactional Trap", "Emerging Community Loop", "Healthy Community Flywheel", "Iconic Brand Flywheel"].includes(result.cfrTier)
  );
  assert.ok(typeof result.earnedCommunityGrowth === "number");
  assert.ok(typeof result.subsidizedTransactionalGrowth === "number");
  assert.ok(Array.isArray(result.leaks));
  assert.ok(Array.isArray(result.plays));
  assert.ok(Array.isArray(result.explanation) && result.explanation.length > 0);
});

test("calculateCommunityFlywheelRatio: earnedCommunityGrowth / subsidizedTransactionalGrowth ≈ estimatedCfr", () => {
  const result = calculateCommunityFlywheelRatio({ mode: "customer", profile: fullDtcProfile() });
  const rawRatio = result.earnedCommunityGrowth / result.subsidizedTransactionalGrowth;
  assert.ok(
    Math.abs(rawRatio - result.estimatedCfr) < 0.1,
    `ratio mismatch: earned=${result.earnedCommunityGrowth} / subsidized=${result.subsidizedTransactionalGrowth} = ${rawRatio.toFixed(2)}, cfr=${result.estimatedCfr}`
  );
});

test("calculateCommunityFlywheelRatio: recommendedPlay matches first play in plays array", () => {
  const result = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: bareProfile() });
  if (result.plays.length > 0) {
    assert.equal(result.recommendedPlay, result.plays[0]?.playType);
  }
});

test("calculateCommunityFlywheelRatio: product drop signal produces PRODUCT_DROP_PARTICIPATION_CAMPAIGN play", () => {
  const result = calculateCommunityFlywheelRatio({
    mode: "prospecting",
    profile: fullDtcProfile(),
    signals: [
      {
        id: "s1", workspaceId: "w1", accountId: "a1",
        type: "PRODUCT_LAUNCH",
        title: "Limited edition drop — new summer flavor",
        totalScore: 80
      }
    ]
  });
  assert.ok(
    result.plays.some((p) => p.playType === "PRODUCT_DROP_PARTICIPATION_CAMPAIGN"),
    "product launch signal should produce PRODUCT_DROP_PARTICIPATION_CAMPAIGN play"
  );
});

test("calculateCommunityFlywheelRatio: sustainability angle produces mission play", () => {
  const result = calculateCommunityFlywheelRatio({
    mode: "prospecting",
    profile: { ...bareProfile(), shopifyDetected: true, sustainabilityAngle: "B Corp certified" }
  });
  assert.ok(
    result.plays.some((p) => p.playType === "SUSTAINABILITY_OR_MISSION_CHALLENGE"),
    "sustainability angle should produce SUSTAINABILITY_OR_MISSION_CHALLENGE play"
  );
});

test("calculateCommunityFlywheelRatio: subsidizedTransactionalGrowth floored at 10 — no division by zero", () => {
  const result = calculateCommunityFlywheelRatio({ mode: "customer", profile: bareProfile() });
  assert.ok(Number.isFinite(result.estimatedCfr), "CFR should be finite even when subsidized signals are absent");
  assert.ok(result.subsidizedTransactionalGrowth >= 10, "subsidizedTransactionalGrowth should not fall below the floor");
});

// ─── Points-only brand with high social presence ──────────────────────────────

test("points-only loyalty brand with high social presence has CFR below 1 and VIP_TIER_MIGRATION play", () => {
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
      { id: "e1", sourceUrl: "https://brand.example/rewards", rawExcerpt: "Earn points for purchases and redeem points for dollars off." },
      { id: "e2", sourceUrl: "https://instagram.com/example", rawExcerpt: "Large social community with regular customer content." }
    ]
  });

  assert.ok(snapshot.estimatedCfr < 1, `expected CFR < 1, got ${snapshot.estimatedCfr}`);
  assert.ok(snapshot.plays.length > 0);
  assert.equal(snapshot.primaryLeak, "POINTS_ONLY_LOYALTY");
  assert.equal(snapshot.recommendedPlay, "VIP_TIER_MIGRATION");
  assert.ok(snapshot.leaks.some((l) => l.leakType === "UGC_NOT_VERIFIED"));
});

// ─── Mature community brand ───────────────────────────────────────────────────

test("brand with referrals, reviews, and subscription loops has higher CFR than points-only baseline", () => {
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
    evidence: [{ id: "p1", sourceUrl: "https://brand.example/rewards", rawExcerpt: "Earn points." }]
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
      { id: "r1", sourceUrl: "https://brand.example/reviews", rawExcerpt: "Verified reviews unlock referrals and subscriber perks." },
      { id: "s1", sourceUrl: "https://brand.example/subscribe", rawExcerpt: "Subscribers earn renewal rewards and referral bonuses." }
    ]
  });

  assert.ok(mature.estimatedCfr > baseline.estimatedCfr, "mature brand should outperform points-only baseline");
  assert.ok(mature.estimatedCfr >= 1, "mature brand should reach Healthy Community Flywheel");
  assert.match(mature.cfrTier, /Healthy|Iconic/);
});

// ─── Discount-heavy brand ─────────────────────────────────────────────────────

test("discount-heavy brand with no community programs lands in Transactional Trap", () => {
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
      { id: "d1", sourceUrl: "https://brand.example/sale", rawExcerpt: "Use promo code for 40% off, clearance sale, coupon and winback discount." }
    ]
  });

  assert.equal(snapshot.cfrTier, "Transactional Trap");
  assert.ok(snapshot.estimatedCfr < 0.5, `expected CFR < 0.5, got ${snapshot.estimatedCfr}`);
  assert.ok(snapshot.leaks.some((l) => l.leakType === "DISCOUNT_HEAVY_RETENTION"));
});

// ─── Missing data / edge cases ────────────────────────────────────────────────

test("all-null profile produces valid snapshot without throwing", () => {
  assert.doesNotThrow(() => {
    calculateCommunityFlywheelRatio({ profile: bareProfile() });
  });
});

test("missing data is conservative — no fake precision in CFR", () => {
  const snapshot = calculateCommunityFlywheelRatio({ profile: {} });

  assert.equal(Number.isInteger(snapshot.earnedCommunityGrowth), true);
  assert.equal(Number.isInteger(snapshot.subsidizedTransactionalGrowth), true);
  assert.equal(Number.isNaN(snapshot.estimatedCfr), false);
  assert.equal(snapshot.estimatedCfr, Number(snapshot.estimatedCfr.toFixed(2)));
  assert.ok(snapshot.cfrConfidence < 0.35);
});

test("empty signals and detections do not throw", () => {
  assert.doesNotThrow(() => {
    calculateCommunityFlywheelRatio({ profile: fullDtcProfile(), signals: [], detections: [], evidence: [] });
  });
});

// ─── explainCfr ───────────────────────────────────────────────────────────────

test("explanation does not expose internal 0–100 sub-scores", () => {
  const snapshot = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: bareProfile() });
  const fullText = snapshot.explanation.join(" ");

  const forbidden = [
    "participationDepth", "repeatEngagementStrength", "advocacyPotential",
    "preferenceCapturePotential", "retentionProgramStrength",
    "discountDependency", "transactionalRewardBias", "paidCacDependency", "churnExposure",
    "earnedCommunityGrowth", "subsidizedTransactionalGrowth"
  ];
  for (const term of forbidden) {
    assert.ok(!fullText.includes(term), `explanation should not expose internal field "${term}"`);
  }
});

test("explanation includes CFR value and confidence percentage", () => {
  const snapshot = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: fullDtcProfile() });
  const fullText = snapshot.explanation.join(" ");
  const confidencePct = Math.round(snapshot.cfrConfidence * 100);
  assert.ok(fullText.includes(`${snapshot.estimatedCfr}`), "explanation should include the CFR value");
  assert.ok(fullText.includes(`${confidencePct}%`), "explanation should include the confidence percentage");
});

test("prospecting explanation notes that data comes from visible signals", () => {
  const snapshot = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: bareProfile() });
  const fullText = snapshot.explanation.join(" ");
  assert.ok(
    /publicly visible signals/i.test(fullText),
    "prospecting explanation should mention visible signals"
  );
});

test("customer mode explanation does not mention prospecting", () => {
  const snapshot = calculateCommunityFlywheelRatio({ mode: "customer", profile: fullDtcProfile() });
  const fullText = snapshot.explanation.join(" ");
  assert.ok(
    !/prospecting/i.test(fullText),
    "customer mode explanation should not mention prospecting"
  );
});

test("explanation names primary leak when one exists", () => {
  const snapshot = calculateCommunityFlywheelRatio({ mode: "prospecting", profile: bareProfile() });
  if (snapshot.primaryLeak) {
    const fullText = snapshot.explanation.join(" ");
    assert.ok(fullText.toLowerCase().includes("leak"), "explanation should mention the leak");
  }
});

// ─── CFR helpers compose correctly ───────────────────────────────────────────

test("CFR helpers expose earned, subsidized, leaks, plays, and tier consistently", () => {
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
  const evidence = [{ id: "q1", sourceUrl: "https://brand.example/quiz", rawExcerpt: "Take our routine quiz and subscribe." }];

  const earned = estimateEarnedCommunityGrowth(profile, [], evidence);
  const subsidized = estimateSubsidizedTransactionalGrowth(profile, [], evidence);
  const leaks = detectCommunityFlywheelLeaks(profile, [], [], evidence);
  const plays = recommendCommunityFlywheelPlays(profile, leaks, []);

  assert.equal(classifyCfrTier(2.1), "Iconic Brand Flywheel");
  assert.ok(earned.preferenceCapturePotential > 10, "quiz evidence should lift preferenceCapturePotential");
  assert.ok(subsidized.churnExposure > 0, "subscription-only brand should have some churnExposure");
  assert.ok(leaks.length > 0, "should detect at least one leak");
  assert.ok(plays.length > 0, "should recommend at least one play");
});
