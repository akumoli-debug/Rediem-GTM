import assert from "node:assert/strict";
import { test } from "node:test";
import {
  rediemPlaybooks,
  selectRediemPlaybooks,
  type RediemPlaybookId
} from "../src/server/playbooks/rediemPlaybooks";
import type { CommunityFlywheelSnapshotEstimate } from "../src/server/scoring/communityFlywheel";
import type { GtmDiagnosticMetricId, GtmDiagnosticScore } from "../src/server/scoring/gtmDiagnostics";
import type { RediemBrandProfileInput } from "../src/server/scoring/rediem";

const expectedPlaybookIds: RediemPlaybookId[] = [
  "RETAIL_TO_OWNED_DATA_BRIDGE",
  "POINTS_TO_PARTICIPATION_MIGRATION",
  "REVIEW_TO_REFERRAL_LOOP",
  "UGC_TO_OWNED_COMMUNITY",
  "SUBSCRIPTION_RETENTION_LOOP",
  "MISSION_CHALLENGE_ACTIVATION",
  "PRODUCT_DROP_PARTICIPATION",
  "ZERO_PARTY_PERSONALIZATION_LOOP",
  "STACK_FRAGMENTATION_CONSOLIDATION",
  "OWNED_COMMUNITY_CONVERSION"
];

function metric(
  metricId: GtmDiagnosticMetricId,
  score = 88,
  confidence = 0.72,
  source = "https://brand.test/source"
): GtmDiagnosticScore {
  return {
    metricId,
    label: metricId,
    score,
    confidence,
    tier: score >= 75 ? "Priority" : "High",
    explanation: `${metricId} public-signal diagnostic with confidence and source evidence.`,
    sourceEvidenceIds: [`ev_${metricId.toLowerCase()}`],
    sourceUrls: [source],
    recommendedPlayTypes: ["UGC_SOCIAL_CHALLENGE"],
    buyerPersonas: ["Director of Retention"],
    outboundAngle: `${metricId} angle`
  };
}

function cfr(
  primaryLeak: string | null,
  recommendedPlay: string | null
): CommunityFlywheelSnapshotEstimate {
  return {
    mode: "prospecting",
    snapshotDate: new Date("2026-05-20T12:00:00.000Z"),
    estimatedCfr: 0.82,
    cfrConfidence: 0.61,
    cfrTier: "Emerging Community Loop",
    participationDepth: 50,
    repeatEngagementStrength: 50,
    advocacyPotential: 50,
    preferenceCapturePotential: 50,
    retentionProgramStrength: 50,
    verifiedParticipationValue: 50,
    repeatParticipationRate: 50,
    advocacyConversionRate: 50,
    zeroPartyCompletionRate: 50,
    retentionLiftValue: 50,
    discountDependency: 50,
    transactionalRewardBias: 50,
    paidCacDependency: 50,
    churnExposure: 50,
    rewardCostRatio: 50,
    churnRecoveryCost: 50,
    earnedCommunityGrowth: 50,
    subsidizedTransactionalGrowth: 61,
    primaryLeak: primaryLeak as never,
    secondaryLeak: null,
    recommendedPlay: recommendedPlay as never,
    leaks: [],
    plays: [],
    explanation: ["Prospecting CFR estimate."]
  };
}

function baseInput(
  metricId: GtmDiagnosticMetricId,
  profile: RediemBrandProfileInput,
  text: string,
  source = "https://brand.test/source"
) {
  return {
    gtmDiagnostics: [metric(metricId, 90, 0.74, source)],
    brandProfile: profile,
    signals: [
      {
        type: "PLAYBOOK_SIGNAL",
        title: text,
        description: text,
        sourceUrl: source,
        totalScore: 90
      }
    ],
    detections: [],
    evidence: [
      {
        id: "ev_primary",
        fieldName: "playbookSignal",
        value: text,
        rawExcerpt: text,
        sourceUrl: source,
        confidence: 0.74
      }
    ]
  };
}

