import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "./rediem";

export type CommunityArchetype =
  | "CULT_CONSUMER_BRAND"
  | "MISSION_LED_BRAND"
  | "RITUAL_REPEAT_USE_BRAND"
  | "RETAIL_TO_DTC_BRIDGE_BRAND"
  | "CREATOR_AMBASSADOR_LED_BRAND"
  | "PRODUCT_DROP_BRAND"
  | "EDUCATION_TRUST_LED_BRAND"
  | "LOW_COMMUNITY_COMMODITY_BRAND";

export type CommunityScore = {
  score: number;
  confidence: number;
  reasons: string[];
};

export type CommunityArchetypeResult = {
  primaryArchetype: CommunityArchetype;
  archetypes: CommunityArchetype[];
  confidence: number;
  scores: {
    communityEnergy: CommunityScore;
    participationCaptureGap: CommunityScore;
    retailToOwnedDataOpportunity: CommunityScore;
    missionIdentityStrength: CommunityScore;
    ritualRepeatPurchaseFit: CommunityScore;
    creatorAmbassadorFit: CommunityScore;
    communityValueFit: CommunityScore;
  };
  reasons: string[];
};

export type CommunityArchetypeInput = {
  profile: RediemBrandProfileInput;
  signals?: RediemSignalInput[];
  detections?: RediemCompetitorToolDetectionInput[];
};

export function classifyCommunityArchetype(
  input: CommunityArchetypeInput
): CommunityArchetypeResult {
  const signals = input.signals ?? [];
  const detections = input.detections ?? [];
  const profile = input.profile;
  const scores = {
    communityEnergy: calculateCommunityEnergyScore(profile, signals, detections),
    participationCaptureGap: calculateParticipationCaptureGap(profile, signals, detections),
    retailToOwnedDataOpportunity: calculateRetailToOwnedDataOpportunity(profile, signals, detections),
    missionIdentityStrength: calculateMissionIdentityStrength(profile, signals, detections),
    ritualRepeatPurchaseFit: calculateRitualRepeatPurchaseFit(profile, signals, detections),
    creatorAmbassadorFit: calculateCreatorAmbassadorFit(profile, signals, detections),
    communityValueFit: calculateCommunityValueFitScore(profile, signals, detections)
  };
  const text = combinedText(profile, signals, detections);
  const archetypes: CommunityArchetype[] = [];

  if (
    scores.communityEnergy.score >= 70 &&
    (hasAnySocial(profile) ||
      profile.hasUGC ||
      profile.hasReviews ||
      matchesAny(text, ["cult", "community", "fans", "viral", "drops", "ambassador"]))
  ) {
    archetypes.push("CULT_CONSUMER_BRAND");
  }

  if (scores.missionIdentityStrength.score >= 65) {
    archetypes.push("MISSION_LED_BRAND");
  }

  if (scores.ritualRepeatPurchaseFit.score >= 68) {
    archetypes.push("RITUAL_REPEAT_USE_BRAND");
  }

  if (scores.retailToOwnedDataOpportunity.score >= 65) {
    archetypes.push("RETAIL_TO_DTC_BRIDGE_BRAND");
  }

  if (scores.creatorAmbassadorFit.score >= 65) {
    archetypes.push("CREATOR_AMBASSADOR_LED_BRAND");
  }

  if (matchesAny(text, ["product drop", "limited edition", "limited drop", "collaboration", "collab", "restock"])) {
    archetypes.push("PRODUCT_DROP_BRAND");
  }

  if (matchesAny(text, ["education", "science", "clinical", "ingredient", "expert", "dermatologist", "wellness"])) {
    archetypes.push("EDUCATION_TRUST_LED_BRAND");
  }

  if (archetypes.length === 0 || scores.communityValueFit.score < 35) {
    archetypes.splice(0, archetypes.length, "LOW_COMMUNITY_COMMODITY_BRAND");
  }

  const primaryArchetype = selectPrimaryArchetype(archetypes, scores);
  const uniqueArchetypes = unique(archetypes);
  const confidence = average([
    scores.communityEnergy.confidence,
    scores.participationCaptureGap.confidence,
    scores.retailToOwnedDataOpportunity.confidence,
    scores.missionIdentityStrength.confidence,
    scores.ritualRepeatPurchaseFit.confidence,
    scores.creatorAmbassadorFit.confidence
  ]);

  return {
    primaryArchetype,
    archetypes: uniqueArchetypes,
    confidence: roundConfidence(confidence),
    scores,
    reasons: unique([
      ...scores.communityValueFit.reasons,
      `Primary community archetype: ${primaryArchetype}.`
    ])
  };
}

