import {
  getCache,
  setCache,
  stableHash,
  type CacheEntryClient,
  type ProviderCacheNamespace
} from "@/server/cache";
import { maybeEvaluateFormulasAfterEntityEnrichment } from "@/server/formulas";
import { redactSensitiveValue } from "@/server/providers/redaction";
import type { WebPageResult, WebResearchProvider } from "@/server/providers";
import {
  calculateAgenticCommerceScore,
  scoreRediemFit,
  type RediemBrandProfileInput,
  type RediemCompetitorToolDetectionInput,
  type RediemSignalInput,
  type RediemTier
} from "@/server/scoring/rediem";
import { canonicalizeDomain } from "./researchAccount";

type ProviderResultStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";

type ProviderResultRecord = {
  workspaceId: string;
  provider: string;
  toolName: string;
  inputHash: string;
  rawResponse?: unknown;
  normalizedResponse?: unknown;
  costUsd?: number | string | null;
  latencyMs?: number | null;
  status: ProviderResultStatus;
  errorMessage?: string | null;
  createdAt?: Date;
};

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  websiteSummary?: string | null;
  lastEnrichedAt?: Date | null;
};

type EvidenceRecord = {
  id?: string;
  workspaceId: string;
  entityType: "ACCOUNT";
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
  capturedAt: Date;
  createdAt?: Date;
};

type BrandProfileRecord = RediemBrandProfileInput & {
  id: string;
  workspaceId: string;
  accountId: string;
  rediemFitScore?: number | null;
  loyaltyMaturityScore?: number | null;
  communityReadinessScore?: number | null;
  migrationPainScore?: number | null;
  agenticCommerceScore?: number | null;
};

type CompetitorToolDetectionRecord = RediemCompetitorToolDetectionInput & {
  id?: string;
  workspaceId: string;
  accountId: string;
  category: string;
  vendor: string;
  sourceUrl?: string | null;
};

