// LEGACY B2B MODULE - DO NOT EXTEND FOR REDIEM USE CASES
//
// This workflow generates outreach angles for generic B2B SaaS motions:
// RevOps, GTM systems, developer infrastructure, enterprise deals.
// Its vocabulary (enterprise, compliance, RevOps, platform) is wrong for Rediem AEs
// who sell to DTC brand retention/loyalty/marketing teams.
//
// Rediem AEs need brand-specific angles: loyalty migration pain, subscription loops,
// community readiness, receipt-upload retail-to-DTC bridges.
//
// Deferred replacement: generateRediemOutreachAngles.ts, a DTC-specific AE angle
// generator that pulls from BrandProfile, communityFlywheelSnapshot, and BrandActivationIdea.
//
// Do not add DTC brand logic here. Do not reference this from Rediem workflows.

type EvidenceEntityType = "ACCOUNT" | "PERSON" | "SIGNAL" | "FORMULA_RESULT";

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  industry?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  blogSummary?: string | null;
  pressSummary?: string | null;
  accountScore?: number | null;
  confidenceScore?: number | null;
};

type PersonRecord = {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  fullName: string;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  personaType?: string | null;
  roleScore?: number | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
};

type SignalRecord = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  title: string;
  description?: string | null;
  signalDate?: Date | null;
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
  capturedAt: Date;
  createdAt?: Date;
};

type EvidenceCreateInput = Omit<EvidenceRecord, "id" | "createdAt">;

export type OutreachAngleVariant =
  | "conservative_direct"
  | "signal_based"
  | "creative_personable";

export type GenerateOutreachAnglesInput = {
  workspaceId: string;
  accountId: string;
  personId?: string;
  motion: string;
};

export type OutreachSignalReference = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
  totalScore?: number | null;
  signalDate?: Date | null;
};

export type OutreachEvidenceReference = {
  id: string;
  entityType: EvidenceEntityType;
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  confidence?: number | null;
  rawExcerpt?: string | null;
  capturedAt: Date;
};

export type OutreachAngle = {
  variant: OutreachAngleVariant;
  angleTitle: string;
  whyNow: string;
  painHypothesis: string;
  relevantSignals: OutreachSignalReference[];
  suggestedPersona: string;
  personalizationBullets: string[];
  sourceUrls: string[];
  confidence: number;
  doNotUseIfLowConfidence: boolean;
  citedEvidence: OutreachEvidenceReference[];
};

export type OutreachAngleDossier = {
  status: "READY" | "INSUFFICIENT_EVIDENCE";
  accountId: string;
  personId?: string;
  motion: string;
  angles: OutreachAngle[];
  sourceUrls: string[];
  confidence: number;
  doNotUseIfLowConfidence: boolean;
  reason?: string;
};

export type OutreachAngleClient = {
  account: {
    findFirst(args: {
      where: { id: string; workspaceId: string };
    }): Promise<AccountRecord | null>;
  };
  person: {
    findFirst(args: {
      where: { id: string; workspaceId: string };
    }): Promise<PersonRecord | null>;
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
      orderBy?: { capturedAt?: "asc" | "desc"; createdAt?: "asc" | "desc" };
    }): Promise<EvidenceRecord[]>;
    create(args: { data: EvidenceCreateInput }): Promise<EvidenceRecord>;
  };
};

const GENERATED_PROVIDER = "outreach-angle-generator";
const MIN_READY_CONFIDENCE = 0.5;
const LOW_CONFIDENCE_WARNING = 0.72;

