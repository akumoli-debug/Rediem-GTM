import type { ActivationIdeaType } from "@/generated/prisma/enums";

type EvidenceEntityType = "ACCOUNT" | "PERSON" | "SIGNAL" | "FORMULA_RESULT";

type BrandProfileRecord = {
  id?: string;
  workspaceId: string;
  accountId: string;
  ecommercePlatform?: string | null;
  shopifyDetected?: boolean | null;
  productCategory?: string | null;
  brandCategory?: string | null;
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
  retailSignals?: unknown;
  sustainabilityAngle?: string | null;
  missionDrivenAngle?: string | null;
  rediemFitScore?: number | null;
  loyaltyMaturityScore?: number | null;
  communityReadinessScore?: number | null;
  migrationPainScore?: number | null;
};

type SignalRecord = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  title: string;
  description?: string | null;
  totalScore?: number | null;
  sourceUrl?: string | null;
  createdAt?: Date;
};

type EvidenceRecord = {
  id: string;
  workspaceId: string;
  entityType: EvidenceEntityType;
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
  capturedAt?: Date;
  createdAt?: Date;
};

type CompetitorToolDetectionRecord = {
  id?: string;
  workspaceId: string;
  accountId: string;
  category: string;
  vendor: string;
  confidence?: number | null;
  sourceUrl?: string | null;
  evidence?: string | null;
};

