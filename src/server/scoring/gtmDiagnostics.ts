import type {
  CommunityFlywheelEvidenceInput,
  CommunityFlywheelPlayType
} from "./communityFlywheel";
import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "./rediem";

export type GtmDiagnosticMetricId =
  | "PCG"
  | "RCBI"
  | "MAR"
  | "UVG"
  | "DDR"
  | "ZPDD"
  | "PDPS"
  | "SFI"
  | "OCCS";

export type GtmDiagnosticTier = "Low" | "Moderate" | "High" | "Priority";

export type GtmDiagnosticScore = {
  metricId: GtmDiagnosticMetricId;
  label: string;
  score: number;
  confidence: number;
  tier: GtmDiagnosticTier;
  explanation: string;
  sourceEvidenceIds: string[];
  sourceUrls: string[];
  recommendedPlayTypes: CommunityFlywheelPlayType[];
  buyerPersonas: string[];
  outboundAngle: string;
};

export type GtmDiagnosticInput = {
  profile: RediemBrandProfileInput;
  signals?: RediemSignalInput[];
  detections?: RediemCompetitorToolDetectionInput[];
  evidence?: CommunityFlywheelEvidenceInput[];
};

type DiagnosticContext = {
  input: Required<GtmDiagnosticInput>;
  text: string;
  profileText: string;
  signalText: string;
  detectionText: string;
  evidenceText: string;
  baseConfidence: number;
};

type WeightedScoreInput = Array<[number, number]>;

const PLAY = {
  REVIEW_TO_REFERRAL_CHALLENGE: "REVIEW_TO_REFERRAL_CHALLENGE",
  SUBSCRIPTION_REWARD_SERIES: "SUBSCRIPTION_REWARD_SERIES",
  UGC_SOCIAL_CHALLENGE: "UGC_SOCIAL_CHALLENGE",
  RECEIPT_UPLOAD_RETAIL_TO_DTC: "RECEIPT_UPLOAD_RETAIL_TO_DTC",
  ZERO_PARTY_PREFERENCE_CHALLENGE: "ZERO_PARTY_PREFERENCE_CHALLENGE",
  VIP_TIER_MIGRATION: "VIP_TIER_MIGRATION",
  PRODUCT_DROP_PARTICIPATION_CAMPAIGN: "PRODUCT_DROP_PARTICIPATION_CAMPAIGN",
  SUSTAINABILITY_OR_MISSION_CHALLENGE: "SUSTAINABILITY_OR_MISSION_CHALLENGE"
} satisfies Record<CommunityFlywheelPlayType, CommunityFlywheelPlayType>;

const KEYWORDS = {
  participation: [
    "review", "verified review", "ugc", "user generated", "creator", "ambassador",
    "affiliate", "refer", "referral", "subscription", "subscribe", "replenish",
    "community", "challenge", "mission", "retail", "receipt", "drop", "launch"
  ],
  ownedCapture: [
    "member", "membership", "member profile", "account", "profile", "loyalty program",
    "reward account", "vip", "tier", "receipt upload", "scan receipt", "preference",
    "quiz", "referral program", "verified customer", "verified member", "purchase verified"
  ],
  retail: [
    "retail", "retailer", "store locator", "find us in store", "whole foods",
    "target", "walmart", "cvs", "walgreens", "sprouts", "kroger", "ulta",
    "sephora", "amazon", "marketplace", "wholesale", "omnichannel", "receipt",
    "scan receipt", "upload receipt", "cart", "in-store"
  ],
  mission: [
    "mission", "sustainable", "sustainability", "impact", "giveback", "give back",
    "wellness", "clean", "climate", "plastic", "recycle", "refill", "science",
    "clinical", "education", "ingredient", "values", "community impact"
  ],
  action: [
    "challenge", "pledge", "submit", "upload", "join", "complete", "quiz",
    "survey", "profile", "refer", "review", "vote", "share", "scan", "recycle",
    "refill", "mission reward", "community action"
  ],
  ugc: [
    "ugc", "user generated", "tag us", "creator", "ambassador", "affiliate",
    "influencer", "tiktok", "instagram", "social", "share your", "community"
  ],
  verification: [
    "verified", "verified customer", "verified buyer", "verified member",
    "purchase verified", "receipt upload", "scan receipt", "member-only",
    "member only", "account required"
  ],
  discount: [
    "discount", "% off", "percent off", "coupon", "promo", "promo code", "sale",
    "clearance", "cash back", "cashback", "store credit", "dollars off",
    "first order", "first purchase", "winback", "reactivation"
  ],
  participationReward: [
    "challenge", "refer", "referral", "review", "ugc", "creator", "ambassador",
    "preference", "profile", "quiz", "receipt", "mission", "vip", "tier",
    "subscriber reward", "renewal reward", "community reward"
  ],
  zeroParty: [
    "quiz", "preference", "preferences", "survey", "poll", "profile", "routine",
    "goal", "skin type", "hair type", "flavor", "taste", "style", "size",
    "fit finder", "personalization", "zero-party", "zero party", "recommendation"
  ],
  drop: [
    "product drop", "drop", "launch", "limited edition", "limited", "early access",
    "seasonal", "new flavor", "flavor drop", "collab", "collaboration", "restock",
    "waitlist", "exclusive", "scavenger hunt", "hunt"
  ],
  stack: [
    "loyalty", "reviews", "review", "sms", "email", "subscription", "helpdesk",
    "referral", "ecommerce", "shopify", "klaviyo", "attentive", "recharge",
    "okendo", "loyaltylion", "yotpo", "gorgias", "zendesk", "smile"
  ]
} as const;

