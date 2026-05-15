import assert from "node:assert/strict";
import { test } from "node:test";
import type { ActivationIdeaType } from "../src/generated/prisma/enums";
import {
  generateRediemActivationIdeas,
  type GenerateRediemActivationIdeasClient
} from "../src/server/workflows/generateRediemActivationIdeas";

function createClient(overrides: {
  profile?: Record<string, unknown> | null;
  evidence?: Array<Record<string, unknown>>;
  detections?: Array<Record<string, unknown>>;
  signals?: Array<Record<string, unknown>>;
} = {}) {
  const storedIdeas: Array<Record<string, unknown>> = [];
  const profile =
    overrides.profile === undefined
      ? {
          id: "brand_profile_1",
          workspaceId: "workspace_1",
          accountId: "account_1",
          brandCategory: "beverage",
          hasSubscription: true,
          subscriptionProvider: "Recharge",
          hasLoyaltyProgram: true,
          loyaltyProvider: "Smile.io",
          loyaltyProgramType: "Points and VIP tiers",
          hasReferralProgram: true,
          hasReviews: true,
          reviewProvider: "Okendo",
          hasUGC: true,
          instagramUrl: "https://instagram.com/fizz",
          tiktokUrl: "https://tiktok.com/@fizz",
          hasRetailPresence: true,
          retailSignals: { channels: ["regional grocery"] },
          sustainabilityAngle: "Recyclable cans",
          rediemFitScore: 91
        }
      : overrides.profile;
  const evidence =
    overrides.evidence ??
    [
      evidenceRow("evidence_reviews", "brandProfile.hasReviews", "true", "Reviews page shows Okendo reviews.", 0.82),
      evidenceRow("evidence_retail", "brandProfile.hasRetailPresence", "true", "Store locator and regional grocery retail.", 0.8),
      evidenceRow("evidence_subscription", "brandProfile.hasSubscription", "true", "Subscribe and save powered by Recharge.", 0.84),
      evidenceRow("evidence_ugc", "brandProfile.hasUGC", "true", "TikTok and creator UGC challenge language.", 0.78),
      evidenceRow("evidence_loyalty", "brandProfile.loyaltyProgramType", "Points and VIP tiers", "Rewards page has points and VIP tiers.", 0.81),
      evidenceRow("evidence_mission", "brandProfile.sustainabilityAngle", "Recyclable cans", "Sustainability copy mentions recyclable cans.", 0.7)
    ];
  const detections =
    overrides.detections ??
    [
      {
        id: "detection_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        category: "LOYALTY",
        vendor: "Smile.io",
        confidence: 0.8,
        evidence: "Smile rewards widget detected."
      }
    ];
  const signals =
    overrides.signals ??
    [
      {
        id: "signal_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        type: "PRODUCT_DROP",
        title: "New flavor drop",
        description: "Limited edition new flavor launch.",
        totalScore: 84,
        sourceUrl: "https://fizz.example/blog/new-flavor"
      }
    ];

  const client: GenerateRediemActivationIdeasClient = {
    brandProfile: {
      async findFirst() {
        return profile as never;
      }
    },
    signal: {
      async findMany() {
        return signals as never;
      }
    },
    evidence: {
      async findMany() {
        return evidence as never;
      }
    },
    competitorToolDetection: {
      async findMany() {
        return detections as never;
      }
    },
    brandActivationIdea: {
      async deleteMany() {
        storedIdeas.length = 0;
        return { count: 0 };
      },
      async createMany(args) {
        storedIdeas.push(...args.data);
        return { count: args.data.length };
      },
      async findMany() {
        return storedIdeas as never;
      }
    }
  };

  return { client, storedIdeas };
}

function evidenceRow(
  id: string,
  fieldName: string,
  value: string,
  rawExcerpt: string,
  confidence: number
) {
  return {
    id,
    workspaceId: "workspace_1",
    entityType: "ACCOUNT",
    entityId: "account_1",
    fieldName,
    value,
    sourceUrl: `https://example.com/${id}`,
    provider: "test",
    rawExcerpt,
    confidence,
    capturedAt: new Date("2026-05-15T12:00:00.000Z")
  };
}

