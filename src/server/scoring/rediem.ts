export type RediemBrandProfileInput = {
  ecommercePlatform?: string | null;
  ecommercePlatformScore?: number | null;
  shopifyDetected?: boolean | null;
  shopifyPlusLikely?: boolean | null;
  productCategory?: string | null;
  brandCategory?: string | null;
  pricePoint?: string | null;
  targetCustomer?: string | null;
  hasSubscription?: boolean | null;
  subscriptionProvider?: string | null;
  hasLoyaltyProgram?: boolean | null;
  loyaltyProvider?: string | null;
  loyaltyProgramUrl?: string | null;
  loyaltyProgramType?: string | null;
  hasReferralProgram?: boolean | null;
  hasReviews?: boolean | null;
  reviewProvider?: string | null;
  hasUGC?: boolean | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  socialCommunityScore?: number | null;
  hasRetailPresence?: boolean | null;
  sustainabilityAngle?: string | null;
  missionDrivenAngle?: string | null;
  rediemFitScore?: number | null;
  loyaltyMaturityScore?: number | null;
  communityReadinessScore?: number | null;
  migrationPainScore?: number | null;
  agenticCommerceScore?: number | null;
};

export type RediemSignalInput = {
  type?: string | null;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  totalScore?: number | null;
};

export type RediemCompetitorToolDetectionInput = {
  category?: string | null;
  vendor?: string | null;
  confidence?: number | null;
  sourceUrl?: string | null;
  evidence?: string | null;
};

export type RediemTier = "Tier 1" | "Tier 2" | "Tier 3" | "Disqualify";

export type RediemScoreBreakdown = {
  score: number;
  tier: RediemTier;
  components: {
    ecommerceFit: number;
    communityReadiness: number;
    loyaltyPain: number;
    retentionNeed: number;
    socialUGCPotential: number;
    subscriptionRepeatPurchaseFit: number;
    migrationOpportunity: number;
    timingSignal: number;
  };
  // Human-readable explanations of what drove the score, suitable for sales context.
  reasons: string[];
};

// Weight rationale:
//   ecommerceFit (20%)             — hard gating signal; non-Shopify stacks rarely support Rediem integrations
//   communityReadiness (15%)       — participation loops only convert in brands with existing community motion
//   loyaltyPain (15%)              — inadequate loyalty infrastructure is the core buying trigger
//   retentionNeed (15%)            — high-repurchase categories justify the platform investment
//   socialUGCPotential (10%)       — UGC is the content flywheel Rediem's activation ideas depend on
//   subscriptionRepeatPurchase (10%) — subscription brands already understand recurring value; easier sell
//   migrationOpportunity (10%)     — confirmed legacy tool gives a concrete displacement story for AEs
//   timingSignal (5%)              — recency boost only; not a primary qualifier on its own
export function scoreRediemFit(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): RediemScoreBreakdown {
  const components = {
    ecommerceFit: calculateEcommerceFit(profile),
    communityReadiness: calculateCommunityReadinessScore(profile, signals),
    loyaltyPain: calculateLoyaltyPainScore(profile, detections),
    retentionNeed: calculateRetentionNeedScore(profile),
    socialUGCPotential: calculateSocialUGCPotential(profile, signals),
    subscriptionRepeatPurchaseFit: calculateSubscriptionRepeatPurchaseFit(profile),
    migrationOpportunity: calculateMigrationPainScore(profile, detections),
    timingSignal: calculateTimingSignalScore(signals),
  };

  const score = clampScore(
    Math.round(
      0.2 * components.ecommerceFit +
        0.15 * components.communityReadiness +
        0.15 * components.loyaltyPain +
        0.15 * components.retentionNeed +
        0.1 * components.socialUGCPotential +
        0.1 * components.subscriptionRepeatPurchaseFit +
        0.1 * components.migrationOpportunity +
        0.05 * components.timingSignal
    )
  );

  return {
    score,
    tier: classifyRediemTier(score),
    components,
    reasons: buildReasons(profile, signals, detections),
  };
}

