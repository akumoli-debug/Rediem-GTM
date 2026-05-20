import type { CommunityFlywheelSnapshotEstimate } from "@/server/scoring/communityFlywheel";
import type { GtmDiagnosticMetricId, GtmDiagnosticScore } from "@/server/scoring/gtmDiagnostics";
import type {
  RediemBrandProfileInput,
  RediemCompetitorToolDetectionInput,
  RediemSignalInput
} from "@/server/scoring/rediem";
import type { CommunityFlywheelEvidenceInput } from "@/server/scoring/communityFlywheel";

export type RediemPlaybookId =
  | "RETAIL_TO_OWNED_DATA_BRIDGE"
  | "POINTS_TO_PARTICIPATION_MIGRATION"
  | "REVIEW_TO_REFERRAL_LOOP"
  | "UGC_TO_OWNED_COMMUNITY"
  | "SUBSCRIPTION_RETENTION_LOOP"
  | "MISSION_CHALLENGE_ACTIVATION"
  | "PRODUCT_DROP_PARTICIPATION"
  | "ZERO_PARTY_PERSONALIZATION_LOOP"
  | "STACK_FRAGMENTATION_CONSOLIDATION"
  | "OWNED_COMMUNITY_CONVERSION";

export type RediemPlaybook = {
  id: RediemPlaybookId;
  title: string;
  thesis: string;
  triggerMetricIds: GtmDiagnosticMetricId[];
  requiredSignals: string[];
  positiveSignals: string[];
  disqualifiers: string[];
  recommendedBuyerPersonas: string[];
  outboundAngle: string;
  activationIdea: string;
  crmFields: string[];
  n8nActions: string[];
  evidenceRequirements: string[];
  safetyNotes: string[];
};

export type RediemPlaybookSelection = {
  playbook: RediemPlaybook;
  score: number;
  confidence: number;
  readiness: "OUTBOUND_READY" | "MANUAL_REVIEW";
  whySelected: string[];
  supportingEvidenceIds: string[];
  sourceUrls: string[];
  triggeredMetricIds: GtmDiagnosticMetricId[];
  safetyNotes: string[];
};

export type SelectRediemPlaybooksInput = {
  gtmDiagnostics: GtmDiagnosticScore[];
  communityFlywheelRatio?: CommunityFlywheelSnapshotEstimate | null;
  brandProfile?: RediemBrandProfileInput | null;
  signals?: RediemSignalInput[];
  detections?: RediemCompetitorToolDetectionInput[];
  evidence?: CommunityFlywheelEvidenceInput[];
};

type PlaybookRule = {
  playbook: RediemPlaybook;
  signalKeywords: string[];
  positiveKeywords: string[];
  disqualifierKeywords: string[];
};