test("generates concrete Rediem activation ideas and stores them", async () => {
  const { client, storedIdeas } = createClient();
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });
  const types = dossier.ideas.map((idea) => idea.type);

  assert.ok(dossier.ideas.length >= 3);
  assert.ok(dossier.ideas.length <= 5);
  assert.ok(types.includes("receipt_upload_challenge"));
  assert.ok(types.includes("review_reward_series"));
  assert.ok(types.includes("subscription_renewal_series"));
  assert.ok(
    dossier.ideas.some((idea) =>
      idea.suggestedOutboundOneLiner.includes("receipt uploads")
    )
  );
  assert.ok(
    dossier.ideas.every((idea) => idea.evidenceUsed.length > 0)
  );
  assert.equal(storedIdeas.length, dossier.ideas.length);
  assert.ok(
    storedIdeas.some((idea) => idea.type === ("RECEIPT_UPLOAD_CHALLENGE" satisfies ActivationIdeaType))
  );
});

test("weak evidence lowers confidence instead of inventing proof", async () => {
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      hasReviews: true,
      hasRetailPresence: false,
      hasUGC: false,
      hasSubscription: false
    },
    evidence: [],
    detections: [],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  assert.equal(dossier.ideas.length, 1);
  assert.equal(dossier.ideas[0]?.type, "review_reward_series");
  assert.ok((dossier.ideas[0]?.confidence ?? 1) < 0.5);
  assert.deepEqual(dossier.ideas[0]?.evidenceUsed, []);
});

test("returns no ideas when BrandProfile is missing", async () => {
  const { client, storedIdeas } = createClient({ profile: null });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "missing_account"
  });

  assert.deepEqual(dossier.ideas, []);
  assert.deepEqual(storedIdeas, []);
});

test("whyItFitsThisBrand references brand-specific details like provider names", async () => {
  const { client } = createClient();
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  const subscription = dossier.ideas.find((idea) => idea.type === "subscription_renewal_series");
  assert.ok(subscription, "subscription renewal series should be generated");
  assert.ok(
    subscription.whyItFitsThisBrand.includes("Recharge"),
    "subscription why-it-fits should name the detected provider"
  );

  const review = dossier.ideas.find((idea) => idea.type === "review_reward_series");
  assert.ok(review, "review reward series should be generated");
  assert.ok(
    review.whyItFitsThisBrand.includes("Okendo"),
    "review why-it-fits should name the detected review provider"
  );

  const vip = dossier.ideas.find((idea) => idea.type === "vip_tier_migration");
  assert.ok(vip, "VIP tier migration should be generated");
  assert.ok(
    vip.whyItFitsThisBrand.includes("Smile.io"),
    "VIP migration why-it-fits should name the loyalty provider"
  );
});

test("vipTierMigration is not generated when loyalty exists but no tier or points evidence", async () => {
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      hasLoyaltyProgram: true,
      loyaltyProvider: null,
      loyaltyProgramType: null,
      // no tier/points language in profile fields
      hasSubscription: false,
      hasReviews: false,
      hasUGC: false,
      hasRetailPresence: false,
      rediemFitScore: 70
    },
    evidence: [],
    detections: [
      // Even a LOYALTY detection should not be enough to trigger vipTierMigration
      { id: "detection_1", workspaceId: "workspace_1", accountId: "account_1", category: "LOYALTY", vendor: "Custom", confidence: 0.7 }
    ],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  assert.ok(
    !dossier.ideas.some((idea) => idea.type === "vip_tier_migration"),
    "vipTierMigration should not fire without tier/points evidence — a bare LOYALTY detection is not enough"
  );
});

test("productDropLoyaltyCampaign fires from a drop signal, not from loyalty flag alone", async () => {
  // Brand with loyalty but NO drop signal — product drop idea should not appear
  const { client: noDropClient } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Points",
      hasSubscription: false,
      hasReviews: false,
      hasUGC: false,
      hasRetailPresence: false,
      rediemFitScore: 75
    },
    evidence: [],
    detections: [],
    signals: [
      // signal type is HIRING, not a drop — should not trigger the idea
      { id: "signal_1", workspaceId: "workspace_1", accountId: "account_1", type: "HIRING", title: "New marketing hire", totalScore: 70 }
    ]
  });
  const noDrop = await generateRediemActivationIdeas(noDropClient, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });
  assert.ok(
    !noDrop.ideas.some((idea) => idea.type === "product_drop_loyalty_campaign"),
    "productDropLoyaltyCampaign should not appear without a launch/drop signal"
  );

  // Same brand with a drop signal added — product drop idea should appear
  const { client: dropClient } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Points",
      hasSubscription: false,
      hasReviews: false,
      hasUGC: false,
      hasRetailPresence: false,
      rediemFitScore: 75
    },
    evidence: [],
    detections: [],
    signals: [
      { id: "signal_1", workspaceId: "workspace_1", accountId: "account_1", type: "PRODUCT_LAUNCH", title: "Limited edition launch", totalScore: 80 }
    ]
  });
  const withDrop = await generateRediemActivationIdeas(dropClient, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });
  assert.ok(
    withDrop.ideas.some((idea) => idea.type === "product_drop_loyalty_campaign"),
    "productDropLoyaltyCampaign should appear when a drop or launch signal is present"
  );
});