type BrandActivationIdeaRecord = {
  id?: string;
  workspaceId: string;
  accountId: string;
  type: ActivationIdeaType;
  title: string;
  description: string;
  targetBehavior?: string | null;
  expectedImpact?: string | null;
  confidence?: number | null;
  evidenceIds?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RediemActivationIdeaType =
  | "review_reward_series"
  | "referral_challenge"
  | "subscription_renewal_series"
  | "ugc_social_challenge"
  | "receipt_upload_challenge"
  | "product_drop_loyalty_campaign"
  | "sustainability_or_mission_challenge"
  | "vip_tier_migration"
  | "retail_to_dtc_bridge"
  | "zero_party_preference_challenge";

export type GenerateRediemActivationIdeasInput = {
  workspaceId: string;
  accountId: string;
};

export type RediemActivationIdea = {
  title: string;
  type: RediemActivationIdeaType;
  targetBehavior: string;
  whyItFitsThisBrand: string;
  evidenceUsed: EvidenceRecord[];
  confidence: number;
  rediemValuePropAngle: string;
  suggestedOutboundOneLiner: string;
};

export type RediemActivationIdeaDossier = {
  accountId: string;
  ideas: RediemActivationIdea[];
};

export type GenerateRediemActivationIdeasClient = {
  brandProfile: {
    findFirst(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<BrandProfileRecord | null>;
  };
  signal: {
    findMany(args: {
      where: { workspaceId: string; accountId: string };
      orderBy?: { totalScore?: "asc" | "desc"; createdAt?: "asc" | "desc" };
      take?: number;
    }): Promise<SignalRecord[]>;
  };
  evidence: {
    findMany(args: {
      where: {
        workspaceId: string;
        entityType: EvidenceEntityType;
        entityId: string;
      };
      orderBy?: { confidence?: "asc" | "desc"; capturedAt?: "asc" | "desc" };
      take?: number;
    }): Promise<EvidenceRecord[]>;
  };
  competitorToolDetection: {
    findMany(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<CompetitorToolDetectionRecord[]>;
  };
  brandActivationIdea: {
    deleteMany(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<{ count: number }>;
    createMany(args: {
      data: Array<{
        workspaceId: string;
        accountId: string;
        type: ActivationIdeaType;
        title: string;
        description: string;
        targetBehavior: string;
        expectedImpact: string;
        confidence: number;
        evidenceIds: string[];
      }>;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: { workspaceId: string; accountId: string };
      orderBy?: { confidence?: "asc" | "desc"; createdAt?: "asc" | "desc" };
    }): Promise<BrandActivationIdeaRecord[]>;
  };
};

type IdeaCandidate = Omit<RediemActivationIdea, "evidenceUsed"> & {
  score: number;
  evidenceUsed: EvidenceRecord[];
};

export async function generateRediemActivationIdeas(
  client: GenerateRediemActivationIdeasClient,
  input: GenerateRediemActivationIdeasInput
): Promise<RediemActivationIdeaDossier> {
  const [profile, signals, evidence, detections] = await Promise.all([
    client.brandProfile.findFirst({
      where: { workspaceId: input.workspaceId, accountId: input.accountId }
    }),
    client.signal.findMany({
      where: { workspaceId: input.workspaceId, accountId: input.accountId },
      orderBy: { totalScore: "desc" },
      take: 20
    }),
    client.evidence.findMany({
      where: {
        workspaceId: input.workspaceId,
        entityType: "ACCOUNT",
        entityId: input.accountId
      },
      orderBy: { confidence: "desc" },
      take: 80
    }),
    client.competitorToolDetection.findMany({
      where: { workspaceId: input.workspaceId, accountId: input.accountId }
    })
  ]);

  if (!profile) {
    return { accountId: input.accountId, ideas: [] };
  }

  const candidates = buildIdeaCandidates({
    profile,
    signals,
    evidence,
    detections
  });
  const ideas = candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .filter((idea) => idea.confidence >= 0.25)
    .map(({ score: _score, ...idea }) => idea);

  await client.brandActivationIdea.deleteMany({
    where: { workspaceId: input.workspaceId, accountId: input.accountId }
  });

  if (ideas.length > 0) {
    await client.brandActivationIdea.createMany({
      data: ideas.map((idea) => ({
        workspaceId: input.workspaceId,
        accountId: input.accountId,
        type: toPrismaActivationType(idea.type),
        title: idea.title,
        description: [
          `Why it fits: ${idea.whyItFitsThisBrand}`,
          `Rediem angle: ${idea.rediemValuePropAngle}`,
          `Outbound one-liner: ${idea.suggestedOutboundOneLiner}`
        ].join("\n"),
        targetBehavior: idea.targetBehavior,
        expectedImpact: idea.rediemValuePropAngle,
        confidence: idea.confidence,
        evidenceIds: idea.evidenceUsed.map((item) => item.id)
      }))
    });
  }

  return {
    accountId: input.accountId,
    ideas
  };
}

function buildIdeaCandidates(input: {
  profile: BrandProfileRecord;
  signals: SignalRecord[];
  evidence: EvidenceRecord[];
  detections: CompetitorToolDetectionRecord[];
}): IdeaCandidate[] {
  const context = {
    ...input,
    evidenceByField: (fields: string[]) => evidenceForFields(input.evidence, fields),
    evidenceByText: (keywords: string[]) => evidenceForText(input.evidence, keywords),
    signalText: input.signals
      .map((signal) => `${signal.type} ${signal.title} ${signal.description ?? ""}`)
      .join(" ")
      .toLowerCase(),
    detectionText: input.detections
      .map((detection) => `${detection.category} ${detection.vendor} ${detection.evidence ?? ""}`)
      .join(" ")
      .toLowerCase()
  };
  const candidates = [
    reviewRewardSeries(context),
    referralChallenge(context),
    subscriptionRenewalSeries(context),
    ugcSocialChallenge(context),
    receiptUploadChallenge(context),
    productDropLoyaltyCampaign(context),
    sustainabilityMissionChallenge(context),
    vipTierMigration(context),
    retailToDtcBridge(context),
    zeroPartyPreferenceChallenge(context)
  ];

  return candidates.filter((candidate): candidate is IdeaCandidate => Boolean(candidate));
}

type CandidateContext = {
  profile: BrandProfileRecord;
  signals: SignalRecord[];
  evidence: EvidenceRecord[];
  detections: CompetitorToolDetectionRecord[];
  evidenceByField(fields: string[]): EvidenceRecord[];
  evidenceByText(keywords: string[]): EvidenceRecord[];
  signalText: string;
  detectionText: string;
};

function reviewRewardSeries(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasReviews) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasReviews", "brandProfile.reviewProvider"]),
    ...context.evidenceByText(["review", "stars"])
  ]);

  return idea({
    type: "review_reward_series",
    title: "Review reward series",
    targetBehavior: "Encourage verified buyers to leave product reviews after purchase.",
    whyItFitsThisBrand: `Reviews are already visible${context.profile.reviewProvider ? ` through ${context.profile.reviewProvider}` : ""}, so Rediem can turn review completion into a repeatable reward loop.`,
    rediemValuePropAngle: "Convert review collection into a loyalty action that builds social proof and richer customer profiles.",
    suggestedOutboundOneLiner: `Review requests aren't going away — making them a points-earning moment turns a passive ask into something${context.profile.reviewProvider ? ` ${context.profile.reviewProvider}` : " your"} members actually look forward to.`,
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, context.profile.reviewProvider ? 0.78 : 0.68),
    score: 87
  });
}

