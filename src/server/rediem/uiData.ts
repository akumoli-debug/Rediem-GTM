import { prisma } from "@/server/db/client";
import { getFormulaSettingsData, getWorkspaceSummary } from "@/server/workspace/tableData";
import {
  calculateCommunityReadinessScore,
  calculateLoyaltyPainScore,
  classifyRediemTier,
  scoreRediemFit
} from "@/server/scoring/rediem";
import { calculateCommunityFlywheelRatio } from "@/server/scoring/communityFlywheel";
import { calculateGtmDiagnostics } from "@/server/scoring/gtmDiagnostics";
import {
  generateDisplacementWedges,
  selectPrimaryDisplacementWedge
} from "@/server/scoring/displacementWedges";
import { selectRediemPlaybooks } from "@/server/playbooks/rediemPlaybooks";
import { normalizeRediemTitle } from "@/server/scoring/rediemTitleTaxonomy";
import {
  classifyAnalysisFreshness,
  classifyConfidence,
  classifyOutboundReadiness,
  deriveAccountConfidence
} from "@/server/rediem/accountHealth";
import type {
  RediemAccountDetail,
  RediemAccountRow,
  RediemAccountsData,
  RediemActivationIdeaView,
  RediemBuyer,
  RediemDetectionView,
  RediemMetric,
  RediemSignalView
} from "@/components/rediem/types";
import type { EvidenceItem, FormulaCell } from "@/components/workspace/types";

type FormulaResultWithColumn = {
  entityId: string;
  formulaColumnId: string;
  value: unknown;
  error: string | null;
  formulaColumn: {
    name: string;
  };
};

type BrandProfileShape = NonNullable<
  Awaited<ReturnType<typeof prisma.brandProfile.findMany>>[number]
>;

type SignalShape = Awaited<ReturnType<typeof prisma.signal.findMany>>[number];
type DetectionShape = Awaited<ReturnType<typeof prisma.competitorToolDetection.findMany>>[number];

const MOCK_EVIDENCE: EvidenceItem[] = [
  {
    id: "demo_ev_rewards",
    entityType: "ACCOUNT",
    entityId: "demo-sample-brand",
    fieldName: "brandProfile.loyaltyProgramType",
    value: "Points and VIP tiers",
    sourceUrl: "https://sample-beverage.test/rewards",
    provider: "mock",
    rawExcerpt: "Earn points and climb VIP tiers with every purchase.",
    confidence: 0.74,
    capturedAt: "2026-05-20T12:00:00.000Z"
  },
  {
    id: "demo_ev_retail",
    entityType: "ACCOUNT",
    entityId: "demo-sample-brand",
    fieldName: "brandProfile.hasRetailPresence",
    value: "true",
    sourceUrl: "https://sample-beverage.test/store-locator",
    provider: "mock",
    rawExcerpt: "Find us at Target, Whole Foods, and Sprouts.",
    confidence: 0.71,
    capturedAt: "2026-05-20T12:00:00.000Z"
  },
  {
    id: "demo_ev_reviews",
    entityType: "ACCOUNT",
    entityId: "demo-sample-brand",
    fieldName: "brandProfile.hasReviews",
    value: "true",
    sourceUrl: "https://sample-beverage.test/reviews",
    provider: "mock",
    rawExcerpt: "Customer reviews and product ratings are displayed.",
    confidence: 0.78,
    capturedAt: "2026-05-20T12:00:00.000Z"
  }
];

const MOCK_REDIEM_ROW: RediemAccountRow = {
  id: "demo-sample-brand",
  brand: "Sample Beverage Co.",
  domain: "sample-beverage.test",
  category: "Functional beverage",
  ecommercePlatform: "Shopify",
  loyaltyProvider: "LoyaltyLion",
  loyaltyType: "Points and VIP tiers",
  hasSubscription: true,
  hasReviews: true,
  shopifyDetected: true,
  hasLoyaltyProgram: true,
  socialCommunityScore: 78,
  loyaltyPainScore: 85,
  migrationPainScore: 76,
  communityReadinessScore: 91,
  agenticCommerceScore: 82,
  rediemFitScore: 87,
  tier: "Tier 1",
  recommendedPlay: "Retail-to-owned data bridge",
  lastAnalyzed: "2026-05-20T12:00:00.000Z",
  analysisFreshness: classifyAnalysisFreshness("2026-05-20T12:00:00.000Z"),
  confidence: classifyConfidence(0.68),
  outboundReadiness: classifyOutboundReadiness({
    freshness: classifyAnalysisFreshness("2026-05-20T12:00:00.000Z"),
    confidence: classifyConfidence(0.68)
  }),
  evidence: MOCK_EVIDENCE,
  formulaOutputs: []
};

