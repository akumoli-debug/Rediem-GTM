import { prisma } from "@/server/db/client";
import { getFormulaSettingsData, getWorkspaceSummary } from "@/server/workspace/tableData";
import {
  calculateCommunityReadinessScore,
  calculateLoyaltyPainScore,
  classifyRediemTier,
  scoreRediemFit
} from "@/server/scoring/rediem";
import { normalizeRediemTitle } from "@/server/scoring/rediemTitleTaxonomy";
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

export async function getRediemAccountsData(): Promise<RediemAccountsData> {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return { rows: [], metrics: [] };
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
}

export async function getRediemAccountDetailData(
  accountId: string
): Promise<RediemAccountDetail | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      brandProfile: true,
      brandActivationIdeas: { orderBy: [{ confidence: "desc" }, { createdAt: "desc" }] },
      competitorToolDetections: { orderBy: [{ category: "asc" }, { confidence: "desc" }] },
      signals: { orderBy: [{ totalScore: "desc" }, { createdAt: "desc" }] },
      people: { orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }] }
    }
  });

  if (!account) {
    return null;
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
  const breakdown = account.brandProfile
    ? scoreRediemFit(
        account.brandProfile,
        account.signals,
        account.competitorToolDetections
      ).components
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
    buyerCommittee: groupRediemBuyers(account.people),
    suggestedOutboundAngle: buildOutboundAngle(account.brandActivationIdeas[0], row)
  };
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
    lastAnalyzed: (
      profile?.lastScoredAt ??
      account.lastEnrichedAt ??
      profile?.updatedAt ??
      account.updatedAt
    ).toISOString(),
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

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}