function referralChallenge(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasReferralProgram && !context.detectionText.includes("referral")) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasReferralProgram", "brandProfile.loyaltyProgramType"]),
    ...context.evidenceByText(["refer", "referral"])
  ]);

  return idea({
    type: "referral_challenge",
    title: "Referral challenge",
    targetBehavior: "Motivate loyal customers to invite friends with milestone rewards.",
    whyItFitsThisBrand: "Referral mechanics are already present, so a time-boxed challenge can give the program a clearer participation moment.",
    rediemValuePropAngle: "Layer community milestones and attribution-ready rewards onto an existing referral motion.",
    suggestedOutboundOneLiner: "Most referral programs go quiet after launch — a time-boxed challenge gives your customers a clear moment to share right now.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.72),
    score: 74
  });
}

function subscriptionRenewalSeries(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasSubscription) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasSubscription", "brandProfile.subscriptionProvider"]),
    ...context.evidenceByText(["subscription", "subscribe"])
  ]);

  return idea({
    type: "subscription_renewal_series",
    title: "Subscription renewal series",
    targetBehavior: "Reward subscribers for renewal, replenishment, quiz updates, and product education.",
    whyItFitsThisBrand: `A subscription motion is detected${context.profile.subscriptionProvider ? ` via ${context.profile.subscriptionProvider}` : ""}, which means repeat purchase behavior is already part of the customer journey.`,
    rediemValuePropAngle: "Use Rediem to make renewal moments participatory, measurable, and personalized.",
    suggestedOutboundOneLiner: "Renewals don't have to be silent — we can make each rebill feel like a loyalty milestone your members actually track.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.8),
    score: 86
  });
}

function ugcSocialChallenge(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasUGC && !context.profile.instagramUrl && !context.profile.tiktokUrl) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField([
      "brandProfile.hasUGC",
      "brandProfile.instagramUrl",
      "brandProfile.tiktokUrl",
      "brandProfile.socialCommunityScore"
    ]),
    ...context.evidenceByText(["ugc", "creator", "community", "instagram", "tiktok"])
  ]);

  const socialPlatforms = [
    context.profile.instagramUrl ? "Instagram" : null,
    context.profile.tiktokUrl ? "TikTok" : null
  ].filter(Boolean).join(" and ");
  const platformClause = socialPlatforms ? ` on ${socialPlatforms}` : "";

  return idea({
    type: "ugc_social_challenge",
    title: "UGC social challenge",
    targetBehavior: "Reward customers for posting tagged social content and sharing product-use stories.",
    whyItFitsThisBrand: `Community activity is already happening${platformClause} — a Rediem challenge gives that participation structure, attribution, and a path into an owned member profile.`,
    rediemValuePropAngle: "Turn social participation into a first-party community action with evidence and attribution.",
    suggestedOutboundOneLiner: `Your${socialPlatforms ? ` ${socialPlatforms}` : " social"} community is already posting — a challenge turns that into rewardable loyalty actions tied to a member profile.`,
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.78),
    score: 84
  });
}

function receiptUploadChallenge(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasRetailPresence) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasRetailPresence", "brandProfile.retailSignals"]),
    ...context.evidenceByText(["retail", "store locator", "stockist", "where to buy"])
  ]);

  return idea({
    type: "receipt_upload_challenge",
    title: "Receipt upload challenge",
    targetBehavior: "Reward retail buyers for uploading receipts and joining owned DTC journeys.",
    whyItFitsThisBrand: "Retail presence plus a DTC profile creates a concrete bridge from offline purchase to owned community.",
    rediemValuePropAngle: "Capture retail buyers, verify behavior, and convert them into reachable DTC members.",
    suggestedOutboundOneLiner: "Retail buyers are invisible to your CRM — receipt uploads turn a store purchase into a loyalty profile you actually own.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.76),
    score: 82
  });
}