export const rediemPlaybooks: RediemPlaybook[] = [
  {
    id: "RETAIL_TO_OWNED_DATA_BRIDGE",
    title: "Retail-to-owned data bridge",
    thesis: "Retail demand should become owned community data through receipt verification, member profiles, and follow-on DTC participation.",
    triggerMetricIds: ["RCBI", "OCCS", "PCG"],
    requiredSignals: ["Retail, marketplace, store locator, or omnichannel evidence"],
    positiveSignals: ["Receipt upload language", "Reviews or UGC", "DTC subscription or account flow"],
    disqualifiers: ["No retail or marketplace evidence", "Low-confidence retail source only"],
    recommendedBuyerPersonas: ["VP Ecommerce", "Director of Retail Marketing", "CRM Lead", "Head of Omnichannel"],
    outboundAngle: "Retail appears to create demand the brand may not fully own. Rediem can turn retail purchases into verified community profiles and follow-on DTC actions.",
    activationIdea: "Launch a receipt upload challenge that rewards verified retail buyers, captures preferences, and routes members into reviews, referrals, or subscriptions.",
    crmFields: ["retail_to_community_bridge_index", "top_gtm_diagnostic", "recommended_gtm_playbook", "rediem_source_urls"],
    n8nActions: ["Create retail bridge review task", "Route to ecommerce or omnichannel owner", "Attach source URLs and receipt-upload angle"],
    evidenceRequirements: ["Retail/store locator or marketplace URL", "Owned ecommerce or member path evidence", "Receipt-upload absence or presence evidence"],
    safetyNotes: ["Do not estimate retail sales volume from public retailer presence.", "Frame missing receipt upload as not detected unless evidence is complete."]
  },
  {
    id: "POINTS_TO_PARTICIPATION_MIGRATION",
    title: "Points-to-participation migration",
    thesis: "Points-only loyalty can be migrated into verified participation behaviors: reviews, referrals, UGC, preferences, and status.",
    triggerMetricIds: ["DDR", "PCG", "SFI"],
    requiredSignals: ["Loyalty, rewards, VIP, points, earn, or redeem evidence"],
    positiveSignals: ["Points or discount language", "Reviews or UGC outside loyalty", "Stack fragmentation"],
    disqualifiers: ["No loyalty or rewards evidence", "Existing participation-based loyalty is already explicit"],
    recommendedBuyerPersonas: ["Director of Retention", "Loyalty Manager", "VP Growth", "Lifecycle Marketing Lead"],
    outboundAngle: "The loyalty surface appears built around points or discounts. Rediem can shift more value behind verified participation instead of only transactions.",
    activationIdea: "Migrate VIP tiers so members earn status for reviews, referrals, UGC, preference completion, and subscription milestones.",
    crmFields: ["discount_dependence_ratio", "participation_capture_gap", "stack_fragmentation_index", "recommended_gtm_playbook"],
    n8nActions: ["Tag account as loyalty migration", "Route to retention owner", "Create VIP migration outbound task"],
    evidenceRequirements: ["Rewards or loyalty URL", "Points/earn/redeem excerpt", "At least one participation surface such as reviews, UGC, referral, or subscription"],
    safetyNotes: ["Do not infer margin pressure or promo spend from discount language.", "Avoid saying the loyalty program is broken; describe visible migration opportunity."]
  },
  {
    id: "REVIEW_TO_REFERRAL_LOOP",
    title: "Review-to-referral loop",
    thesis: "Verified customer reviews are the highest-intent advocacy surface and should feed referral challenges, not sit alone as social proof.",
    triggerMetricIds: ["PCG", "OCCS", "DDR"],
    requiredSignals: ["Review evidence"],
    positiveSignals: ["Reviews without referral capture", "Review provider detection", "UGC or social proof"],
    disqualifiers: ["No review evidence", "Explicit review-to-referral loop already detected"],
    recommendedBuyerPersonas: ["Director of Retention", "CRM Lead", "Growth Marketing Manager", "Customer Experience Lead"],
    outboundAngle: "Reviews appear to create customer voice, but the next advocacy step may be under-captured. Rediem can turn verified reviews into referral challenges.",
    activationIdea: "Invite verified reviewers into a time-boxed referral challenge with tier credit, profile enrichment, and follow-on reward triggers.",
    crmFields: ["participation_capture_gap", "owned_community_conversion_score", "recommended_gtm_playbook", "primary_gtm_diagnosis"],
    n8nActions: ["Create reviewer advocacy task", "Route to lifecycle owner", "Attach review URLs and referral hypothesis"],
    evidenceRequirements: ["Review URL or provider detection", "Referral absence or weak referral evidence", "Source URL for review claim"],
    safetyNotes: ["Do not claim review volume unless exact counts are sourced.", "Say referral loop is weak or not detected from public evidence."]
  },
  {
    id: "UGC_TO_OWNED_COMMUNITY",
    title: "UGC-to-owned community",
    thesis: "Creator and UGC energy should become verified owned community participation, not only social engagement on rented platforms.",
    triggerMetricIds: ["UVG", "OCCS", "PCG"],
    requiredSignals: ["UGC, creator, ambassador, TikTok, Instagram, or social community evidence"],
    positiveSignals: ["Weak verification language", "High social community score", "No owned member capture"],
    disqualifiers: ["No social, UGC, creator, or ambassador evidence", "Verified UGC capture already explicit"],
    recommendedBuyerPersonas: ["Head of Community", "Social Media Manager", "Influencer Manager", "VP Growth"],
    outboundAngle: "The brand has visible creator or UGC energy, but Rediem can help make that participation verified, owned, and repeatable.",
    activationIdea: "Run a verified UGC challenge requiring member sign-up, purchase or receipt verification, and profile completion before rewards unlock.",
    crmFields: ["ugc_verification_gap", "owned_community_conversion_score", "top_gtm_diagnostic", "recommended_gtm_playbook"],
    n8nActions: ["Route to community or social owner", "Create UGC verification task", "Attach creator/community evidence URLs"],
    evidenceRequirements: ["UGC/social/creator source URL", "Evidence of weak or missing verification path", "Owned community capture source if present"],
    safetyNotes: ["Do not estimate UGC volume from public social presence.", "Use verification not detected language when evidence is incomplete."]
  },
  {
    id: "SUBSCRIPTION_RETENTION_LOOP",
    title: "Subscription retention loop",
    thesis: "Subscribers should earn rewards for renewal, streaks, referrals, preferences, reviews, and replenishment behaviors.",
    triggerMetricIds: ["DDR", "ZPDD", "PCG"],
    requiredSignals: ["Subscription, replenishment, autoship, or routine evidence"],
    positiveSignals: ["Subscription provider detection", "Reviews", "Preference or routine language", "Discount-heavy retention language"],
    disqualifiers: ["No subscription, replenishment, routine, or repeat-use evidence"],
    recommendedBuyerPersonas: ["Director of Retention", "Lifecycle Marketing Lead", "CRM Lead", "VP Customer Experience"],
    outboundAngle: "Subscribers are already high-intent customers. Rediem can turn renewal and replenishment moments into participation milestones instead of only subscribe-and-save.",
    activationIdea: "Create a subscriber reward series for renewal streaks, profile updates, reviews, referrals, and early access.",
    crmFields: ["discount_dependence_ratio", "zero_party_data_depth", "participation_capture_gap", "recommended_gtm_playbook"],
    n8nActions: ["Route to lifecycle owner", "Create subscriber series task", "Attach subscription and replenishment evidence"],
    evidenceRequirements: ["Subscription URL or provider detection", "Repeat-use category or replenishment language", "Participation milestone gap"],
    safetyNotes: ["Do not infer churn or renewal rates from public subscription pages.", "Frame as visible retention-loop opportunity."]
  },
  {
    id: "MISSION_CHALLENGE_ACTIVATION",
    title: "Mission challenge activation",
    thesis: "Mission, sustainability, wellness, education, or identity language becomes more valuable when customers can act on it.",
    triggerMetricIds: ["MAR", "ZPDD", "PCG"],
    requiredSignals: ["Mission, sustainability, wellness, impact, education, or identity evidence"],
    positiveSignals: ["Weak challenge/action language", "UGC or reviews", "Preference or values capture"],
    disqualifiers: ["No mission, sustainability, wellness, education, or identity evidence"],
    recommendedBuyerPersonas: ["CMO", "Brand Manager", "Head of Community", "Founder"],
    outboundAngle: "The mission is visible, but Rediem can help turn it into customer actions, stories, preferences, and rewards.",
    activationIdea: "Launch a mission challenge where customers submit mission-aligned actions or stories, complete preferences, and unlock community rewards.",
    crmFields: ["mission_to_action_ratio", "zero_party_data_depth", "primary_gtm_diagnosis", "recommended_gtm_playbook"],
    n8nActions: ["Route to brand/community owner", "Create mission challenge task", "Attach mission and action-path evidence"],
    evidenceRequirements: ["Mission or impact source URL", "Customer action path evidence or absence", "Confidence on mission claim"],
    safetyNotes: ["Do not judge mission authenticity.", "Avoid impact claims unless the brand provides verified impact data."]
  },
  {
    id: "PRODUCT_DROP_PARTICIPATION",
    title: "Product drop participation",
    thesis: "Drops, launches, restocks, collaborations, and early access moments should build the owned community before and after checkout.",
    triggerMetricIds: ["PDPS", "OCCS", "PCG"],
    requiredSignals: ["Drop, launch, limited edition, restock, early access, seasonal, collab, or waitlist evidence"],
    positiveSignals: ["UGC around launch", "VIP or early access", "Post-drop review/referral opportunity"],
    disqualifiers: ["No launch, drop, waitlist, or limited-edition evidence"],
    recommendedBuyerPersonas: ["VP Ecommerce", "VP Growth", "Brand Manager", "Head of Community"],
    outboundAngle: "Launch attention can become more than a checkout spike. Rediem can make each drop a participation campaign.",
    activationIdea: "Reward members for joining a waitlist, voting, sharing UGC, referring friends, reviewing post-drop, or completing preferences.",
    crmFields: ["product_drop_participation_score", "owned_community_conversion_score", "recommended_gtm_playbook"],
    n8nActions: ["Route to ecommerce/growth owner", "Create product drop participation task", "Attach launch evidence"],
    evidenceRequirements: ["Launch/drop source URL", "Owned signup or member access evidence", "Participation mechanics evidence or absence"],
    safetyNotes: ["Do not estimate sell-through, waitlist size, or drop revenue.", "Capture dates because launch evidence decays quickly."]
  },
  {
    id: "ZERO_PARTY_PERSONALIZATION_LOOP",
    title: "Zero-party personalization loop",
    thesis: "Declared preferences should be rewarded and then used to personalize community actions, subscriptions, referrals, and offers.",
    triggerMetricIds: ["ZPDD", "PCG", "MAR"],
    requiredSignals: ["Quiz, survey, poll, preference, profile, routine, goal, fit, taste, or style evidence"],
    positiveSignals: ["Preference capture not connected to rewards", "Subscription or mission context", "Profile completion opportunity"],
    disqualifiers: ["No visible declared-data or preference-capture evidence"],
    recommendedBuyerPersonas: ["CRM Lead", "Lifecycle Marketing Lead", "Director of Retention", "Ecommerce Manager"],
    outboundAngle: "The brand has a natural preference story. Rediem can make declared data capture a rewarded participation loop.",
    activationIdea: "Launch a preference challenge that rewards quiz/profile completion and routes members into personalized reviews, referrals, subscriptions, or mission actions.",
    crmFields: ["zero_party_data_depth", "participation_capture_gap", "recommended_gtm_playbook"],
    n8nActions: ["Route to CRM/lifecycle owner", "Create zero-party challenge task", "Attach preference evidence URLs"],
    evidenceRequirements: ["Preference/quiz/profile source URL", "Reward or personalization connection evidence", "Sensitive-data review if applicable"],
    safetyNotes: ["Do not claim what the brand stores internally from public forms.", "Avoid storing sensitive attributes beyond GTM evidence."]
  },
  {
    id: "STACK_FRAGMENTATION_CONSOLIDATION",
    title: "Stack fragmentation consolidation",
    thesis: "Loyalty, reviews, subscriptions, SMS/email, referrals, retail, and social tools should resolve into one participation layer.",
    triggerMetricIds: ["SFI", "PCG", "OCCS"],
    requiredSignals: ["Multiple detected tools or disconnected participation surfaces"],
    positiveSignals: ["Loyalty plus reviews", "Subscription plus messaging", "Retail plus DTC", "Weak connection language"],
    disqualifiers: ["Fewer than two reliable tool or participation-surface detections"],
    recommendedBuyerPersonas: ["Chief Digital Officer", "VP Ecommerce", "Martech Lead", "Director of Digital Product", "CRM Lead"],
    outboundAngle: "Useful customer behaviors appear split across tools. Rediem can sit across those surfaces as the participation layer.",
    activationIdea: "Map the highest-value participation surfaces, then consolidate the first loop into member profiles and shared reward triggers.",
    crmFields: ["stack_fragmentation_index", "participation_capture_gap", "owned_community_conversion_score", "recommended_gtm_playbook"],
    n8nActions: ["Route to ecommerce/martech owner", "Create stack consolidation task", "Attach tool detections and source URLs"],
    evidenceRequirements: ["Two or more reliable tool detections", "Source URL or excerpt for each tool", "No claim about internal architecture without explicit evidence"],
    safetyNotes: ["Do not claim exact internal architecture from public scripts.", "Treat low-confidence vendor detections as review-only."]
  },
  {
    id: "OWNED_COMMUNITY_CONVERSION",
    title: "Owned community conversion",
    thesis: "Public community demand should convert into owned members with repeatable verified participation paths.",
    triggerMetricIds: ["OCCS", "UVG", "RCBI"],
    requiredSignals: ["Social, reviews, UGC, retail, subscription, referral, or drop demand"],
    positiveSignals: ["Weak owned member path", "High public community demand", "UGC or retail bridge opportunity"],
    disqualifiers: ["No public community, review, retail, subscription, or UGC demand evidence"],
    recommendedBuyerPersonas: ["VP Growth", "Head of Community", "Director of Retention", "CRM Lead"],
    outboundAngle: "The brand has public community energy. Rediem can turn that attention into owned profiles, verified actions, and repeatable participation.",
    activationIdea: "Launch the lowest-friction owned conversion path: UGC sign-up, receipt upload, preference completion, or review-to-referral.",
    crmFields: ["owned_community_conversion_score", "top_gtm_diagnostic", "primary_gtm_diagnosis", "recommended_gtm_playbook"],
    n8nActions: ["Route to growth/community owner", "Create owned conversion task", "Attach top diagnostic and source URLs"],
    evidenceRequirements: ["Public demand source URL", "Owned conversion path evidence or absence", "Confidence on top diagnostic"],
    safetyNotes: ["Do not estimate actual conversion rate from public paths.", "Route low-confidence accounts to manual review."]
  }
];