const MOCK_REDIEM_DETAIL: RediemAccountDetail = {
  row: MOCK_REDIEM_ROW,
  fitBreakdown: [
    { label: "Community Energy", score: 91 },
    { label: "Participation Capture Gap", score: 85 },
    { label: "Ritual Repeat Purchase Fit", score: 88 },
    { label: "Retail-to-Owned Data", score: 84 },
    { label: "Mission / Identity Strength", score: 72 },
    { label: "Stack / Migration Opportunity", score: 76 },
    { label: "Timing Signal", score: 68 }
  ],
  profileFacts: [
    { label: "Commerce Platform", value: "Shopify" },
    { label: "Subscription", value: "Recharge" },
    { label: "Loyalty Program", value: "LoyaltyLion" },
    { label: "Reviews", value: "Okendo" },
    { label: "Retail Presence", value: "Yes" },
    { label: "UGC", value: "Yes" }
  ],
  detections: [
    {
      id: "demo_detection_loyalty",
      category: "LOYALTY",
      vendor: "LoyaltyLion",
      confidence: 0.82,
      sourceUrl: "https://sample-beverage.test/rewards",
      evidence: "Rewards page references points and VIP tiers."
    },
    {
      id: "demo_detection_reviews",
      category: "REVIEWS",
      vendor: "Okendo",
      confidence: 0.78,
      sourceUrl: "https://sample-beverage.test/reviews",
      evidence: "Reviews page contains Okendo widgets."
    },
    {
      id: "demo_detection_subscription",
      category: "SUBSCRIPTION",
      vendor: "Recharge",
      confidence: 0.76,
      sourceUrl: "https://sample-beverage.test/subscriptions",
      evidence: "Subscription page references subscribe and save."
    }
  ],
  signals: [
    {
      id: "demo_signal_retail",
      type: "RETAIL_PRESENCE",
      title: "Retail and store locator presence detected",
      totalScore: 82,
      sourceUrl: "https://sample-beverage.test/store-locator"
    },
    {
      id: "demo_signal_reviews",
      type: "REVIEWS",
      title: "Customer reviews detected",
      totalScore: 78,
      sourceUrl: "https://sample-beverage.test/reviews"
    }
  ],
  activationIdeas: [
    {
      id: "demo_idea_receipt",
      title: "Receipt upload challenge",
      type: "RECEIPT_UPLOAD_CHALLENGE",
      targetBehavior: "Verify retail purchases and route buyers into review, referral, and subscription loops.",
      expectedImpact: "Creates an owned community bridge from retail demand.",
      description: "Launch a receipt upload challenge for retail buyers.",
      confidence: 0.68,
      evidenceIds: ["demo_ev_retail", "demo_ev_reviews"]
    }
  ],
  communityFlywheel: {
    estimatedCfr: 0.82,
    cfrTier: "Emerging Community Loop",
    cfrConfidence: 0.61,
    earnedCommunityGrowth: 58,
    subsidizedTransactionalGrowth: 71,
    explanation: [
      "Visible reviews, UGC, subscriptions, and retail presence suggest real participation potential.",
      "The loyalty motion appears points-heavy, so earned community behavior may not be fully captured.",
      "Retail buyers appear disconnected from owned DTC profiles, making receipt upload a strong first loop."
    ],
    lowConfidence: false
  },
  topDiagnostics: [
    {
      metricId: "UVG",
      label: "UGC Verification Gap",
      score: 100,
      tier: "Priority",
      confidence: 0.72,
      confidenceLabel: "High confidence",
      evidenceCount: 2,
      explanation: "Visible UGC and review proof are not clearly tied to verified customer participation.",
      sourceUrls: ["https://sample-beverage.test/community", "https://sample-beverage.test/reviews"]
    },
    {
      metricId: "PCG",
      label: "Participation Capture Gap",
      score: 85,
      tier: "Priority",
      confidence: 0.72,
      confidenceLabel: "High confidence",
      evidenceCount: 2,
      explanation: "Customers appear to participate through reviews, social, retail, and subscriptions, but owned capture looks thinner.",
      sourceUrls: ["https://sample-beverage.test/rewards", "https://sample-beverage.test/reviews"]
    },
    {
      metricId: "RCBI",
      label: "Retail-to-Community Bridge Index",
      score: 67,
      tier: "High",
      confidence: 0.68,
      confidenceLabel: "High confidence",
      evidenceCount: 1,
      explanation: "Retail presence is visible, but public evidence of receipt-to-owned profile capture is limited.",
      sourceUrls: ["https://sample-beverage.test/store-locator"]
    }
  ],
  diagnosticDetails: [],
  primaryParticipationLeak: {
    leakType: "POINTS_ONLY_LOYALTY",
    severity: 84,
    description: "The visible loyalty motion emphasizes points and VIP status more than verified community behaviors.",
    recommendedFix: "Move points and tiers into broader verified participation: reviews, referrals, UGC, preferences, and retail proof.",
    evidenceIds: ["demo_ev_rewards", "demo_ev_reviews"],
    sourceUrls: ["https://sample-beverage.test/rewards", "https://sample-beverage.test/reviews"]
  },
  recommendedPlaybook: {
    id: "RETAIL_TO_OWNED_DATA_BRIDGE",
    title: "Retail-to-owned data bridge",
    thesis: "Retail demand should become owned community data through receipt verification, member profiles, and follow-on DTC participation.",
    readiness: "OUTBOUND_READY",
    readinessReasons: [],
    confidence: 0.68,
    confidenceLabel: "High confidence",
    evidenceCount: 2,
    buyerPersona: "VP Ecommerce",
    outboundAngle: "Retail appears to create demand the brand may not fully own. Rediem can turn retail purchases into verified community profiles and follow-on DTC actions.",
    activationIdea: "Launch a receipt upload challenge that rewards verified retail buyers and routes them into reviews, referrals, or subscriptions.",
    whySelected: [
      "Retail presence is visible.",
      "Reviews and subscriptions create follow-on participation paths.",
      "Receipt upload is not clearly detected in public evidence."
    ],
    sourceUrls: ["https://sample-beverage.test/store-locator", "https://sample-beverage.test/reviews"]
  },
  displacementWedge: {
    vendor: "LoyaltyLion",
    category: "loyalty",
    likelyCurrentMotion: "Points, tiers, referrals, and VIP rewards anchored to purchase behavior.",
    whatNotToSay: "Do not say 'replace your loyalty platform.'",
    rediemWedge: "Move from points and referrals into broader verified participation across reviews, referrals, UGC, preferences, events, and retail proof.",
    migrationRisk: "MEDIUM",
    recommendedAngle: "Keep the loyalty investment intact while Rediem expands what can be verified, rewarded, and routed back into the customer profile.",
    buyerPersona: "Director of Retention or Loyalty Lead",
    supportingDiagnostics: [
      "Reviews and loyalty appear separate; Rediem can connect proof, referral, reward, and community actions.",
      "Klaviyo is present, so Rediem events can be routed into existing lifecycle segmentation."
    ],
    confidence: 0.82,
    confidenceLabel: "High confidence",
    evidenceCount: 1,
    sourceUrls: ["https://sample-beverage.test/rewards"]
  },
  feedback: {
    playbookAccepted: null,
    playbookOverrideReason: null,
    aeNotes: "",
    reviewedAt: null,
    reviewedBy: null,
    status: null
  },
  evidenceUrls: [
    "https://sample-beverage.test/rewards",
    "https://sample-beverage.test/reviews",
    "https://sample-beverage.test/store-locator"
  ],
  buyerCommittee: {
    economicBuyers: [],
    operatorBuyers: [
      {
        id: "demo_buyer_retention",
        fullName: "Maya Chen",
        title: "Director of Retention",
        email: "maya@example.com",
        score: 91,
        personaGroup: "operatorBuyer",
        angle: "Owns retention, lifecycle, loyalty, and repeat-purchase loops."
      }
    ],
    technicalBuyers: [],
    influencers: []
  },
  suggestedOutboundAngle: "Retail appears to create demand the brand may not fully own. Rediem can turn retail purchases into verified community profiles and follow-on DTC actions."
};