export function calculateRediemFitScore(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): number {
  return scoreRediemFit(profile, signals, detections).score;
}

export function calculateLoyaltyPainScore(
  profile: RediemBrandProfileInput,
  detections: RediemCompetitorToolDetectionInput[] = []
): number {
  if (!hasEcommerce(profile)) {
    return 15;
  }

  let score = profile.hasLoyaltyProgram ? 58 : 38;
  const loyaltyText = normalizedText(
    profile.loyaltyProvider,
    profile.loyaltyProgramType,
    ...detections.map((detection) => `${detection.vendor ?? ""} ${detection.evidence ?? ""}`)
  );

  if (profile.hasLoyaltyProgram && loyaltyText.includes("points")) {
    score += 20;
  }

  if (profile.hasLoyaltyProgram && loyaltyText.includes("tier")) {
    score += 10;
  }

  if (profile.hasReferralProgram) {
    score += 8;
  }

  if (profile.hasSubscription) {
    score += 7;
  }

  if (profile.hasReviews || profile.hasUGC) {
    score += 5;
  }

  if (detectsCategory(detections, "loyalty")) {
    score += 12;
  }

  return clampScore(score);
}

export function calculateCommunityReadinessScore(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = []
): number {
  if (!hasEcommerce(profile)) {
    return 20;
  }

  let score = profile.socialCommunityScore ?? 35;

  if (profile.hasUGC) {
    score += 18;
  }

  if (profile.instagramUrl) {
    score += 8;
  }

  if (profile.tiktokUrl) {
    score += 8;
  }

  if (profile.missionDrivenAngle || profile.sustainabilityAngle) {
    score += 8;
  }

  const signalText = normalizedSignalText(signals);
  if (matchesAny(signalText, ["creator", "ambassador", "community", "ugc", "event"])) {
    score += 10;
  }

  return clampScore(score);
}

export function calculateMigrationPainScore(
  profile: RediemBrandProfileInput,
  detections: RediemCompetitorToolDetectionInput[] = []
): number {
  if (!hasEcommerce(profile)) {
    return 10;
  }

  // Fixed baseline — do not seed from profile.migrationPainScore; that is the
  // stored output of this function and would cause re-scoring inflation.
  let score = 25;
  const loyaltyText = normalizedText(
    profile.loyaltyProvider,
    profile.loyaltyProgramType,
    ...detections.map((detection) => `${detection.category ?? ""} ${detection.vendor ?? ""} ${detection.evidence ?? ""}`)
  );

  if (profile.hasLoyaltyProgram) {
    score += 22;
  }

  if (matchesAny(loyaltyText, ["points", "tier", "vip", "legacy"])) {
    score += 18;
  }

  if (detectsCategory(detections, "loyalty")) {
    score += 16;
  }

  if (detectsCategory(detections, "reviews") || profile.hasReviews) {
    score += 5;
  }

  if (profile.shopifyPlusLikely) {
    score += 8;
  }

  return clampScore(score);
}

export function calculateAgenticCommerceScore(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = []
): number {
  if (!hasEcommerce(profile)) {
    return 15;
  }

  // Fixed baseline — do not seed from profile.agenticCommerceScore; that is the
  // stored output of this function and would cause re-scoring inflation.
  let score = 35;

  if (profile.shopifyDetected || profile.shopifyPlusLikely) {
    score += 14;
  }

  if (profile.hasSubscription) {
    score += 12;
  }

  if (profile.hasLoyaltyProgram || profile.hasReferralProgram) {
    score += 10;
  }

  if (profile.hasReviews || profile.hasUGC) {
    score += 8;
  }

  if (calculateTimingSignalScore(signals) >= 70) {
    score += 8;
  }

  return clampScore(score);
}

export function classifyRediemTier(score: number): RediemTier {
  if (score >= 85) {
    return "Tier 1";
  }

  if (score >= 70) {
    return "Tier 2";
  }

  if (score >= 50) {
    return "Tier 3";
  }

  return "Disqualify";
}