const PLAYBOOK_RULES: PlaybookRule[] = rediemPlaybooks.map((playbook) => ({
  playbook,
  signalKeywords: keywordsForPlaybook(playbook.id, "required"),
  positiveKeywords: keywordsForPlaybook(playbook.id, "positive"),
  disqualifierKeywords: keywordsForPlaybook(playbook.id, "disqualifier")
}));

export function selectRediemPlaybooks(input: SelectRediemPlaybooksInput): RediemPlaybookSelection[] {
  const context = createSelectionContext(input);

  return PLAYBOOK_RULES
    .map((rule) => scorePlaybook(rule, context))
    .filter((selection): selection is RediemPlaybookSelection => selection !== null)
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence || left.playbook.id.localeCompare(right.playbook.id))
    .slice(0, 3);
}

function scorePlaybook(
  rule: PlaybookRule,
  context: ReturnType<typeof createSelectionContext>
): RediemPlaybookSelection | null {
  const metricMatches = context.diagnostics.filter((metric) =>
    rule.playbook.triggerMetricIds.includes(metric.metricId)
  );
  const bestMetric = metricMatches.sort((left, right) => right.score - left.score)[0];
  const requiredMatched = matchesAny(context.text, rule.signalKeywords) || profileMatchesPlaybook(rule.playbook.id, context);
  const disqualified = matchesAny(context.text, rule.disqualifierKeywords);
  const positiveHits = countKeywordHits(context.text, rule.positiveKeywords);

  if (!bestMetric && !requiredMatched) {
    return null;
  }

  if (disqualified && !bestMetric) {
    return null;
  }

  const metricScore = bestMetric?.score ?? 0;
  const signalScore = requiredMatched ? 22 : 0;
  const positiveScore = Math.min(18, positiveHits * 5);
  const cfrScore = cfrPlaybookBonus(rule.playbook.id, context.cfr);
  const penalty = disqualified ? 28 : 0;
  const score = clampScore(metricScore * 0.72 + signalScore + positiveScore + cfrScore - penalty);
  const confidence = selectionConfidence(metricMatches, context, requiredMatched, disqualified);

  if (score < 35) {
    return null;
  }

  const supporting = supportingEvidence(context, rule, metricMatches);
  const whySelected = buildWhySelected(rule, metricMatches, requiredMatched, positiveHits, cfrScore, disqualified);

  return {
    playbook: rule.playbook,
    score: roundScore(score),
    confidence,
    readiness: confidence >= 0.55 && supporting.sourceUrls.length > 0 && !disqualified ? "OUTBOUND_READY" : "MANUAL_REVIEW",
    whySelected,
    supportingEvidenceIds: supporting.evidenceIds,
    sourceUrls: supporting.sourceUrls,
    triggeredMetricIds: unique(metricMatches.map((metric) => metric.metricId)),
    safetyNotes: rule.playbook.safetyNotes
  };
}