export function calculateGtmDiagnostics(input: GtmDiagnosticInput): GtmDiagnosticScore[] {
  return [
    calculateParticipationCaptureGap(input),
    calculateRetailToCommunityBridgeIndex(input),
    calculateMissionToActionRatio(input),
    calculateUgcVerificationGap(input),
    calculateDiscountDependenceRatio(input),
    calculateZeroPartyDataDepth(input),
    calculateProductDropParticipationScore(input),
    calculateStackFragmentationIndex(input),
    calculateOwnedCommunityConversionScore(input)
  ];
}

export function calculateParticipationCaptureGap(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const visibleParticipation = clampScore(
    boolScore(input.profile.hasReviews, 18) +
      boolScore(input.profile.hasUGC, 18) +
      boolScore(input.profile.hasReferralProgram, 12) +
      boolScore(input.profile.hasSubscription, 12) +
      boolScore(input.profile.hasRetailPresence, 12) +
      socialScore(input.profile) * 0.2 +
      textScore(context.text, KEYWORDS.participation, 28) +
      missionPresenceScore(input.profile, context) * 0.35
  );
  const ownedCapture = ownedCaptureScore(input.profile, context);
  const score = clampScore(
    opportunityGapScore(visibleParticipation, ownedCapture, context.baseConfidence) +
      (isPointsLed(input.profile, context) ? 12 : 0)
  );

  return buildScore(context, {
    metricId: "PCG",
    label: "Participation Capture Gap",
    rawScore: score,
    keywords: [...KEYWORDS.participation, ...KEYWORDS.ownedCapture],
    recommendedPlayTypes: [
      PLAY.VIP_TIER_MIGRATION,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE,
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE,
      PLAY.UGC_SOCIAL_CHALLENGE
    ],
    buyerPersonas: ["Director of Retention", "Loyalty Manager", "Head of Community", "VP Customer Experience", "CRM Lead"],
    explanation: `Visible participation demand is estimated at ${roundScore(visibleParticipation)} while owned participation capture is estimated at ${roundScore(ownedCapture)}. This is a public-signal estimate, not a measured customer conversion gap.`,
    outboundAngle: "Customers appear to be participating across reviews, social, retail, or subscriptions, but the owned capture path looks thinner than the participation surface. Rediem can turn those behaviors into verified member actions and rewards."
  });
}