test("sustainabilityMissionChallenge quotes the detected sustainability angle", async () => {
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      shopifyDetected: true,
      hasLoyaltyProgram: false,
      hasSubscription: false,
      hasReviews: false,
      hasUGC: false,
      hasRetailPresence: false,
      sustainabilityAngle: "B Corp certified and carbon neutral shipping",
      rediemFitScore: 68
    },
    evidence: [
      evidenceRow("evidence_mission", "brandProfile.sustainabilityAngle", "B Corp certified", "B Corp certified and carbon neutral shipping.", 0.75)
    ],
    detections: [],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  const mission = dossier.ideas.find((idea) => idea.type === "sustainability_or_mission_challenge");
  assert.ok(mission, "sustainability challenge should be generated");
  assert.ok(
    mission.whyItFitsThisBrand.includes("B Corp certified"),
    "why-it-fits should quote the actual sustainability angle, not a generic placeholder"
  );
});

test("retail-only brand produces both receipt_upload_challenge and retail_to_dtc_bridge", async () => {
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      shopifyDetected: true,
      hasRetailPresence: true,
      hasLoyaltyProgram: false,
      hasSubscription: false,
      hasReviews: false,
      hasUGC: false,
      rediemFitScore: 62
    },
    evidence: [
      evidenceRow("evidence_retail", "brandProfile.hasRetailPresence", "true", "Store locator on the website.", 0.78)
    ],
    detections: [],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  const types = dossier.ideas.map((idea) => idea.type);
  assert.ok(types.includes("receipt_upload_challenge"), "receipt upload should be generated for retail brand");
  assert.ok(types.includes("retail_to_dtc_bridge"), "retail-to-DTC bridge should also be generated for retail brand");
});

test("ideas below confidence threshold are excluded from output", async () => {
  // Profile with only UGC flag and no evidence — confidenceFromEvidence returns low value
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      hasUGC: true,
      // no other engagement signals
      hasLoyaltyProgram: false,
      hasSubscription: false,
      hasReviews: false,
      hasRetailPresence: false,
      rediemFitScore: 50
    },
    evidence: [
      // Only evidence is UGC — zero-party challenge requires evidence, and ugcSocialChallenge will fire
      evidenceRow("evidence_ugc", "brandProfile.hasUGC", "true", "UGC creator challenge page.", 0.28)
    ],
    detections: [],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  // All returned ideas must meet the 0.25 floor
  assert.ok(
    dossier.ideas.every((idea) => idea.confidence >= 0.25),
    "no idea with confidence < 0.25 should be returned"
  );
});

test("ugcSocialChallenge one-liner names detected social platforms", async () => {
  const { client } = createClient({
    profile: {
      id: "brand_profile_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      shopifyDetected: true,
      hasUGC: true,
      instagramUrl: "https://instagram.com/testbrand",
      tiktokUrl: "https://tiktok.com/@testbrand",
      hasLoyaltyProgram: false,
      hasSubscription: false,
      hasReviews: false,
      hasRetailPresence: false,
      rediemFitScore: 65
    },
    evidence: [
      evidenceRow("evidence_ugc", "brandProfile.instagramUrl", "https://instagram.com/testbrand", "Instagram and TikTok presence detected.", 0.8)
    ],
    detections: [],
    signals: []
  });
  const dossier = await generateRediemActivationIdeas(client, {
    workspaceId: "workspace_1",
    accountId: "account_1"
  });

  const ugc = dossier.ideas.find((idea) => idea.type === "ugc_social_challenge");
  assert.ok(ugc, "UGC social challenge should be generated");
  assert.ok(
    ugc.suggestedOutboundOneLiner.includes("Instagram") && ugc.suggestedOutboundOneLiner.includes("TikTok"),
    "one-liner should name both detected social platforms"
  );
  assert.ok(
    ugc.whyItFitsThisBrand.includes("Instagram") && ugc.whyItFitsThisBrand.includes("TikTok"),
    "why-it-fits should also name the platforms"
  );
});