function buildWhySelected(
  rule: PlaybookRule,
  metrics: GtmDiagnosticScore[],
  requiredMatched: boolean,
  positiveHits: number,
  cfrScore: number,
  disqualified: boolean
): string[] {
  const reasons: string[] = [];

  if (metrics.length > 0) {
    const metricSummary = metrics
      .map((metric) => `${metric.metricId} ${metric.score}/100 at ${Math.round(metric.confidence * 100)}% confidence`)
      .join(", ");
    reasons.push(`Triggered by Rediem diagnostics: ${metricSummary}.`);
  }

  if (requiredMatched) {
    reasons.push(`Required signal matched: ${rule.playbook.requiredSignals.join("; ")}.`);
  }

  if (positiveHits > 0) {
    reasons.push(`${positiveHits} supporting public signal${positiveHits === 1 ? "" : "s"} matched this playbook.`);
  }

  if (cfrScore > 0) {
    reasons.push("CFR leak or recommended play supports this GTM motion.");
  }

  if (disqualified) {
    reasons.push("A disqualifying or already-solved signal was detected, so route this playbook to manual review.");
  }

  return reasons.length > 0 ? reasons : ["Selected from visible Rediem GTM evidence with conservative confidence handling."];
}

function supportingEvidence(
  context: ReturnType<typeof createSelectionContext>,
  rule: PlaybookRule,
  metrics: GtmDiagnosticScore[]
) {
  const metricEvidenceIds = metrics.flatMap((metric) => metric.sourceEvidenceIds);
  const metricUrls = metrics.flatMap((metric) => metric.sourceUrls);
  const evidenceIds: string[] = [...metricEvidenceIds];
  const sourceUrls: string[] = [...metricUrls];
  const keywords = [...rule.signalKeywords, ...rule.positiveKeywords];

  for (const item of context.evidence) {
    const evidenceText = normalizeText(item.fieldName, item.value, item.rawExcerpt);
    if (!matchesAny(evidenceText, keywords)) continue;
    if (item.id) evidenceIds.push(item.id);
    if (item.sourceUrl) sourceUrls.push(item.sourceUrl);
  }

  for (const signal of context.signals) {
    const signalText = normalizeText(signal.type, signal.title, signal.description);
    if (signal.sourceUrl && matchesAny(signalText, keywords)) sourceUrls.push(signal.sourceUrl);
  }

  for (const detection of context.detections) {
    const detectionText = normalizeText(detection.category, detection.vendor, detection.evidence);
    if (detection.sourceUrl && matchesAny(detectionText, keywords)) sourceUrls.push(detection.sourceUrl);
  }

  return {
    evidenceIds: unique(evidenceIds),
    sourceUrls: unique(sourceUrls)
  };
}