export async function getRediemAccountsData(): Promise<RediemAccountsData> {
  try {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return getMockRediemAccountsData();
  }

  const [accounts, formulaColumns] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId: workspace.id },
      include: {
        brandProfile: true,
        brandActivationIdeas: { orderBy: [{ confidence: "desc" }, { createdAt: "desc" }] },
        competitorToolDetections: true,
        signals: { orderBy: [{ totalScore: "desc" }, { createdAt: "desc" }] }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.formulaColumn.findMany({
      where: { workspaceId: workspace.id, scope: "ACCOUNT", enabled: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const accountIds = accounts.map((account) => account.id);
  const signalIds = accounts.flatMap((account) => account.signals.map((signal) => signal.id));
  const [evidence, formulaResults] = await Promise.all([
    prisma.evidence.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { entityType: "ACCOUNT", entityId: { in: accountIds } },
          { entityType: "SIGNAL", entityId: { in: signalIds } }
        ]
      },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.formulaResult.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "ACCOUNT",
        formulaColumnId: { in: formulaColumns.map((column) => column.id) }
      },
      include: { formulaColumn: true },
      orderBy: { evaluatedAt: "desc" }
    })
  ]);

  const evidenceByEntity = groupEvidence(evidence);
  const signalToAccount = new Map(
    accounts.flatMap((account) =>
      account.signals.map((signal) => [signal.id, account.id] as const)
    )
  );
  const signalEvidenceByAccount = new Map<string, EvidenceItem[]>();
  for (const item of evidence) {
    if (item.entityType !== "SIGNAL") {
      continue;
    }
    const accountId = signalToAccount.get(item.entityId);
    if (!accountId) {
      continue;
    }
    const list = signalEvidenceByAccount.get(accountId) ?? [];
    list.push(toEvidenceItem(item));
    signalEvidenceByAccount.set(accountId, list);
  }

  const formulaNames = formulaColumns.map((column) => column.name);
  const formulasByEntity = groupFormulaResults(formulaResults);
  const rows = accounts.map((account): RediemAccountRow => {
    const accountEvidence = evidenceByEntity.get(account.id) ?? [];
    const signalEvidence = signalEvidenceByAccount.get(account.id) ?? [];
    const formulaOutputs = fillFormulaCells(formulaNames, formulasByEntity.get(account.id) ?? []);

    return toRediemAccountRow({
      account,
      formulaOutputs,
      evidence: [...accountEvidence, ...signalEvidence]
    });
  });

  return {
    workspaceId: workspace.id,
    rows,
    metrics: buildRediemMetrics(rows)
  };
  } catch {
    return getMockRediemAccountsData();
  }
}