function productDropLoyaltyCampaign(context: CandidateContext): IdeaCandidate | null {
  const hasDropSignal = matchesAny(context.signalText, ["drop", "launch", "limited edition", "new collection", "new flavor"]);
  // Without a real drop signal there's no timing hook — this idea is specifically about launch moments
  if (!hasDropSignal) return null;
  const hasLoyalty = Boolean(context.profile.hasLoyaltyProgram);
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasLoyaltyProgram", "brandProfile.loyaltyProgramUrl"]),
    ...context.evidenceByText(["drop", "launch", "limited edition", "new collection", "new flavor", "loyalty"]),
    ...signalsToEvidenceLike(context.signals, ["drop", "launch", "limited edition", "new collection", "new flavor"])
  ]);

  return idea({
    type: "product_drop_loyalty_campaign",
    title: "Product drop loyalty campaign",
    targetBehavior: "Reward members for product-drop actions like waitlist joins, early access, reviews, and social shares.",
    whyItFitsThisBrand: `A product launch or drop signal was detected — that's a high-intent moment${hasLoyalty ? " and an existing loyalty program means there are already members to activate" : " that Rediem can build a participation challenge around"}.`,
    rediemValuePropAngle: "Coordinate launch participation across loyalty, social, and post-purchase actions.",
    suggestedOutboundOneLiner: "Product launches are your highest-traffic moment — a Rediem challenge at launch turns that hype into loyalty data you can act on afterward.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, hasLoyalty ? 0.78 : 0.66),
    score: 81
  });
}

function sustainabilityMissionChallenge(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.sustainabilityAngle && !context.profile.missionDrivenAngle) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.sustainabilityAngle", "brandProfile.missionDrivenAngle"]),
    ...context.evidenceByText(["sustainable", "mission", "values", "repair", "refill", "give back"])
  ]);

  const angle = context.profile.sustainabilityAngle ?? context.profile.missionDrivenAngle ?? "sustainability or mission";

  return idea({
    type: "sustainability_or_mission_challenge",
    title: "Sustainability or mission challenge",
    targetBehavior: "Reward customers for mission-aligned actions such as refill, repair, education, donation, or pledge completion.",
    whyItFitsThisBrand: `"${angle}" is already part of the brand story — a Rediem challenge makes that participatory and measurable without replacing it with generic discounts.`,
    rediemValuePropAngle: "Make values-based behavior measurable and rewardable inside the loyalty experience.",
    suggestedOutboundOneLiner: "Sustainability copy on a website is table stakes — a Rediem challenge makes it something customers actually do and earn for.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.74),
    score: 76
  });
}

function vipTierMigration(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasLoyaltyProgram) return null;
  // Require explicit tier/points signals in the profile fields or in scraped evidence —
  // detectionText always contains "loyalty" from any LOYALTY detection, so it can't gate this
  const profileText = `${context.profile.loyaltyProgramType ?? ""} ${context.profile.loyaltyProvider ?? ""}`.toLowerCase();
  const hasTierOrPoints =
    matchesAny(profileText, ["points", "tier", "vip"]) ||
    context.evidenceByText(["points", "tier", "vip"]).length > 0;
  if (!hasTierOrPoints) return null;

  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField([
      "brandProfile.hasLoyaltyProgram",
      "brandProfile.loyaltyProvider",
      "brandProfile.loyaltyProgramType",
      "brandProfile.migrationPainScore"
    ]),
    ...context.evidenceByText(["points", "tier", "vip", "loyalty"])
  ]);
  const providerNote = context.profile.loyaltyProvider ? ` (currently on ${context.profile.loyaltyProvider})` : "";

  return idea({
    type: "vip_tier_migration",
    title: "VIP tier migration",
    targetBehavior: "Move members from static points into status-based challenges and richer participation tiers.",
    whyItFitsThisBrand: `Points or VIP structure${providerNote} is already in place — the opportunity is upgrading participation mechanics, not rebuilding from zero.`,
    rediemValuePropAngle: "Give the team a migration story from legacy points to behavior-based community loyalty.",
    suggestedOutboundOneLiner: "Points programs cap out on engagement — behavior-based tiers give your top members something to actively work toward.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.8),
    score: 88
  });
}

function retailToDtcBridge(context: CandidateContext): IdeaCandidate | null {
  if (!context.profile.hasRetailPresence) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField(["brandProfile.hasRetailPresence", "brandProfile.retailSignals"]),
    ...context.evidenceByText(["retail", "stockist", "store locator", "where to buy"])
  ]);

  return idea({
    type: "retail_to_dtc_bridge",
    title: "Retail-to-DTC bridge",
    targetBehavior: "Convert retail shoppers into owned members through receipt validation, education, and follow-up rewards.",
    whyItFitsThisBrand: "Retail presence means a portion of buyers are purchasing outside any owned channel — those customers are currently untrackable and unreachable for loyalty or subscription upsells.",
    rediemValuePropAngle: "Bridge retail behavior into owned profiles, subscriptions, and community programs.",
    suggestedOutboundOneLiner: "You know units move through retail, but not who bought them — receipt validation gives you those names and gets them into your member base.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.74),
    score: 78
  });
}