function selectionConfidence(
  metrics: GtmDiagnosticScore[],
  context: ReturnType<typeof createSelectionContext>,
  requiredMatched: boolean,
  disqualified: boolean
): number {
  const metricConfidence = metrics.length > 0
    ? metrics.reduce((sum, metric) => sum + metric.confidence, 0) / metrics.length
    : 0.25;
  const evidenceCoverage = Math.min(0.18, context.evidence.length * 0.03 + context.signals.length * 0.02 + context.detections.length * 0.02);
  const requiredBonus = requiredMatched ? 0.08 : 0;
  const disqualifierPenalty = disqualified ? 0.18 : 0;

  return roundConfidence(metricConfidence * 0.72 + evidenceCoverage + requiredBonus - disqualifierPenalty);
}

function createSelectionContext(input: SelectRediemPlaybooksInput) {
  const brandProfile = input.brandProfile ?? {};
  const signals = input.signals ?? [];
  const detections = input.detections ?? [];
  const evidence = input.evidence ?? [];
  const text = normalizeText(
    profileText(brandProfile),
    ...signals.map((signal) => `${signal.type ?? ""} ${signal.title ?? ""} ${signal.description ?? ""}`),
    ...detections.map((detection) => `${detection.category ?? ""} ${detection.vendor ?? ""} ${detection.evidence ?? ""}`),
    ...evidence.map((item) => `${item.fieldName ?? ""} ${item.value ?? ""} ${item.rawExcerpt ?? ""}`)
  );

  return {
    diagnostics: input.gtmDiagnostics ?? [],
    cfr: input.communityFlywheelRatio ?? null,
    brandProfile,
    signals,
    detections,
    evidence,
    text
  };
}