test("Rediem playbook definitions are complete and GTM-ops ready", () => {
  assert.deepEqual(rediemPlaybooks.map((playbook) => playbook.id), expectedPlaybookIds);

  for (const playbook of rediemPlaybooks) {
    assert.ok(playbook.title.length > 0, `${playbook.id} title`);
    assert.ok(playbook.thesis.length > 40, `${playbook.id} thesis`);
    assert.ok(playbook.triggerMetricIds.length > 0, `${playbook.id} metrics`);
    assert.ok(playbook.requiredSignals.length > 0, `${playbook.id} requiredSignals`);
    assert.ok(playbook.positiveSignals.length > 0, `${playbook.id} positiveSignals`);
    assert.ok(playbook.disqualifiers.length > 0, `${playbook.id} disqualifiers`);
    assert.ok(playbook.recommendedBuyerPersonas.length > 0, `${playbook.id} personas`);
    assert.ok(playbook.outboundAngle.length > 40, `${playbook.id} outboundAngle`);
    assert.ok(playbook.activationIdea.length > 40, `${playbook.id} activationIdea`);
    assert.ok(playbook.crmFields.includes("recommended_gtm_playbook"), `${playbook.id} crmFields`);
    assert.ok(playbook.n8nActions.length > 0, `${playbook.id} n8nActions`);
    assert.ok(playbook.evidenceRequirements.length > 0, `${playbook.id} evidenceRequirements`);
    assert.ok(playbook.safetyNotes.length > 0, `${playbook.id} safetyNotes`);
  }
});

test("selects retail-to-owned data bridge from RCBI, retail, and receipt evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("RCBI", { hasRetailPresence: true, hasReviews: true }, "Retail store locator at Target with receipt upload opportunity and DTC subscription."),
    communityFlywheelRatio: cfr("RETAIL_NOT_CONNECTED_TO_DTC", "RECEIPT_UPLOAD_RETAIL_TO_DTC")
  });

  assertSelected(selections, "RETAIL_TO_OWNED_DATA_BRIDGE");
});

test("selects points-to-participation migration from points loyalty evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("DDR", {
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Earn points, redeem rewards, VIP tiers",
      hasReviews: true
    }, "Rewards loyalty points earn redeem VIP discounts with reviews and UGC elsewhere."),
    communityFlywheelRatio: cfr("POINTS_ONLY_LOYALTY", "VIP_TIER_MIGRATION")
  });

  assertSelected(selections, "POINTS_TO_PARTICIPATION_MIGRATION");
});

test("selects review-to-referral loop from reviews with weak referral capture", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("PCG", { hasReviews: true, hasReferralProgram: false }, "Okendo verified reviews and social proof but no review to referral loop detected."),
    communityFlywheelRatio: cfr("REVIEWS_ISOLATED_FROM_REWARDS", "REVIEW_TO_REFERRAL_CHALLENGE")
  });

  assertSelected(selections, "REVIEW_TO_REFERRAL_LOOP");
});

test("selects UGC-to-owned community from creator and social evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("UVG", {
      hasUGC: true,
      instagramUrl: "https://instagram.com/brand",
      tiktokUrl: "https://tiktok.com/@brand",
      socialCommunityScore: 90
    }, "Creator ambassador UGC tag us on Instagram and TikTok with weak verified member capture."),
    communityFlywheelRatio: cfr("UGC_NOT_VERIFIED", "UGC_SOCIAL_CHALLENGE")
  });

  assertSelected(selections, "UGC_TO_OWNED_COMMUNITY");
});

test("selects subscription retention loop from subscription and replenishment evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("ZPDD", {
      hasSubscription: true,
      subscriptionProvider: "Recharge",
      hasReviews: true
    }, "Recharge subscription subscribe replenishment routine with preference and renewal reward opportunity."),
    communityFlywheelRatio: cfr("NO_SUBSCRIPTION_REWARD_SERIES", "SUBSCRIPTION_REWARD_SERIES")
  });

  assertSelected(selections, "SUBSCRIPTION_RETENTION_LOOP");
});