export async function generateOutreachAngles(
  client: OutreachAngleClient,
  input: GenerateOutreachAnglesInput
): Promise<OutreachAngleDossier> {
  const account = await client.account.findFirst({
    where: {
      id: input.accountId,
      workspaceId: input.workspaceId
    }
  });

  if (!account) {
    throw new Error(`Account not found: ${input.accountId}`);
  }

  const person = input.personId
    ? await client.person.findFirst({
        where: {
          id: input.personId,
          workspaceId: input.workspaceId
        }
      })
    : null;

  if (input.personId && !person) {
    throw new Error(`Person not found: ${input.personId}`);
  }

  if (person?.accountId && person.accountId !== account.id) {
    throw new Error(`Person ${person.id} does not belong to account ${account.id}.`);
  }

  const signals = await client.signal.findMany({
    where: {
      workspaceId: input.workspaceId,
      accountId: account.id
    },
    orderBy: {
      totalScore: "desc"
    },
    take: 8
  });
  const evidence = await loadCitedEvidence(client, {
    workspaceId: input.workspaceId,
    accountId: account.id,
    personId: person?.id,
    signals
  });
  const sourceUrls = collectSourceUrls(signals, evidence);
  const confidence = calculateOutreachConfidence(signals, evidence, sourceUrls);

  if (!hasEnoughEvidence(signals, evidence, sourceUrls, confidence)) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      accountId: account.id,
      personId: person?.id,
      motion: input.motion,
      angles: [],
      sourceUrls,
      confidence,
      doNotUseIfLowConfidence: true,
      reason: "insufficient evidence"
    };
  }

  const angles = buildAngles({
    account,
    person,
    motion: input.motion,
    signals,
    evidence,
    sourceUrls,
    confidence
  });

  await Promise.all(
    angles.map((angle) =>
      storeGeneratedAngle(client, {
        workspaceId: input.workspaceId,
        targetEntityType: person ? "PERSON" : "ACCOUNT",
        targetEntityId: person?.id ?? account.id,
        angle
      })
    )
  );

  return {
    status: "READY",
    accountId: account.id,
    personId: person?.id,
    motion: input.motion,
    angles,
    sourceUrls,
    confidence,
    doNotUseIfLowConfidence: confidence < LOW_CONFIDENCE_WARNING
  };
}

async function loadCitedEvidence(
  client: OutreachAngleClient,
  input: {
    workspaceId: string;
    accountId: string;
    personId?: string;
    signals: SignalRecord[];
  }
): Promise<EvidenceRecord[]> {
  const accountEvidence = await client.evidence.findMany({
    where: {
      workspaceId: input.workspaceId,
      entityType: "ACCOUNT",
      entityId: input.accountId
    },
    orderBy: {
      capturedAt: "desc"
    }
  });
  const personEvidence = input.personId
    ? await client.evidence.findMany({
        where: {
          workspaceId: input.workspaceId,
          entityType: "PERSON",
          entityId: input.personId
        },
        orderBy: {
          capturedAt: "desc"
        }
      })
    : [];
  const signalEvidence = await Promise.all(
    input.signals.slice(0, 5).map((signal) =>
      client.evidence.findMany({
        where: {
          workspaceId: input.workspaceId,
          entityType: "SIGNAL",
          entityId: signal.id
        },
        orderBy: {
          capturedAt: "desc"
        }
      })
    )
  );

  return [...accountEvidence, ...personEvidence, ...signalEvidence.flat()].filter(
    (row) => row.provider !== GENERATED_PROVIDER
  );
}

function buildAngles(input: {
  account: AccountRecord;
  person: PersonRecord | null;
  motion: string;
  signals: SignalRecord[];
  evidence: EvidenceRecord[];
  sourceUrls: string[];
  confidence: number;
}): OutreachAngle[] {
  const topSignals = input.signals.slice(0, 3);
  const citedEvidence = selectCitedEvidence(input.evidence);
  const suggestedPersona = suggestPersona(input.person, input.motion, topSignals);
  const whyNow = buildWhyNow(topSignals);
  const painHypothesis = buildPainHypothesis({
    account: input.account,
    motion: input.motion,
    signals: topSignals,
    evidence: citedEvidence
  });
  const personalizationBullets = buildPersonalizationBullets({
    account: input.account,
    person: input.person,
    signals: topSignals,
    evidence: citedEvidence
  });
  const references = topSignals.map(toSignalReference);
  const shared = {
    whyNow,
    painHypothesis,
    relevantSignals: references,
    suggestedPersona,
    personalizationBullets,
    sourceUrls: input.sourceUrls,
    confidence: input.confidence,
    doNotUseIfLowConfidence: input.confidence < LOW_CONFIDENCE_WARNING,
    citedEvidence: citedEvidence.map(toEvidenceReference)
  };
  const accountName = input.account.name || input.account.domain || "the account";
  const primarySignal = describeSignal(topSignals[0]);
  const secondarySignal = describeSignal(topSignals[1]);
  const personaPhrase = input.person?.title
    ? `${input.person.fullName}, ${input.person.title}`
    : suggestedPersona.toLowerCase();

  return [
    {
      variant: "conservative_direct",
      angleTitle: `${accountName} may have a practical ${input.motion} need based on ${primarySignal}.`,
      ...shared
    },
    {
      variant: "signal_based",
      angleTitle: secondarySignal
        ? `${primarySignal} plus ${secondarySignal} suggests ${accountName} may be prioritizing ${input.motion}.`
        : `${primarySignal} suggests ${accountName} may be prioritizing ${input.motion}.`,
      ...shared
    },
    {
      variant: "creative_personable",
      angleTitle: `A grounded opener for ${personaPhrase}: connect ${input.motion} to ${primarySignal}.`,
      ...shared
    }
  ];
}

