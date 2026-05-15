// Community Flywheel Ratio (CFR)
//
// CFR = Earned Community Growth / Subsidized Transactional Growth
//
// The ratio measures whether a brand's customer growth engine is pulling people in
// through community participation (earned) or pushing them in through discounts,
// paid acquisition, and transactional rewards (subsidized).
//
// CFR > 1 means earned growth is outpacing subsidized growth — the flywheel is turning.
// CFR < 1 means the brand is buying its way to retention, not earning it.
//
// PROSPECTING MODE vs CUSTOMER MODE
// ----------------------------------
// In prospecting mode, CFR is estimated from publicly visible signals: website content,
// brand profile fields, and detected tools. Confidence is 0.18–0.65. The CFR is capped
// at 1.99 ("Healthy Community Flywheel") because "Iconic Brand Flywheel" status requires
// actual behavioral data to substantiate, not just visible signals.
//
// In customer mode, CFR is computed from real Rediem platform data: verified participation
// events, referral conversion rates, subscription tenure, and churn signals. Confidence is
// 0.75–0.95. Customer mode is the version used in monthly CS reporting.
//
// Both modes return the same shape so they can be compared and trended over time.

import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "./rediem";

// ─── Public types ────────────────────────────────────────────────────────────

export type CfrMode = "prospecting" | "customer";

export type CfrTier =
  | "Transactional Trap"        // CFR < 0.5 — subsidized growth dominates heavily
  | "Emerging Community Loop"   // CFR 0.5–1 — community behaviors are starting to show
  | "Healthy Community Flywheel" // CFR 1–2 — earned growth is outpacing subsidized
  | "Iconic Brand Flywheel";    // CFR ≥ 2 — community is the primary growth engine (customer mode only)

export type CommunityFlywheelLeakType =
  | "NO_PARTICIPATION_CAPTURE"       // nothing turns a purchase into a community action
  | "POINTS_ONLY_LOYALTY"            // loyalty earns points but no community behaviors
  | "DISCOUNT_HEAVY_RETENTION"       // retention touchpoints are dominated by discounts
  | "REVIEWS_ISOLATED_FROM_REWARDS"  // reviews exist but don't connect to referrals or rewards
  | "UGC_NOT_VERIFIED"               // social content isn't tied to verified purchases or members
  | "WEAK_REFERRAL_LOOP"             // advocacy signals exist but no structured referral path
  | "NO_SUBSCRIPTION_REWARD_SERIES"  // subscribers aren't rewarded beyond the product itself
  | "NO_ZERO_PARTY_DATA_LOOP"        // no preference or intent capture loop
  | "RETAIL_NOT_CONNECTED_TO_DTC"    // retail buyers are invisible to the owned community
  | "SOCIAL_COMMUNITY_NOT_OWNED";    // social engagement isn't captured into owned profiles

export type CommunityFlywheelPlayType =
  | "REVIEW_TO_REFERRAL_CHALLENGE"
  | "SUBSCRIPTION_REWARD_SERIES"
  | "UGC_SOCIAL_CHALLENGE"
  | "RECEIPT_UPLOAD_RETAIL_TO_DTC"
  | "ZERO_PARTY_PREFERENCE_CHALLENGE"
  | "VIP_TIER_MIGRATION"
  | "PRODUCT_DROP_PARTICIPATION_CAMPAIGN"
  | "SUSTAINABILITY_OR_MISSION_CHALLENGE";

export type CommunityFlywheelEvidenceInput = {
  id?: string | null;
  fieldName?: string | null;
  value?: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
};

export type CommunityFlywheelInput = {
  // "prospecting" — estimated from visible signals, capped confidence and CFR tier
  // "customer" — computed from platform data, full confidence range
  mode?: CfrMode;
  profile: RediemBrandProfileInput;
  signals?: RediemSignalInput[];
  detections?: RediemCompetitorToolDetectionInput[];
  evidence?: CommunityFlywheelEvidenceInput[];
  snapshotDate?: Date;
};

export type CommunityFlywheelLeakEstimate = {
  leakType: CommunityFlywheelLeakType;
  // 0–100: how severely this leak is limiting the flywheel
  severity: number;
  // Written for a customer success conversation, not an internal log
  description: string;
  evidenceIds: string[];
  sourceUrls: string[];
  // Short, action-oriented fix tied to a specific Rediem play
  recommendedFix: string;
  // Which play directly addresses this leak — links leaks to the plays array
  recommendedPlayType: CommunityFlywheelPlayType;
};

export type CommunityFlywheelPlayEstimate = {
  playType: CommunityFlywheelPlayType;
  title: string;
  description: string;
  targetBehavior: string;
  // Expected change in CFR if this play is executed well — not a guarantee
  expectedCfrImpact: number;
  expectedTimeToImpact: string;
  confidence: number;
  evidenceIds: string[];
};