function calculateEcommerceFit(profile: RediemBrandProfileInput): number {
  if (!hasEcommerce(profile)) {
    return 10;
  }

  let score = profile.ecommercePlatformScore ?? 60;

  if (profile.shopifyDetected) {
    score += 12;
  }

  if (profile.shopifyPlusLikely) {
    score += 8;
  }

  if (isConsumerBrand(profile)) {
    score += 10;
  }

  return clampScore(score);
}

function calculateRetentionNeedScore(profile: RediemBrandProfileInput): number {
  if (!hasEcommerce(profile)) {
    return 12;
  }

  let score = repeatPurchaseCategoryScore(profile);

  if (profile.hasSubscription) {
    score += 16;
  }

  if (profile.hasRetailPresence) {
    score += 8;
  }

  if (profile.pricePoint && matchesAny(profile.pricePoint, ["premium", "mid", "accessible"])) {
    score += 6;
  }

  return clampScore(score);
}

function calculateSocialUGCPotential(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[]
): number {
  if (!hasEcommerce(profile)) {
    return 15;
  }

  let score = Math.round((profile.socialCommunityScore ?? 35) * 0.65);

  if (profile.hasUGC) {
    score += 24;
  }

  if (profile.instagramUrl && profile.tiktokUrl) {
    score += 12;
  } else if (profile.instagramUrl || profile.tiktokUrl) {
    score += 7;
  }

  if (matchesAny(normalizedSignalText(signals), ["creator", "ugc", "ambassador", "viral"])) {
    score += 10;
  }

  return clampScore(score);
}

function calculateSubscriptionRepeatPurchaseFit(
  profile: RediemBrandProfileInput
): number {
  if (!hasEcommerce(profile)) {
    return 10;
  }

  let score = repeatPurchaseCategoryScore(profile);

  if (profile.hasSubscription) {
    score += 25;
  }

  if (profile.subscriptionProvider) {
    score += 8;
  }

  if (profile.hasReviews) {
    score += 5;
  }

  return clampScore(score);
}

function calculateTimingSignalScore(signals: RediemSignalInput[]): number {
  if (signals.length === 0) {
    return 35;
  }

  const signalText = normalizedSignalText(signals);
  const maxSignalScore = Math.max(0, ...signals.map((signal) => signal.totalScore ?? 0));
  // Use 45 as a neutral baseline only when signals exist but have no totalScore
  // set (unscored signals). Do not inflate to 45 for signals that scored 0.
  const hasUnscoredSignals = signals.some((s) => s.totalScore == null);
  let score = maxSignalScore > 0 ? maxSignalScore : hasUnscoredSignals ? 45 : 0;

  if (matchesAny(signalText, ["launch", "drop", "retail", "expansion", "subscription", "loyalty"])) {
    score += 12;
  }

  return clampScore(score);
}

function repeatPurchaseCategoryScore(profile: RediemBrandProfileInput): number {
  const text = normalizedText(profile.productCategory, profile.brandCategory);

  if (
    matchesAny(text, [
      "beauty",
      "skincare",
      "beverage",
      "food",
      "supplement",
      "wellness",
      "pet",
      "coffee",
      "tea"
    ])
  ) {
    return 76;
  }

  if (matchesAny(text, ["apparel", "accessories", "home", "fitness"])) {
    return 62;
  }

  if (matchesAny(text, ["software", "saas", "b2b", "industrial"])) {
    return 18;
  }

  return isConsumerBrand(profile) ? 55 : 25;
}

// Threshold of 50 prevents near-zero detection confidence (e.g. 0.1) from
// bypassing the ecommerce guard and inflating scores for non-ecommerce brands.
const ECOMMERCE_PLATFORM_SCORE_THRESHOLD = 50;

function hasEcommerce(profile: RediemBrandProfileInput): boolean {
  return Boolean(
    profile.shopifyDetected ||
      profile.ecommercePlatform ||
      (profile.ecommercePlatformScore != null &&
        profile.ecommercePlatformScore >= ECOMMERCE_PLATFORM_SCORE_THRESHOLD)
  );
}

