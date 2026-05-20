import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateDiscountDependenceRatio,
  calculateGtmDiagnostics,
  calculateMissionToActionRatio,
  calculateOwnedCommunityConversionScore,
  calculateParticipationCaptureGap,
  calculateProductDropParticipationScore,
  calculateRetailToCommunityBridgeIndex,
  calculateStackFragmentationIndex,
  calculateUgcVerificationGap,
  calculateZeroPartyDataDepth,
  type GtmDiagnosticInput,
  type GtmDiagnosticMetricId,
  type GtmDiagnosticScore
} from "../src/server/scoring/gtmDiagnostics";

const allMetricIds: GtmDiagnosticMetricId[] = [
  "PCG",
  "RCBI",
  "MAR",
  "UVG",
  "DDR",
  "ZPDD",
  "PDPS",
  "SFI",
  "OCCS"
];

function retailBeverageBrand(): GtmDiagnosticInput {
  return {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Functional beverage",
      brandCategory: "Beverage",
      hasSubscription: true,
      hasLoyaltyProgram: false,
      hasReferralProgram: false,
      hasReviews: true,
      hasUGC: true,
      instagramUrl: "https://instagram.com/bev",
      socialCommunityScore: 72,
      hasRetailPresence: true,
      retailSignals: ["Target", "Whole Foods", "Amazon marketplace"]
    },
    signals: [
      {
        type: "RETAIL_EXPANSION",
        title: "Find us in store at Target and Whole Foods",
        description: "Retail buyers can scan receipt or upload receipt for rewards after purchase.",
        sourceUrl: "https://beverage.test/store-locator"
      }
    ],
    evidence: [
      {
        id: "retail-1",
        fieldName: "retail",
        value: "Target, Whole Foods, Amazon marketplace",
        rawExcerpt: "Upload your retail receipt after you buy in store.",
        sourceUrl: "https://beverage.test/retail-rewards"
      }
    ]
  };
}

function missionLedSustainabilityBrand(): GtmDiagnosticInput {
  return {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Home goods",
      brandCategory: "Sustainable home",
      hasSubscription: false,
      hasLoyaltyProgram: false,
      hasReferralProgram: false,
      hasReviews: true,
      hasUGC: false,
      socialCommunityScore: 48,
      hasRetailPresence: false,
      sustainabilityAngle: "Plastic-free refills and climate impact",
      missionDrivenAngle: "Make low-waste living easier"
    },
    evidence: [
      {
        id: "mission-1",
        fieldName: "mission",
        value: "sustainability impact clean climate plastic-free refill",
        rawExcerpt: "Our mission is to reduce plastic waste through sustainable refill systems and climate-conscious ingredients.",
        sourceUrl: "https://mission.test/impact"
      }
    ]
  };
}

function pointsHeavyDiscountBrand(): GtmDiagnosticInput {
  return {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Beauty",
      brandCategory: "Skincare",
      hasSubscription: true,
      hasLoyaltyProgram: true,
      loyaltyProvider: "Legacy points app",
      loyaltyProgramType: "Earn points, redeem points, store credit, VIP discount tiers",
      hasReferralProgram: false,
      hasReviews: true,
      hasUGC: false,
      socialCommunityScore: 35,
      hasRetailPresence: false
    },
    signals: [
      {
        type: "PROMOTION",
        title: "30% off first purchase",
        description: "Use promo code SAVE30. Redeem points for dollars off and store credit.",
        sourceUrl: "https://points.test/rewards"
      }
    ],
    detections: [
      {
        category: "loyalty",
        vendor: "Legacy points app",
        confidence: 0.8,
        evidence: "Rewards page promotes points, coupons, discounts, and store credit.",
        sourceUrl: "https://points.test/rewards"
      }
    ],
    evidence: [
      {
        id: "discount-1",
        fieldName: "rewards",
        value: "coupon promo code 30% off points dollars off",
        rawExcerpt: "Earn points on every order and redeem for dollars off your next purchase.",
        sourceUrl: "https://points.test/rewards"
      }
    ]
  };
}

function ugcHeavyApparelBrand(): GtmDiagnosticInput {
  return {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Apparel",
      brandCategory: "Streetwear",
      hasSubscription: false,
      hasLoyaltyProgram: false,
      hasReferralProgram: false,
      hasReviews: true,
      hasUGC: true,
      instagramUrl: "https://instagram.com/apparel",
      tiktokUrl: "https://tiktok.com/@apparel",
      socialCommunityScore: 91,
      hasRetailPresence: false
    },
    signals: [
      {
        type: "UGC",
        title: "Creator challenge and tag us on TikTok",
        description: "Ambassadors and creators share outfits using the brand hashtag.",
        sourceUrl: "https://apparel.test/community"
      }
    ],
    evidence: [
      {
        id: "ugc-1",
        fieldName: "community",
        value: "creator ambassador ugc tag us instagram tiktok",
        rawExcerpt: "Tag us on Instagram or TikTok to be featured by our creator community.",
        sourceUrl: "https://apparel.test/community"
      }
    ]
  };
}

