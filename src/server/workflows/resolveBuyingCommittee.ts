import {
  upsertPersonWithEvidence,
  type EvidenceClient,
  type EnrichedField
} from "@/server/evidence";
import type {
  CompanyProvider,
  PeopleProvider,
  PersonResult,
  WebResearchProvider
} from "@/server/providers";
import {
  normalizeTitle,
  roleHintsForMotion,
  scorePersonForMotion,
  type PersonaType
} from "@/server/scoring/titleTaxonomy";
import {
  getPlaybookForWorkflow,
  playbookMotion,
  playbookRoleHints
} from "@/server/playbooks";
import { maybeEvaluateFormulasAfterEntityEnrichment } from "@/server/formulas";
import { withCache } from "@/server/cache";
import { redactSensitiveValue } from "@/server/providers/redaction";
import {
  canonicalizeDomain,
  researchAccount,
  type ResearchAccountClient
} from "./researchAccount";

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  linkedinUrl?: string | null;
  industry?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  accountScore?: number | null;
  confidenceScore?: number | null;
};

type SignalContext = {
  id?: string;
  type?: string;
  title?: string;
  description?: string | null;
  totalScore?: number | null;
  createdAt?: Date;
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

export type ResolveBuyingCommitteeInput = {
  workspaceId: string;
  accountId?: string;
  domain?: string;
  motion: string;
  playbookId?: string;
  maxPeople?: number;
  forceRefresh?: boolean;
};

export type ResolveBuyingCommitteeProviders = {
  people: PeopleProvider;
  company?: CompanyProvider;
  webResearch?: WebResearchProvider;
};

export type ResolveBuyingCommitteeClient = ResearchAccountClient & {
  signal: ResearchAccountClient["signal"] & {
    findMany(args: {
      where: { workspaceId: string; accountId: string };
      orderBy?: { createdAt?: "asc" | "desc" };
      take?: number;
    }): Promise<SignalContext[]>;
  };
};

export type BuyingCommitteePerson = {
  id: string;
  fullName: string;
  title?: string | null;
  seniority: string;
  department: string;
  personaType: PersonaType;
  roleScore: number;
  contactabilityScore: number;
  sourceConfidence: number;
  linkedinUrl?: string | null;
  email?: string | null;
};

export type BuyingCommitteeDossier = {
  account: {
    id: string;
    name: string;
    domain?: string | null;
    accountScore?: number | null;
    confidenceScore?: number | null;
  };
  motion: string;
  buyingCommittee: {
    economicBuyer: BuyingCommitteePerson[];
    technicalBuyer: BuyingCommitteePerson[];
    dayToDayOwner: BuyingCommitteePerson[];
    influencer: BuyingCommitteePerson[];
    championCandidates: BuyingCommitteePerson[];
    blockerCandidates: BuyingCommitteePerson[];
  };
};

export async function resolveBuyingCommittee(
  client: ResolveBuyingCommitteeClient,
  providers: ResolveBuyingCommitteeProviders,
  input: ResolveBuyingCommitteeInput
): Promise<BuyingCommitteeDossier> {
  const playbook = await getPlaybookForWorkflow(client, input);
  const motion = playbookMotion(playbook, input.motion) ?? input.motion;
  const account = await loadOrResearchAccount(client, providers, input, motion);
  const roleHints = playbookRoleHints(playbook, roleHintsForMotion(motion));
  const peopleInput = {
    accountId: account.id,
    domain: account.domain,
    motion,
    playbookId: input.playbookId,
    roleHints,
    maxPeople: input.maxPeople ?? 12
  };
  const peopleCached = await withCache(client, {
    workspaceId: input.workspaceId,
    namespace: "people_lookup",
    provider: providers.people.name,
    toolName: "PeopleProvider.findPeople",
    providerInput: peopleInput,
    forceRefresh: input.forceRefresh,
    recordProviderResult: (result) => recordProviderResult(client, result),
    call: () =>
      providers.people.findPeople({
        domain: account.domain ?? input.domain,
        linkedinCompanyUrl: account.linkedinUrl ?? undefined,
        roleHints,
        maxResults: input.maxPeople ?? 12
      })
  });
  const people = peopleCached.value;

  if (!peopleCached.cached) {
    await recordProviderResult(client, {
      workspaceId: input.workspaceId,
      provider: providers.people.name,
      toolName: "PeopleProvider.findPeople",
      inputHash: peopleCached.inputHash,
      rawResponse: people,
      normalizedResponse: people,
      costUsd: 0,
      latencyMs: peopleCached.latencyMs,
      status: "SUCCESS"
    });
  }

  const recentSignals = await client.signal.findMany({
    where: {
      workspaceId: input.workspaceId,
      accountId: account.id
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });
  const storedPeople = await Promise.all(
    people.map((person) =>
      normalizeScoreAndStorePerson(client, {
        workspaceId: input.workspaceId,
        account,
        motion,
        person,
        providerName: providers.people.name,
        recentSignals
      })
    )
  );

  return {
    account: {
      id: account.id,
      name: account.name,
      domain: account.domain,
      accountScore: account.accountScore,
      confidenceScore: account.confidenceScore
    },
    motion,
    buyingCommittee: groupBuyingCommittee(storedPeople)
  };
}

async function loadOrResearchAccount(
  client: ResolveBuyingCommitteeClient,
  providers: ResolveBuyingCommitteeProviders,
  input: ResolveBuyingCommitteeInput,
  motion: string
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

  if (!providers.company || !providers.webResearch) {
    throw new Error(
      "Account research requires company and webResearch providers when no account exists."
    );
  }

  const dossier = await researchAccount(
    client,
    {
      company: providers.company,
      webResearch: providers.webResearch
    },
    {
      workspaceId: input.workspaceId,
      domain,
      focus: motion,
      playbookId: input.playbookId,
      forceRefresh: input.forceRefresh
    }
  );

  const researched = await client.account.findFirst({
    where: {
      id: dossier.accountId,
      workspaceId: input.workspaceId
    }
  });

  if (!researched) {
    throw new Error(`Researched account not found: ${dossier.accountId}`);
  }

  return researched;
}

async function normalizeScoreAndStorePerson(
  client: EvidenceClient,
  input: {
    workspaceId: string;
    account: AccountRecord;
    motion: string;
    person: PersonResult;
    providerName: string;
    recentSignals: SignalContext[];
  }
): Promise<BuyingCommitteePerson> {
  const normalized = normalizeTitle(input.person.title ?? "");
  const contactabilityScore = calculateContactabilityScore(input.person);
  const score = scorePersonForMotion({
    title: input.person.title ?? "",
    motion: input.motion,
    seniority: normalized.seniority,
    department: normalized.department,
    personaType: input.person.personaType ?? normalized.personaType,
    contactabilityScore,
    sourceConfidence: input.person.sourceConfidence,
    recentSignals: input.recentSignals,
    accountContext: {
      industry: input.account.industry,
      websiteSummary: input.account.websiteSummary,
      pricingSummary: input.account.pricingSummary,
      careersSummary: input.account.careersSummary
    }
  });
  const personaType = input.person.personaType ?? normalized.personaType;
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
      personaType: evidence(personaType),
      roleScore: evidence(score.personScore, 0.85),
      contactabilityScore: evidence(score.contactabilityScore, 0.85),
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
    personaType: (stored.personaType ?? personaType) as PersonaType,
    roleScore: stored.roleScore ?? score.personScore,
    contactabilityScore:
      stored.contactabilityScore ?? score.contactabilityScore,
    sourceConfidence: stored.sourceConfidence ?? score.sourceConfidence,
    linkedinUrl: stored.linkedinUrl,
    email: stored.email
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

function groupBuyingCommittee(people: BuyingCommitteePerson[]) {
  const groups: BuyingCommitteeDossier["buyingCommittee"] = {
    economicBuyer: [],
    technicalBuyer: [],
    dayToDayOwner: [],
    influencer: [],
    championCandidates: [],
    blockerCandidates: []
  };

  for (const person of people.sort((left, right) => right.roleScore - left.roleScore)) {
    switch (person.personaType) {
      case "ECONOMIC_BUYER":
        groups.economicBuyer.push(person);
        break;
      case "TECHNICAL_BUYER":
        groups.technicalBuyer.push(person);
        break;
      case "DAY_TO_DAY_OWNER":
        groups.dayToDayOwner.push(person);
        break;
      case "CHAMPION_CANDIDATE":
        groups.championCandidates.push(person);
        break;
      case "BLOCKER_CANDIDATE":
        groups.blockerCandidates.push(person);
        break;
      case "INFLUENCER":
      case "UNKNOWN":
        groups.influencer.push(person);
        break;
    }
  }

  return groups;
}

async function recordProviderResult(
  client: Pick<ResolveBuyingCommitteeClient, "providerResult">,
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

function stableHash(value: unknown): string {
  const json = JSON.stringify(sortJsonValue(value));
  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)])
    );
  }

  return value;
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