function buildWhyNow(signals: SignalRecord[]): string {
  return signals
    .slice(0, 2)
    .map((signal) => `${formatSignalType(signal.type)}: ${signal.title}`)
    .join("; ");
}

function buildPainHypothesis(input: {
  account: AccountRecord;
  motion: string;
  signals: SignalRecord[];
  evidence: EvidenceRecord[];
}): string {
  const text = normalizeText(
    [
      input.motion,
      input.account.websiteSummary,
      input.account.pricingSummary,
      input.account.careersSummary,
      input.account.pressSummary,
      ...input.signals.flatMap((signal) => [signal.type, signal.title, signal.description]),
      ...input.evidence.flatMap((row) => [row.fieldName, row.value, row.rawExcerpt])
    ].join(" ")
  );

  if (containsAny(text, ["revops", "revenue operations", "sales ops", "gtm systems", "sales operations"])) {
    return "They may be formalizing GTM systems or revenue operations around current growth signals.";
  }

  if (containsAny(text, ["enterprise", "pricing", "plan", "sales-led", "sales led"])) {
    return "They may be tightening the handoff between demand, sales process, and enterprise packaging.";
  }

  if (containsAny(text, ["security", "compliance", "soc 2", "hipaa", "risk", "trust"])) {
    return "They may need stronger operational proof points and controls as buyer scrutiny increases.";
  }

  if (containsAny(text, ["platform", "infrastructure", "devops", "sre", "developer productivity"])) {
    return "They may be investing in technical systems that reduce operational drag for engineering teams.";
  }

  return `They may be evaluating whether ${input.motion} can help with the cited account-level priorities.`;
}

function buildPersonalizationBullets(input: {
  account: AccountRecord;
  person: PersonRecord | null;
  signals: SignalRecord[];
  evidence: EvidenceRecord[];
}): string[] {
  const bullets = [
    input.account.domain ? `Account domain: ${input.account.domain}` : null,
    input.account.industry ? `Industry context: ${input.account.industry}` : null,
    input.signals[0] ? `Recent signal: ${input.signals[0].title}` : null,
    input.person?.title
      ? `Person context: ${input.person.fullName} is listed as ${input.person.title}`
      : null,
    evidenceBullet(input.evidence)
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(bullets)).slice(0, 5);
}

function evidenceBullet(evidence: EvidenceRecord[]): string | null {
  const row = evidence.find((item) => item.value && item.sourceUrl) ?? evidence.find((item) => item.value);

  if (!row?.value) {
    return null;
  }

  return `Cited field: ${row.fieldName} = ${truncate(row.value, 120)}`;
}

function suggestPersona(
  person: PersonRecord | null,
  motion: string,
  signals: SignalRecord[]
): string {
  if (person?.personaType && person.personaType !== "UNKNOWN") {
    return humanizeEnum(person.personaType);
  }

  if (person?.title) {
    return person.title;
  }

  const text = normalizeText(
    [motion, ...signals.flatMap((signal) => [signal.type, signal.title, signal.description])].join(" ")
  );

  if (containsAny(text, ["developer", "infrastructure", "platform", "devops", "sre", "security"])) {
    return "Technical Buyer";
  }

  if (containsAny(text, ["revops", "sales ops", "gtm systems", "workflow", "revenue"])) {
    return "Day To Day Owner";
  }

  if (containsAny(text, ["pricing", "enterprise", "budget", "finance"])) {
    return "Economic Buyer";
  }

  return "Influencer";
}