function profileMatchesPlaybook(
  id: RediemPlaybookId,
  context: ReturnType<typeof createSelectionContext>
): boolean {
  const profile = context.brandProfile;

  switch (id) {
    case "RETAIL_TO_OWNED_DATA_BRIDGE":
      return Boolean(profile.hasRetailPresence);
    case "POINTS_TO_PARTICIPATION_MIGRATION":
      return Boolean(profile.hasLoyaltyProgram) && matchesAny(normalizeText(profile.loyaltyProgramType, profile.loyaltyProvider), ["points", "earn", "redeem", "vip"]);
    case "REVIEW_TO_REFERRAL_LOOP":
      return Boolean(profile.hasReviews);
    case "UGC_TO_OWNED_COMMUNITY":
      return Boolean(profile.hasUGC || profile.instagramUrl || profile.tiktokUrl || (profile.socialCommunityScore ?? 0) >= 65);
    case "SUBSCRIPTION_RETENTION_LOOP":
      return Boolean(profile.hasSubscription);
    case "MISSION_CHALLENGE_ACTIVATION":
      return Boolean(profile.missionDrivenAngle || profile.sustainabilityAngle);
    case "PRODUCT_DROP_PARTICIPATION":
      return matchesAny(context.text, ["drop", "launch", "limited edition", "early access", "restock"]);
    case "ZERO_PARTY_PERSONALIZATION_LOOP":
      return matchesAny(context.text, ["quiz", "preference", "profile", "survey", "poll", "style", "routine"]);
    case "STACK_FRAGMENTATION_CONSOLIDATION":
      return reliableToolCategoryCount(context.detections) >= 2;
    case "OWNED_COMMUNITY_CONVERSION":
      return Boolean(profile.hasReviews || profile.hasUGC || profile.hasRetailPresence || profile.hasSubscription || profile.hasReferralProgram);
  }
}