export function calculateRetailToCommunityBridgeIndex(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const retailPresence = clampScore(
    boolScore(input.profile.hasRetailPresence, 45) +
      textScore(context.text, KEYWORDS.retail, 45)
  );
  const ownedCommerceSurface = clampScore(
    boolScore(Boolean(input.profile.shopifyDetected || input.profile.ecommercePlatform), 30) +
      boolScore(input.profile.hasSubscription, 12) +
      boolScore(input.profile.hasLoyaltyProgram, 12) +
      textScore(context.text, ["dtc", "direct to consumer", "shop", "subscribe", "account", "member"], 20)
  );
  const participationProof = clampScore(
    boolScore(input.profile.hasReviews, 14) +
      boolScore(input.profile.hasUGC, 14) +
      boolScore(input.profile.hasReferralProgram, 12) +
      socialScore(input.profile) * 0.18 +
      textScore(context.text, ["review", "ugc", "refer", "community", "social proof"], 20)
  );
  const receiptBridge = textScore(context.text, ["receipt upload", "upload receipt", "scan receipt", "receipt", "retail reward", "proof of purchase"], 100);
  const rawScore = weightedAverage([
    [retailPresence, 0.35],
    [ownedCommerceSurface, 0.2],
    [participationProof, 0.25],
    [receiptBridge, 0.2]
  ]);

  return buildScore(context, {
    metricId: "RCBI",
    label: "Retail-to-Community Bridge Index",
    rawScore,
    keywords: KEYWORDS.retail,
    recommendedPlayTypes: [
      PLAY.RECEIPT_UPLOAD_RETAIL_TO_DTC,
      PLAY.SUBSCRIPTION_REWARD_SERIES,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE,
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE
    ],
    buyerPersonas: ["VP Ecommerce", "Chief Digital Officer", "Director of Retail Marketing", "CRM Lead", "Head of Omnichannel"],
    explanation: `Retail bridge readiness is estimated from retail presence (${retailPresence}), owned commerce surface (${ownedCommerceSurface}), participation proof (${participationProof}), and receipt bridge evidence (${receiptBridge}). No retail volume is inferred.`,
    outboundAngle: "Retail appears to create reach, but the public journey may not fully pull buyers into owned community. Rediem can use receipt verification to connect retail purchases to member profiles, rewards, and follow-on DTC actions."
  });
}

export function calculateMissionToActionRatio(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const missionIntensity = missionPresenceScore(input.profile, context);
  const actionDepth = clampScore(
    textScore(context.text, KEYWORDS.action, 55) +
      boolScore(input.profile.hasUGC, 10) +
      boolScore(input.profile.hasReferralProgram, 8) +
      boolScore(input.profile.hasLoyaltyProgram, 8) +
      textScore(context.text, ["mission reward", "impact challenge", "community challenge"], 25)
  );
  const rawScore = opportunityGapScore(missionIntensity, actionDepth, context.baseConfidence);

  return buildScore(context, {
    metricId: "MAR",
    label: "Mission-to-Action Ratio",
    rawScore,
    keywords: [...KEYWORDS.mission, ...KEYWORDS.action],
    recommendedPlayTypes: [
      PLAY.SUSTAINABILITY_OR_MISSION_CHALLENGE,
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE,
      PLAY.UGC_SOCIAL_CHALLENGE,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE
    ],
    buyerPersonas: ["CMO", "Brand Manager", "Head of Community", "VP Customer Experience", "Founder"],
    explanation: `Mission narrative intensity is estimated at ${missionIntensity}; visible mission-linked action depth is estimated at ${actionDepth}. The score rises when the mission is visible but customer action paths are weaker.`,
    outboundAngle: "The brand has visible mission or identity language, but the public customer journey gives people limited ways to act on it. Rediem can turn the mission into verified challenges, stories, preferences, and rewards."
  });
}