export async function getRediemAccountDetailData(
  accountId: string
): Promise<RediemAccountDetail | null> {
  try {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      brandProfile: true,
      brandActivationIdeas: { orderBy: [{ confidence: "desc" }, { createdAt: "desc" }] },
      competitorToolDetections: { orderBy: [{ category: "asc" }, { confidence: "desc" }] },
      signals: { orderBy: [{ totalScore: "desc" }, { createdAt: "desc" }] },
      communityFlywheelSnapshots: {
        orderBy: [{ snapshotDate: "desc" }, { createdAt: "desc" }],
        take: 1
      },
      communityFlywheelLeaks: { orderBy: [{ severity: "desc" }, { createdAt: "desc" }] },
      people: { orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }] }
    }
  });

  if (!account) {
    return accountId === MOCK_REDIEM_DETAIL.row.id ? MOCK_REDIEM_DETAIL : null;
  }

  const [formulaColumns, formulaResults, evidence] = await Promise.all([
    prisma.formulaColumn.findMany({
      where: { workspaceId: account.workspaceId, scope: "ACCOUNT", enabled: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.formulaResult.findMany({
      where: {
        workspaceId: account.workspaceId,
        entityType: "ACCOUNT",
        entityId: account.id
      },
      include: { formulaColumn: true },
      orderBy: { evaluatedAt: "desc" }
    }),
    prisma.evidence.findMany({
      where: {
        workspaceId: account.workspaceId,
        OR: [
          { entityType: "ACCOUNT", entityId: account.id },
          { entityType: "SIGNAL", entityId: { in: account.signals.map((signal) => signal.id) } }
        ]
      },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }]
    })
  ]);

  const formulasByEntity = groupFormulaResults(formulaResults);
  const formulaOutputs = fillFormulaCells(
    formulaColumns.map((column) => column.name),
    formulasByEntity.get(account.id) ?? []
  );
  const row = toRediemAccountRow({
    account,
    formulaOutputs,
    evidence: evidence.map(toEvidenceItem)
  });
  const evidenceForScoring = evidence.map((item) => ({
    id: item.id,
    fieldName: item.fieldName,
    value: item.value,
    sourceUrl: item.sourceUrl,
    provider: item.provider,
    rawExcerpt: item.rawExcerpt,
    confidence: item.confidence
  }));
  const cfrEstimate = account.brandProfile
    ? calculateCommunityFlywheelRatio({
        profile: account.brandProfile,
        signals: account.signals,
        detections: account.competitorToolDetections,
        evidence: evidenceForScoring
      })
    : null;
  const persistedCfr = account.communityFlywheelSnapshots[0] ?? null;
  const gtmDiagnostics = account.brandProfile
    ? calculateGtmDiagnostics({
        profile: account.brandProfile,
        signals: account.signals,
        detections: account.competitorToolDetections,
        evidence: evidenceForScoring
      })
    : [];
  const topDiagnostics = [...gtmDiagnostics]
    .filter((diagnostic) => diagnostic.score >= 50 || diagnostic.confidence >= 0.45)
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence)
    .slice(0, 2);
  const diagnosticDetails = [...gtmDiagnostics]
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence);
  const playbookSelection = selectRediemPlaybooks({
    gtmDiagnostics,
    communityFlywheelRatio: cfrEstimate,
    brandProfile: account.brandProfile,
    signals: account.signals,
    detections: account.competitorToolDetections,
    evidence: evidenceForScoring
  })[0] ?? null;
  const displacementWedge = selectPrimaryDisplacementWedge(
    generateDisplacementWedges({
      detections: account.competitorToolDetections,
      evidence: evidenceForScoring
    })
  );
  const breakdown = account.brandProfile
    ? scoreRediemFit(
        account.brandProfile,
        account.signals,
        account.competitorToolDetections
      ).components
    : null;
  const playbookReadiness = playbookSelection
    ? classifyOutboundReadiness({
        baseReadiness: playbookSelection.readiness,
        freshness: row.analysisFreshness,
        confidence: playbookSelection.confidence
      })
    : null;

  return {
    row,
    fitBreakdown: breakdown
      ? [
          { label: "Community Energy", score: breakdown.communityEnergy },
          { label: "Participation Capture Gap", score: breakdown.participationCaptureGap },
          { label: "Ritual Repeat Purchase Fit", score: breakdown.ritualRepeatPurchaseFit },
          { label: "Retail-to-Owned Data", score: breakdown.retailToOwnedDataOpportunity },
          { label: "Mission / Identity Strength", score: breakdown.missionIdentityStrength },
          { label: "Stack / Migration Opportunity", score: breakdown.stackMigrationOpportunity },
          { label: "Timing Signal", score: breakdown.timingSignal }
        ]
      : [],
    profileFacts: account.brandProfile ? buildProfileFacts(account.brandProfile) : [],
    detections: account.competitorToolDetections.map(toDetectionView),
    signals: account.signals.map(toSignalView),
    activationIdeas: account.brandActivationIdeas.map(toActivationIdeaView),
    communityFlywheel: {
      estimatedCfr: persistedCfr?.estimatedCfr ?? cfrEstimate?.estimatedCfr ?? null,
      cfrTier: persistedCfr?.cfrTier ?? cfrEstimate?.cfrTier ?? "Unknown",
      cfrConfidence: persistedCfr?.cfrConfidence ?? cfrEstimate?.cfrConfidence ?? null,
      earnedCommunityGrowth: persistedCfr?.earnedCommunityGrowth ?? cfrEstimate?.earnedCommunityGrowth ?? null,
      subsidizedTransactionalGrowth: persistedCfr?.subsidizedTransactionalGrowth ?? cfrEstimate?.subsidizedTransactionalGrowth ?? null,
      explanation: arrayOfStrings(persistedCfr?.explanation).length > 0
        ? arrayOfStrings(persistedCfr?.explanation)
        : cfrEstimate?.explanation ?? [],
      lowConfidence: (persistedCfr?.cfrConfidence ?? cfrEstimate?.cfrConfidence ?? 0) < 0.45
    },
    topDiagnostics: topDiagnostics.map(toDiagnosticView),
    diagnosticDetails: diagnosticDetails.map(toDiagnosticView),
    primaryParticipationLeak: toPrimaryLeakView(account.communityFlywheelLeaks[0], cfrEstimate?.leaks[0]),
    recommendedPlaybook: playbookSelection
      ? {
          id: playbookSelection.playbook.id,
          title: playbookSelection.playbook.title,
          thesis: playbookSelection.playbook.thesis,
          readiness: playbookReadiness?.status ?? playbookSelection.readiness,
          readinessReasons: playbookReadiness?.reasons ?? [],
          confidence: playbookSelection.confidence,
          confidenceLabel: classifyConfidence(playbookSelection.confidence).label,
          evidenceCount: uniqueStrings([
            ...playbookSelection.sourceUrls,
            ...playbookSelection.supportingEvidenceIds
          ]).length,
          buyerPersona: playbookSelection.playbook.recommendedBuyerPersonas[0] ?? "Retention or ecommerce owner",
          outboundAngle: playbookSelection.playbook.outboundAngle,
          activationIdea: playbookSelection.playbook.activationIdea,
          whySelected: playbookSelection.whySelected,
          sourceUrls: playbookSelection.sourceUrls
        }
      : null,
    displacementWedge: displacementWedge
      ? {
          vendor: displacementWedge.vendor,
          category: displacementWedge.category,
          likelyCurrentMotion: displacementWedge.likelyCurrentMotion,
          whatNotToSay: displacementWedge.whatNotToSay,
          rediemWedge: displacementWedge.rediemWedge,
          migrationRisk: displacementWedge.migrationRisk,
          recommendedAngle: displacementWedge.recommendedAngle,
          buyerPersona: displacementWedge.buyerPersona,
          supportingDiagnostics: displacementWedge.supportingDiagnostics,
          confidence: displacementWedge.confidence,
          confidenceLabel: classifyConfidence(displacementWedge.confidence).label,
          evidenceCount: displacementWedge.sourceUrls.length,
          sourceUrls: displacementWedge.sourceUrls
        }
      : null,
    feedback: buildEmptyFeedback(),
    evidenceUrls: uniqueStrings(evidence.map((item) => item.sourceUrl)),
    buyerCommittee: groupRediemBuyers(account.people),
    suggestedOutboundAngle: playbookSelection?.playbook.outboundAngle ?? displacementWedge?.recommendedAngle ?? buildOutboundAngle(account.brandActivationIdeas[0], row)
  };
  } catch {
    return accountId === MOCK_REDIEM_DETAIL.row.id ? MOCK_REDIEM_DETAIL : null;
  }
}