function cfrPlaybookBonus(id: RediemPlaybookId, cfr: CommunityFlywheelSnapshotEstimate | null): number {
  if (!cfr) return 0;
  const text = normalizeText(cfr.primaryLeak, cfr.secondaryLeak, cfr.recommendedPlay);

  switch (id) {
    case "RETAIL_TO_OWNED_DATA_BRIDGE":
      return matchesAny(text, ["RETAIL_NOT_CONNECTED_TO_DTC", "RECEIPT_UPLOAD_RETAIL_TO_DTC"]) ? 10 : 0;
    case "POINTS_TO_PARTICIPATION_MIGRATION":
      return matchesAny(text, ["POINTS_ONLY_LOYALTY", "DISCOUNT_HEAVY_RETENTION", "VIP_TIER_MIGRATION"]) ? 10 : 0;
    case "REVIEW_TO_REFERRAL_LOOP":
      return matchesAny(text, ["REVIEWS_ISOLATED_FROM_REWARDS", "WEAK_REFERRAL_LOOP", "REVIEW_TO_REFERRAL_CHALLENGE"]) ? 10 : 0;
    case "UGC_TO_OWNED_COMMUNITY":
      return matchesAny(text, ["UGC_NOT_VERIFIED", "SOCIAL_COMMUNITY_NOT_OWNED", "UGC_SOCIAL_CHALLENGE"]) ? 10 : 0;
    case "SUBSCRIPTION_RETENTION_LOOP":
      return matchesAny(text, ["NO_SUBSCRIPTION_REWARD_SERIES", "SUBSCRIPTION_REWARD_SERIES"]) ? 10 : 0;
    case "MISSION_CHALLENGE_ACTIVATION":
      return matchesAny(text, ["SUSTAINABILITY_OR_MISSION_CHALLENGE"]) ? 10 : 0;
    case "PRODUCT_DROP_PARTICIPATION":
      return matchesAny(text, ["PRODUCT_DROP_PARTICIPATION_CAMPAIGN"]) ? 10 : 0;
    case "ZERO_PARTY_PERSONALIZATION_LOOP":
      return matchesAny(text, ["NO_ZERO_PARTY_DATA_LOOP", "ZERO_PARTY_PREFERENCE_CHALLENGE"]) ? 10 : 0;
    case "STACK_FRAGMENTATION_CONSOLIDATION":
      return matchesAny(text, ["POINTS_ONLY_LOYALTY", "REVIEWS_ISOLATED_FROM_REWARDS"]) ? 6 : 0;
    case "OWNED_COMMUNITY_CONVERSION":
      return matchesAny(text, ["SOCIAL_COMMUNITY_NOT_OWNED", "NO_PARTICIPATION_CAPTURE"]) ? 10 : 0;
  }
}

function reliableToolCategoryCount(detections: RediemCompetitorToolDetectionInput[]): number {
  const categories = new Set<string>();
  for (const detection of detections) {
    if (detection.confidence != null && detection.confidence < 0.35) continue;
    categories.add(normalizeToolCategory(detection.category, detection.vendor));
  }
  return categories.size;
}

function normalizeToolCategory(category?: string | null, vendor?: string | null): string {
  const text = normalizeText(category, vendor);
  if (matchesAny(text, ["loyalty", "loyaltylion", "smile", "yotpo loyalty"])) return "loyalty";
  if (matchesAny(text, ["review", "okendo", "judge", "yotpo reviews"])) return "reviews";
  if (matchesAny(text, ["subscription", "recharge", "skio"])) return "subscription";
  if (matchesAny(text, ["sms", "email", "klaviyo", "attentive"])) return "messaging";
  if (matchesAny(text, ["helpdesk", "gorgias", "zendesk"])) return "helpdesk";
  if (matchesAny(text, ["referral"])) return "referral";
  if (matchesAny(text, ["shopify", "ecommerce"])) return "ecommerce";
  return text || "unknown";
}