function selectCitedEvidence(evidence: EvidenceRecord[]): EvidenceRecord[] {
  return [...evidence]
    .sort((a, b) => {
      const confidenceDelta = (b.confidence ?? 0) - (a.confidence ?? 0);

      if (confidenceDelta !== 0) {
        return confidenceDelta;
      }

      return b.capturedAt.getTime() - a.capturedAt.getTime();
    })
    .slice(0, 8);
}

function collectSourceUrls(signals: SignalRecord[], evidence: EvidenceRecord[]): string[] {
  return Array.from(
    new Set(
      [...signals.map((signal) => signal.sourceUrl), ...evidence.map((row) => row.sourceUrl)]
        .filter((url): url is string => Boolean(url))
        .map((url) => url.trim())
        .filter(Boolean)
    )
  );
}

function calculateOutreachConfidence(
  signals: SignalRecord[],
  evidence: EvidenceRecord[],
  sourceUrls: string[]
): number {
  if (signals.length === 0 || evidence.length === 0 || sourceUrls.length === 0) {
    return 0;
  }

  const signalScore = average(
    signals.slice(0, 3).map((signal) => normalizeScore(signal.totalScore ?? 50))
  );
  const evidenceScore = average(
    evidence.slice(0, 8).map((row) => normalizeConfidence(row.confidence ?? 0.5))
  );
  const sourceCoverage = Math.min(1, sourceUrls.length / 3);

  return round2(0.45 * signalScore + 0.4 * evidenceScore + 0.15 * sourceCoverage);
}

function hasEnoughEvidence(
  signals: SignalRecord[],
  evidence: EvidenceRecord[],
  sourceUrls: string[],
  confidence: number
): boolean {
  return (
    signals.length > 0 &&
    evidence.length > 0 &&
    sourceUrls.length > 0 &&
    confidence >= MIN_READY_CONFIDENCE
  );
}

async function storeGeneratedAngle(
  client: OutreachAngleClient,
  input: {
    workspaceId: string;
    targetEntityType: "ACCOUNT" | "PERSON";
    targetEntityId: string;
    angle: OutreachAngle;
  }
): Promise<void> {
  await client.evidence.create({
    data: {
      workspaceId: input.workspaceId,
      entityType: input.targetEntityType,
      entityId: input.targetEntityId,
      fieldName: `outreachAngle.${input.angle.variant}`,
      value: input.angle.angleTitle,
      sourceUrl: input.angle.sourceUrls[0] ?? null,
      provider: GENERATED_PROVIDER,
      rawExcerpt: JSON.stringify({
        whyNow: input.angle.whyNow,
        painHypothesis: input.angle.painHypothesis,
        relevantSignalIds: input.angle.relevantSignals.map((signal) => signal.id),
        citedEvidenceIds: input.angle.citedEvidence.map((row) => row.id),
        sourceUrls: input.angle.sourceUrls
      }),
      confidence: input.angle.confidence,
      capturedAt: new Date()
    }
  });
}

function toSignalReference(signal: SignalRecord): OutreachSignalReference {
  return {
    id: signal.id,
    type: signal.type,
    title: signal.title,
    description: signal.description,
    sourceUrl: signal.sourceUrl,
    totalScore: signal.totalScore,
    signalDate: signal.signalDate
  };
}

function toEvidenceReference(row: EvidenceRecord): OutreachEvidenceReference {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    fieldName: row.fieldName,
    value: row.value,
    sourceUrl: row.sourceUrl,
    provider: row.provider,
    confidence: row.confidence,
    rawExcerpt: row.rawExcerpt,
    capturedAt: row.capturedAt
  };
}

function describeSignal(signal: SignalRecord | undefined): string {
  if (!signal) {
    return "the cited evidence";
  }

  return `${formatSignalType(signal.type)} (${signal.title})`;
}

function formatSignalType(type: string): string {
  return humanizeEnum(type).toLowerCase();
}

function humanizeEnum(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeScore(value: number): number {
  if (value <= 1) {
    return clamp(value, 0, 1);
  }

  return clamp(value / 100, 0, 1);
}

function normalizeConfidence(value: number): number {
  if (value <= 1) {
    return clamp(value, 0, 1);
  }

  return clamp(value / 100, 0, 1);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}