function isConsumerBrand(profile: RediemBrandProfileInput): boolean {
  const text = normalizedText(
    profile.productCategory,
    profile.brandCategory,
    profile.targetCustomer
  );

  return matchesAny(text, [
    "beauty",
    "skincare",
    "beverage",
    "food",
    "apparel",
    "accessories",
    "consumer",
    "dtc",
    "ecommerce",
    "wellness",
    "home",
    "pet"
  ]);
}

// minConfidence: detections without a confidence field pass (benefit of the doubt
// for scrapers that don't emit scores), but explicit low-confidence hits do not.
function detectsCategory(
  detections: RediemCompetitorToolDetectionInput[],
  category: string,
  minConfidence = 0.5
): boolean {
  return detections.some(
    (detection) =>
      normalizedText(detection.category).includes(category) &&
      (detection.confidence == null || detection.confidence >= minConfidence)
  );
}

function normalizedSignalText(signals: RediemSignalInput[]): string {
  return normalizedText(
    ...signals.flatMap((signal) => [
      signal.type,
      signal.title,
      signal.description
    ])
  );
}

function normalizedText(...values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function buildReasons(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[],
  detections: RediemCompetitorToolDetectionInput[]
): string[] {
  const reasons: string[] = [];

  if (!hasEcommerce(profile)) {
    reasons.push("No ecommerce platform detected — not a fit for Rediem.");
    return reasons;
  }

  if (profile.shopifyPlusLikely) {
    reasons.push("Shopify Plus detected — strong ecommerce fit and migration readiness.");
  } else if (profile.shopifyDetected) {
    reasons.push("Shopify detected — solid ecommerce fit.");
  } else if (profile.ecommercePlatform) {
    reasons.push(`Ecommerce platform detected: ${profile.ecommercePlatform}.`);
  }

  if (profile.hasLoyaltyProgram) {
    const loyaltyText = normalizedText(profile.loyaltyProvider, profile.loyaltyProgramType);
    const hasPoints = loyaltyText.includes("points");
    const hasTiers = loyaltyText.includes("tier") || loyaltyText.includes("vip");
    if (hasPoints && hasTiers) {
      reasons.push("Points + tiered loyalty program — strong migration candidate for Rediem.");
    } else if (hasPoints) {
      reasons.push("Points-based loyalty program — migration candidate.");
    } else {
      reasons.push("Existing loyalty program — migration or optimization opportunity.");
    }
  } else {
    reasons.push("No loyalty program — greenfield opportunity for Rediem.");
  }

  if (detectsCategory(detections, "loyalty")) {
    reasons.push("Third-party loyalty tool confirmed by detection — concrete displacement story for AEs.");
  }

  if (profile.hasSubscription) {
    const provider = profile.subscriptionProvider ? ` via ${profile.subscriptionProvider}` : "";
    reasons.push(`Subscription commerce active${provider} — repeat-purchase loop already in place.`);
  }

  if (profile.hasUGC && profile.instagramUrl && profile.tiktokUrl) {
    reasons.push("Active UGC with dual social presence (Instagram + TikTok) — high community readiness.");
  } else if (profile.hasUGC) {
    reasons.push("Active UGC — community engagement signals present.");
  }

  if (profile.missionDrivenAngle || profile.sustainabilityAngle) {
    reasons.push("Mission or sustainability angle — supports participation-loop content.");
  }

  if (profile.hasReferralProgram) {
    reasons.push("Referral program active — word-of-mouth infrastructure exists.");
  }

  if (profile.hasRetailPresence) {
    reasons.push("Retail presence — online-to-offline community activation opportunity.");
  }

  const signalText = normalizedSignalText(signals);
  if (matchesAny(signalText, ["launch", "drop", "retail", "expansion", "subscription", "loyalty"])) {
    reasons.push("Timing signal: active launch or expansion activity detected.");
  }

  return reasons;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}