function fragmentedStackBrand(): GtmDiagnosticInput {
  return {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Supplements",
      brandCategory: "Wellness",
      hasSubscription: true,
      subscriptionProvider: "Recharge",
      hasLoyaltyProgram: true,
      loyaltyProvider: "LoyaltyLion",
      loyaltyProgramType: "Points and VIP",
      hasReferralProgram: true,
      hasReviews: true,
      reviewProvider: "Okendo",
      hasUGC: true,
      socialCommunityScore: 68,
      hasRetailPresence: true
    },
    detections: [
      { category: "loyalty", vendor: "LoyaltyLion", confidence: 0.9, sourceUrl: "https://stack.test/rewards" },
      { category: "email", vendor: "Klaviyo", confidence: 0.88, sourceUrl: "https://stack.test" },
      { category: "subscription", vendor: "Recharge", confidence: 0.86, sourceUrl: "https://stack.test/subscribe" },
      { category: "reviews", vendor: "Okendo", confidence: 0.91, sourceUrl: "https://stack.test/reviews" },
      { category: "sms", vendor: "Attentive", confidence: 0.84, sourceUrl: "https://stack.test" },
      { category: "ecommerce", vendor: "Shopify", confidence: 0.95, sourceUrl: "https://stack.test/cart" }
    ],
    evidence: [
      {
        id: "stack-1",
        fieldName: "tools",
        value: "LoyaltyLion Klaviyo Recharge Okendo Attentive Shopify",
        rawExcerpt: "Public scripts and pages show loyalty, email, subscription, reviews, sms, and ecommerce tools.",
        sourceUrl: "https://stack.test"
      }
    ]
  };
}

function lowDataUnknownBrand(): GtmDiagnosticInput {
  return {
    profile: {},
    signals: [],
    detections: [],
    evidence: []
  };
}

function assertValidScore(score: GtmDiagnosticScore) {
  assert.ok(allMetricIds.includes(score.metricId), `unknown metricId ${score.metricId}`);
  assert.ok(score.label.length > 0, "label should be present");
  assert.ok(Number.isInteger(score.score), `${score.metricId} score should be integer`);
  assert.ok(score.score >= 0 && score.score <= 100, `${score.metricId} score ${score.score} out of range`);
  assert.ok(score.confidence >= 0 && score.confidence <= 1, `${score.metricId} confidence out of range`);
  assert.ok(score.explanation.length > 40, `${score.metricId} explanation should be useful`);
  assert.ok(score.outboundAngle.length > 40, `${score.metricId} outbound angle should be useful`);
  assert.ok(score.recommendedPlayTypes.length > 0, `${score.metricId} should recommend Rediem plays`);
  assert.ok(score.buyerPersonas.length > 0, `${score.metricId} should include buyer personas`);
}

test("calculateGtmDiagnostics returns every Rediem GTM diagnostic in stable order", () => {
  const diagnostics = calculateGtmDiagnostics(retailBeverageBrand());

  assert.deepEqual(diagnostics.map((metric) => metric.metricId), allMetricIds);
  for (const metric of diagnostics) {
    assertValidScore(metric);
  }
});

test("retail-heavy beverage brand has a strong retail-to-community bridge opportunity", () => {
  const score = calculateRetailToCommunityBridgeIndex(retailBeverageBrand());

  assertValidScore(score);
  assert.ok(score.score >= 60, `expected high RCBI, got ${score.score}`);
  assert.ok(score.confidence >= 0.45, `expected useful confidence, got ${score.confidence}`);
  assert.ok(score.sourceEvidenceIds.includes("retail-1"));
  assert.ok(score.sourceUrls.includes("https://beverage.test/retail-rewards"));
  assert.ok(score.recommendedPlayTypes.includes("RECEIPT_UPLOAD_RETAIL_TO_DTC"));
});

test("mission-led sustainability brand with weak action capture has elevated MAR", () => {
  const score = calculateMissionToActionRatio(missionLedSustainabilityBrand());
  const unknown = calculateMissionToActionRatio(lowDataUnknownBrand());

  assertValidScore(score);
  assert.ok(score.score > unknown.score, `mission brand ${score.score} should exceed unknown ${unknown.score}`);
  assert.ok(score.score >= 45, `expected meaningful MAR opportunity, got ${score.score}`);
  assert.ok(score.sourceEvidenceIds.includes("mission-1"));
  assert.ok(score.recommendedPlayTypes.includes("SUSTAINABILITY_OR_MISSION_CHALLENGE"));
});