export type CommunityFlywheelSnapshotEstimate = {
  mode: CfrMode;
  snapshotDate: Date;
  estimatedCfr: number;
  // 0–1: how much to trust this CFR estimate (prospecting max ~0.65, customer max ~0.95)
  cfrConfidence: number;
  cfrTier: CfrTier;

  // ── Earned community growth sub-scores (0–100) ───────────────────────────
  // These are heuristic indexes, not measured rates or dollar values.
  // They reflect the *presence and strength* of the underlying signal, not an actual metric.
  //
  // participationDepth: how many verified community behaviors the brand supports
  // repeatEngagementStrength: how likely customers are to engage more than once
  // advocacyPotential: signals of organic advocacy mechanisms (referrals, UGC, reviews)
  // preferenceCapturePotential: signals of preference and intent collection
  // retentionProgramStrength: how strong the retention infrastructure is
  participationDepth: number;
  repeatEngagementStrength: number;
  advocacyPotential: number;
  preferenceCapturePotential: number;
  retentionProgramStrength: number;
  verifiedParticipationValue: number;
  repeatParticipationRate: number;
  advocacyConversionRate: number;
  zeroPartyCompletionRate: number;
  retentionLiftValue: number;

  // ── Subsidized transactional growth sub-scores (0–100) ───────────────────
  // Higher means more reliance on subsidized behaviors.
  //
  // discountDependency: how discount-heavy the retention language appears
  // transactionalRewardBias: how transactional (points/cash-back) vs behavioral the reward structure is
  // paidCacDependency: signals of heavy paid acquisition reliance
  // churnExposure: risk signals from churn-recovery language and lack of loyalty infrastructure
  discountDependency: number;
  transactionalRewardBias: number;
  paidCacDependency: number;
  churnExposure: number;
  rewardCostRatio: number;
  churnRecoveryCost: number;

  // ── CFR numerator and denominator ────────────────────────────────────────
  // Both are weighted composites of the sub-scores above, on a 0–100 scale.
  // earnedCommunityGrowth / subsidizedTransactionalGrowth = estimatedCfr
  earnedCommunityGrowth: number;
  subsidizedTransactionalGrowth: number;

  primaryLeak: CommunityFlywheelLeakType | null;
  secondaryLeak: CommunityFlywheelLeakType | null;
  recommendedPlay: CommunityFlywheelPlayType | null;
  leaks: CommunityFlywheelLeakEstimate[];
  plays: CommunityFlywheelPlayEstimate[];
  // Plain-language narrative, safe to share with a brand's retention team
  explanation: string[];
};

// ─── Main entry point ────────────────────────────────────────────────────────

export function calculateCommunityFlywheelRatio(
  input: CommunityFlywheelInput
): CommunityFlywheelSnapshotEstimate {
  const mode: CfrMode = input.mode ?? "prospecting";
  const signals = input.signals ?? [];
  const detections = input.detections ?? [];
  const evidence = input.evidence ?? [];

  const earned = estimateEarnedCommunityGrowth(input.profile, signals, evidence);
  const subsidized = estimateSubsidizedTransactionalGrowth(input.profile, signals, evidence);
  const leaks = detectCommunityFlywheelLeaks(input.profile, signals, detections, evidence);
  const plays = recommendCommunityFlywheelPlays(input.profile, leaks, signals);

  const earnedCommunityGrowth = weightedAverage([
    [earned.participationDepth, 0.25],
    [earned.repeatEngagementStrength, 0.2],
    [earned.advocacyPotential, 0.2],
    [earned.preferenceCapturePotential, 0.15],
    [earned.retentionProgramStrength, 0.2]
  ]);

  // Floor at 10 so division never produces Infinity — a brand with no subsidized signals
  // still has some baseline transactional behavior.
  const subsidizedTransactionalGrowth = Math.max(
    10,
    weightedAverage([
      [subsidized.discountDependency, 0.35],
      [subsidized.transactionalRewardBias, 0.25],
      [subsidized.paidCacDependency, 0.25],
      [subsidized.churnExposure, 0.15]
    ])
  );

  const rawCfr = roundCfr(earnedCommunityGrowth / subsidizedTransactionalGrowth);
  const text = buildTextContext(signals, evidence).text;
  const hasDiscountTrap = leaks.some((leak) => leak.leakType === "DISCOUNT_HEAVY_RETENTION") &&
    leaks.some((leak) => leak.leakType === "NO_PARTICIPATION_CAPTURE");
  const hasPointsOnlyTrap =
    input.profile.hasLoyaltyProgram &&
    normalizeText(input.profile.loyaltyProvider, input.profile.loyaltyProgramType, text).includes("points") &&
    !input.profile.hasUGC &&
    !input.profile.hasReferralProgram;
  const adjustedRawCfr = hasDiscountTrap
    ? Math.min(rawCfr, 0.49)
    : hasPointsOnlyTrap
      ? Math.min(rawCfr, 0.95)
      : rawCfr;
  // Prospecting estimates are based on visible signals, not behavioral data.
  // Claiming "Iconic Brand Flywheel" (CFR ≥ 2) from website scraping would overstate
  // confidence — cap prospecting CFR just below that tier boundary.
  const estimatedCfr = mode === "prospecting" ? Math.min(adjustedRawCfr, 1.99) : adjustedRawCfr;

  const primaryLeak = leaks[0]?.leakType ?? null;
  const secondaryLeak = leaks[1]?.leakType ?? null;
  const recommendedPlay = plays[0]?.playType ?? null;

  const snapshot: CommunityFlywheelSnapshotEstimate = {
    mode,
    snapshotDate: input.snapshotDate ?? new Date(),
    estimatedCfr,
    cfrConfidence: estimateCfrConfidence(mode, input.profile, signals, detections, evidence),
    cfrTier: classifyCfrTier(estimatedCfr),
    ...earned,
    ...subsidized,
    earnedCommunityGrowth,
    subsidizedTransactionalGrowth,
    primaryLeak,
    secondaryLeak,
    recommendedPlay,
    leaks,
    plays,
    explanation: []
  };

  snapshot.explanation = explainCfr(snapshot);
  return snapshot;
}