export type AnalyzeBrandForRediemClient = CacheEntryClient & {
  account: {
    findFirst(args: {
      where: {
        workspaceId: string;
        OR?: Array<{ domain?: string }>;
      };
    }): Promise<AccountRecord | null>;
    create(args: { data: Record<string, unknown> }): Promise<AccountRecord>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<AccountRecord>;
  };
  brandProfile: {
    upsert(args: {
      where: { accountId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<BrandProfileRecord>;
  };
  competitorToolDetection: {
    deleteMany(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<{ count: number }>;
    createMany(args: {
      data: Array<Record<string, unknown>>;
    }): Promise<{ count: number }>;
  };
  evidence: {
    create(args: { data: Omit<EvidenceRecord, "id" | "createdAt"> }): Promise<EvidenceRecord>;
  };
  providerResult: {
    create(args: { data: ProviderResultRecord }): Promise<ProviderResultRecord>;
  };
};

export type AnalyzeBrandForRediemProviders = {
  webResearch: WebResearchProvider;
};

export type AnalyzeBrandForRediemInput = {
  workspaceId: string;
  domain: string;
  forceRefresh?: boolean;
};

type BrandPageName =
  | "homepage"
  | "about"
  | "rewards"
  | "loyalty"
  | "vip"
  | "referral"
  | "reviews"
  | "subscriptions"
  | "community"
  | "blog";

type PageSnapshot = {
  page: BrandPageName;
  path: string;
  url: string;
  result: WebPageResult;
  content: string;
};

type Claim<T> = {
  value: T | null;
  confidence: number;
  sourceUrl: string;
  rawExcerpt?: string | null;
};

type BrandProfileClaims = {
  ecommercePlatform: Claim<string>;
  ecommercePlatformScore: Claim<number>;
  shopifyDetected: Claim<boolean>;
  shopifyPlusLikely: Claim<boolean>;
  productCategory: Claim<string>;
  brandCategory: Claim<string>;
  pricePoint: Claim<string>;
  targetCustomer: Claim<string>;
  hasSubscription: Claim<boolean>;
  subscriptionProvider: Claim<string>;
  hasLoyaltyProgram: Claim<boolean>;
  loyaltyProvider: Claim<string>;
  loyaltyProgramUrl: Claim<string>;
  loyaltyProgramType: Claim<string>;
  hasReferralProgram: Claim<boolean>;
  hasReviews: Claim<boolean>;
  reviewProvider: Claim<string>;
  hasUGC: Claim<boolean>;
  instagramUrl: Claim<string>;
  tiktokUrl: Claim<string>;
  socialCommunityScore: Claim<number>;
  hasRetailPresence: Claim<boolean>;
  retailSignals: Claim<Record<string, unknown>>;
  sustainabilityAngle: Claim<string>;
  missionDrivenAngle: Claim<string>;
  rediemFitScore: Claim<number>;
  loyaltyMaturityScore: Claim<number>;
  communityReadinessScore: Claim<number>;
  migrationPainScore: Claim<number>;
  agenticCommerceScore: Claim<number>;
};

export type RediemCompetitorToolDetectionDossier = {
  category: string;
  vendor: string;
  confidence: number;
  sourceUrl?: string;
  evidence?: string;
};

export type RediemAccountDossier = {
  workspaceId: string;
  domain: string;
  accountId: string;
  accountName: string;
  cached: boolean;
  rediemFitScore: number;
  tier: RediemTier;
  scores: {
    loyaltyPainScore: number;
    communityReadinessScore: number;
    migrationPainScore: number;
    agenticCommerceScore: number;
  };
  brandProfile: Record<string, unknown>;
  competitorToolDetections: RediemCompetitorToolDetectionDossier[];
  signals: Array<{
    type: string;
    title: string;
    sourceUrl?: string;
    confidence: number;
  }>;
  evidence: Array<{
    fieldName: string;
    value: unknown;
    sourceUrl: string;
    confidence: number;
    rawExcerpt?: string | null;
  }>;
  sourceUrls: string[];
  providerCalls: number;
  cachedProviderCalls: number;
};

const CACHE_NAMESPACE = "workflow:rediem-brand";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PAGE_CONCURRENCY = 4;

const PAGE_PATHS: Array<{ page: BrandPageName; path: string }> = [
  { page: "homepage", path: "/" },
  { page: "about", path: "/about" },
  { page: "rewards", path: "/rewards" },
  { page: "loyalty", path: "/loyalty" },
  { page: "vip", path: "/vip" },
  { page: "referral", path: "/referral" },
  { page: "reviews", path: "/reviews" },
  { page: "subscriptions", path: "/subscriptions" },
  { page: "community", path: "/community" },
  { page: "blog", path: "/blog" }
];

const STACK_PATTERNS = [
  { category: "ecommerce", vendor: "Shopify", patterns: ["shopify", "myshopify.com", "cdn.shopify.com"] },
  { category: "subscriptions", vendor: "Recharge", patterns: ["recharge", "rechargepayments"] },
  { category: "subscriptions", vendor: "Skio", patterns: ["skio"] },
  { category: "loyalty", vendor: "Yotpo Loyalty", patterns: ["yotpo loyalty", "swell rewards"] },
  { category: "loyalty", vendor: "Smile.io", patterns: ["smile.io", "smile-ui", "smile rewards"] },
  { category: "loyalty", vendor: "LoyaltyLion", patterns: ["loyaltylion"] },
  { category: "reviews", vendor: "Okendo", patterns: ["okendo"] },
  { category: "reviews", vendor: "Yotpo Reviews", patterns: ["yotpo reviews", "yotpo-widget"] },
  { category: "reviews", vendor: "Judge.me", patterns: ["judge.me", "judgeme"] },
  { category: "email_sms", vendor: "Klaviyo", patterns: ["klaviyo"] },
  { category: "email_sms", vendor: "Attentive", patterns: ["attentive"] }
];

export async function analyzeBrandForRediem(
  client: AnalyzeBrandForRediemClient,
  providers: AnalyzeBrandForRediemProviders,
  input: AnalyzeBrandForRediemInput
): Promise<RediemAccountDossier> {
  const domain = canonicalizeDomain(input.domain);
  const cacheKey = `${input.workspaceId}:${domain}`;

  if (!input.forceRefresh) {
    const cached = await getCachedDossier(client, cacheKey);

    if (cached) {
      await recordProviderResult(client, {
        workspaceId: input.workspaceId,
        provider: "cache",
        toolName: "analyzeBrandForRediem.cache",
        inputHash: cacheKey,
        normalizedResponse: cached,
        costUsd: 0,
        latencyMs: 0,
        status: "CACHED"
      });

      return {
        ...cached,
        cached: true,
        providerCalls: cached.providerCalls + 1,
        cachedProviderCalls: cached.cachedProviderCalls + 1
      };
    }
  }

  const account = await loadOrCreateAccount(client, input.workspaceId, domain);
  const providerStats = { calls: 0, cachedCalls: 0 };
  const pages = (
    await mapWithConcurrency(PAGE_PATHS, PAGE_CONCURRENCY, async ({ page, path }) => {
      try {
        return await scrapeBrandPage(
          client,
          providers.webResearch,
          input.workspaceId,
          domain,
          page,
          path,
          Boolean(input.forceRefresh),
          providerStats
        );
      } catch {
        return null;
      }
    })
  // Filter nulls (thrown errors) and HTTP error responses. A 404 page can still
  // contain navigation HTML that triggers keyword matches, producing false detections.
  ).filter(
    (page): page is PageSnapshot =>
      page !== null && (page.result.statusCode == null || page.result.statusCode < 400)
  );
  const analysis = analyzePagesForRediem(domain, pages);
  const profileData = claimsToProfileData(analysis.profileClaims);

  const profileForScoring: RediemBrandProfileInput = profileData;
  // scoreRediemFit computes all 8 weighted components in one pass. Extract the
  // three sub-scores that are also stored as separate BrandProfile fields so we
  // don't recompute them below.
  const breakdown = scoreRediemFit(profileForScoring, analysis.signals, analysis.detections);
  const rediemFitScore = breakdown.score;
  const loyaltyPainScore = breakdown.components.loyaltyPain;
  const communityReadinessScore = breakdown.components.communityReadiness;
  const migrationPainScore = breakdown.components.migrationOpportunity;
  // agenticCommerceScore is stored as a separate BrandProfile field but is not
  // one of the 8 rediemFitScore components, so it requires its own call.
  const agenticCommerceScore = calculateAgenticCommerceScore(
    profileForScoring,
    analysis.signals
  );
  const scoredClaims: BrandProfileClaims = {
    ...analysis.profileClaims,
    rediemFitScore: claimNumber(rediemFitScore, analysis.primarySourceUrl, 0.8, "Weighted Rediem fit score."),
    loyaltyMaturityScore: claimNumber(loyaltyPainScore, analysis.primarySourceUrl, 0.75, "Derived loyalty pain score."),
    communityReadinessScore: claimNumber(communityReadinessScore, analysis.primarySourceUrl, 0.75, "Derived community readiness score."),
    migrationPainScore: claimNumber(migrationPainScore, analysis.primarySourceUrl, 0.75, "Derived migration pain score."),
    agenticCommerceScore: claimNumber(agenticCommerceScore, analysis.primarySourceUrl, 0.75, "Derived agentic commerce score.")
  };
  const scoredProfileData = claimsToProfileData(scoredClaims);
  const brandProfile = await client.brandProfile.upsert({
    where: { accountId: account.id },
    create: {
      workspaceId: input.workspaceId,
      accountId: account.id,
      ...scoredProfileData,
      lastScoredAt: new Date()
    },
    update: {
      ...scoredProfileData,
      lastScoredAt: new Date()
    }
  });

  await client.competitorToolDetection.deleteMany({
    where: { workspaceId: input.workspaceId, accountId: account.id }
  });

  if (analysis.detections.length > 0) {
    await client.competitorToolDetection.createMany({
      data: analysis.detections.map((detection) => ({
        workspaceId: input.workspaceId,
        accountId: account.id,
        category: toToolCategory(detection.category),
        vendor: detection.vendor,
        confidence: detection.confidence ?? null,
        sourceUrl: detection.sourceUrl ?? null,
        evidence: detection.evidence ?? null
      }))
    });
  }

  const evidence = await createClaimEvidence(client, {
    workspaceId: input.workspaceId,
    accountId: account.id,
    provider: providers.webResearch.name,
    claims: scoredClaims,
    detections: analysis.detections,
    signals: analysis.signals
  });

  await client.account.update({
    where: { id: account.id },
    data: {
      lastEnrichedAt: new Date(),
      accountScore: rediemFitScore,
      confidenceScore: averageEvidenceConfidence(evidence)
    }
  });
  await maybeEvaluateFormulasAfterEntityEnrichment(client, {
    workspaceId: input.workspaceId,
    entityType: "ACCOUNT",
    entityId: account.id
  });

  const dossier: RediemAccountDossier = {
    workspaceId: input.workspaceId,
    domain,
    accountId: account.id,
    accountName: account.name,
    cached: false,
    rediemFitScore,
    tier: breakdown.tier,
    scores: {
      loyaltyPainScore,
      communityReadinessScore,
      migrationPainScore,
      agenticCommerceScore
    },
    brandProfile: brandProfile as Record<string, unknown>,
    competitorToolDetections: analysis.detections.map((detection) => ({
      category: detection.category ?? "unknown",
      vendor: detection.vendor ?? "Unknown",
      confidence: detection.confidence ?? 0.35,
      sourceUrl: detection.sourceUrl ?? undefined,
      evidence: detection.evidence ?? undefined
    })),
    signals: analysis.signals.map((signal) => ({
      type: signal.type ?? "OTHER",
      title: signal.title ?? "Rediem-relevant signal",
      sourceUrl: signal.sourceUrl ?? undefined,
      confidence: scoreToConfidence(signal.totalScore)
    })),
    evidence: evidence.map((item) => ({
      fieldName: item.fieldName,
      value: item.value,
      sourceUrl: item.sourceUrl ?? analysis.primarySourceUrl,
      confidence: item.confidence ?? 0.3,
      rawExcerpt: item.rawExcerpt
    })),
    sourceUrls: uniqueStrings(pages.map((page) => page.url)),
    providerCalls: providerStats.calls,
    cachedProviderCalls: providerStats.cachedCalls
  };

  await setCache(client, {
    namespace: CACHE_NAMESPACE as ProviderCacheNamespace,
    key: cacheKey,
    value: dossier,
    ttlMs: CACHE_TTL_MS
  });

  return dossier;
}

function analyzePagesForRediem(domain: string, pages: PageSnapshot[]) {
  const primarySourceUrl = pages[0]?.url ?? `https://${domain}`;
  const allContent = pages.map((page) => page.content).join("\n").toLowerCase();
  const detections = detectStack(pages);
  const ecommerce = detectEcommercePlatform(pages, detections, primarySourceUrl);
  const category = detectBrandCategory(pages, primarySourceUrl);
  const subscription = detectSubscription(pages, detections, primarySourceUrl);
  const loyalty = detectLoyalty(pages, detections, primarySourceUrl);
  const reviews = detectReviews(pages, detections, primarySourceUrl);
  const social = detectSocialAndCommunity(pages, primarySourceUrl);
  const retail = detectRetailPresence(pages, primarySourceUrl);
  const angles = detectMissionAngles(pages, primarySourceUrl);
  const signals = deriveRediemSignals({
    pages,
    subscription,
    loyalty,
    reviews,
    social,
    retail,
    angles
  });
  const profileClaims: BrandProfileClaims = {
    ecommercePlatform: ecommerce.platform,
    ecommercePlatformScore: ecommerce.score,
    shopifyDetected: ecommerce.shopifyDetected,
    shopifyPlusLikely: ecommerce.shopifyPlusLikely,
    productCategory: category.productCategory,
    brandCategory: category.brandCategory,
    pricePoint: detectPricePoint(pages, primarySourceUrl),
    targetCustomer: detectTargetCustomer(pages, primarySourceUrl),
    hasSubscription: subscription.exists,
    subscriptionProvider: subscription.provider,
    hasLoyaltyProgram: loyalty.exists,
    loyaltyProvider: loyalty.provider,
    loyaltyProgramUrl: loyalty.programUrl,
    loyaltyProgramType: loyalty.programType,
    hasReferralProgram: loyalty.hasReferral,
    hasReviews: reviews.exists,
    reviewProvider: reviews.provider,
    hasUGC: social.hasUGC,
    instagramUrl: social.instagramUrl,
    tiktokUrl: social.tiktokUrl,
    socialCommunityScore: social.score,
    hasRetailPresence: retail.exists,
    retailSignals: retail.signals,
    sustainabilityAngle: angles.sustainability,
    missionDrivenAngle: angles.mission,
    rediemFitScore: claimNumber(null, primarySourceUrl, 0.2),
    loyaltyMaturityScore: claimNumber(null, primarySourceUrl, 0.2),
    communityReadinessScore: claimNumber(null, primarySourceUrl, 0.2),
    migrationPainScore: claimNumber(null, primarySourceUrl, 0.2),
    agenticCommerceScore: claimNumber(null, primarySourceUrl, 0.2)
  };

  if (!ecommerce.platform.value && !allContent.trim()) {
    profileClaims.brandCategory = claimString("other", primarySourceUrl, 0.2, "No visible brand category evidence found.");
  }

  return {
    primarySourceUrl,
    profileClaims,
    detections,
    signals
  };
}

async function scrapeBrandPage(
  client: AnalyzeBrandForRediemClient,
  provider: WebResearchProvider,
  workspaceId: string,
  domain: string,
  page: BrandPageName,
  path: string,
  forceRefresh: boolean,
  providerStats: { calls: number; cachedCalls: number }
): Promise<PageSnapshot> {
  const url = `https://${domain}${path}`;
  const value = await callProvider(client, {
    workspaceId,
    provider: provider.name,
    toolName: "WebResearchProvider.scrapePage",
    cacheNamespace: "web_scrape",
    input: { url },
    forceRefresh,
    call: () => provider.scrapePage(url)
  });
  providerStats.calls += 1;
  providerStats.cachedCalls += value.cached ? 1 : 0;

  return {
    page,
    path,
    url,
    result: value.value,
    content: normalizePageContent(value.value)
  };
}

async function callProvider<TResult>(
  client: AnalyzeBrandForRediemClient,
  input: {
    workspaceId: string;
    provider: string;
    toolName: string;
    cacheNamespace: ProviderCacheNamespace;
    input: unknown;
    forceRefresh?: boolean;
    call: () => Promise<TResult>;
  }
): Promise<{ value: TResult; cached: boolean }> {
  const inputHash = stableHash(input.input);
  const cacheKey = `${input.provider}:${input.toolName}:${inputHash}`;
  const startedAt = Date.now();

  if (!input.forceRefresh) {
    const cached = await getCache<TResult>(client, {
      namespace: input.cacheNamespace,
      key: cacheKey
    });

    if (cached) {
      await recordProviderResult(client, {
        workspaceId: input.workspaceId,
        provider: input.provider,
        toolName: input.toolName,
        inputHash,
        normalizedResponse: cached,
        costUsd: 0,
        latencyMs: 0,
        status: "CACHED"
      });

      return { value: cached, cached: true };
    }
  }

  try {
    const value = await input.call();
    const latencyMs = Date.now() - startedAt;
    await setCache(client, {
      namespace: input.cacheNamespace,
      key: cacheKey,
      value
    });
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: input.provider,
      toolName: input.toolName,
      inputHash,
      rawResponse: value,
      normalizedResponse: value,
      costUsd: 0.005,
      latencyMs,
      status: "SUCCESS"
    });

    return { value, cached: false };
  } catch (error) {
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: input.provider,
      toolName: input.toolName,
      inputHash,
      costUsd: 0,
      latencyMs: Date.now() - startedAt,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

async function recordProviderResult(
  client: AnalyzeBrandForRediemClient,
  data: ProviderResultRecord
) {
  await client.providerResult.create({
    data: {
      ...data,
      rawResponse: toJsonCompatible(redactSensitiveValue(data.rawResponse)),
      normalizedResponse: toJsonCompatible(redactSensitiveValue(data.normalizedResponse))
    }
  });
}

async function loadOrCreateAccount(
  client: AnalyzeBrandForRediemClient,
  workspaceId: string,
  domain: string
): Promise<AccountRecord> {
  const existing = await client.account.findFirst({
    where: {
      workspaceId,
      OR: [{ domain }]
    }
  });

  if (existing) {
    return existing;
  }

  return client.account.create({
    data: {
      workspaceId,
      domain,
      name: titleizeDomain(domain),
      lastEnrichedAt: new Date()
    }
  });
}

function detectStack(pages: PageSnapshot[]): RediemCompetitorToolDetectionInput[] {
  const detections = new Map<string, RediemCompetitorToolDetectionInput>();

  for (const page of pages) {
    const content = page.content.toLowerCase();

    for (const pattern of STACK_PATTERNS) {
      if (pattern.patterns.some((needle) => content.includes(needle))) {
        const key = `${pattern.category}:${pattern.vendor}`;
        const excerpt = findExcerpt(page.content, pattern.patterns) ?? `Detected ${pattern.vendor}.`;
        detections.set(key, {
          category: pattern.category,
          vendor: pattern.vendor,
          confidence: pattern.category === "ecommerce" ? 0.9 : 0.78,
          sourceUrl: page.url,
          evidence: excerpt
        });
      }
    }
  }

  return [...detections.values()];
}

function detectEcommercePlatform(
  pages: PageSnapshot[],
  detections: RediemCompetitorToolDetectionInput[],
  fallbackUrl: string
) {
  const shopify = detections.find(
    (detection) => detection.category === "ecommerce" && detection.vendor === "Shopify"
  );
  const content = pages.map((page) => page.content).join("\n").toLowerCase();
  const shopifyPlus = matchesAny(content, ["shopify plus", "plus merchant", "checkout.shopify.com"]);

  return {
    platform: claimString(shopify ? "Shopify" : null, shopify?.sourceUrl ?? fallbackUrl, shopify ? 0.9 : 0.25, shopify?.evidence ?? "No ecommerce platform evidence found."),
    score: claimNumber(shopify ? (shopifyPlus ? 94 : 86) : 20, shopify?.sourceUrl ?? fallbackUrl, shopify ? 0.85 : 0.25),
    shopifyDetected: claimBoolean(Boolean(shopify), shopify?.sourceUrl ?? fallbackUrl, shopify ? 0.9 : 0.25, shopify?.evidence ?? "Shopify markers were not visible."),
    shopifyPlusLikely: claimBoolean(shopifyPlus, shopify?.sourceUrl ?? fallbackUrl, shopifyPlus ? 0.7 : 0.25, shopifyPlus ? "Shopify Plus language or checkout markers found." : "Shopify Plus markers were not visible.")
  };
}

function detectBrandCategory(pages: PageSnapshot[], fallbackUrl: string) {
  const categories = [
    { value: "beauty", product: "Beauty and skincare", keywords: ["beauty", "skincare", "serum", "makeup", "cleanser", "moisturizer"] },
    { value: "apparel", product: "Apparel", keywords: ["apparel", "clothing", "shirt", "dress", "denim", "capsule"] },
    { value: "beverage", product: "Beverage", keywords: ["beverage", "drink", "sparkling", "soda", "coffee", "tea"] },
    { value: "wellness", product: "Wellness", keywords: ["wellness", "supplement", "vitamin", "fitness", "health"] },
    { value: "food", product: "Food", keywords: ["snack", "food", "granola", "chocolate", "pantry"] },
    { value: "home", product: "Home", keywords: ["home goods", "furniture", "decor", "bedding", "candle"] },
    { value: "pets", product: "Pets", keywords: ["pet", "dog", "cat", "treats", "pet food"] }
  ];
  const best = categories
    .map((category) => {
      const page = findPageWithKeywords(pages, category.keywords);
      return {
        ...category,
        page,
        score: category.keywords.filter((keyword) => page?.content.toLowerCase().includes(keyword)).length
      };
    })
    .sort((left, right) => right.score - left.score)[0];

  if (!best || best.score === 0 || !best.page) {
    return {
      productCategory: claimString(null, fallbackUrl, 0.25, "No visible product category evidence found."),
      brandCategory: claimString("other", fallbackUrl, 0.3, "No specific consumer category evidence found.")
    };
  }

  const excerpt = findExcerpt(best.page.content, best.keywords);

  return {
    productCategory: claimString(best.product, best.page.url, 0.75, excerpt),
    brandCategory: claimString(best.value, best.page.url, 0.75, excerpt)
  };
}

function detectSubscription(
  pages: PageSnapshot[],
  detections: RediemCompetitorToolDetectionInput[],
  fallbackUrl: string
) {
  const page = findPageWithKeywords(pages, [
    "subscription",
    "subscribe and save",
    "subscribe & save",
    "recharge",
    "skio"
  ]);
  const provider = detections.find((detection) => detection.category === "subscriptions");
  const exists = Boolean(page || provider);
  const sourceUrl = page?.url ?? provider?.sourceUrl ?? fallbackUrl;

  return {
    exists: claimBoolean(exists, sourceUrl, exists ? 0.82 : 0.25, exists ? findExcerpt(page?.content ?? provider?.evidence ?? "", ["subscription", "subscribe", "recharge", "skio"]) : "Subscription evidence was not visible."),
    provider: claimString(provider?.vendor ?? null, provider?.sourceUrl ?? sourceUrl, provider ? 0.8 : 0.25, provider?.evidence ?? null)
  };
}

function detectLoyalty(
  pages: PageSnapshot[],
  detections: RediemCompetitorToolDetectionInput[],
  fallbackUrl: string
) {
  const page = findPageWithKeywords(pages, [
    "rewards",
    "loyalty",
    "vip",
    "points",
    "referral",
    "refer a friend"
  ]);
  const provider = detections.find((detection) => detection.category === "loyalty");
  const content = page?.content.toLowerCase() ?? "";
  const exists = Boolean(page || provider);
  const points = content.includes("points") || provider?.evidence?.toLowerCase().includes("points");
  const tiers = matchesAny(content, ["tier", "vip", "level", "status"]);
  const referralPage = findPageWithKeywords(pages, ["referral", "refer a friend", "give $", "get $"]);
  const sourceUrl = page?.url ?? provider?.sourceUrl ?? fallbackUrl;
  const type = points && tiers ? "Points and tiers" : points ? "Points" : tiers ? "VIP tiers" : exists ? "Rewards" : null;

  return {
    exists: claimBoolean(exists, sourceUrl, exists ? 0.82 : 0.25, exists ? findExcerpt(page?.content ?? provider?.evidence ?? "", ["rewards", "loyalty", "points", "vip"]) : "Loyalty program evidence was not visible."),
    provider: claimString(provider?.vendor ?? null, provider?.sourceUrl ?? sourceUrl, provider ? 0.8 : 0.25, provider?.evidence ?? null),
    programUrl: claimString(page?.url ?? null, sourceUrl, page ? 0.8 : 0.25, page ? `Detected loyalty page at ${page.url}.` : null),
    programType: claimString(type, sourceUrl, exists ? 0.7 : 0.25, findExcerpt(page?.content ?? "", ["points", "tier", "vip", "rewards"])),
    // Use specific phrases rather than "refer" substring — "reference", "preferred",
    // and "preferred by dermatologists" all contain "refer" and would false-positive.
    hasReferral: claimBoolean(Boolean(referralPage || matchesAny(content, ["referral", "refer a friend", "give $", "get $"])), referralPage?.url ?? sourceUrl, referralPage ? 0.78 : 0.3, referralPage ? findExcerpt(referralPage.content, ["referral", "refer a friend"]) : "Referral evidence was not visible.")
  };
}

function detectReviews(
  pages: PageSnapshot[],
  detections: RediemCompetitorToolDetectionInput[],
  fallbackUrl: string
) {
  const page = findPageWithKeywords(pages, ["reviews", "stars", "customer reviews", "okendo", "yotpo", "judge.me"]);
  const provider = detections.find((detection) => detection.category === "reviews");
  const exists = Boolean(page || provider);
  const sourceUrl = page?.url ?? provider?.sourceUrl ?? fallbackUrl;

  return {
    exists: claimBoolean(exists, sourceUrl, exists ? 0.78 : 0.25, exists ? findExcerpt(page?.content ?? provider?.evidence ?? "", ["review", "stars", "okendo", "yotpo", "judge"]) : "Review evidence was not visible."),
    provider: claimString(provider?.vendor ?? null, provider?.sourceUrl ?? sourceUrl, provider ? 0.78 : 0.25, provider?.evidence ?? null)
  };
}

function detectSocialAndCommunity(pages: PageSnapshot[], fallbackUrl: string) {
  const content = pages.map((page) => page.content).join("\n");
  const lower = content.toLowerCase();
  const instagram = extractFirstUrl(content, /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.-/?=&]+/i);
  const tiktok = extractFirstUrl(content, /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+/i);
  const ugcPage = findPageWithKeywords(pages, ["ugc", "creator", "ambassador", "community", "tag us", "share your"]);
  const hasUGC = Boolean(ugcPage || instagram || tiktok || matchesAny(lower, ["user generated", "ambassador"]));
  const sourceUrl = ugcPage?.url ?? fallbackUrl;
  const score = Math.min(
    100,
    25 +
      (hasUGC ? 25 : 0) +
      (instagram ? 15 : 0) +
      (tiktok ? 15 : 0) +
      (matchesAny(lower, ["community", "ambassador", "creator"]) ? 15 : 0)
  );

  return {
    hasUGC: claimBoolean(hasUGC, sourceUrl, hasUGC ? 0.78 : 0.25, hasUGC ? findExcerpt(ugcPage?.content ?? content, ["ugc", "creator", "community", "ambassador", "instagram", "tiktok"]) : "UGC or community evidence was not visible."),
    instagramUrl: claimString(instagram, fallbackUrl, instagram ? 0.8 : 0.25, instagram ? "Instagram link found." : null),
    tiktokUrl: claimString(tiktok, fallbackUrl, tiktok ? 0.8 : 0.25, tiktok ? "TikTok link found." : null),
    score: claimNumber(score, sourceUrl, hasUGC ? 0.72 : 0.35)
  };
}

function detectRetailPresence(pages: PageSnapshot[], fallbackUrl: string) {
  const page = findPageWithKeywords(pages, [
    "store locator",
    "where to buy",
    "stockists",
    "retail",
    "sephora",
    "ulta",
    "target",
    "whole foods"
  ]);
  const exists = Boolean(page);
  const signals = page
    ? {
        keywords: ["store locator", "where to buy", "stockists", "retail"].filter((keyword) =>
          page.content.toLowerCase().includes(keyword)
        ),
        excerpt: findExcerpt(page.content, ["store locator", "where to buy", "stockists", "retail"])
      }
    : null;

  return {
    exists: claimBoolean(exists, page?.url ?? fallbackUrl, exists ? 0.75 : 0.25, signals?.excerpt ?? "Retail presence evidence was not visible."),
    signals: claimJson(signals, page?.url ?? fallbackUrl, exists ? 0.7 : 0.25, signals?.excerpt ?? null)
  };
}

function detectMissionAngles(pages: PageSnapshot[], fallbackUrl: string) {
  const sustainabilityPage = findPageWithKeywords(pages, [
    "sustainable",
    "sustainability",
    "recyclable",
    "refill",
    "repair",
    "carbon"
  ]);
  const missionPage = findPageWithKeywords(pages, [
    "mission",
    "values",
    "give back",
    "community",
    "clean ingredients",
    "ethical"
  ]);

  return {
    sustainability: claimString(
      sustainabilityPage ? findExcerpt(sustainabilityPage.content, ["sustainable", "recyclable", "refill", "repair", "carbon"]) : null,
      sustainabilityPage?.url ?? fallbackUrl,
      sustainabilityPage ? 0.72 : 0.25,
      sustainabilityPage ? findExcerpt(sustainabilityPage.content, ["sustainable", "recyclable", "refill", "repair", "carbon"]) : null
    ),
    mission: claimString(
      missionPage ? findExcerpt(missionPage.content, ["mission", "values", "give back", "community", "clean ingredients", "ethical"]) : null,
      missionPage?.url ?? fallbackUrl,
      missionPage ? 0.72 : 0.25,
      missionPage ? findExcerpt(missionPage.content, ["mission", "values", "give back", "community", "clean ingredients", "ethical"]) : null
    )
  };
}

function detectPricePoint(pages: PageSnapshot[], fallbackUrl: string): Claim<string> {
  const content = pages.map((page) => page.content).join("\n").toLowerCase();

  if (matchesAny(content, ["luxury", "premium", "$90", "$120", "$150"])) {
    return claimString("Premium", fallbackUrl, 0.55, "Premium price language or high price points found.");
  }

  if (matchesAny(content, ["affordable", "under $", "$10", "$20", "$30"])) {
    return claimString("Accessible", fallbackUrl, 0.55, "Accessible price language or lower price points found.");
  }

  return claimString(null, fallbackUrl, 0.2, "Price point evidence was not visible.");
}

function detectTargetCustomer(pages: PageSnapshot[], fallbackUrl: string): Claim<string> {
  const page = findPageWithKeywords(pages, ["for women", "for men", "parents", "athletes", "creators", "families", "pets"]);
  const excerpt = page ? findExcerpt(page.content, ["for women", "for men", "parents", "athletes", "creators", "families", "pets"]) : null;

  return claimString(excerpt, page?.url ?? fallbackUrl, page ? 0.55 : 0.2, excerpt);
}

function deriveRediemSignals(input: {
  pages: PageSnapshot[];
  subscription: ReturnType<typeof detectSubscription>;
  loyalty: ReturnType<typeof detectLoyalty>;
  reviews: ReturnType<typeof detectReviews>;
  social: ReturnType<typeof detectSocialAndCommunity>;
  retail: ReturnType<typeof detectRetailPresence>;
  angles: ReturnType<typeof detectMissionAngles>;
}): RediemSignalInput[] {
  const signals: RediemSignalInput[] = [];
  const productDropPage = findPageWithKeywords(input.pages, ["drop", "launch", "limited edition", "new collection", "new flavor"]);

  if (input.subscription.exists.value) {
    signals.push(signal("SUBSCRIPTION", "Subscription or repeat-purchase motion detected", input.subscription.exists));
  }

  if (input.reviews.exists.value) {
    signals.push(signal("REVIEWS", "Customer reviews detected", input.reviews.exists));
  }

  if (input.social.hasUGC.value) {
    signals.push(signal("SOCIAL_COMMUNITY", "UGC or social community signals detected", input.social.hasUGC));
  }

  if (input.retail.exists.value) {
    signals.push(signal("RETAIL_PRESENCE", "Retail or stockist presence detected", input.retail.exists));
  }

  if (input.angles.sustainability.value || input.angles.mission.value) {
    signals.push(signal("MISSION_SUSTAINABILITY", "Mission or sustainability angle detected", input.angles.sustainability.value ? input.angles.sustainability : input.angles.mission));
  }

  if (productDropPage) {
    signals.push({
      type: "PRODUCT_DROP",
      title: "Product drop or launch language detected",
      description: findExcerpt(productDropPage.content, ["drop", "launch", "limited edition", "new collection", "new flavor"]) ?? undefined,
      sourceUrl: productDropPage.url,
      totalScore: 78
    });
  }

  if (input.loyalty.exists.value && !input.loyalty.programType.value) {
    signals.push(signal("LOYALTY_PAGE_WEAKNESS", "Loyalty page exists but program mechanics are unclear", input.loyalty.exists, 65));
  }

  return signals;
}

function signal(
  type: string,
  title: string,
  claim: Claim<unknown>,
  totalScore = Math.round((claim.confidence ?? 0.5) * 100)
): RediemSignalInput {
  return {
    type,
    title,
    description: claim.rawExcerpt ?? undefined,
    sourceUrl: claim.sourceUrl,
    totalScore
  };
}

async function createClaimEvidence(
  client: AnalyzeBrandForRediemClient,
  input: {
    workspaceId: string;
    accountId: string;
    provider: string;
    claims: BrandProfileClaims;
    detections: RediemCompetitorToolDetectionInput[];
    signals: RediemSignalInput[];
  }
): Promise<EvidenceRecord[]> {
  const evidence: EvidenceRecord[] = [];

  for (const [fieldName, claim] of Object.entries(input.claims)) {
    evidence.push(
      await client.evidence.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "ACCOUNT",
          entityId: input.accountId,
          fieldName: `brandProfile.${fieldName}`,
          value: serializeEvidenceValue(claim.value),
          sourceUrl: claim.sourceUrl,
          provider: input.provider,
          rawExcerpt: claim.rawExcerpt ?? null,
          confidence: claim.confidence,
          capturedAt: new Date()
        }
      })
    );
  }

  for (const detection of input.detections) {
    evidence.push(
      await client.evidence.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "ACCOUNT",
          entityId: input.accountId,
          fieldName: `competitorToolDetection.${detection.category}.${detection.vendor}`,
          value: detection.vendor ?? null,
          sourceUrl: detection.sourceUrl ?? null,
          provider: input.provider,
          rawExcerpt: detection.evidence ?? null,
          confidence: detection.confidence ?? 0.5,
          capturedAt: new Date()
        }
      })
    );
  }

  for (const signal of input.signals) {
    evidence.push(
      await client.evidence.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "ACCOUNT",
          entityId: input.accountId,
          fieldName: `rediemSignal.${signal.type}`,
          value: signal.title ?? null,
          sourceUrl: signal.sourceUrl ?? null,
          provider: input.provider,
          rawExcerpt: signal.description ?? null,
          confidence: scoreToConfidence(signal.totalScore),
          capturedAt: new Date()
        }
      })
    );
  }

  return evidence;
}