export function calculateUgcVerificationGap(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const ugcEnergy = clampScore(
    boolScore(input.profile.hasUGC, 35) +
      boolScore(Boolean(input.profile.instagramUrl || input.profile.tiktokUrl), 12) +
      socialScore(input.profile) * 0.28 +
      textScore(context.text, KEYWORDS.ugc, 32)
  );
  const verifiedCapture = clampScore(
    textScore(context.text, KEYWORDS.verification, 50) +
      boolScore(input.profile.hasLoyaltyProgram, 12) +
      boolScore(input.profile.hasReferralProgram, 10) +
      textScore(context.text, ["member profile", "account", "receipt"], 20)
  );
  const rawScore = opportunityGapScore(ugcEnergy, verifiedCapture, context.baseConfidence);

  return buildScore(context, {
    metricId: "UVG",
    label: "UGC Verification Gap",
    rawScore,
    keywords: [...KEYWORDS.ugc, ...KEYWORDS.verification],
    recommendedPlayTypes: [
      PLAY.UGC_SOCIAL_CHALLENGE,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE,
      PLAY.VIP_TIER_MIGRATION,
      PLAY.RECEIPT_UPLOAD_RETAIL_TO_DTC
    ],
    buyerPersonas: ["Head of Community", "Social Media Manager", "Influencer Manager", "VP Growth", "Director of Retention"],
    explanation: `Public UGC energy is estimated at ${ugcEnergy}; verified member or purchase capture is estimated at ${verifiedCapture}. Use this as a verification opportunity, not a claim about actual UGC volume.`,
    outboundAngle: "The brand has visible social or creator energy, but public evidence does not clearly show that content being verified against customer identity. Rediem can make UGC a verified participation loop."
  });
}

export function calculateDiscountDependenceRatio(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const discountPressure = clampScore(
    textScore(context.text, KEYWORDS.discount, 65) +
      (isPointsLed(input.profile, context) ? 18 : 0)
  );
  const participationRewardDepth = clampScore(
    textScore(context.text, KEYWORDS.participationReward, 45) +
      boolScore(input.profile.hasReferralProgram, 12) +
      boolScore(input.profile.hasUGC, 10) +
      boolScore(input.profile.hasReviews, 8) +
      boolScore(input.profile.hasSubscription, 8)
  );
  const rawScore = opportunityGapScore(discountPressure, participationRewardDepth, context.baseConfidence);

  return buildScore(context, {
    metricId: "DDR",
    label: "Discount Dependence Ratio",
    rawScore,
    keywords: [...KEYWORDS.discount, ...KEYWORDS.participationReward],
    recommendedPlayTypes: [
      PLAY.VIP_TIER_MIGRATION,
      PLAY.SUBSCRIPTION_REWARD_SERIES,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE,
      PLAY.PRODUCT_DROP_PARTICIPATION_CAMPAIGN
    ],
    buyerPersonas: ["Director of Retention", "VP Growth", "CMO", "Loyalty Manager", "Lifecycle Marketing Lead"],
    explanation: `Visible discount pressure is estimated at ${discountPressure}; participation reward depth is estimated at ${participationRewardDepth}. This does not infer margin, CAC, promo spend, or actual retention performance.`,
    outboundAngle: "The public retention motion appears more discount-led than participation-led. Rediem can keep incentives in the journey while moving more value behind verified reviews, referrals, preferences, status, and access."
  });
}

export function calculateZeroPartyDataDepth(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const breadth = clampScore(
    textScore(context.text, KEYWORDS.zeroParty, 70) +
      textScore(context.text, ["onboarding", "preference center", "account profile"], 18)
  );
  const specificity = textScore(context.text, ["routine", "goal", "skin type", "hair type", "flavor", "taste", "style", "size", "fit", "needs"], 100);
  const connection = clampScore(
    textScore(context.text, ["recommendation", "personalized", "reward", "challenge", "subscription preference", "profile completion", "early access", "waitlist", "member"], 60) +
      boolScore(input.profile.hasSubscription, 10) +
      boolScore(input.profile.hasLoyaltyProgram, 10)
  );
  const rawScore = weightedAverage([
    [breadth, 1],
    [specificity, 1],
    [connection, 1]
  ]);

  return buildScore(context, {
    metricId: "ZPDD",
    label: "Zero-Party Data Depth",
    rawScore,
    keywords: KEYWORDS.zeroParty,
    recommendedPlayTypes: [
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE,
      PLAY.SUBSCRIPTION_REWARD_SERIES,
      PLAY.SUSTAINABILITY_OR_MISSION_CHALLENGE,
      PLAY.VIP_TIER_MIGRATION
    ],
    buyerPersonas: ["CRM Lead", "Lifecycle Marketing Lead", "Director of Retention", "VP Customer Experience", "Ecommerce Manager"],
    explanation: `Preference capture breadth is estimated at ${breadth}, specificity at ${specificity}, and reward or personalization connection at ${connection}. The score reflects visible declared-data depth, not internal data storage.`,
    outboundAngle: "The brand has a natural preference story. Rediem can make preference capture a rewarded community action and use declared intent to personalize participation, rewards, referrals, and subscriptions."
  });
}