export function calculateCommunityEnergyScore(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  let score = profile.socialCommunityScore ?? 28;
  const reasons: string[] = [];

  if (profile.socialCommunityScore != null) {
    reasons.push("Visible social/community score available.");
  }

  if (hasAnySocial(profile)) {
    score += 12;
    reasons.push("Owned social presence detected.");
  }

  if (profile.hasUGC) {
    score += 18;
    reasons.push("UGC or customer participation language detected.");
  }

  if (profile.hasReviews) {
    score += 8;
    reasons.push("Reviews create visible customer voice.");
  }

  if (profile.hasReferralProgram) {
    score += 8;
    reasons.push("Referral loop indicates customer advocacy potential.");
  }

  if (matchesAny(text, ["community", "creator", "ambassador", "affiliate", "challenge", "fans", "viral"])) {
    score += 14;
    reasons.push("Community, creator, or ambassador language detected.");
  }

  if (
    !hasEcommerceSignal(profile) &&
    !profile.hasRetailPresence &&
    !profile.hasSubscription &&
    !profile.hasReviews
  ) {
    score = Math.min(score, isConsumerBrand(profile) ? 58 : 32);
    reasons.push("No clear commerce, retail, subscription, or review signal, so community energy is conservative.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateParticipationCaptureGap(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  const communityEnergy = calculateCommunityEnergyScore(profile, signals, detections).score;
  let score = Math.round(communityEnergy * 0.55);
  const reasons: string[] = [];
  const hasParticipation = Boolean(profile.hasUGC || profile.hasReviews || profile.hasReferralProgram);
  const hasOwnedCapture = Boolean(profile.hasLoyaltyProgram || profile.hasSubscription || detectsCategory(detections, "email") || detectsCategory(detections, "sms"));
  const disconnectedTools = countDisconnectedTools(profile, detections);

  if (communityEnergy >= 65 && !profile.hasLoyaltyProgram) {
    score += 20;
    reasons.push("Community signals exist but no loyalty program is detected.");
  }

  if (hasParticipation && !profile.hasReferralProgram) {
    score += 12;
    reasons.push("Customer participation exists but referral capture is weak.");
  }

  if (profile.hasReviews && !profile.hasLoyaltyProgram) {
    score += 10;
    reasons.push("Reviews are visible but not clearly tied to owned rewards.");
  }

  if (profile.hasLoyaltyProgram && matchesAny(normalizedText(profile.loyaltyProgramType, profile.loyaltyProvider), ["points", "earn", "burn"])) {
    score += 12;
    reasons.push("Points-style loyalty may capture transactions more than community behavior.");
  }

  if (disconnectedTools >= 3) {
    score += 12;
    reasons.push("Multiple disconnected commerce/marketing tools suggest fragmented participation data.");
  } else if (disconnectedTools >= 2) {
    score += 8;
    reasons.push("Several tools suggest participation data is split across systems.");
  }

  if (matchesAny(text, ["discount", "sale", "coupon", "off your first", "% off"])) {
    score += 10;
    reasons.push("Discount-heavy language suggests transactional growth pressure.");
  }

  if (hasOwnedCapture && profile.hasReferralProgram && profile.hasUGC) {
    score -= 16;
    reasons.push("Owned capture loops are already partially connected.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateRetailToOwnedDataOpportunity(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  let score = 20;
  const reasons: string[] = [];

  if (profile.hasRetailPresence || hasRetailLanguage(text)) {
    score += 38;
    reasons.push("Retail presence creates a retail-to-owned-data bridge opportunity.");
  }

  if (matchesAny(text, ["target", "whole foods", "walmart", "sprouts", "amazon", "cvs", "ulta", "sephora"])) {
    score += 14;
    reasons.push("Retailer or marketplace language detected.");
  }

  if (hasEcommerceSignal(profile)) {
    score += 10;
    reasons.push("Owned ecommerce exists alongside retail signals.");
  }

  if (profile.hasReviews || profile.hasUGC || hasAnySocial(profile)) {
    score += 10;
    reasons.push("Customer participation can be redirected into owned profiles.");
  }

  if (matchesAny(text, ["receipt", "retail rewards", "upload"])) {
    score += 8;
    reasons.push("Receipt or retail reward language detected.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateMissionIdentityStrength(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  let score = 18;
  const reasons: string[] = [];

  if (profile.missionDrivenAngle) {
    score += 28;
    reasons.push("Mission-driven angle detected.");
  }

  if (profile.sustainabilityAngle) {
    score += 22;
    reasons.push("Sustainability angle detected.");
  }

  if (matchesAny(text, ["clean", "sustainable", "mission", "plastic", "climate", "wellness", "science", "ingredient", "clinical", "education"])) {
    score += 18;
    reasons.push("Identity, wellness, sustainability, or education language detected.");
  }

  if (matchesAny(normalizedText(profile.brandCategory, profile.productCategory), ["wellness", "beauty", "skincare", "supplement", "food", "beverage"])) {
    score += 8;
    reasons.push("Category supports identity-based community participation.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateRitualRepeatPurchaseFit(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  let score = repeatPurchaseCategoryScore(profile);
  const reasons: string[] = [];

  if (profile.hasSubscription) {
    score += 22;
    reasons.push("Subscription flow indicates repeat-use behavior.");
  }

  if (profile.subscriptionProvider || detectsCategory(detections, "subscription")) {
    score += 10;
    reasons.push("Subscription tooling detected.");
  }

  if (matchesAny(text, ["routine", "daily", "replenish", "subscribe", "refill", "habit", "ritual", "everyday"])) {
    score += 14;
    reasons.push("Routine, replenishment, or habit language detected.");
  }

  if (profile.hasReviews) {
    score += 5;
    reasons.push("Reviews support repeat-purchase trust.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateCreatorAmbassadorFit(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const text = combinedText(profile, signals, detections);
  let score = profile.hasUGC ? 50 : 18;
  const reasons: string[] = [];

  if (profile.hasUGC) {
    reasons.push("UGC detected.");
  }

  if (hasAnySocial(profile)) {
    score += 14;
    reasons.push("Social channels are visible.");
  }

  if (matchesAny(text, ["creator", "ambassador", "affiliate", "influencer", "ugc", "social challenge", "community challenge"])) {
    score += 28;
    reasons.push("Creator, ambassador, affiliate, or challenge language detected.");
  }

  if (profile.hasReferralProgram) {
    score += 8;
    reasons.push("Referral program can convert advocacy into owned participation.");
  }

  return metric(score, evidenceConfidence(profile, signals, detections), reasons);
}

export function calculateCommunityValueFitScore(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  const communityEnergy = calculateCommunityEnergyScore(profile, signals, detections);
  const participationCaptureGap = calculateParticipationCaptureGap(profile, signals, detections);
  const ritualRepeatPurchaseFit = calculateRitualRepeatPurchaseFit(profile, signals, detections);
  const retailToOwnedDataOpportunity = calculateRetailToOwnedDataOpportunity(profile, signals, detections);
  const missionIdentityStrength = calculateMissionIdentityStrength(profile, signals, detections);
  const stackMigrationOpportunity = calculateStackMigrationOpportunity(profile, detections);
  const timingSignal = calculateTimingSignal(signals);

  const score = Math.round(
    0.25 * communityEnergy.score +
      0.2 * participationCaptureGap.score +
      0.15 * ritualRepeatPurchaseFit.score +
      0.15 * retailToOwnedDataOpportunity.score +
      0.1 * missionIdentityStrength.score +
      0.1 * stackMigrationOpportunity.score +
      0.05 * timingSignal.score
  );
  const confidence = average([
    communityEnergy.confidence,
    participationCaptureGap.confidence,
    ritualRepeatPurchaseFit.confidence,
    retailToOwnedDataOpportunity.confidence,
    missionIdentityStrength.confidence,
    stackMigrationOpportunity.confidence,
    timingSignal.confidence
  ]);

  return metric(score, confidence, [
    "Community value fit is weighted toward participation potential, capture gap, ritual fit, retail bridge opportunity, mission identity, stack migration, and timing."
  ]);
}

export function calculateStackMigrationOpportunity(
  profile: RediemBrandProfileInput,
  detections: RediemCompetitorToolDetectionInput[] = []
): CommunityScore {
  let score = 22;
  const reasons: string[] = [];
  const toolCount = countDisconnectedTools(profile, detections);
  const loyaltyText = normalizedText(
    profile.loyaltyProvider,
    profile.loyaltyProgramType,
    ...detections.map((detection) => `${detection.category ?? ""} ${detection.vendor ?? ""} ${detection.evidence ?? ""}`)
  );

  if (profile.hasLoyaltyProgram) {
    score += 20;
    reasons.push("Existing loyalty program creates migration or consolidation opportunity.");
  }

  if (matchesAny(loyaltyText, ["points", "tier", "vip", "earn", "burn"])) {
    score += 16;
    reasons.push("Points, tier, or VIP language suggests loyalty maturity but possible migration pain.");
  }

  if (toolCount >= 3) {
    score += 22;
    reasons.push("Several disconnected commerce, loyalty, review, subscription, SMS, or email tools detected.");
  } else if (toolCount >= 2) {
    score += 14;
    reasons.push("Multiple disconnected tools detected.");
  }

  if (profile.shopifyPlusLikely) {
    score += 6;
    reasons.push("Complex commerce stack increases migration readiness.");
  }

  return metric(score, evidenceConfidence(profile, [], detections), reasons);
}

export function calculateTimingSignal(
  signals: RediemSignalInput[] = []
): CommunityScore {
  if (signals.length === 0) {
    return metric(35, 0.25, ["No recent timing signal detected."]);
  }

  const text = normalizedText(
    ...signals.flatMap((signal) => [signal.type, signal.title, signal.description])
  );
  const maxSignalScore = Math.max(0, ...signals.map((signal) => signal.totalScore ?? 0));
  const hasUnscoredSignals = signals.some((signal) => signal.totalScore == null);
  let score = maxSignalScore > 0 ? maxSignalScore : hasUnscoredSignals ? 45 : 0;

  if (matchesAny(text, ["launch", "drop", "retail", "expansion", "subscription", "loyalty", "community", "ambassador"])) {
    score += 12;
  }

  return metric(score, 0.45 + Math.min(0.4, signals.length * 0.1), ["Recent Rediem-relevant timing signal detected."]);
}

function selectPrimaryArchetype(
  archetypes: CommunityArchetype[],
  scores: CommunityArchetypeResult["scores"]
): CommunityArchetype {
  const priority: Array<[CommunityArchetype, number]> = [
    ["CULT_CONSUMER_BRAND", scores.communityEnergy.score],
    ["RETAIL_TO_DTC_BRIDGE_BRAND", scores.retailToOwnedDataOpportunity.score],
    ["CREATOR_AMBASSADOR_LED_BRAND", scores.creatorAmbassadorFit.score],
    ["RITUAL_REPEAT_USE_BRAND", scores.ritualRepeatPurchaseFit.score],
    ["MISSION_LED_BRAND", scores.missionIdentityStrength.score],
    ["PRODUCT_DROP_BRAND", 62],
    ["EDUCATION_TRUST_LED_BRAND", 58],
    ["LOW_COMMUNITY_COMMODITY_BRAND", 0]
  ];

  return priority
    .filter(([archetype]) => archetypes.includes(archetype))
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "LOW_COMMUNITY_COMMODITY_BRAND";
}

function repeatPurchaseCategoryScore(profile: RediemBrandProfileInput): number {
  const text = normalizedText(profile.productCategory, profile.brandCategory, profile.targetCustomer);

  if (matchesAny(text, ["beverage", "food", "coffee", "tea", "supplement", "wellness", "beauty", "skincare", "pet"])) {
    return 66;
  }

  if (matchesAny(text, ["apparel", "fitness", "home", "baby", "personal care"])) {
    return 52;
  }

  if (matchesAny(text, ["software", "saas", "b2b", "industrial", "commodity"])) {
    return 18;
  }

  return isConsumerBrand(profile) ? 45 : 22;
}

function countDisconnectedTools(
  profile: RediemBrandProfileInput,
  detections: RediemCompetitorToolDetectionInput[]
): number {
  const categories = new Set<string>();

  if (profile.hasLoyaltyProgram || profile.loyaltyProvider) {
    categories.add("loyalty");
  }

  if (profile.hasReviews || profile.reviewProvider) {
    categories.add("reviews");
  }

  if (profile.hasSubscription || profile.subscriptionProvider) {
    categories.add("subscription");
  }

  for (const detection of detections) {
    if (detection.confidence != null && detection.confidence < 0.5) {
      continue;
    }
    const category = normalizedText(detection.category);
    if (category.includes("loyalty")) categories.add("loyalty");
    if (category.includes("review")) categories.add("reviews");
    if (category.includes("subscription")) categories.add("subscription");
    if (category.includes("email")) categories.add("email");
    if (category.includes("sms")) categories.add("sms");
    if (category.includes("referral")) categories.add("referral");
  }

  return categories.size;
}

function evidenceConfidence(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[],
  detections: RediemCompetitorToolDetectionInput[]
): number {
  let confidence = 0.25;

  if (isConsumerBrand(profile)) confidence += 0.12;
  if (hasEcommerceSignal(profile)) confidence += 0.08;
  if (profile.socialCommunityScore != null || hasAnySocial(profile)) confidence += 0.12;
  if (profile.hasReviews != null || profile.hasUGC != null) confidence += 0.1;
  if (profile.hasSubscription != null || profile.hasLoyaltyProgram != null) confidence += 0.08;
  if (profile.hasRetailPresence != null || profile.retailSignals != null) confidence += 0.08;
  if (signals.length > 0) confidence += 0.08;
  if (detections.length > 0) confidence += 0.09;

  return roundConfidence(confidence);
}

function hasEcommerceSignal(profile: RediemBrandProfileInput): boolean {
  return Boolean(
    profile.ecommercePlatform ||
      profile.shopifyDetected ||
      profile.shopifyPlusLikely ||
      (profile.ecommercePlatformScore != null && profile.ecommercePlatformScore >= 50)
  );
}

function hasAnySocial(profile: RediemBrandProfileInput): boolean {
  return Boolean(profile.instagramUrl || profile.tiktokUrl || (profile.socialCommunityScore ?? 0) >= 55);
}

function hasRetailLanguage(text: string): boolean {
  return matchesAny(text, [
    "retail",
    "store locator",
    "find us in stores",
    "target",
    "whole foods",
    "walmart",
    "sprouts",
    "amazon",
    "cvs",
    "ulta",
    "sephora"
  ]);
}

function isConsumerBrand(profile: RediemBrandProfileInput): boolean {
  const text = normalizedText(profile.productCategory, profile.brandCategory, profile.targetCustomer);

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
    "pet",
    "supplement",
    "personal care"
  ]);
}

function detectsCategory(
  detections: RediemCompetitorToolDetectionInput[],
  category: string
): boolean {
  return detections.some(
    (detection) =>
      normalizedText(detection.category).includes(category) &&
      (detection.confidence == null || detection.confidence >= 0.5)
  );
}

function combinedText(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[],
  detections: RediemCompetitorToolDetectionInput[]
): string {
  return normalizedText(
    profile.ecommercePlatform,
    profile.productCategory,
    profile.brandCategory,
    profile.pricePoint,
    profile.targetCustomer,
    profile.subscriptionProvider,
    profile.loyaltyProvider,
    profile.loyaltyProgramType,
    profile.reviewProvider,
    profile.sustainabilityAngle,
    profile.missionDrivenAngle,
    stringifyJson(profile.retailSignals),
    ...signals.flatMap((signal) => [signal.type, signal.title, signal.description, signal.sourceUrl]),
    ...detections.flatMap((detection) => [detection.category, detection.vendor, detection.evidence, detection.sourceUrl])
  );
}

function stringifyJson(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function metric(score: number, confidence: number, reasons: string[]): CommunityScore {
  return {
    score: clampScore(Math.round(score)),
    confidence: roundConfidence(confidence),
    reasons: unique(reasons)
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundConfidence(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizedText(...values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}