// ─── Tier classification ─────────────────────────────────────────────────────

export function classifyCfrTier(cfr: number): CfrTier {
  if (cfr < 0.5) return "Transactional Trap";
  if (cfr < 1) return "Emerging Community Loop";
  if (cfr < 2) return "Healthy Community Flywheel";
  return "Iconic Brand Flywheel";
}

// ─── Earned community growth estimation ─────────────────────────────────────

export function estimateEarnedCommunityGrowth(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  evidence: CommunityFlywheelEvidenceInput[] = []
) {
  const text = buildTextContext(signals, evidence);
  const hasEcommerceSignal = hasEcommerce(profile);

  // How many verified community behaviors does the brand support?
  const participationDepth = clampScore(
    (hasEcommerceSignal ? 20 : 8) +
      boolScore(profile.hasReviews, 18) +
      boolScore(profile.hasUGC, 18) +
      boolScore(profile.hasReferralProgram, 14) +
      textScore(text.text, ["verified review", "verified customer", "receipt upload", "purchase verified"], 16) +
      socialScore(profile) * 0.16
  );

  // How likely are customers to engage more than once?
  const repeatEngagementStrength = clampScore(
    (hasEcommerceSignal ? 18 : 6) +
      boolScore(profile.hasSubscription, 25) +
      boolScore(profile.hasLoyaltyProgram, 12) +
      boolScore(profile.hasReferralProgram, 8) +
      repeatPurchaseCategoryScore(profile) * 0.22 +
      textScore(text.text, ["subscribe", "subscription", "autoship", "replenishment", "repeat purchase"], 14)
  );

  // How strong are the brand's organic advocacy mechanisms?
  const advocacyPotential = clampScore(
    12 +
      boolScore(profile.hasReferralProgram, 25) +
      boolScore(profile.hasReviews, 16) +
      boolScore(profile.hasUGC, 20) +
      socialScore(profile) * 0.14 +
      textScore(text.text, ["ambassador", "refer", "creator", "share", "challenge"], 14)
  );

  // How well does the brand capture declared customer intent and preferences?
  const preferenceCapturePotential = clampScore(
    10 +
      textScore(text.text, ["quiz", "preference", "survey", "profile", "routine", "skin type", "style profile"], 40) +
      boolScore(Boolean(profile.missionDrivenAngle || profile.sustainabilityAngle), 8)
  );

  // How strong is the retention infrastructure beyond discounts?
  const retentionProgramStrength = clampScore(
    12 +
      boolScore(profile.hasSubscription, 24) +
      boolScore(profile.hasLoyaltyProgram, 12) +
      boolScore(profile.hasReviews, 8) +
      boolScore(profile.hasReferralProgram, 8) +
      repeatPurchaseCategoryScore(profile) * 0.24 +
      textScore(text.text, ["retention", "lifecycle", "renewal", "reorder", "vip"], 12)
  );

  return {
    participationDepth: roundScore(participationDepth),
    repeatEngagementStrength: roundScore(repeatEngagementStrength),
    advocacyPotential: roundScore(advocacyPotential),
    preferenceCapturePotential: roundScore(preferenceCapturePotential),
    retentionProgramStrength: roundScore(retentionProgramStrength),
    verifiedParticipationValue: roundScore(participationDepth),
    repeatParticipationRate: roundScore(repeatEngagementStrength),
    advocacyConversionRate: roundScore(advocacyPotential),
    zeroPartyCompletionRate: roundScore(preferenceCapturePotential),
    retentionLiftValue: roundScore(retentionProgramStrength)
  };
}

// ─── Subsidized transactional growth estimation ──────────────────────────────