function keywordsForPlaybook(id: RediemPlaybookId, kind: "required" | "positive" | "disqualifier"): string[] {
  const keywords: Record<RediemPlaybookId, Record<typeof kind, string[]>> = {
    RETAIL_TO_OWNED_DATA_BRIDGE: {
      required: ["retail", "store locator", "target", "whole foods", "amazon", "marketplace", "omnichannel", "receipt"],
      positive: ["receipt upload", "scan receipt", "reviews", "ugc", "subscription", "dtc"],
      disqualifier: ["no retail"]
    },
    POINTS_TO_PARTICIPATION_MIGRATION: {
      required: ["loyalty", "rewards", "points", "vip", "earn", "redeem"],
      positive: ["discount", "store credit", "review", "ugc", "subscription", "referral"],
      disqualifier: ["participation based loyalty", "verified participation rewards"]
    },
    REVIEW_TO_REFERRAL_LOOP: {
      required: ["review", "reviews", "okendo", "yotpo reviews", "verified review"],
      positive: ["refer", "referral", "ugc", "social proof", "verified customer"],
      disqualifier: ["review to referral"]
    },
    UGC_TO_OWNED_COMMUNITY: {
      required: ["ugc", "creator", "ambassador", "instagram", "tiktok", "tag us", "social"],
      positive: ["member", "verified", "receipt", "community", "challenge"],
      disqualifier: ["verified ugc", "purchase verified ugc"]
    },
    SUBSCRIPTION_RETENTION_LOOP: {
      required: ["subscription", "subscribe", "autoship", "recharge", "skio", "replenish", "routine"],
      positive: ["renewal", "streak", "preference", "review", "refer", "subscriber reward"],
      disqualifier: ["no subscription"]
    },
    MISSION_CHALLENGE_ACTIVATION: {
      required: ["mission", "sustainable", "sustainability", "impact", "wellness", "education", "clean", "climate"],
      positive: ["challenge", "pledge", "submit", "story", "preference", "values"],
      disqualifier: ["no mission"]
    },
    PRODUCT_DROP_PARTICIPATION: {
      required: ["drop", "launch", "limited edition", "early access", "seasonal", "collab", "restock", "waitlist"],
      positive: ["ugc", "vote", "refer", "share", "review", "member", "vip"],
      disqualifier: ["no launches"]
    },
    ZERO_PARTY_PERSONALIZATION_LOOP: {
      required: ["quiz", "preference", "survey", "poll", "profile", "routine", "style", "taste", "fit"],
      positive: ["personalized", "recommendation", "subscription", "reward", "profile completion"],
      disqualifier: ["no preference"]
    },
    STACK_FRAGMENTATION_CONSOLIDATION: {
      required: ["loyaltylion", "klaviyo", "recharge", "okendo", "attentive", "shopify", "gorgias", "yotpo", "smile"],
      positive: ["loyalty", "reviews", "subscription", "sms", "email", "referral"],
      disqualifier: ["all in one participation layer", "unified profile"]
    },
    OWNED_COMMUNITY_CONVERSION: {
      required: ["community", "ugc", "reviews", "retail", "subscription", "referral", "drop", "creator"],
      positive: ["member", "profile", "join", "receipt", "verified", "challenge"],
      disqualifier: ["owned community conversion already connected"]
    }
  };
  return keywords[id][kind];
}

function profileText(profile: RediemBrandProfileInput): string {
  return normalizeText(
    profile.ecommercePlatform,
    profile.productCategory,
    profile.brandCategory,
    profile.targetCustomer,
    profile.subscriptionProvider,
    profile.loyaltyProvider,
    profile.loyaltyProgramType,
    profile.reviewProvider,
    profile.instagramUrl,
    profile.tiktokUrl,
    profile.retailSignals == null ? "" : JSON.stringify(profile.retailSignals),
    profile.sustainabilityAngle,
    profile.missionDrivenAngle
  );
}

function countKeywordHits(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  return keywords.filter((keyword) => normalized.includes(normalizeText(keyword))).length;
}

function matchesAny(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function normalizeText(...values: unknown[]): string {
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