export async function getRediemPlaybooksData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return { workspaceId: undefined, playbooks: [] };
  }

  const playbooks = await prisma.playbook.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" }
  });

  return { workspaceId: workspace.id, playbooks };
}

export async function getRediemFormulaData() {
  const data = await getFormulaSettingsData();
  const isRediemTemplate = (value: { key?: string; name: string; description?: string }) =>
    [value.key, value.name, value.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes("rediem");
  const isRediemFormula = (value: { name: string; expression: string }) =>
    [value.name, value.expression].join(" ").toLowerCase().includes("rediem");

  return {
    ...data,
    formulas: data.formulas.filter(isRediemFormula),
    templates: data.templates.filter(isRediemTemplate)
  };
}

function toRediemAccountRow({
  account,
  formulaOutputs,
  evidence
}: {
  account: Awaited<ReturnType<typeof prisma.account.findMany>>[number] & {
    brandProfile: BrandProfileShape | null;
    brandActivationIdeas: Array<{ title: string; confidence: number | null }>;
    competitorToolDetections: DetectionShape[];
    signals: SignalShape[];
  };
  formulaOutputs: FormulaCell[];
  evidence: EvidenceItem[];
}): RediemAccountRow {
  const profile = account.brandProfile;
  const loyaltyPainScore = profile
    ? calculateLoyaltyPainScore(profile, account.competitorToolDetections)
    : null;
  const communityReadinessScore = profile
    ? profile.communityReadinessScore ?? calculateCommunityReadinessScore(profile, account.signals)
    : null;
  const fitScore = profile
    ? profile.rediemFitScore ?? scoreRediemFit(profile, account.signals, account.competitorToolDetections).score
    : null;
  const lastAnalyzedDate = (
    profile?.lastScoredAt ??
    account.lastEnrichedAt ??
    profile?.updatedAt ??
    account.updatedAt
  );
  const confidence = deriveAccountConfidence([
    account.confidenceScore,
    ...evidence.map((item) => item.confidence)
  ]);
  const analysisFreshness = classifyAnalysisFreshness(lastAnalyzedDate);

  return {
    id: account.id,
    brand: account.name,
    domain: account.domain ?? "—",
    category: profile?.brandCategory ?? profile?.productCategory ?? account.industry ?? "—",
    ecommercePlatform: profile?.ecommercePlatform ?? "Unknown",
    loyaltyProvider: profile?.loyaltyProvider ?? (profile?.hasLoyaltyProgram ? "Unknown" : "None detected"),
    loyaltyType: profile?.loyaltyProgramType ?? (profile?.hasLoyaltyProgram ? "Unknown" : "None detected"),
    hasSubscription: profile?.hasSubscription ?? null,
    hasReviews: profile?.hasReviews ?? null,
    shopifyDetected: profile?.shopifyDetected ?? null,
    hasLoyaltyProgram: profile?.hasLoyaltyProgram ?? null,
    socialCommunityScore: profile?.socialCommunityScore ?? null,
    loyaltyPainScore,
    migrationPainScore: profile?.migrationPainScore ?? null,
    communityReadinessScore,
    agenticCommerceScore: profile?.agenticCommerceScore ?? null,
    rediemFitScore: fitScore,
    tier: fitScore === null ? "Unanalyzed" : classifyRediemTier(fitScore),
    recommendedPlay: recommendedPlayFrom(formulaOutputs, account.brandActivationIdeas[0]?.title, profile),
    lastAnalyzed: lastAnalyzedDate.toISOString(),
    analysisFreshness,
    confidence,
    outboundReadiness: classifyOutboundReadiness({
      freshness: analysisFreshness,
      confidence
    }),
    evidence,
    formulaOutputs
  };
}

function buildRediemMetrics(rows: RediemAccountRow[]): RediemMetric[] {
  const analyzedRows = rows.filter((row) => row.rediemFitScore !== null);
  const tierOne = rows.filter((row) => row.tier === "Tier 1").length;
  const migrationReady = rows.filter((row) => (row.migrationPainScore ?? 0) > 70).length;
  const communityReady = rows.filter((row) => (row.communityReadinessScore ?? 0) > 70).length;

  return [
    { label: "Analyzed Brands", value: analyzedRows.length.toString(), detail: `${rows.length} total accounts` },
    { label: "Tier 1 Brands", value: tierOne.toString(), detail: "Highest Rediem fit" },
    { label: "Migration Pain > 70", value: migrationReady.toString(), detail: "Displacement angle" },
    { label: "Community Ready > 70", value: communityReady.toString(), detail: "Activation-ready audience" }
  ];
}

function getMockRediemAccountsData(): RediemAccountsData {
  const rows = [MOCK_REDIEM_ROW];

  return {
    workspaceId: "demo-workspace",
    rows,
    metrics: buildRediemMetrics(rows)
  };
}

function recommendedPlayFrom(
  formulaOutputs: FormulaCell[],
  topIdeaTitle: string | undefined,
  profile: BrandProfileShape | null
) {
  const formulaPlay = formulaOutputs.find((formula) => formula.name === "Recommended Play");
  if (formulaPlay && formulaPlay.value !== "—" && !formulaPlay.error) {
    return formulaPlay.value;
  }

  if (topIdeaTitle) {
    return topIdeaTitle;
  }

  if (profile?.hasRetailPresence && profile?.hasReviews) {
    return "Retail-to-DTC receipt loop";
  }

  if (profile?.hasSubscription) {
    return "Subscription retention series";
  }

  if (profile?.hasUGC || (profile?.socialCommunityScore ?? 0) >= 70) {
    return "UGC community challenge";
  }

  if (profile?.hasLoyaltyProgram) {
    return "Loyalty migration audit";
  }

  return profile ? "Community readiness audit" : "Run Rediem analysis";
}

function buildProfileFacts(profile: BrandProfileShape) {
  return [
    { label: "Commerce Platform", value: profile.ecommercePlatform ?? "Unknown" },
    { label: "Shopify Detected", value: formatBoolean(profile.shopifyDetected) },
    { label: "Shopify Plus Likely", value: formatBoolean(profile.shopifyPlusLikely) },
    { label: "Brand Category", value: profile.brandCategory ?? "Unknown" },
    { label: "Product Category", value: profile.productCategory ?? "Unknown" },
    { label: "Price Point", value: profile.pricePoint ?? "Unknown" },
    { label: "Target Customer", value: profile.targetCustomer ?? "Unknown" },
    { label: "Subscription", value: profile.subscriptionProvider ?? formatBoolean(profile.hasSubscription) },
    { label: "Loyalty Program", value: profile.loyaltyProvider ?? formatBoolean(profile.hasLoyaltyProgram) },
    { label: "Loyalty Type", value: profile.loyaltyProgramType ?? "Unknown" },
    { label: "Referral Program", value: formatBoolean(profile.hasReferralProgram) },
    { label: "Reviews", value: profile.reviewProvider ?? formatBoolean(profile.hasReviews) },
    { label: "UGC", value: formatBoolean(profile.hasUGC) },
    { label: "Retail Presence", value: formatBoolean(profile.hasRetailPresence) },
    { label: "Sustainability Angle", value: profile.sustainabilityAngle ?? "Not detected" },
    { label: "Mission Angle", value: profile.missionDrivenAngle ?? "Not detected" }
  ];
}

function groupRediemBuyers(
  people: Array<{
    id: string;
    fullName: string;
    title: string | null;
    email: string | null;
    roleScore: number | null;
  }>
) {
  const groups = {
    economicBuyers: [] as RediemBuyer[],
    operatorBuyers: [] as RediemBuyer[],
    technicalBuyers: [] as RediemBuyer[],
    influencers: [] as RediemBuyer[]
  };

  for (const person of people) {
    const normalized = normalizeRediemTitle(person.title ?? "");
    const view: RediemBuyer = {
      id: person.id,
      fullName: person.fullName,
      title: person.title ?? "—",
      email: person.email ?? "—",
      score: person.roleScore,
      personaGroup: normalized.personaGroup,
      angle: normalized.angle
    };

    if (normalized.personaGroup === "economicBuyer") {
      groups.economicBuyers.push(view);
    } else if (normalized.personaGroup === "operatorBuyer") {
      groups.operatorBuyers.push(view);
    } else if (normalized.personaGroup === "technicalBuyer") {
      groups.technicalBuyers.push(view);
    } else if (normalized.personaGroup === "influencer") {
      groups.influencers.push(view);
    }
  }

  return groups;
}

function buildOutboundAngle(
  idea: { title: string; description: string | null } | undefined,
  row: RediemAccountRow
) {
  if (idea?.description) {
    const line = idea.description
      .split("\n")
      .find((item) => item.toLowerCase().startsWith("outbound one-liner:"));
    if (line) {
      return line.replace(/^Outbound one-liner:\s*/i, "");
    }
  }

  if (row.migrationPainScore !== null && row.migrationPainScore > 70) {
    return `${row.brand} shows loyalty migration pressure; lead with a concrete path from points/VIP mechanics into participation-based community rewards.`;
  }

  if (row.hasSubscription) {
    return `${row.brand} has repeat-purchase mechanics; lead with renewal, referral, and community activation loops.`;
  }

  return `${row.brand} needs stronger evidence before using a highly specific Rediem angle.`;
}

function toDetectionView(detection: DetectionShape): RediemDetectionView {
  return {
    id: detection.id,
    category: detection.category,
    vendor: detection.vendor,
    confidence: detection.confidence,
    sourceUrl: detection.sourceUrl,
    evidence: detection.evidence
  };
}

function toSignalView(signal: SignalShape): RediemSignalView {
  return {
    id: signal.id,
    type: signal.type,
    title: signal.title,
    totalScore: signal.totalScore,
    sourceUrl: signal.sourceUrl
  };
}

function toActivationIdeaView(
  idea: Awaited<ReturnType<typeof prisma.brandActivationIdea.findMany>>[number]
): RediemActivationIdeaView {
  return {
    id: idea.id,
    title: idea.title,
    type: idea.type,
    targetBehavior: idea.targetBehavior ?? "—",
    expectedImpact: idea.expectedImpact ?? "—",
    description: idea.description,
    confidence: idea.confidence,
    evidenceIds: arrayOfStrings(idea.evidenceIds)
  };
}

function toDiagnosticView(diagnostic: {
  metricId: string;
  label: string;
  score: number;
  tier: string;
  confidence: number;
  explanation: string;
  sourceUrls: string[];
  sourceEvidenceIds?: string[];
}) {
  return {
    metricId: diagnostic.metricId,
    label: diagnostic.label,
    score: diagnostic.score,
    tier: diagnostic.tier,
    confidence: diagnostic.confidence,
    confidenceLabel: classifyConfidence(diagnostic.confidence).label,
    evidenceCount: uniqueStrings([
      ...diagnostic.sourceUrls,
      ...(diagnostic.sourceEvidenceIds ?? [])
    ]).length,
    explanation: diagnostic.explanation,
    sourceUrls: diagnostic.sourceUrls
  };
}

function buildEmptyFeedback() {
  return {
    playbookAccepted: null,
    playbookOverrideReason: null,
    aeNotes: "",
    reviewedAt: null,
    reviewedBy: null,
    status: null
  };
}

function toPrimaryLeakView(
  persisted:
    | {
        leakType: string;
        severity: number;
        description: string;
        recommendedFix: string | null;
        evidenceIds: unknown;
        sourceUrls: unknown;
      }
    | undefined,
  estimated:
    | {
        leakType: string;
        severity: number;
        description: string;
        recommendedFix: string;
        evidenceIds: string[];
        sourceUrls: string[];
      }
    | undefined
) {
  if (persisted) {
    return {
      leakType: persisted.leakType,
      severity: persisted.severity,
      description: persisted.description,
      recommendedFix: persisted.recommendedFix ?? "Review the recommended Rediem play.",
      evidenceIds: arrayOfStrings(persisted.evidenceIds),
      sourceUrls: arrayOfStrings(persisted.sourceUrls)
    };
  }

  if (estimated) {
    return {
      leakType: estimated.leakType,
      severity: estimated.severity,
      description: estimated.description,
      recommendedFix: estimated.recommendedFix,
      evidenceIds: estimated.evidenceIds,
      sourceUrls: estimated.sourceUrls
    };
  }

  return null;
}

function groupEvidence(items: Awaited<ReturnType<typeof prisma.evidence.findMany>>) {
  const map = new Map<string, EvidenceItem[]>();

  for (const item of items) {
    const list = map.get(item.entityId) ?? [];
    list.push(toEvidenceItem(item));
    map.set(item.entityId, list);
  }

  return map;
}

function toEvidenceItem(
  item: Awaited<ReturnType<typeof prisma.evidence.findMany>>[number]
): EvidenceItem {
  return {
    id: item.id,
    entityType: item.entityType,
    entityId: item.entityId,
    fieldName: item.fieldName,
    value: item.value,
    sourceUrl: item.sourceUrl,
    provider: item.provider,
    rawExcerpt: item.rawExcerpt,
    confidence: item.confidence,
    capturedAt: item.capturedAt.toISOString()
  };
}

function groupFormulaResults(results: FormulaResultWithColumn[]) {
  const map = new Map<string, FormulaCell[]>();

  for (const result of results) {
    const list = map.get(result.entityId) ?? [];
    list.push({
      columnId: result.formulaColumnId,
      name: result.formulaColumn.name,
      value: displayJsonValue(result.value),
      error: result.error
    });
    map.set(result.entityId, list);
  }

  return map;
}

function fillFormulaCells(names: string[], cells: FormulaCell[]) {
  return names.map((name) => {
    const cell = cells.find((item) => item.name === name);
    return (
      cell ?? {
        columnId: name,
        name,
        value: "—",
        error: null
      }
    );
  });
}

function displayJsonValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function uniqueStrings(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}