export function estimateSubsidizedTransactionalGrowth(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  evidence: CommunityFlywheelEvidenceInput[] = []
) {
  const text = buildTextContext(signals, evidence).text;

  const discountDependency = clampScore(
    28 +
      textScore(text, ["discount", "% off", "sale", "coupon", "promo code", "clearance"], 42) +
      (profile.hasLoyaltyProgram && isPointsOnly(profile, text) ? 12 : 0) -
      boolScore(profile.hasUGC, 8) -
      boolScore(profile.hasReferralProgram, 6)
  );

  // How transactional (earn/redeem points, cash back) vs behavioral is the reward structure?
  const transactionalRewardBias = clampScore(
    24 +
      (profile.hasLoyaltyProgram ? 18 : 0) +
      (isPointsOnly(profile, text) ? 28 : 0) +
      textScore(text, ["points", "cash back", "store credit", "dollars off", "redeem"], 18) -
      boolScore(profile.hasUGC, 6)
  );

  // Baseline 18 (not 38) — most DTC brands run some paid acquisition, but we shouldn't
  // assume heavy paid dependency without explicit signals. Text evidence lifts this.
  const paidCacDependency = clampScore(
    18 +
      textScore(text, ["paid social", "paid acquisition", "meta ads", "google ads", "influencer whitelisting"], 28) -
      boolScore(profile.hasReferralProgram, 10) -
      boolScore(profile.hasUGC, 8) -
      Math.min(12, socialScore(profile) * 0.1)
  );

  // How exposed is the brand to churn that isn't offset by loyalty or community retention?
  const churnExposure = clampScore(
    25 +
      boolScore(profile.hasSubscription && !profile.hasLoyaltyProgram, 18) +
      textScore(text, ["winback", "churn", "cancellation", "reactivation", "lapsed"], 24) -
      boolScore(profile.hasSubscription && profile.hasLoyaltyProgram, 8) -
      boolScore(profile.hasReferralProgram, 5)
  );

  return {
    discountDependency: roundScore(discountDependency),
    transactionalRewardBias: roundScore(transactionalRewardBias),
    paidCacDependency: roundScore(paidCacDependency),
    churnExposure: roundScore(churnExposure),
    rewardCostRatio: roundScore(transactionalRewardBias),
    churnRecoveryCost: roundScore(churnExposure)
  };
}

// ─── Leak detection ──────────────────────────────────────────────────────────