export function calculateProductDropParticipationScore(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const dropAttention = textScore(context.text, KEYWORDS.drop, 100);
  const ownedSignup = clampScore(
    textScore(context.text, ["waitlist", "early access", "member", "vip", "account", "join", "subscriber"], 45) +
      boolScore(input.profile.hasLoyaltyProgram, 10) +
      boolScore(input.profile.hasSubscription, 8)
  );
  const participationMechanics = textScore(context.text, ["share", "refer", "review", "ugc", "vote", "quiz", "challenge", "scavenger hunt"], 100);
  const postDropLoop = clampScore(
    textScore(context.text, ["review", "refer", "preference", "replenish", "restock", "subscribe", "community"], 45) +
      boolScore(input.profile.hasReviews, 8) +
      boolScore(input.profile.hasReferralProgram, 8)
  );
  const rawScore = weightedAverage([
    [dropAttention, 0.3],
    [ownedSignup, 0.25],
    [participationMechanics, 0.25],
    [postDropLoop, 0.2]
  ]);

  return buildScore(context, {
    metricId: "PDPS",
    label: "Product Drop Participation Score",
    rawScore,
    keywords: KEYWORDS.drop,
    recommendedPlayTypes: [
      PLAY.PRODUCT_DROP_PARTICIPATION_CAMPAIGN,
      PLAY.UGC_SOCIAL_CHALLENGE,
      PLAY.VIP_TIER_MIGRATION,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE
    ],
    buyerPersonas: ["VP Ecommerce", "VP Growth", "Brand Manager", "Head of Community", "CMO"],
    explanation: `Drop attention is estimated at ${dropAttention}; owned signup at ${ownedSignup}; participation mechanics at ${participationMechanics}; post-drop loop at ${postDropLoop}. No sell-through, waitlist size, or launch revenue is inferred.`,
    outboundAngle: "Launch attention appears available. Rediem can make each product drop a participation campaign by rewarding join, share, review, referral, vote, UGC, and preference actions."
  });
}

export function calculateStackFragmentationIndex(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const categories = detectedStackCategories(input, context);
  const disconnectedSurfaces = clampScore(categories.size * 16);
  const connectionEvidence = clampScore(
    textScore(context.text, ["unified profile", "member profile", "single profile", "connected rewards", "integration", "all in one", "community layer"], 45) +
      textScore(context.text, ["points", "review", "subscription", "sms", "email"], 12)
  );
  const rawScore = opportunityGapScore(disconnectedSurfaces, connectionEvidence, context.baseConfidence);

  return buildScore(context, {
    metricId: "SFI",
    label: "Stack Fragmentation Index",
    rawScore,
    keywords: KEYWORDS.stack,
    recommendedPlayTypes: [
      PLAY.VIP_TIER_MIGRATION,
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE,
      PLAY.RECEIPT_UPLOAD_RETAIL_TO_DTC,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE
    ],
    buyerPersonas: ["Chief Digital Officer", "VP Ecommerce", "Martech Lead", "Director of Digital Product", "CRM Lead"],
    explanation: `${categories.size} public participation stack categories were detected. The score reflects apparent fragmentation from public detections and does not claim exact internal architecture.`,
    outboundAngle: "The stack appears to capture useful behaviors in separate places: reviews, loyalty, subscriptions, messages, or referrals. Rediem can sit across those surfaces as the participation layer that makes the customer profile usable."
  });
}