test("selects mission challenge activation from mission and sustainability evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("MAR", {
      missionDrivenAngle: "Wellness education",
      sustainabilityAngle: "Plastic-free sustainability impact"
    }, "Mission sustainability impact wellness education with weak customer challenge action path."),
    communityFlywheelRatio: cfr(null, "SUSTAINABILITY_OR_MISSION_CHALLENGE")
  });

  assertSelected(selections, "MISSION_CHALLENGE_ACTIVATION");
});

test("selects product drop participation from launch and early access evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("PDPS", { hasUGC: true, hasLoyaltyProgram: true }, "Limited edition product drop launch early access seasonal collab waitlist with UGC voting.")
  });

  assertSelected(selections, "PRODUCT_DROP_PARTICIPATION");
});

test("selects zero-party personalization loop from quiz and preference evidence", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("ZPDD", { hasSubscription: true }, "Quiz preference survey poll profile routine style taste fit personalization reward.")
  });

  assertSelected(selections, "ZERO_PARTY_PERSONALIZATION_LOOP");
});

test("selects stack fragmentation consolidation from multiple reliable tool detections", () => {
  const input = baseInput("SFI", {
    hasLoyaltyProgram: true,
    hasReviews: true,
    hasSubscription: true
  }, "LoyaltyLion Klaviyo Recharge Okendo Attentive Shopify loyalty reviews subscription sms email.");
  const selections = selectRediemPlaybooks({
    ...input,
    detections: [
      { category: "loyalty", vendor: "LoyaltyLion", confidence: 0.9, sourceUrl: "https://brand.test/rewards" },
      { category: "email", vendor: "Klaviyo", confidence: 0.9, sourceUrl: "https://brand.test" },
      { category: "subscription", vendor: "Recharge", confidence: 0.86, sourceUrl: "https://brand.test/subscribe" },
      { category: "reviews", vendor: "Okendo", confidence: 0.91, sourceUrl: "https://brand.test/reviews" },
      { category: "sms", vendor: "Attentive", confidence: 0.84, sourceUrl: "https://brand.test" }
    ]
  });

  assertSelected(selections, "STACK_FRAGMENTATION_CONSOLIDATION");
});

test("selects owned community conversion from public demand and weak owned capture", () => {
  const selections = selectRediemPlaybooks({
    ...baseInput("OCCS", {
      hasReviews: true,
      hasUGC: true,
      hasRetailPresence: true,
      socialCommunityScore: 82
    }, "Community UGC reviews retail creator demand with weak join member profile conversion path.")
  });

  assertSelected(selections, "OWNED_COMMUNITY_CONVERSION");
});

test("low confidence selections route to manual review instead of outbound-ready", () => {
  const selections = selectRediemPlaybooks({
    gtmDiagnostics: [metric("UVG", 80, 0.28)],
    brandProfile: { hasUGC: true },
    evidence: [
      {
        id: "ev_low",
        fieldName: "weakSocial",
        value: "ugc",
        rawExcerpt: "Possible UGC mention.",
        sourceUrl: "https://brand.test/community",
        confidence: 0.24
      }
    ]
  });

  assert.ok(selections.length > 0);
  assert.equal(selections[0]?.readiness, "MANUAL_REVIEW");
  assert.ok(selections[0]?.whySelected.length);
});

function assertSelected(selections: ReturnType<typeof selectRediemPlaybooks>, id: RediemPlaybookId) {
  const selection = selections.find((item) => item.playbook.id === id);
  assert.ok(selection, `expected ${id} in ${selections.map((item) => item.playbook.id).join(", ")}`);
  assert.ok(selection.score >= 35, `${id} score should be actionable`);
  assert.ok(selection.whySelected.length > 0, `${id} should explain selection`);
  assert.ok(selection.sourceUrls.length > 0, `${id} should include source URLs`);
  assert.ok(selection.supportingEvidenceIds.length > 0, `${id} should include evidence IDs`);
  assert.ok(selection.safetyNotes.length > 0, `${id} should preserve safety notes`);
}