export function detectCommunityFlywheelLeaks(
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[] = [],
  detections: RediemCompetitorToolDetectionInput[] = [],
  evidence: CommunityFlywheelEvidenceInput[] = []
): CommunityFlywheelLeakEstimate[] {
  const context = buildTextContext(signals, evidence);
  const text = context.text;
  const ids = context.evidenceIds;
  const urls = context.sourceUrls;
  const leaks: CommunityFlywheelLeakEstimate[] = [];

  if (!profile.hasReviews && !profile.hasUGC && !profile.hasReferralProgram) {
    leaks.push(leak(
      "NO_PARTICIPATION_CAPTURE", 82,
      "Customers are buying, but nothing is capturing that transaction as a community action. Every order is a missed opportunity to pull someone into the loop.",
      ids, urls,
      "Launch a first participation loop — a verified review challenge, preference capture, or referral invite — before adding more reward complexity.",
      "ZERO_PARTY_PREFERENCE_CHALLENGE"
    ));
  }

  if (profile.hasLoyaltyProgram && isPointsOnlyLeak(profile, text)) {
    leaks.push(leak(
      "POINTS_ONLY_LOYALTY", 78,
      "The loyalty program earns points for purchases, but points alone don't generate community — they generate expectations of discounts. Members are waiting for the next redemption, not participating.",
      ids, urls,
      "Migrate VIP tier value toward verified behaviors: reviews, referrals, preference completion, and community challenges.",
      "VIP_TIER_MIGRATION"
    ));
  }

  if (matchesAny(text, ["discount", "% off", "coupon", "promo code", "clearance", "sale"])) {
    leaks.push(leak(
      "DISCOUNT_HEAVY_RETENTION", 86,
      "When discount language dominates retention touchpoints, the brand is training customers to wait for the next sale instead of staying for the community. This is subsidized retention, not earned loyalty.",
      ids, urls,
      "Replace at least one discount retention touchpoint with a participation-triggered reward — a challenge completion or referral unlock.",
      "REVIEW_TO_REFERRAL_CHALLENGE"
    ));
  }

  if (profile.hasReviews && !profile.hasReferralProgram && !profile.hasLoyaltyProgram) {
    leaks.push(leak(
      "REVIEWS_ISOLATED_FROM_REWARDS", 66,
      "Reviews are being collected but not creating anything downstream — no referrals, no loyalty credit, no community advocacy. Each verified review is wasted advocacy potential.",
      ids, urls,
      "Connect verified reviews to a referral challenge so each review creates downstream advocacy, not just social proof.",
      "REVIEW_TO_REFERRAL_CHALLENGE"
    ));
  }

  if ((profile.hasUGC || socialScore(profile) >= 70) && !matchesAny(text, ["verified ugc", "purchase verified", "verified creator", "verified customer"])) {
    leaks.push(leak(
      "UGC_NOT_VERIFIED", 62,
      "Social content is being created around this brand, but there's no visible mechanism to verify that creators are actual customers or members. Unverified UGC is brand marketing, not community data.",
      ids, urls,
      "Require verified purchase or member record before UGC is rewarded, so social participation creates owned community data.",
      "UGC_SOCIAL_CHALLENGE"
    ));
  }

  if (!profile.hasReferralProgram && (profile.hasReviews || profile.hasUGC || socialScore(profile) >= 65)) {
    leaks.push(leak(
      "WEAK_REFERRAL_LOOP", 58,
      "Advocacy signals are visible — customers are posting, reviewing, and recommending — but there's no structured referral loop to capture and reward that behavior. Organic advocacy is leaking out of the funnel.",
      ids, urls,
      "Run a time-boxed referral challenge for reviewers and UGC creators — the highest-intent customers are the best referrers.",
      "REVIEW_TO_REFERRAL_CHALLENGE"
    ));
  }

  if (profile.hasSubscription && !matchesAny(text, ["subscription reward", "subscriber reward", "renewal reward", "subscriber perk"])) {
    leaks.push(leak(
      "NO_SUBSCRIPTION_REWARD_SERIES", 60,
      "Subscribers are the brand's highest-intent customers, but their subscription journey appears unrewarded beyond the product itself. Renewal, streak, and preference milestones are a missed participation surface.",
      ids, urls,
      "Create a subscriber reward series: renewal streak rewards, preference completion bonuses, and early-access perks tied to subscription tenure.",
      "SUBSCRIPTION_REWARD_SERIES"
    ));
  }

  if (!matchesAny(text, ["quiz", "preference", "profile", "survey", "zero-party", "zero party"])) {
    leaks.push(leak(
      "NO_ZERO_PARTY_DATA_LOOP", 54,
      "No preference capture loop is visible. Without declared customer intent — routines, goals, flavor preferences — the brand can't personalize community actions or rewards in a meaningful way.",
      ids, urls,
      "Launch a preference or routine challenge that earns rewards for completion — this builds personalization data while driving participation.",
      "ZERO_PARTY_PREFERENCE_CHALLENGE"
    ));
  }

  if (profile.hasRetailPresence && !matchesAny(text, ["receipt", "upload", "scan receipt", "retail reward"])) {
    leaks.push(leak(
      "RETAIL_NOT_CONNECTED_TO_DTC", 64,
      "Retail buyers are purchasing the product but are invisible to the brand's owned community. Without a receipt upload or similar bridge, retail volume doesn't contribute to the flywheel.",
      ids, urls,
      "Launch receipt upload rewards to convert retail buyers into owned community members with verifiable purchase history.",
      "RECEIPT_UPLOAD_RETAIL_TO_DTC"
    ));
  }

  if (socialScore(profile) >= 70 && !profile.hasLoyaltyProgram && !profile.hasReferralProgram) {
    leaks.push(leak(
      "SOCIAL_COMMUNITY_NOT_OWNED", 70,
      "There's active social engagement around this brand, but it's not being captured into owned profiles or reward loops. Social followers and engagement are platform-dependent — not assets the brand controls.",
      ids, urls,
      "Capture social engagement into owned member profiles through a UGC challenge that requires sign-up and purchase verification.",
      "UGC_SOCIAL_CHALLENGE"
    ));
  }

  // If a competitor loyalty tool is detected, strengthen the points-only leak signal —
  // most mid-tier loyalty tools default to points-only configurations.
  if (detections.some((d) => normalizeText(d.category, d.vendor).includes("loyalty"))) {
    const pointsLeak = leaks.find((item) => item.leakType === "POINTS_ONLY_LOYALTY");
    if (pointsLeak) {
      pointsLeak.severity = clampScore(pointsLeak.severity + 6);
    }
  }

  return leaks.sort((left, right) => right.severity - left.severity).slice(0, 6);
}

// ─── Play recommendations ────────────────────────────────────────────────────

export function recommendCommunityFlywheelPlays(
  profile: RediemBrandProfileInput,
  leaks: CommunityFlywheelLeakEstimate[] = [],
  signals: RediemSignalInput[] = []
): CommunityFlywheelPlayEstimate[] {
  const plays = new Map<CommunityFlywheelPlayType, CommunityFlywheelPlayEstimate>();
  const signalText = normalizeText(...signals.map((s) => `${s.title ?? ""} ${s.description ?? ""}`));

  for (const currentLeak of leaks) {
    const candidate = playForLeak(currentLeak, profile);
    upsertPlay(plays, candidate);
  }

  if (matchesAny(signalText, ["launch", "drop", "limited edition", "new product"])) {
    upsertPlay(plays, {
      playType: "PRODUCT_DROP_PARTICIPATION_CAMPAIGN",
      title: "Product drop participation campaign",
      description: "Use product-drop attention to reward verified community participation instead of only discount-driven conversion.",
      targetBehavior: "Join, share, review, or refer around a product drop.",
      expectedCfrImpact: 0.25,
      expectedTimeToImpact: "2–4 weeks",
      confidence: 0.62,
      evidenceIds: []
    });
  }

  if (profile.sustainabilityAngle || profile.missionDrivenAngle) {
    upsertPlay(plays, {
      playType: "SUSTAINABILITY_OR_MISSION_CHALLENGE",
      title: "Mission-led community challenge",
      description: "Use the brand mission as a participation prompt that earns community growth without relying only on discounts.",
      targetBehavior: "Submit mission-aligned actions, stories, or preferences.",
      expectedCfrImpact: 0.2,
      expectedTimeToImpact: "3–6 weeks",
      confidence: 0.58,
      evidenceIds: []
    });
  }

  return [...plays.values()]
    .sort((left, right) => right.confidence - left.confidence || right.expectedCfrImpact - left.expectedCfrImpact)
    .slice(0, 5);
}

