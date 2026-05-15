import {
  upsertPersonWithEvidence,
  type EvidenceClient,
  type EnrichedField
} from "@/server/evidence";
import { maybeEvaluateFormulasAfterEntityEnrichment } from "@/server/formulas";
import type { PeopleProvider, PersonResult } from "@/server/providers";
import { redactSensitiveValue } from "@/server/providers/redaction";
import { withCache, type CacheEntryClient } from "@/server/cache";
import {
  REDIEM_ROLE_HINTS,
  normalizeRediemTitle,
  rediemPersonaAngle,
  scorePersonForRediem,
  type RediemPersonaGroup
} from "@/server/scoring/rediemTitleTaxonomy";
import type { RediemBrandProfileInput, RediemSignalInput } from "@/server/scoring/rediem";
import { canonicalizeDomain } from "./researchAccount";

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  linkedinUrl?: string | null;
};

type StoredPersonRecord = {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  fullName: string;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  emailStatus?: string | null;
  phone?: string | null;
  location?: string | null;
  personaType?: string | null;
  roleScore?: number | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
  lastEnrichedAt?: Date | null;
};

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

export type ResolveRediemBuyingCommitteeInput = {
  workspaceId: string;
  accountId?: string;
  domain?: string;
  forceRefresh?: boolean;
  maxPeople?: number;
};

export type ResolveRediemBuyingCommitteeProviders = {
  people: PeopleProvider;
};

export type ResolveRediemBuyingCommitteeClient = EvidenceClient &
  CacheEntryClient & {
    account: EvidenceClient["account"] & {
      findFirst(args: {
        where: {
          id?: string;
          workspaceId: string;
          OR?: Array<{ domain?: string }>;
        };
      }): Promise<AccountRecord | null>;
      create(args: { data: Record<string, unknown> }): Promise<AccountRecord>;
    };
    person: EvidenceClient["person"] & {
      create(args: { data: Record<string, unknown> }): Promise<StoredPersonRecord>;
      update(args: {
        where: { id: string };
        data: Record<string, unknown>;
      }): Promise<StoredPersonRecord>;
    };
    brandProfile: {
      findFirst(args: {
        where: { workspaceId: string; accountId: string };
      }): Promise<(RediemBrandProfileInput & { id?: string }) | null>;
    };
    signal: EvidenceClient["signal"] & {
      findMany(args: {
        where: { workspaceId: string; accountId: string };
        orderBy?: { createdAt?: "asc" | "desc" };
        take?: number;
      }): Promise<RediemSignalInput[]>;
    };
    providerResult: {
      create(args: { data: ProviderResultRecord }): Promise<ProviderResultRecord>;
    };
  };

export type RediemCommitteePerson = {
  id: string;
  fullName: string;
  title?: string | null;
  seniority: string;
  department: string;
  personaGroup: RediemPersonaGroup;
  personRediemScore: number;
  contactabilityScore: number;
  sourceConfidence: number;
  linkedinUrl?: string | null;
  email?: string | null;
  angle: string;
  scoreBreakdown: {
    titleFit: number;
    departmentFit: number;
    seniorityFit: number;
    brandProfileFit: number;
    recentSignalRelevance: number;
    contactability: number;
    sourceConfidence: number;
  };
};

export type RediemMultithreadPlan = {
  whoToContactFirst: string | null;
  ccOrSequenceLater: Array<{
    fullName: string;
    title?: string | null;
    reason: string;
  }>;
  personaAngles: Record<
    "economicBuyers" | "operatorBuyers" | "technicalBuyers" | "influencers",
    string
  >;
};

export type RediemBuyingCommitteeDossier = {
  account: {
    id: string;
    name: string;
    domain?: string | null;
  };
  economicBuyers: RediemCommitteePerson[];
  operatorBuyers: RediemCommitteePerson[];
  technicalBuyers: RediemCommitteePerson[];
  influencers: RediemCommitteePerson[];
  recommendedFirstContact: RediemCommitteePerson | null;
  multithreadPlan: RediemMultithreadPlan;
};

