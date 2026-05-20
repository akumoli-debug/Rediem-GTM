import assert from "node:assert/strict";
import { test } from "node:test";
import type { WebPageResult, WebResearchProvider } from "../src/server/providers";
import {
  analyzeBrandForRediem,
  calculateLoyaltyMaturityLevel,
  type AnalyzeBrandForRediemClient
} from "../src/server/workflows/analyzeBrandForRediem";

class MockBrandWebProvider implements WebResearchProvider {
  name = "mock-brand-web";
  scrapeCalls = 0;

  constructor(private pages: Record<string, string>) {}

  async scrapePage(url: string): Promise<WebPageResult> {
    this.scrapeCalls += 1;
    const path = new URL(url).pathname;
    const content = this.pages[path] ?? "";

    return {
      url,
      statusCode: content ? 200 : 404,
      title: path === "/" ? "Aurora Beauty" : path,
      text: content,
      html: content,
      capturedAt: new Date("2026-05-15T12:00:00.000Z")
    };
  }

  async searchWeb() {
    return [];
  }

  async extractStructured(input: { url: string; schema: object }) {
    return {
      url: input.url,
      schema: input.schema,
      data: {},
      confidence: 0
    };
  }
}

function createWorkflowClient(): AnalyzeBrandForRediemClient & {
  rows: {
    accounts: Array<Record<string, unknown>>;
    brandProfiles: Array<Record<string, unknown>>;
    detections: Array<Record<string, unknown>>;
    scoreHistory: Array<Record<string, unknown>>;
    cfrSnapshots: Array<Record<string, unknown>>;
    cfrLeaks: Array<Record<string, unknown>>;
    cfrPlays: Array<Record<string, unknown>>;
    evidence: Array<Record<string, unknown>>;
    providerResults: Array<Record<string, unknown>>;
    cacheEntries: Array<Record<string, unknown>>;
  };
} {
  const rows = {
    accounts: [] as Array<Record<string, unknown>>,
    brandProfiles: [] as Array<Record<string, unknown>>,
    detections: [] as Array<Record<string, unknown>>,
    scoreHistory: [] as Array<Record<string, unknown>>,
    cfrSnapshots: [] as Array<Record<string, unknown>>,
    cfrLeaks: [] as Array<Record<string, unknown>>,
    cfrPlays: [] as Array<Record<string, unknown>>,
    evidence: [] as Array<Record<string, unknown>>,
    providerResults: [] as Array<Record<string, unknown>>,
    cacheEntries: [] as Array<Record<string, unknown>>
  };
  let id = 1;

  return {
    rows,
    account: {
      async findFirst(args) {
        const domain = args.where.OR?.[0]?.domain;
        return (
          rows.accounts.find(
            (account) =>
              account.workspaceId === args.where.workspaceId &&
              (!domain || account.domain === domain)
          ) ?? null
        ) as never;
      },
      async create(args) {
        const account = {
          id: `account_${id++}`,
          ...args.data
        };
        rows.accounts.push(account);
        return account as never;
      },
      async update(args) {
        const account = rows.accounts.find((item) => item.id === args.where.id);
        if (!account) {
          throw new Error(`Missing account ${args.where.id}`);
        }
        Object.assign(account, args.data);
        return account as never;
      }
    },
    brandProfile: {
      async upsert(args) {
        const existing = rows.brandProfiles.find(
          (profile) => profile.accountId === args.where.accountId
        );
        if (existing) {
          Object.assign(existing, args.update);
          return existing as never;
        }
        const profile = {
          id: `brand_profile_${id++}`,
          ...args.create
        };
        rows.brandProfiles.push(profile);
        return profile as never;
      }
    },
    competitorToolDetection: {
      async deleteMany(args) {
        const before = rows.detections.length;
        rows.detections = rows.detections.filter(
          (detection) =>
            detection.workspaceId !== args.where.workspaceId ||
            detection.accountId !== args.where.accountId
        );
        return { count: before - rows.detections.length };
      },
      async createMany(args) {
        rows.detections.push(
          ...args.data.map((detection) => ({
            id: `detection_${id++}`,
            ...detection
          }))
        );
        return { count: args.data.length };
      }
    },
    brandScoreHistory: {
      async create(args) {
        const score = {
          id: `score_${id++}`,
          ...args.data
        };
        rows.scoreHistory.push(score);
        return score;
      }
    },
    communityFlywheelSnapshot: {
      async create(args) {
        const snapshot = {
          id: `cfr_snapshot_${id++}`,
          ...args.data
        };
        rows.cfrSnapshots.push(snapshot);
        return snapshot;
      }
    },
    communityFlywheelLeak: {
      async deleteMany(args) {
        const before = rows.cfrLeaks.length;
        rows.cfrLeaks = rows.cfrLeaks.filter(
          (leak) =>
            leak.workspaceId !== args.where.workspaceId ||
            leak.accountId !== args.where.accountId
        );
        return { count: before - rows.cfrLeaks.length };
      },
      async createMany(args) {
        rows.cfrLeaks.push(
          ...args.data.map((leak) => ({
            id: `cfr_leak_${id++}`,
            ...leak
          }))
        );
        return { count: args.data.length };
      }
    },
    communityFlywheelPlay: {
      async deleteMany(args) {
        const before = rows.cfrPlays.length;
        rows.cfrPlays = rows.cfrPlays.filter(
          (play) =>
            play.workspaceId !== args.where.workspaceId ||
            play.accountId !== args.where.accountId
        );
        return { count: before - rows.cfrPlays.length };
      },
      async createMany(args) {
        rows.cfrPlays.push(
          ...args.data.map((play) => ({
            id: `cfr_play_${id++}`,
            ...play
          }))
        );
        return { count: args.data.length };
      }
    },
    evidence: {
      async create(args) {
        const evidence = {
          id: `evidence_${id++}`,
          ...args.data
        };
        rows.evidence.push(evidence);
        return evidence as never;
      }
    },
    providerResult: {
      async create(args) {
        rows.providerResults.push({
          id: `provider_result_${id++}`,
          ...args.data
        });
        return args.data;
      }
    },
    cacheEntry: {
      async findFirst(args) {
        return (
          rows.cacheEntries.find(
            (entry) =>
              entry.namespace === args.where.namespace &&
              entry.key === args.where.key
          ) ?? null
        ) as never;
      },
      async upsert(args) {
        const existing = rows.cacheEntries.find(
          (entry) =>
            entry.namespace === args.where.namespace_key.namespace &&
            entry.key === args.where.namespace_key.key
        );
        if (existing) {
          Object.assign(existing, args.update);
          return existing as never;
        }
        const entry = {
          id: `cache_${id++}`,
          ...args.create
        };
        rows.cacheEntries.push(entry);
        return entry as never;
      }
    }
  };
}