export function calculateOwnedCommunityConversionScore(input: GtmDiagnosticInput): GtmDiagnosticScore {
  const context = createContext(input);
  const publicCommunityDemand = clampScore(
    boolScore(input.profile.hasReviews, 16) +
      boolScore(input.profile.hasUGC, 18) +
      boolScore(input.profile.hasSubscription, 10) +
      boolScore(input.profile.hasRetailPresence, 12) +
      boolScore(input.profile.hasReferralProgram, 10) +
      socialScore(input.profile) * 0.24 +
      textScore(context.text, [...KEYWORDS.ugc, ...KEYWORDS.retail, ...KEYWORDS.drop], 26)
  );
  const ownedConversionSurface = ownedCaptureScore(input.profile, context);
  const rawScore = opportunityGapScore(publicCommunityDemand, ownedConversionSurface, context.baseConfidence);

  return buildScore(context, {
    metricId: "OCCS",
    label: "Owned Community Conversion Score",
    rawScore,
    keywords: [...KEYWORDS.participation, ...KEYWORDS.ownedCapture],
    recommendedPlayTypes: [
      PLAY.UGC_SOCIAL_CHALLENGE,
      PLAY.RECEIPT_UPLOAD_RETAIL_TO_DTC,
      PLAY.REVIEW_TO_REFERRAL_CHALLENGE,
      PLAY.ZERO_PARTY_PREFERENCE_CHALLENGE,
      PLAY.PRODUCT_DROP_PARTICIPATION_CAMPAIGN
    ],
    buyerPersonas: ["VP Growth", "Head of Community", "Director of Retention", "CRM Lead", "VP Customer Experience"],
    explanation: `Public community demand is estimated at ${roundScore(publicCommunityDemand)} while owned conversion surface is estimated at ${roundScore(ownedConversionSurface)}. The score reflects visible conversion readiness, not actual conversion rate.`,
    outboundAngle: "The brand has public community energy, but the owned conversion path looks thinner than demand. Rediem can turn that attention into member profiles, verified actions, and repeatable participation."
  });
}

function buildScore(
  context: DiagnosticContext,
  params: {
    metricId: GtmDiagnosticMetricId;
    label: string;
    rawScore: number;
    keywords: readonly string[];
    explanation: string;
    recommendedPlayTypes: CommunityFlywheelPlayType[];
    buyerPersonas: string[];
    outboundAngle: string;
  }
): GtmDiagnosticScore {
  const confidence = confidenceForMetric(context, params.keywords);
  const score = capScoreForConfidence(params.rawScore, confidence);
  const sources = extractSources(context, params.keywords);

  return {
    metricId: params.metricId,
    label: params.label,
    score,
    confidence,
    tier: classifyDiagnosticTier(score),
    explanation: params.explanation,
    sourceEvidenceIds: sources.sourceEvidenceIds,
    sourceUrls: sources.sourceUrls,
    recommendedPlayTypes: unique(params.recommendedPlayTypes),
    buyerPersonas: unique(params.buyerPersonas),
    outboundAngle: params.outboundAngle
  };
}

function createContext(input: GtmDiagnosticInput): DiagnosticContext {
  const normalizedInput: Required<GtmDiagnosticInput> = {
    profile: input.profile,
    signals: input.signals ?? [],
    detections: input.detections ?? [],
    evidence: input.evidence ?? []
  };
  const profileText = profileToText(input.profile);
  const signalText = normalizeText(...normalizedInput.signals.map((signal) => `${signal.type ?? ""} ${signal.title ?? ""} ${signal.description ?? ""}`));
  const detectionText = normalizeText(...normalizedInput.detections.map((detection) => `${detection.category ?? ""} ${detection.vendor ?? ""} ${detection.evidence ?? ""}`));
  const evidenceText = normalizeText(...normalizedInput.evidence.map((item) => `${item.fieldName ?? ""} ${item.value ?? ""} ${item.rawExcerpt ?? ""}`));
  const text = normalizeText(profileText, signalText, detectionText, evidenceText);

  return {
    input: normalizedInput,
    text,
    profileText,
    signalText,
    detectionText,
    evidenceText,
    baseConfidence: estimateBaseConfidence(normalizedInput)
  };
}