function claimsToProfileData(claims: BrandProfileClaims): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(claims).map(([key, claim]) => [key, claim.value])
  );
}

async function getCachedDossier(
  client: AnalyzeBrandForRediemClient,
  key: string
): Promise<RediemAccountDossier | null> {
  return getCache<RediemAccountDossier>(client, {
    namespace: CACHE_NAMESPACE as ProviderCacheNamespace,
    key
  });
}

function normalizePageContent(page: WebPageResult): string {
  return [page.title, page.text, page.html].filter(Boolean).join("\n");
}

function findPageWithKeywords(
  pages: PageSnapshot[],
  keywords: string[]
): PageSnapshot | undefined {
  return pages.find((page) => matchesAny(page.content, keywords));
}

function findExcerpt(content: string, keywords: string[]): string | null {
  const normalized = content.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const keyword = keywords.find((item) => lower.includes(item.toLowerCase()));

  if (!keyword) {
    // Return null rather than an unrelated page excerpt — a caller that receives
    // null knows the keyword wasn't found, whereas a generic prefix looks like
    // evidence when it isn't.
    return null;
  }

  const index = Math.max(0, lower.indexOf(keyword.toLowerCase()) - 80);
  return normalized.slice(index, index + 240);
}

function extractFirstUrl(content: string, regex: RegExp): string | null {
  return content.match(regex)?.[0] ?? null;
}

function matchesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function claimString(
  value: string | null | undefined,
  sourceUrl: string,
  confidence: number,
  rawExcerpt?: string | null
): Claim<string> {
  return { value: value ?? null, sourceUrl, confidence, rawExcerpt };
}

function claimNumber(
  value: number | null | undefined,
  sourceUrl: string,
  confidence: number,
  rawExcerpt?: string | null
): Claim<number> {
  return { value: value ?? null, sourceUrl, confidence, rawExcerpt };
}

function claimBoolean(
  value: boolean | null | undefined,
  sourceUrl: string,
  confidence: number,
  rawExcerpt?: string | null
): Claim<boolean> {
  return { value: value ?? false, sourceUrl, confidence, rawExcerpt };
}

function claimJson(
  value: Record<string, unknown> | null,
  sourceUrl: string,
  confidence: number,
  rawExcerpt?: string | null
): Claim<Record<string, unknown>> {
  return { value, sourceUrl, confidence, rawExcerpt };
}

function serializeEvidenceValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function toToolCategory(category: string | null | undefined): string {
  switch ((category ?? "").toLowerCase()) {
    case "loyalty":
      return "LOYALTY";
    case "reviews":
      return "REVIEWS";
    case "subscriptions":
    case "subscription":
      return "SUBSCRIPTION";
    case "referral":
      return "REFERRAL";
    case "email":
    case "email_sms":
      return "EMAIL";
    case "sms":
      return "SMS";
    default:
      return "OTHER";
  }
}

function scoreToConfidence(score: number | null | undefined): number {
  return Math.round(Math.max(0.25, Math.min(0.95, (score ?? 50) / 100)) * 100) / 100;
}

function averageEvidenceConfidence(evidence: EvidenceRecord[]): number {
  const values = evidence
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return 0.35;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < inputs.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(inputs[currentIndex] as TInput, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker())
  );

  return results;
}

function titleizeDomain(domain: string): string {
  return (
    domain
      .split(".")[0]
      ?.split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") ?? domain
  );
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function toJsonCompatible(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value, (_key, child) =>
      child instanceof Date ? child.toISOString() : child
    )
  ) as unknown;
}