test("calculateLoyaltyMaturityLevel follows Rediem loyalty maturity ladder", () => {
  assert.equal(calculateLoyaltyMaturityLevel({ hasLoyaltyProgram: false }), 0);
  assert.equal(
    calculateLoyaltyMaturityLevel({
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Earn points and redeem rewards"
    }),
    1
  );
  assert.equal(
    calculateLoyaltyMaturityLevel({
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Points with VIP tiers",
      hasReferralProgram: true
    }),
    2
  );
  assert.equal(
    calculateLoyaltyMaturityLevel({
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Points with VIP tiers",
      hasReferralProgram: true,
      hasReviews: true,
      hasUGC: true
    }, [], "review challenge ambassador community"),
    3
  );
  assert.equal(
    calculateLoyaltyMaturityLevel({
      hasLoyaltyProgram: true,
      loyaltyProgramType: "Personalized preference journeys and predictive rewards",
      hasReferralProgram: true,
      hasReviews: true,
      hasUGC: true
    }, [], "zero-party quiz profile"),
    4
  );
});

test("analyzeBrandForRediem creates a cited Rediem dossier from mocked pages", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": `
      Shopify.theme = {}; cdn.shopify.com
      Clean skincare serum, moisturizer, and cleanser for Gen Z skincare routines.
      <a href="https://instagram.com/aurorabeauty">Instagram</a>
      <a href="https://tiktok.com/@aurorabeauty">TikTok</a>
      Refillable packaging and clean ingredients.
    `,
    "/rewards": `
      Aurora Rewards powered by Smile.io. Earn points, unlock VIP tiers,
      get birthday rewards, and refer a friend for credits.
    `,
    "/reviews": "Okendo customer reviews with five star ratings and before after stories.",
    "/subscriptions": "Subscribe and save with Recharge for replenishment.",
    "/community": "Join our creator community, share UGC, tag us, and become an ambassador.",
    "/blog": "New serum drop and limited edition launch with retail pop-up events."
  });

  const dossier = await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    {
      workspaceId: "workspace_1",
      domain: "https://www.aurora-beauty.example"
    }
  );

  assert.equal(dossier.domain, "aurora-beauty.example");
  assert.equal(dossier.tier, "Tier 1");
  assert.ok(dossier.rediemFitScore >= 85);
  assert.equal(client.rows.accounts.length, 1);
  assert.equal(client.rows.brandProfiles[0]?.hasLoyaltyProgram, true);
  assert.equal(client.rows.brandProfiles[0]?.brandCategory, "beauty");
  assert.equal(client.rows.brandProfiles[0]?.loyaltyMaturityLevel, 3);
  assert.equal(client.rows.scoreHistory.length, 1);
  assert.equal(client.rows.scoreHistory[0]?.tier, "Tier 1");
  assert.equal(client.rows.cfrSnapshots.length, 1);
  assert.equal(typeof client.rows.cfrSnapshots[0]?.estimatedCfr, "number");
  assert.equal(typeof client.rows.cfrSnapshots[0]?.cfrConfidence, "number");
  assert.equal(typeof dossier.communityFlywheelRatio.estimatedCfr, "number");
  assert.equal(dossier.communityFlywheelRatio.estimatedCfr, client.rows.cfrSnapshots[0]?.estimatedCfr);
  assert.equal(dossier.gtmDiagnostics.length, 9);
  assert.deepEqual(
    dossier.gtmDiagnostics.map((diagnostic) => diagnostic.metricId),
    ["PCG", "RCBI", "MAR", "UVG", "DDR", "ZPDD", "PDPS", "SFI", "OCCS"]
  );
  assert.ok(dossier.topDiagnostics.length > 0);
  assert.ok(dossier.topDiagnostics.length <= 3);
  assert.ok(
    dossier.topDiagnostics.every((diagnostic) => diagnostic.confidence >= 0.45),
    "top diagnostics should be high-confidence public estimates"
  );
  assert.ok(dossier.primaryGtmDiagnosis);
  assert.ok(dossier.recommendedPlayTypes.length > 0);
  assert.ok(
    dossier.gtmDiagnostics.every((diagnostic) => diagnostic.sourceUrls.length > 0),
    "diagnostics should carry evidence-aware source URLs in mock mode"
  );
  assert.ok(client.rows.cfrLeaks.length > 0);
  assert.ok(client.rows.cfrPlays.length > 0);
  assert.ok(client.rows.detections.some((detection) => detection.vendor === "Smile.io"));
  assert.ok(client.rows.detections.some((detection) => detection.vendor === "Recharge"));
  assert.ok(dossier.displacementWedges.length >= 3);
  assert.equal(dossier.primaryDisplacementWedge?.vendor, "Smile");
  assert.match(dossier.whatNotToSay ?? "", /replace your loyalty platform/);
  assert.match(dossier.rediemWedge ?? "", /broader verified participation/);
  assert.match(dossier.detectedCurrentStack, /Smile \(loyalty\)/);
  assert.match(String(dossier.crmFields.primary_displacement_wedge), /participation layer|verified|rewarded/);
  assert.equal(dossier.n8nExport.rediem_wedge, dossier.crmFields.rediem_wedge);
  assert.ok(
    client.rows.evidence.some(
      (evidence) => evidence.fieldName === "brandProfile.hasLoyaltyProgram"
    )
  );
  assert.ok(
    client.rows.evidence.every((evidence) => "sourceUrl" in evidence)
  );
  assert.ok(client.rows.providerResults.length >= 10);
  assert.ok(dossier.signals.some((signal) => signal.type === "SOCIAL_COMMUNITY"));
});

test("analyzeBrandForRediem uses cached dossier on repeated analysis", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": "Shopify beauty brand with community UGC.",
    "/rewards": "Rewards points and VIP tiers."
  });

  await analyzeBrandForRediem(client, { webResearch: provider }, {
    workspaceId: "workspace_1",
    domain: "cached-brand.example"
  });
  const firstScrapeCount = provider.scrapeCalls;
  const cached = await analyzeBrandForRediem(client, { webResearch: provider }, {
    workspaceId: "workspace_1",
    domain: "cached-brand.example"
  });

  assert.equal(cached.cached, true);
  assert.equal(provider.scrapeCalls, firstScrapeCount);
  assert.ok(
    client.rows.providerResults.some(
      (result) =>
        result.toolName === "analyzeBrandForRediem.cache" &&
        result.status === "CACHED"
    )
  );
});

test("forceRefresh bypasses cache and re-runs analysis", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": "Shopify beauty brand with community UGC.",
    "/rewards": "Rewards points and VIP tiers."
  });

  await analyzeBrandForRediem(client, { webResearch: provider }, {
    workspaceId: "workspace_1",
    domain: "refresh-brand.example"
  });
  const afterFirstRun = provider.scrapeCalls;

  const refreshed = await analyzeBrandForRediem(client, { webResearch: provider }, {
    workspaceId: "workspace_1",
    domain: "refresh-brand.example",
    forceRefresh: true
  });

  assert.equal(refreshed.cached, false);
  assert.ok(
    provider.scrapeCalls > afterFirstRun,
    "forceRefresh should issue new scrape calls even when cache is warm"
  );
});

test("brand with no loyalty program produces hasLoyaltyProgram false and no loyalty detections", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": `
      cdn.shopify.com Shopify.theme = {}
      Premium dog treats made from single-ingredient proteins.
      <a href="https://instagram.com/goodpup">Instagram</a>
    `,
    "/reviews": "Thousands of five star reviews from happy dogs and their owners.",
    "/subscriptions": "Subscribe and save 15% on every bag with auto-ship."
  });

  const dossier = await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "goodpup-treats.example" }
  );

  assert.equal(client.rows.brandProfiles[0]?.hasLoyaltyProgram, false);
  assert.ok(
    !client.rows.detections.some((d) => d.category === "LOYALTY"),
    "should have no loyalty tool detections"
  );
  // Brand with subscription + reviews but no loyalty is still a Rediem opportunity
  assert.notEqual(dossier.tier, "Disqualify");
  // Evidence must still be written for every claim
  assert.ok(
    client.rows.evidence.some((e) => e.fieldName === "brandProfile.hasLoyaltyProgram")
  );
});

test("non-Shopify brand receives low ecommerce fit and is likely Disqualify", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": `
      WooCommerce powered store. Premium candles and home fragrance.
      Free shipping on orders over $50.
    `,
    "/rewards": "Earn reward points on every purchase.",
    "/community": "Follow us on Instagram and share your home decor."
  });

  const dossier = await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "wax-works.example" }
  );

  assert.equal(client.rows.brandProfiles[0]?.shopifyDetected, false);
  // Non-Shopify brand should score low on ecommerce fit
  assert.ok(
    dossier.rediemFitScore < 70,
    `expected score < 70 for non-Shopify brand, got ${dossier.rediemFitScore}`
  );
});

test("all pages return 404 produces a valid low-fit dossier with no false detections", async () => {
  const client = createWorkflowClient();
  // MockBrandWebProvider returns 404 + empty content for any path not in the map
  const provider = new MockBrandWebProvider({});

  const dossier = await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "ghost-brand.example" }
  );

  assert.equal(dossier.tier, "Disqualify");
  assert.equal(dossier.competitorToolDetections.length, 0);
  assert.equal(client.rows.detections.length, 0);
  // Output must still be structurally valid
  assert.ok(typeof dossier.rediemFitScore === "number");
  assert.ok(Array.isArray(dossier.evidence));
});

test("content with 'reference' and 'preferred' does not trigger hasReferralProgram", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": `
      cdn.shopify.com Shopify.theme = {}
      Preferred by dermatologists. Please reference our ingredient glossary.
      For more information refer to our FAQ page.
    `
  });

  await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "refer-false-positive.example" }
  );

  assert.equal(
    client.rows.brandProfiles[0]?.hasReferralProgram,
    false,
    "'reference', 'preferred', and 'refer to' should not trigger hasReferralProgram"
  );
});

test("brand with only homepage accessible still produces a valid dossier", async () => {
  const client = createWorkflowClient();
  // All paths except homepage return 404
  const provider = new MockBrandWebProvider({
    "/": `
      cdn.shopify.com Shopify.theme = {}
      Natural skincare for sensitive skin.
      <a href="https://instagram.com/bareskn">Instagram</a>
      Earn points on every purchase with our loyalty rewards.
      Subscribe and save 10%.
    `
  });

  const dossier = await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "homepage-only.example" }
  );

  // Should detect Shopify from homepage alone
  assert.equal(client.rows.brandProfiles[0]?.shopifyDetected, true);
  // Loyalty keywords on homepage should still be detected
  assert.equal(client.rows.brandProfiles[0]?.hasLoyaltyProgram, true);
  // Dossier must be structurally valid despite missing pages
  assert.ok(typeof dossier.rediemFitScore === "number");
  assert.ok(dossier.tier !== undefined);
});

test("Okendo is detected as a review provider when present in page content", async () => {
  const client = createWorkflowClient();
  const provider = new MockBrandWebProvider({
    "/": "cdn.shopify.com Shopify.theme = {} Premium supplements.",
    "/reviews": "Powered by Okendo. Over 4,000 verified customer reviews."
  });

  await analyzeBrandForRediem(
    client,
    { webResearch: provider },
    { workspaceId: "workspace_1", domain: "okendo-brand.example" }
  );

  assert.ok(
    client.rows.detections.some((d) => d.vendor === "Okendo"),
    "Okendo should be detected from the reviews page"
  );
  assert.equal(client.rows.brandProfiles[0]?.hasReviews, true);
});