export async function resolveRediemBuyingCommittee(
  client: ResolveRediemBuyingCommitteeClient,
  providers: ResolveRediemBuyingCommitteeProviders,
  input: ResolveRediemBuyingCommitteeInput
): Promise<RediemBuyingCommitteeDossier> {
  const account = await loadOrCreateAccount(client, input);
  const [brandProfile, recentSignals] = await Promise.all([
    client.brandProfile.findFirst({
      where: { workspaceId: input.workspaceId, accountId: account.id }
    }),
    client.signal.findMany({
      where: { workspaceId: input.workspaceId, accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);
  const peopleInput = {
    accountId: account.id,
    domain: account.domain ?? input.domain,
    roleHints: REDIEM_ROLE_HINTS,
    maxPeople: input.maxPeople ?? 16
  };
  const peopleCached = await withCache(client, {
    workspaceId: input.workspaceId,
    namespace: "people_lookup",
    provider: providers.people.name,
    toolName: "PeopleProvider.findPeople.rediem",
    providerInput: peopleInput,
    forceRefresh: input.forceRefresh,
    recordProviderResult: (result) => recordProviderResult(client, result),
    call: () =>
      providers.people.findPeople({
        domain: account.domain ?? input.domain,
        linkedinCompanyUrl: account.linkedinUrl ?? undefined,
        roleHints: REDIEM_ROLE_HINTS,
        maxResults: input.maxPeople ?? 16
      })
  });

  if (!peopleCached.cached) {
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: providers.people.name,
      toolName: "PeopleProvider.findPeople.rediem",
      inputHash: peopleCached.inputHash,
      rawResponse: peopleCached.value,
      normalizedResponse: peopleCached.value,
      costUsd: 0,
      latencyMs: peopleCached.latencyMs,
      status: "SUCCESS"
    });
  }

  const storedPeople = await Promise.all(
    peopleCached.value.map((person) =>
      normalizeScoreAndStoreRediemPerson(client, {
        workspaceId: input.workspaceId,
        account,
        person,
        providerName: providers.people.name,
        brandProfile,
        recentSignals
      })
    )
  );
  const groups = groupRediemCommittee(storedPeople);
  const recommendedFirstContact = pickRecommendedFirstContact(groups);

  return {
    account: {
      id: account.id,
      name: account.name,
      domain: account.domain
    },
    ...groups,
    recommendedFirstContact,
    multithreadPlan: buildMultithreadPlan(groups, recommendedFirstContact)
  };
}

async function loadOrCreateAccount(
  client: ResolveRediemBuyingCommitteeClient,
  input: ResolveRediemBuyingCommitteeInput
): Promise<AccountRecord> {
  if (input.accountId) {
    const account = await client.account.findFirst({
      where: {
        id: input.accountId,
        workspaceId: input.workspaceId
      }
    });

    if (!account) {
      throw new Error(`Account not found: ${input.accountId}`);
    }

    return account;
  }

  if (!input.domain) {
    throw new Error("Either accountId or domain is required.");
  }

  const domain = canonicalizeDomain(input.domain);
  const existing = await client.account.findFirst({
    where: {
      workspaceId: input.workspaceId,
      OR: [{ domain }]
    }
  });

  if (existing) {
    return existing;
  }

  return client.account.create({
    data: {
      workspaceId: input.workspaceId,
      domain,
      name: titleizeDomain(domain),
      lastEnrichedAt: new Date()
    }
  });
}

async function normalizeScoreAndStoreRediemPerson(
  client: ResolveRediemBuyingCommitteeClient,
  input: {
    workspaceId: string;
    account: AccountRecord;
    person: PersonResult;
    providerName: string;
    brandProfile: RediemBrandProfileInput | null;
    recentSignals: RediemSignalInput[];
  }
): Promise<RediemCommitteePerson> {
  const normalized = normalizeRediemTitle(input.person.title ?? "");
  const contactabilityScore = calculateContactabilityScore(input.person);
  const score = scorePersonForRediem({
    title: input.person.title ?? "",
    department: normalized.department,
    seniority: normalized.seniority,
    brandProfile: input.brandProfile,
    recentSignals: input.recentSignals,
    contactabilityScore,
    sourceConfidence: input.person.sourceConfidence
  });
  const source = input.person.evidence?.[0];
  const capturedAt = source?.capturedAt ?? new Date();
  const provider = source?.provider ?? input.providerName;
  const sourceUrl = source?.sourceUrl ?? input.person.linkedinUrl;
  const rawExcerpt = source?.rawExcerpt ?? input.person.title;
  const evidence = <T extends string | number>(
    value: T | null | undefined,
    confidence = input.person.sourceConfidence ?? 0.6
  ): EnrichedField<T> => ({
    value,
    sourceUrl,
    provider,
    confidence,
    capturedAt,
    rawExcerpt
  });
  const stored = await upsertPersonWithEvidence(client, {
    workspaceId: input.workspaceId,
    overwritePolicy: "HIGHER_CONFIDENCE",
    fields: {
      accountId: evidence(input.account.id, 1),
      fullName: evidence(input.person.fullName),
      title: evidence(input.person.title),
      seniority: evidence(normalized.seniority),
      department: evidence(normalized.department),
      linkedinUrl: evidence(input.person.linkedinUrl),
      email: evidence(input.person.email),
      emailStatus: evidence(input.person.email ? "UNKNOWN" : undefined),
      phone: evidence(input.person.phone),
      location: evidence(input.person.location),
      personaType: evidence(toGenericPersonaType(normalized.personaGroup)),
      roleScore: evidence(score.personRediemScore, 0.85),
      contactabilityScore: evidence(score.contactability, 0.85),
      sourceConfidence: evidence(score.sourceConfidence, 0.85)
    }
  });
  await maybeEvaluateFormulasAfterEntityEnrichment(client, {
    workspaceId: input.workspaceId,
    entityType: "PERSON",
    entityId: stored.id
  });

  return {
    id: stored.id,
    fullName: stored.fullName,
    title: stored.title,
    seniority: stored.seniority ?? normalized.seniority,
    department: stored.department ?? normalized.department,
    personaGroup: normalized.personaGroup,
    personRediemScore: stored.roleScore ?? score.personRediemScore,
    contactabilityScore: stored.contactabilityScore ?? score.contactability,
    sourceConfidence: stored.sourceConfidence ?? score.sourceConfidence,
    linkedinUrl: stored.linkedinUrl,
    email: stored.email,
    angle: normalized.angle,
    scoreBreakdown: {
      titleFit: score.titleFit,
      departmentFit: score.departmentFit,
      seniorityFit: score.seniorityFit,
      brandProfileFit: score.brandProfileFit,
      recentSignalRelevance: score.recentSignalRelevance,
      contactability: score.contactability,
      sourceConfidence: score.sourceConfidence
    }
  };
}

function groupRediemCommittee(people: RediemCommitteePerson[]) {
  const sorted = [...people].sort(
    (left, right) => right.personRediemScore - left.personRediemScore
  );
  const groups = {
    economicBuyers: [] as RediemCommitteePerson[],
    operatorBuyers: [] as RediemCommitteePerson[],
    technicalBuyers: [] as RediemCommitteePerson[],
    influencers: [] as RediemCommitteePerson[]
  };

  for (const person of sorted) {
    switch (person.personaGroup) {
      case "economicBuyer":
        groups.economicBuyers.push(person);
        break;
      case "operatorBuyer":
        groups.operatorBuyers.push(person);
        break;
      case "technicalBuyer":
        groups.technicalBuyers.push(person);
        break;
      case "influencer":
      case "unknown":
        groups.influencers.push(person);
        break;
    }
  }

  return groups;
}

// Minimum contactabilityScore to be recommended as first contact — someone with at least
// one real contact channel (LinkedIn or email), not just the 30-point base.
const REACHABLE_CONTACT_THRESHOLD = 55;

function pickRecommendedFirstContact(groups: ReturnType<typeof groupRediemCommittee>) {
  function preferReachable(candidates: RediemCommitteePerson[]): RediemCommitteePerson | null {
    if (candidates.length === 0) return null;
    return (
      candidates.find((p) => p.contactabilityScore >= REACHABLE_CONTACT_THRESHOLD) ??
      candidates[0]
    );
  }

  return (
    preferReachable(groups.operatorBuyers) ??
    preferReachable(groups.economicBuyers) ??
    preferReachable(groups.technicalBuyers) ??
    preferReachable(groups.influencers) ??
    null
  );
}

function buildMultithreadPlan(
  groups: ReturnType<typeof groupRediemCommittee>,
  recommendedFirstContact: RediemCommitteePerson | null
): RediemMultithreadPlan {
  const later = [
    ...groups.economicBuyers,
    ...groups.operatorBuyers,
    ...groups.technicalBuyers,
    ...groups.influencers
  ]
    .filter((person) => person.id !== recommendedFirstContact?.id)
    .slice(0, 6)
    .map((person) => ({
      fullName: person.fullName,
      title: person.title,
      reason: `Sequence later for ${person.angle}.`
    }));

  return {
    whoToContactFirst: recommendedFirstContact
      ? `${recommendedFirstContact.fullName} (${recommendedFirstContact.title ?? "unknown title"})`
      : null,
    ccOrSequenceLater: later,
    personaAngles: {
      economicBuyers: rediemPersonaAngle("economicBuyer"),
      operatorBuyers: rediemPersonaAngle("operatorBuyer"),
      technicalBuyers: rediemPersonaAngle("technicalBuyer"),
      influencers: rediemPersonaAngle("influencer")
    }
  };
}

function calculateContactabilityScore(person: PersonResult): number {
  let score = 30;

  if (person.linkedinUrl) {
    score += 25;
  }

  if (person.email) {
    score += 30;
  }

  if (person.phone) {
    score += 15;
  }

  return Math.min(100, score);
}

function toGenericPersonaType(personaGroup: RediemPersonaGroup): string {
  switch (personaGroup) {
    case "economicBuyer":
      return "ECONOMIC_BUYER";
    case "technicalBuyer":
      return "TECHNICAL_BUYER";
    case "operatorBuyer":
      return "DAY_TO_DAY_OWNER";
    case "influencer":
    case "unknown":
      return "INFLUENCER";
  }
}

async function recordProviderResult(
  client: Pick<ResolveRediemBuyingCommitteeClient, "providerResult">,
  data: ProviderResultRecord
): Promise<void> {
  await client.providerResult.create({
    data: {
      ...data,
      rawResponse: toJsonCompatible(redactSensitiveValue(data.rawResponse)),
      normalizedResponse: toJsonCompatible(redactSensitiveValue(data.normalizedResponse))
    }
  });
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