function estimateBaseConfidence(input: Required<GtmDiagnosticInput>): number {
  const profileFields = [
    input.profile.ecommercePlatform,
    input.profile.shopifyDetected,
    input.profile.productCategory,
    input.profile.brandCategory,
    input.profile.hasSubscription,
    input.profile.hasLoyaltyProgram,
    input.profile.hasReferralProgram,
    input.profile.hasReviews,
    input.profile.hasUGC,
    input.profile.socialCommunityScore,
    input.profile.hasRetailPresence,
    input.profile.missionDrivenAngle,
    input.profile.sustainabilityAngle
  ];
  const profileCoverage = profileFields.filter((value) => value !== null && value !== undefined && value !== "").length / profileFields.length;
  const signalCoverage = Math.min(1, input.signals.length / 4);
  const detectionCoverage = Math.min(1, input.detections.length / 5);
  const evidenceCoverage = Math.min(1, input.evidence.filter((item) => item.sourceUrl || item.rawExcerpt || item.value).length / 6);

  return roundConfidence(
    0.16 +
      profileCoverage * 0.3 +
      signalCoverage * 0.16 +
      detectionCoverage * 0.16 +
      evidenceCoverage * 0.22
  );
}

function confidenceForMetric(context: DiagnosticContext, keywords: readonly string[]): number {
  const matchingSources = extractSources(context, keywords);
  const keywordSupport = matchesAny(context.text, keywords) ? 0.08 : 0;
  const sourceSupport = Math.min(0.14, (matchingSources.sourceEvidenceIds.length + matchingSources.sourceUrls.length) * 0.025);
  return roundConfidence(Math.min(0.72, context.baseConfidence + keywordSupport + sourceSupport));
}

function capScoreForConfidence(score: number, confidence: number): number {
  if (confidence < 0.28) return Math.min(roundScore(score), 35);
  if (confidence < 0.4) return Math.min(roundScore(score), 55);
  return roundScore(score);
}