function zeroPartyPreferenceChallenge(context: CandidateContext): IdeaCandidate | null {
  const hasEnoughProfile = Boolean(
    context.profile.hasLoyaltyProgram ||
      context.profile.hasSubscription ||
      context.profile.hasUGC ||
      context.profile.hasReviews
  );
  if (!hasEnoughProfile) return null;
  const evidenceUsed = uniqueEvidence([
    ...context.evidenceByField([
      "brandProfile.hasLoyaltyProgram",
      "brandProfile.hasSubscription",
      "brandProfile.hasUGC",
      "brandProfile.hasReviews"
    ]),
    ...context.evidenceByText(["quiz", "preference", "routine", "profile", "subscription"])
  ]);

  if (evidenceUsed.length === 0) return null;

  return idea({
    type: "zero_party_preference_challenge",
    title: "Zero-party preference challenge",
    targetBehavior: "Reward members for sharing product preferences, routines, goals, or replenishment needs.",
    whyItFitsThisBrand: "Detected loyalty, subscription, reviews, or UGC gives the brand a reason to collect preferences tied to real behavior.",
    rediemValuePropAngle: "Turn preference capture into a rewarded activation instead of a static form.",
    suggestedOutboundOneLiner: "A preference challenge earns you first-party data without relying on cookies — and gives members points for something they'd do anyway.",
    evidenceUsed,
    confidence: confidenceFromEvidence(evidenceUsed, 0.62),
    score: 64
  });
}

function idea(input: IdeaCandidate): IdeaCandidate {
  return input;
}

function evidenceForFields(evidence: EvidenceRecord[], fieldNames: string[]) {
  return evidence.filter((item) =>
    fieldNames.some((fieldName) => item.fieldName === fieldName)
  );
}

function evidenceForText(evidence: EvidenceRecord[], keywords: string[]) {
  return evidence.filter((item) =>
    matchesAny(`${item.fieldName} ${item.value ?? ""} ${item.rawExcerpt ?? ""}`, keywords)
  );
}

function signalsToEvidenceLike(signals: SignalRecord[], keywords: string[]): EvidenceRecord[] {
  return signals
    .filter((signal) => matchesAny(`${signal.type} ${signal.title} ${signal.description ?? ""}`, keywords))
    .map((signal) => ({
      id: signal.id,
      workspaceId: signal.workspaceId,
      entityType: "SIGNAL" as const,
      entityId: signal.id,
      fieldName: `signal.${signal.type}`,
      value: signal.title,
      sourceUrl: signal.sourceUrl,
      rawExcerpt: signal.description,
      confidence: signal.totalScore ? Math.min(0.95, signal.totalScore / 100) : 0.55,
      capturedAt: signal.createdAt
    }));
}

function uniqueEvidence(evidence: EvidenceRecord[]) {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function confidenceFromEvidence(evidence: EvidenceRecord[], baseline: number): number {
  if (evidence.length === 0) {
    return Math.round(Math.min(0.45, baseline * 0.55) * 100) / 100;
  }

  const averageConfidence =
    evidence.reduce((sum, item) => sum + (item.confidence ?? baseline), 0) /
    evidence.length;
  const evidenceVolumeBoost = Math.min(0.08, evidence.length * 0.015);

  return Math.round(Math.min(0.95, averageConfidence * 0.75 + baseline * 0.25 + evidenceVolumeBoost) * 100) / 100;
}

function toPrismaActivationType(type: RediemActivationIdeaType): ActivationIdeaType {
  switch (type) {
    case "review_reward_series":
      return "REVIEW_REWARD_SERIES";
    case "referral_challenge":
      return "REFERRAL_CHALLENGE";
    case "subscription_renewal_series":
      return "SUBSCRIPTION_RENEWAL_SERIES";
    case "ugc_social_challenge":
      return "UGC_SOCIAL_CHALLENGE";
    case "receipt_upload_challenge":
      return "RECEIPT_UPLOAD_CHALLENGE";
    case "product_drop_loyalty_campaign":
      return "PRODUCT_DROP_LOYALTY_CAMPAIGN";
    case "sustainability_or_mission_challenge":
      return "SUSTAINABILITY_OR_MISSION_CHALLENGE";
    case "vip_tier_migration":
      return "VIP_TIER_MIGRATION";
    case "retail_to_dtc_bridge":
      return "RETAIL_TO_DTC_BRIDGE";
    case "zero_party_preference_challenge":
      return "ZERO_PARTY_PREFERENCE_CHALLENGE";
  }
}

function matchesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}