// ─── Explanation (plain-language narrative for CS reporting) ──────────────────

export function explainCfr(
  snapshot: Pick<
    CommunityFlywheelSnapshotEstimate,
    | "mode"
    | "estimatedCfr"
    | "cfrConfidence"
    | "cfrTier"
    | "primaryLeak"
    | "recommendedPlay"
  >
): string[] {
  const lines: string[] = [];

  lines.push(describeFlywheelTier(snapshot.cfrTier, snapshot.estimatedCfr));

  const confidencePct = Math.round(snapshot.cfrConfidence * 100);
  const modeNote =
    snapshot.mode === "prospecting"
      ? "This is a prospecting estimate from publicly visible signals, not internal analytics."
      : "Based on platform participation data for this reporting period.";
  lines.push(`Confidence: ${confidencePct}%. ${modeNote}`);

  if (snapshot.primaryLeak) {
    lines.push(`The highest-priority growth leak is ${formatLeakName(snapshot.primaryLeak)}.`);
  }

  if (snapshot.recommendedPlay) {
    lines.push(`The recommended first play is ${formatPlayName(snapshot.recommendedPlay)}.`);
  }

  return lines;
}

function describeFlywheelTier(tier: CfrTier, cfr: number): string {
  switch (tier) {
    case "Transactional Trap":
      return `At CFR ${cfr}, growth is primarily subsidized through discounts and paid acquisition. Community participation isn't creating organic pull yet — each sale needs to be bought rather than earned.`;
    case "Emerging Community Loop":
      return `At CFR ${cfr}, early community behaviors are visible but subsidized growth still dominates. The flywheel is starting to turn, but not yet generating enough organic momentum to reduce dependence on paid and discounted acquisition.`;
    case "Healthy Community Flywheel":
      return `At CFR ${cfr}, earned community growth is outpacing subsidized transactional growth. The flywheel is working. There are likely specific leaks limiting how fast it compounds — closing them would move the ratio further in the earned direction.`;
    case "Iconic Brand Flywheel":
      return `At CFR ${cfr}, community participation is generating substantially more organic growth than the brand is subsidizing. This is a strong flywheel — the strategic priority is identifying what keeps it compounding, not just what started it.`;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function playForLeak(
  currentLeak: CommunityFlywheelLeakEstimate,
  profile: RediemBrandProfileInput
): CommunityFlywheelPlayEstimate {
  const confidence = clampConfidence(
    0.45 +
      currentLeak.severity / 250 +
      (currentLeak.evidenceIds.length > 0 || currentLeak.sourceUrls.length > 0 ? 0.08 : 0)
  );
  const ids = currentLeak.evidenceIds;

  switch (currentLeak.leakType) {
    case "POINTS_ONLY_LOYALTY":
      return play("VIP_TIER_MIGRATION",
        "VIP tier migration",
        "Move loyalty value from points-only earning toward community participation tiers.",
        "Complete reviews, referrals, UGC, and profile actions to unlock status.",
        0.34, "4–8 weeks", confidence, ids);

    case "DISCOUNT_HEAVY_RETENTION":
    case "REVIEWS_ISOLATED_FROM_REWARDS":
    case "WEAK_REFERRAL_LOOP":
      return play("REVIEW_TO_REFERRAL_CHALLENGE",
        "Review-to-referral challenge",
        "Replace some discount prompts with verified reviews that unlock referral challenges.",
        "Write a verified review and invite a similar customer.",
        0.3, "3–6 weeks", confidence, ids);

    case "UGC_NOT_VERIFIED":
    case "SOCIAL_COMMUNITY_NOT_OWNED":
      return play("UGC_SOCIAL_CHALLENGE",
        "Verified UGC social challenge",
        "Turn social energy into owned, verified community participation.",
        "Create social content tied to a verified member or purchase record.",
        0.27, "3–6 weeks", confidence, ids);

    case "NO_SUBSCRIPTION_REWARD_SERIES":
      return play("SUBSCRIPTION_REWARD_SERIES",
        "Subscription reward series",
        "Reward renewal, streak, and preference behaviors so subscription value is less discount-led.",
        "Renew, review, refer, or complete preferences as a subscriber.",
        0.26, "4–8 weeks", confidence, ids);

    case "RETAIL_NOT_CONNECTED_TO_DTC":
      return play("RECEIPT_UPLOAD_RETAIL_TO_DTC",
        "Receipt upload retail-to-DTC bridge",
        "Convert retail buyers into owned community members through receipt verification.",
        "Upload a receipt, join the community, and unlock DTC rewards.",
        0.31, "3–6 weeks", confidence, ids);

    case "NO_ZERO_PARTY_DATA_LOOP":
      return play("ZERO_PARTY_PREFERENCE_CHALLENGE",
        "Zero-party preference challenge",
        "Collect declared customer preferences in exchange for personalized community incentives.",
        "Complete a preference, routine, taste, or style profile.",
        0.22, "2–4 weeks", confidence, ids);

    case "NO_PARTICIPATION_CAPTURE":
      return play(
        profile.hasReviews ? "REVIEW_TO_REFERRAL_CHALLENGE" : "ZERO_PARTY_PREFERENCE_CHALLENGE",
        profile.hasReviews ? "Review-to-referral challenge" : "Preference capture challenge",
        profile.hasReviews
          ? "Use existing review behavior as the first participation loop."
          : "Start by capturing declared preferences before asking for bigger advocacy behaviors.",
        profile.hasReviews
          ? "Submit a verified review and invite a friend."
          : "Complete a preference profile and join the brand community.",
        0.24, "2–6 weeks", confidence, ids);
  }
}

function leak(
  leakType: CommunityFlywheelLeakType,
  severity: number,
  description: string,
  evidenceIds: string[],
  sourceUrls: string[],
  recommendedFix: string,
  recommendedPlayType: CommunityFlywheelPlayType
): CommunityFlywheelLeakEstimate {
  return { leakType, severity: roundScore(severity), description, evidenceIds, sourceUrls, recommendedFix, recommendedPlayType };
}

function play(
  playType: CommunityFlywheelPlayType,
  title: string,
  description: string,
  targetBehavior: string,
  expectedCfrImpact: number,
  expectedTimeToImpact: string,
  confidence: number,
  evidenceIds: string[]
): CommunityFlywheelPlayEstimate {
  return { playType, title, description, targetBehavior, expectedCfrImpact, expectedTimeToImpact, confidence: roundConfidence(confidence), evidenceIds };
}

function upsertPlay(
  plays: Map<CommunityFlywheelPlayType, CommunityFlywheelPlayEstimate>,
  next: CommunityFlywheelPlayEstimate
) {
  const existing = plays.get(next.playType);
  if (!existing || next.confidence > existing.confidence) {
    plays.set(next.playType, next);
  }
}

// ─── Confidence estimation ────────────────────────────────────────────────────

function estimateCfrConfidence(
  mode: CfrMode,
  profile: RediemBrandProfileInput,
  signals: RediemSignalInput[],
  detections: RediemCompetitorToolDetectionInput[],
  evidence: CommunityFlywheelEvidenceInput[]
): number {
  const profileFields = [
    profile.ecommercePlatform,
    profile.shopifyDetected,
    profile.brandCategory,
    profile.hasSubscription,
    profile.hasLoyaltyProgram,
    profile.loyaltyProgramType,
    profile.hasReferralProgram,
    profile.hasReviews,
    profile.hasUGC,
    profile.socialCommunityScore,
    profile.hasRetailPresence
  ];
  const profileCoverage =
    profileFields.filter((v) => v !== null && v !== undefined && v !== "").length /
    profileFields.length;

  const evidenceCoverage = Math.min(1, evidence.filter((e) => e.sourceUrl || e.rawExcerpt).length / 6);
  const detectionCoverage = Math.min(1, detections.length / 4);
  const signalCoverage = Math.min(1, signals.length / 4);

  let confidence =
    0.18 +
    profileCoverage * 0.36 +
    evidenceCoverage * 0.24 +
    detectionCoverage * 0.1 +
    signalCoverage * 0.08;

  // Without confirmed ecommerce infrastructure, the whole profile is speculative.
  if (!hasEcommerce(profile)) {
    confidence = Math.min(confidence, 0.34);
  }

  // Prospecting estimates are fundamentally limited by the quality of public signals.
  if (mode === "prospecting") {
    confidence = Math.min(confidence, 0.65);
  }

  return roundConfidence(confidence);
}

// ─── Text and context helpers ─────────────────────────────────────────────────

type TextContext = {
  text: string;
  evidenceIds: string[];
  sourceUrls: string[];
};

function buildTextContext(
  signals: RediemSignalInput[],
  evidence: CommunityFlywheelEvidenceInput[]
): TextContext {
  return {
    text: normalizeText(
      ...signals.map((s) => `${s.type ?? ""} ${s.title ?? ""} ${s.description ?? ""}`),
      ...evidence.map((e) => `${e.fieldName ?? ""} ${e.value ?? ""} ${e.rawExcerpt ?? ""}`)
    ),
    evidenceIds: uniqueStrings(evidence.map((e) => e.id).filter(Boolean)),
    sourceUrls: uniqueStrings(
      [...signals.map((s) => s.sourceUrl), ...evidence.map((e) => e.sourceUrl)].filter(Boolean)
    )
  };
}

// ─── Scoring primitives ───────────────────────────────────────────────────────

function weightedAverage(values: Array<[number, number]>) {
  const totalWeight = values.reduce((sum, [, w]) => sum + w, 0);
  return roundScore(values.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight);
}

function boolScore(value: boolean | null | undefined, score: number): number {
  return value ? score : 0;
}

function textScore(text: string, terms: string[], score: number): number {
  return terms.some((term) => text.includes(term)) ? score : 0;
}

function matchesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function socialScore(profile: RediemBrandProfileInput): number {
  return profile.socialCommunityScore ?? (profile.instagramUrl || profile.tiktokUrl ? 55 : 25);
}

function repeatPurchaseCategoryScore(profile: RediemBrandProfileInput): number {
  const category = normalizeText(profile.brandCategory, profile.productCategory);
  if (matchesAny(category, ["beauty", "beverage", "wellness", "food", "pets", "supplement"])) return 82;
  if (matchesAny(category, ["apparel", "home"])) return 62;
  return 42;
}

function hasEcommerce(profile: RediemBrandProfileInput): boolean {
  return Boolean(
    profile.shopifyDetected ||
      profile.shopifyPlusLikely ||
      (profile.ecommercePlatformScore ?? 0) >= 50 ||
      profile.ecommercePlatform
  );
}

// A program is "points only" if it earns points (or uses monetary redemption language)
// without any behavioral/community actions. We check both profile fields AND the text
// context because profile.loyaltyProgramType is often null in prospecting.
function isPointsOnly(profile: RediemBrandProfileInput, text: string = ""): boolean {
  const profileText = normalizeText(profile.loyaltyProvider, profile.loyaltyProgramType);
  const combined = profileText + " " + text;
  const hasPointsLanguage =
    combined.includes("points") ||
    combined.includes("earn points") ||
    combined.includes("cash back") ||
    combined.includes("store credit");
  const hasCommunityLanguage = matchesAny(combined, [
    "challenge", "community", "ugc", "referral", "mission", "quiz", "creator"
  ]);
  return hasPointsLanguage && !hasCommunityLanguage;
}

function isPointsOnlyLeak(profile: RediemBrandProfileInput, text: string = ""): boolean {
  const profileText = normalizeText(profile.loyaltyProvider, profile.loyaltyProgramType);
  if (matchesAny(profileText, ["challenge", "community", "ugc", "referral", "mission", "quiz", "creator"])) {
    return false;
  }

  return (
    isPointsOnly(profile, text) ||
    (
      profileText.includes("points") &&
      !profile.hasUGC &&
      !profile.hasReferralProgram
    )
  );
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatLeakName(leakType: CommunityFlywheelLeakType): string {
  const names: Record<CommunityFlywheelLeakType, string> = {
    NO_PARTICIPATION_CAPTURE: "no participation capture loop",
    POINTS_ONLY_LOYALTY: "points-only loyalty with no community behaviors",
    DISCOUNT_HEAVY_RETENTION: "discount-heavy retention",
    REVIEWS_ISOLATED_FROM_REWARDS: "reviews not connected to rewards or referrals",
    UGC_NOT_VERIFIED: "unverified UGC",
    WEAK_REFERRAL_LOOP: "weak referral loop",
    NO_SUBSCRIPTION_REWARD_SERIES: "no subscriber reward series",
    NO_ZERO_PARTY_DATA_LOOP: "no zero-party preference capture",
    RETAIL_NOT_CONNECTED_TO_DTC: "retail buyers disconnected from DTC",
    SOCIAL_COMMUNITY_NOT_OWNED: "social community not owned through loyalty or referral"
  };
  return names[leakType];
}

function formatPlayName(playType: CommunityFlywheelPlayType): string {
  const names: Record<CommunityFlywheelPlayType, string> = {
    REVIEW_TO_REFERRAL_CHALLENGE: "review-to-referral challenge",
    SUBSCRIPTION_REWARD_SERIES: "subscription reward series",
    UGC_SOCIAL_CHALLENGE: "verified UGC social challenge",
    RECEIPT_UPLOAD_RETAIL_TO_DTC: "receipt upload retail-to-DTC bridge",
    ZERO_PARTY_PREFERENCE_CHALLENGE: "zero-party preference challenge",
    VIP_TIER_MIGRATION: "VIP tier migration",
    PRODUCT_DROP_PARTICIPATION_CAMPAIGN: "product drop participation campaign",
    SUSTAINABILITY_OR_MISSION_CHALLENGE: "mission-led community challenge"
  };
  return names[playType];
}

// ─── Math utilities ───────────────────────────────────────────────────────────

function normalizeText(...values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value));
}

function clampConfidence(value: number): number {
  return Math.max(0.05, Math.min(0.95, value));
}

function roundConfidence(value: number): number {
  return Math.round(clampConfidence(value) * 100) / 100;
}

function roundCfr(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}