function classifyDiagnosticTier(score: number): GtmDiagnosticTier {
  if (score >= 75) return "Priority";
  if (score >= 55) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

function opportunityGapScore(demand: number, capture: number, confidence: number): number {
  const demandScore = clampScore(demand);
  const captureScore = clampScore(capture);
  const gap = Math.max(0, demandScore - captureScore);
  const raw = demandScore * 0.55 + gap * 0.65;
  return capScoreForConfidence(raw, confidence);
}

function ownedCaptureScore(profile: RediemBrandProfileInput, context: DiagnosticContext): number {
  const pointsPenalty = isPointsLed(profile, context) && !profile.hasReferralProgram && !profile.hasUGC ? 24 : 0;
  return clampScore(
    boolScore(profile.hasLoyaltyProgram, 22) +
      boolScore(profile.hasReferralProgram, 16) +
      boolScore(profile.hasSubscription, 10) +
      textScore(context.text, KEYWORDS.ownedCapture, 38) +
      textScore(context.text, KEYWORDS.verification, 16) -
      pointsPenalty
  );
}

function missionPresenceScore(profile: RediemBrandProfileInput, context: DiagnosticContext): number {
  return clampScore(
    boolScore(Boolean(profile.missionDrivenAngle), 28) +
      boolScore(Boolean(profile.sustainabilityAngle), 24) +
      textScore(context.text, KEYWORDS.mission, 48)
  );
}

function detectedStackCategories(input: GtmDiagnosticInput, context: DiagnosticContext): Set<string> {
  const categories = new Set<string>();
  const text = context.text;

  for (const detection of input.detections ?? []) {
    if (detection.confidence != null && detection.confidence < 0.35) continue;
    const category = normalizeText(detection.category, detection.vendor);
    if (matchesAny(category, ["loyalty", "loyaltylion", "yotpo", "smile"])) categories.add("loyalty");
    if (matchesAny(category, ["review", "reviews", "okendo", "yotpo"])) categories.add("reviews");
    if (matchesAny(category, ["sms", "email", "klaviyo", "attentive"])) categories.add("messaging");
    if (matchesAny(category, ["subscription", "recharge", "skio"])) categories.add("subscription");
    if (matchesAny(category, ["helpdesk", "gorgias", "zendesk"])) categories.add("helpdesk");
    if (matchesAny(category, ["referral", "referrals"])) categories.add("referral");
    if (matchesAny(category, ["ecommerce", "shopify", "commerce"])) categories.add("ecommerce");
  }

  if (matchesAny(text, ["loyaltylion", "loyalty", "points", "vip"])) categories.add("loyalty");
  if (matchesAny(text, ["okendo", "review", "reviews"])) categories.add("reviews");
  if (matchesAny(text, ["klaviyo", "attentive", "sms", "email"])) categories.add("messaging");
  if (matchesAny(text, ["recharge", "subscription", "subscribe"])) categories.add("subscription");
  if (matchesAny(text, ["gorgias", "zendesk", "helpdesk"])) categories.add("helpdesk");
  if (matchesAny(text, ["referral", "refer"])) categories.add("referral");
  if (matchesAny(text, ["shopify", "ecommerce", "cart"])) categories.add("ecommerce");

  return categories;
}

function extractSources(context: DiagnosticContext, keywords: readonly string[]) {
  const sourceEvidenceIds: string[] = [];
  const sourceUrls: string[] = [];

  for (const item of context.input.evidence) {
    const text = normalizeText(item.fieldName, item.value, item.rawExcerpt);
    if (!matchesAny(text, keywords)) continue;
    if (item.id) sourceEvidenceIds.push(item.id);
    if (item.sourceUrl) sourceUrls.push(item.sourceUrl);
  }

  for (const signal of context.input.signals) {
    const text = normalizeText(signal.type, signal.title, signal.description);
    if (signal.sourceUrl && matchesAny(text, keywords)) sourceUrls.push(signal.sourceUrl);
  }

  for (const detection of context.input.detections) {
    const text = normalizeText(detection.category, detection.vendor, detection.evidence);
    if (detection.sourceUrl && matchesAny(text, keywords)) sourceUrls.push(detection.sourceUrl);
  }

  return {
    sourceEvidenceIds: unique(sourceEvidenceIds),
    sourceUrls: unique(sourceUrls)
  };
}

function profileToText(profile: RediemBrandProfileInput): string {
  return normalizeText(
    profile.ecommercePlatform,
    profile.productCategory,
    profile.brandCategory,
    profile.pricePoint,
    profile.targetCustomer,
    profile.subscriptionProvider,
    profile.loyaltyProvider,
    profile.loyaltyProgramUrl,
    profile.loyaltyProgramType,
    profile.reviewProvider,
    profile.instagramUrl,
    profile.tiktokUrl,
    profile.sustainabilityAngle,
    profile.missionDrivenAngle,
    profile.retailSignals == null ? "" : JSON.stringify(profile.retailSignals)
  );
}

function isPointsLed(profile: RediemBrandProfileInput, context: DiagnosticContext): boolean {
  return Boolean(profile.hasLoyaltyProgram) &&
    matchesAny(normalizeText(profile.loyaltyProvider, profile.loyaltyProgramType, context.text), ["points", "earn", "redeem", "cash back", "store credit"]);
}

function textScore(text: string, keywords: readonly string[], maxScore: number): number {
  const uniqueHits = keywords.filter((keyword) => text.includes(normalizeText(keyword))).length;
  if (uniqueHits === 0) return 0;
  const density = uniqueHits / Math.min(keywords.length, 5);
  return clampScore(Math.round(maxScore * Math.min(1, density)));
}

function boolScore(value: unknown, score: number): number {
  return value ? score : 0;
}

function socialScore(profile: RediemBrandProfileInput): number {
  return clampScore(
    (profile.socialCommunityScore ?? 0) +
      boolScore(profile.instagramUrl, 8) +
      boolScore(profile.tiktokUrl, 8)
  );
}

function weightedAverage(items: WeightedScoreInput): number {
  const totalWeight = items.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  return clampScore(items.reduce((sum, [value, weight]) => sum + clampScore(value) * weight, 0) / totalWeight);
}

function matchesAny(text: string, keywords: readonly string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function normalizeText(...values: Array<unknown>): string {
  return values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).toLowerCase())
    .join(" ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value));
}

function roundConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