test("points-heavy loyalty brand with promos has elevated DDR and PCG", () => {
  const input = pointsHeavyDiscountBrand();
  const ddr = calculateDiscountDependenceRatio(input);
  const pcg = calculateParticipationCaptureGap(input);

  assertValidScore(ddr);
  assertValidScore(pcg);
  assert.ok(ddr.score >= 55, `expected elevated DDR, got ${ddr.score}`);
  assert.ok(ddr.sourceEvidenceIds.includes("discount-1"));
  assert.ok(ddr.recommendedPlayTypes.includes("VIP_TIER_MIGRATION"));
  assert.ok(pcg.score >= 30, `expected at least moderate PCG, got ${pcg.score}`);
});

test("UGC-heavy apparel brand without verified capture has elevated UVG and OCCS", () => {
  const input = ugcHeavyApparelBrand();
  const uvg = calculateUgcVerificationGap(input);
  const occs = calculateOwnedCommunityConversionScore(input);

  assertValidScore(uvg);
  assertValidScore(occs);
  assert.ok(uvg.score >= 55, `expected elevated UVG, got ${uvg.score}`);
  assert.ok(occs.score >= 45, `expected elevated OCCS, got ${occs.score}`);
  assert.ok(uvg.sourceEvidenceIds.includes("ugc-1"));
  assert.ok(uvg.recommendedPlayTypes.includes("UGC_SOCIAL_CHALLENGE"));
});

test("fragmented LoyaltyLion, Klaviyo, Recharge, Okendo, Attentive stack has high SFI", () => {
  const score = calculateStackFragmentationIndex(fragmentedStackBrand());

  assertValidScore(score);
  assert.ok(score.score >= 55, `expected high SFI, got ${score.score}`);
  assert.ok(score.confidence >= 0.5, `expected strong confidence, got ${score.confidence}`);
  assert.ok(score.sourceEvidenceIds.includes("stack-1"));
  assert.ok(score.sourceUrls.includes("https://stack.test/rewards"));
  assert.ok(score.recommendedPlayTypes.includes("VIP_TIER_MIGRATION"));
});

test("zero-party and product-drop metrics rise from relevant public signals", () => {
  const input: GtmDiagnosticInput = {
    profile: {
      ecommercePlatform: "Shopify",
      shopifyDetected: true,
      productCategory: "Beauty",
      brandCategory: "Skincare",
      hasSubscription: true,
      hasLoyaltyProgram: true,
      hasReferralProgram: false,
      hasReviews: true,
      hasUGC: true,
      socialCommunityScore: 76
    },
    signals: [
      {
        type: "PRODUCT_DROP",
        title: "Limited edition seasonal flavor drop with early access waitlist",
        description: "Members complete a skin type quiz, vote in a poll, and share UGC for launch access.",
        sourceUrl: "https://drop.test/launch"
      }
    ],
    evidence: [
      {
        id: "drop-1",
        fieldName: "launch",
        value: "limited edition early access waitlist product drop quiz poll preference",
        rawExcerpt: "Complete your preference profile and skin type quiz for early access to the limited edition drop.",
        sourceUrl: "https://drop.test/launch"
      }
    ]
  };
  const zpdd = calculateZeroPartyDataDepth(input);
  const pdps = calculateProductDropParticipationScore(input);

  assertValidScore(zpdd);
  assertValidScore(pdps);
  assert.ok(zpdd.score >= 45, `expected elevated ZPDD, got ${zpdd.score}`);
  assert.ok(pdps.score >= 55, `expected elevated PDPS, got ${pdps.score}`);
  assert.ok(zpdd.recommendedPlayTypes.includes("ZERO_PARTY_PREFERENCE_CHALLENGE"));
  assert.ok(pdps.recommendedPlayTypes.includes("PRODUCT_DROP_PARTICIPATION_CAMPAIGN"));
});

test("low-data unknown brand stays low confidence and avoids strong positive claims", () => {
  const diagnostics = calculateGtmDiagnostics(lowDataUnknownBrand());

  assert.equal(diagnostics.length, allMetricIds.length);
  for (const metric of diagnostics) {
    assertValidScore(metric);
    assert.ok(metric.confidence <= 0.24, `${metric.metricId} confidence should stay low, got ${metric.confidence}`);
    assert.ok(metric.score <= 35, `${metric.metricId} low-data score should be capped, got ${metric.score}`);
    assert.notEqual(metric.tier, "Priority", `${metric.metricId} should not be priority on missing data`);
  }
});
