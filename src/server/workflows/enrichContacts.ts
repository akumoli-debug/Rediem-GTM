import {
  upsertPersonWithEvidence,
  type EvidenceClient,
  type EnrichedField
} from "@/server/evidence";
import type {
  ContactProvider,
  ContactResult,
  EmailVerificationProvider,
  EmailVerificationResult
} from "@/server/providers";
import { maybeEvaluateFormulasAfterEntityEnrichment } from "@/server/formulas";
import {
  withCache,
  type CacheEntryClient,
  type ProviderCacheNamespace
} from "@/server/cache";
import { redactSensitiveValue } from "@/server/providers/redaction";

type EmailStatus =
  | "UNKNOWN"
  | "VERIFIED"
  | "RISKY"
  | "CATCH_ALL"
  | "INVALID"
  | "SUPPRESSED";

type PersonRecord = {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  fullName: string;
  title?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  emailStatus?: EmailStatus | string | null;
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
};

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
};

type ProviderResultRecord = {
  workspaceId: string;
  provider: string;
  toolName: string;
  inputHash: string;
  rawResponse?: unknown;
  normalizedResponse?: unknown;
  costUsd?: number | string | null;
  latencyMs?: number | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";
  errorMessage?: string | null;
  createdAt?: Date;
};

export type EnrichContactsInput = {
  workspaceId: string;
  personIds?: string[];
  accountId?: string;
  maxCostUsd?: number;
  requireVerifiedEmail?: boolean;
  forceRefresh?: boolean;
};

export type EnrichContactsProviders = {
  contactProviders: ContactProvider[];
  emailVerificationProvider: EmailVerificationProvider;
};

export type EnrichContactsClient = EvidenceClient & CacheEntryClient & {
  account: EvidenceClient["account"] & {
    findFirst(args: {
      where: { id?: string; workspaceId: string; OR?: Array<{ domain?: string }> };
    }): Promise<AccountRecord | null>;
  };
  person: EvidenceClient["person"] & {
    findMany(args: {
      where: {
        workspaceId: string;
        id?: { in: string[] };
        accountId?: string;
      };
    }): Promise<PersonRecord[]>;
  };
  providerResult: {
    create(args: { data: ProviderResultRecord }): Promise<ProviderResultRecord>;
  };
};

export type EnrichedContactResult = {
  personId: string;
  fullName: string;
  email?: string | null;
  emailStatus: EmailStatus;
  contactabilityScore: number;
  sequenceReady: boolean;
  skipped: boolean;
  reason?: string;
};

export type EnrichContactsDossier = {
  workspaceId: string;
  processed: number;
  updated: number;
  skipped: number;
  totalCostUsd: number;
  results: EnrichedContactResult[];
};

const ROLE_BASED_LOCAL_PARTS = new Set([
  "info",
  "support",
  "sales",
  "careers",
  "admin",
  "hello"
]);
const VERIFIED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COSTS = {
  contactProvider: 0.03,
  emailVerification: 0.005
};

export async function enrichContacts(
  client: EnrichContactsClient,
  providers: EnrichContactsProviders,
  input: EnrichContactsInput
): Promise<EnrichContactsDossier> {
  const people = await loadPeople(client, input);
  const costGuard = createCostGuard(input.maxCostUsd);
  const results: EnrichedContactResult[] = [];

  for (const person of people) {
    const result = await enrichOneContact(client, providers, costGuard, input, person);
    results.push(result);
  }

  return {
    workspaceId: input.workspaceId,
    processed: results.length,
    updated: results.filter((result) => !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    totalCostUsd: costGuard.totalCostUsd(),
    results
  };
}

export function generateEmailPatterns(
  fullName: string,
  domain: string
): string[] {
  const parts = fullName
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0];
  const last = parts.at(-1);

  if (!first || !last) {
    return [];
  }

  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);

  return uniqueStrings([
    `${first}@${domain}`,
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${firstInitial}${capitalize(last)}@${domain}`,
    `${first}_${lastInitial}@${domain}`
  ]);
}

export function mapVerificationStatus(
  result: Pick<EmailVerificationResult, "email" | "status" | "confidence">
): EmailStatus {
  if (isSuppressedEmail(result.email)) {
    return "SUPPRESSED";
  }

  if (result.status === "VERIFIED") {
    return "VERIFIED";
  }

  if (result.status === "CATCH_ALL") {
    return "CATCH_ALL";
  }

  if (result.status === "RISKY") {
    return "RISKY";
  }

  if (result.status === "INVALID") {
    return "INVALID";
  }

  return "UNKNOWN";
}

export function isSuppressedEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes("@")) {
    return false;
  }

  return ROLE_BASED_LOCAL_PARTS.has(email.split("@")[0]?.toLowerCase() ?? "");
}

async function enrichOneContact(
  client: EnrichContactsClient,
  providers: EnrichContactsProviders,
  costGuard: CostGuard,
  input: EnrichContactsInput,
  person: PersonRecord
): Promise<EnrichedContactResult> {
  if (isRecentlyVerified(person)) {
    return {
      personId: person.id,
      fullName: person.fullName,
      email: person.email,
      emailStatus: "VERIFIED",
      contactabilityScore: person.contactabilityScore ?? 100,
      sequenceReady: true,
      skipped: true,
      reason: "Email already verified within 30 days."
    };
  }

  const account = person.accountId
    ? await client.account.findFirst({
        where: {
          id: person.accountId,
          workspaceId: input.workspaceId
        }
      })
    : null;
  const domain = account?.domain;
  let best = person.email
    ? await chooseBestEmail(client, providers, costGuard, input, [
        {
          email: person.email,
          source: "existing",
          provider: "existing"
        }
      ])
    : null;

  if (best?.status !== "VERIFIED" && domain) {
    const providerCandidates: Array<{
      email: string;
      source: string;
      provider: string;
      contactResult?: ContactResult;
    }> = [];

    for (const provider of providers.contactProviders) {
      const contact = await callProvider(client, costGuard, {
        workspaceId: input.workspaceId,
        provider: provider.name,
        toolName: "ContactProvider.enrichContact",
        cacheNamespace: "contact_enrichment",
        input: {
          fullName: person.fullName,
          companyDomain: domain,
          linkedinUrl: person.linkedinUrl
        },
        estimatedCostUsd: COSTS.contactProvider,
        forceRefresh: input.forceRefresh,
        call: () =>
          provider.enrichContact({
            fullName: person.fullName,
            companyDomain: domain,
            linkedinUrl: person.linkedinUrl ?? undefined
          })
      });

      if (contact.email) {
        providerCandidates.push({
          email: contact.email,
          source: "provider",
          provider: provider.name,
          contactResult: contact
        });
        break;
      }
    }

    if (providerCandidates.length > 0) {
      best = choosePreferredEmail(
        best,
        await chooseBestEmail(client, providers, costGuard, input, providerCandidates),
        input.requireVerifiedEmail
      );
    } else {
      best = choosePreferredEmail(
        best,
        await chooseBestEmail(
          client,
          providers,
          costGuard,
          input,
          generateEmailPatterns(person.fullName, domain).map((email) => ({
            email,
            source: "generated",
            provider: "pattern-generator"
          }))
        ),
        input.requireVerifiedEmail
      );
    }
  }

  const emailStatus = best?.status ?? "UNKNOWN";
  const selectedEmail =
    emailStatus === "INVALID" || emailStatus === "SUPPRESSED"
      ? person.email
      : best?.email ?? person.email;
  const contactabilityScore = calculateContactabilityScore({
    emailStatus,
    email: selectedEmail,
    phone: best?.contactResult?.phone ?? person.phone,
    linkedinUrl: person.linkedinUrl
  });

  const updated = await upsertPersonWithEvidence(client, {
    workspaceId: input.workspaceId,
    id: person.id,
    overwritePolicy: "ALWAYS",
    fields: {
      fullName: evidence(person.fullName, "existing", 1),
      email: evidence(selectedEmail, best?.provider ?? "email-waterfall", best?.confidence),
      emailStatus: evidence(emailStatus, best?.provider ?? "email-waterfall", best?.confidence),
      emailVerifiedAt: evidence(
        emailStatus === "VERIFIED" ? new Date() : undefined,
        best?.provider ?? "email-waterfall",
        best?.confidence
      ),
      phone: evidence(best?.contactResult?.phone ?? person.phone, best?.provider ?? "email-waterfall", best?.confidence),
      contactabilityScore: evidence(contactabilityScore, best?.provider ?? "email-waterfall", best?.confidence),
      sourceConfidence: evidence(best?.confidence, best?.provider ?? "email-waterfall", best?.confidence),
      lastEnrichedAt: evidence(new Date(), best?.provider ?? "email-waterfall", best?.confidence)
    }
  });
  await maybeEvaluateFormulasAfterEntityEnrichment(client, {
    workspaceId: input.workspaceId,
    entityType: "PERSON",
    entityId: updated.id
  });

  return {
    personId: updated.id,
    fullName: updated.fullName,
    email: updated.email,
    emailStatus: (updated.emailStatus ?? emailStatus) as EmailStatus,
    contactabilityScore: updated.contactabilityScore ?? contactabilityScore,
    sequenceReady: (updated.emailStatus ?? emailStatus) === "VERIFIED",
    skipped: false
  };
}

async function chooseBestEmail(
  client: EnrichContactsClient,
  providers: EnrichContactsProviders,
  costGuard: CostGuard,
  input: EnrichContactsInput,
  candidates: Array<{
    email: string;
    source: string;
    provider: string;
    contactResult?: ContactResult;
  }>
): Promise<
  | {
      email: string;
      status: EmailStatus;
      confidence: number;
      provider: string;
      contactResult?: ContactResult;
    }
  | null
> {
  let fallback:
    | {
        email: string;
        status: EmailStatus;
        confidence: number;
        provider: string;
        contactResult?: ContactResult;
      }
    | null = null;

  for (const candidate of dedupeCandidates(candidates)) {
    if (isSuppressedEmail(candidate.email)) {
      const suppressed = {
        email: candidate.email,
        status: "SUPPRESSED" as const,
        confidence: 1,
        provider: candidate.provider,
        contactResult: candidate.contactResult
      };
      fallback ??= suppressed;
      continue;
    }

    const verification = await callProvider(client, costGuard, {
      workspaceId: input.workspaceId,
      provider: providers.emailVerificationProvider.name,
      toolName: "EmailVerificationProvider.verifyEmail",
      cacheNamespace: "email_verification",
      input: {
        email: candidate.email
      },
      estimatedCostUsd: COSTS.emailVerification,
      forceRefresh: input.forceRefresh,
      call: () =>
        providers.emailVerificationProvider.verifyEmail({
          email: candidate.email
        })
    });
    const status = mapVerificationStatus(verification);
    const scored = {
      email: verification.email,
      status,
      confidence: verification.confidence ?? confidenceForStatus(status),
      provider: providers.emailVerificationProvider.name,
      contactResult: candidate.contactResult
    };

    if (status === "VERIFIED") {
      return scored;
    }

    if (!fallback || rankStatus(status) > rankStatus(fallback.status)) {
      fallback = scored;
    }

  }

  return input.requireVerifiedEmail ? null : fallback;
}

function choosePreferredEmail(
  current:
    | {
        email: string;
        status: EmailStatus;
        confidence: number;
        provider: string;
        contactResult?: ContactResult;
      }
    | null,
  candidate:
    | {
        email: string;
        status: EmailStatus;
        confidence: number;
        provider: string;
        contactResult?: ContactResult;
      }
    | null,
  requireVerifiedEmail?: boolean
) {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  if (requireVerifiedEmail) {
    return candidate.status === "VERIFIED" ? candidate : current;
  }

  return rankStatus(candidate.status) > rankStatus(current.status)
    ? candidate
    : current;
}

async function loadPeople(
  client: EnrichContactsClient,
  input: EnrichContactsInput
): Promise<PersonRecord[]> {
  return client.person.findMany({
    where: {
      workspaceId: input.workspaceId,
      ...(input.personIds ? { id: { in: input.personIds } } : {}),
      ...(input.accountId ? { accountId: input.accountId } : {})
    }
  });
}

function isRecentlyVerified(person: PersonRecord): boolean {
  return (
    person.emailStatus === "VERIFIED" &&
    Boolean(person.emailVerifiedAt) &&
    Date.now() - (person.emailVerifiedAt?.getTime() ?? 0) < VERIFIED_TTL_MS
  );
}

function calculateContactabilityScore(input: {
  emailStatus: EmailStatus;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
}): number {
  let score = 0;

  if (input.emailStatus === "VERIFIED") {
    score += 70;
  } else if (input.emailStatus === "CATCH_ALL") {
    score += 40;
  } else if (input.emailStatus === "RISKY") {
    score += 30;
  } else if (input.emailStatus === "UNKNOWN" && input.email) {
    score += 20;
  }

  if (input.linkedinUrl) {
    score += 20;
  }

  if (input.phone) {
    score += 10;
  }

  return Math.min(100, score);
}

function evidence<T extends string | number | Date>(
  value: T | null | undefined,
  provider: string,
  confidence?: number | null
): EnrichedField<T> {
  return {
    value,
    provider,
    confidence: confidence ?? null,
    capturedAt: new Date()
  };
}

function dedupeCandidates(
  candidates: Array<{
    email: string;
    source: string;
    provider: string;
    contactResult?: ContactResult;
  }>
) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const email = candidate.email.toLowerCase();

    if (seen.has(email)) {
      return false;
    }

    seen.add(email);
    return true;
  });
}

function rankStatus(status: EmailStatus): number {
  switch (status) {
    case "VERIFIED":
      return 6;
    case "CATCH_ALL":
      return 5;
    case "RISKY":
      return 4;
    case "UNKNOWN":
      return 3;
    case "INVALID":
      return 2;
    case "SUPPRESSED":
      return 1;
  }
}

function confidenceForStatus(status: EmailStatus): number {
  switch (status) {
    case "VERIFIED":
      return 0.95;
    case "CATCH_ALL":
      return 0.65;
    case "RISKY":
      return 0.55;
    case "INVALID":
    case "SUPPRESSED":
      return 0.9;
    case "UNKNOWN":
      return 0.4;
  }
}

async function callProvider<TResult>(
  client: EnrichContactsClient,
  costGuard: CostGuard,
  input: {
    workspaceId: string;
    provider: string;
    toolName: string;
    cacheNamespace: ProviderCacheNamespace;
    input: unknown;
    estimatedCostUsd: number;
    forceRefresh?: boolean;
    call: () => Promise<TResult>;
  }
): Promise<TResult> {
  try {
    const cached = await withCache(client, {
      workspaceId: input.workspaceId,
      namespace: input.cacheNamespace,
      provider: input.provider,
      toolName: input.toolName,
      providerInput: input.input,
      forceRefresh: input.forceRefresh,
      recordProviderResult: (result) =>
        client.providerResult.create({
          data: {
            ...result,
            rawResponse: toJsonCompatible(redactSensitiveValue(result.rawResponse)),
            normalizedResponse: toJsonCompatible(redactSensitiveValue(result.normalizedResponse))
          }
        }).then(() => undefined),
      call: async () => {
        costGuard.reserve(input.estimatedCostUsd, input.toolName);
        return input.call();
      }
    });

    if (cached.cached) {
      return cached.value;
    }

    await client.providerResult.create({
      data: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        toolName: input.toolName,
        inputHash: cached.inputHash,
        rawResponse: toJsonCompatible(redactSensitiveValue(cached.value)),
        normalizedResponse: toJsonCompatible(redactSensitiveValue(cached.value)),
        costUsd: input.estimatedCostUsd,
        latencyMs: cached.latencyMs,
        status: "SUCCESS"
      }
    });
    return cached.value;
  } catch (error) {
    await client.providerResult.create({
      data: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        toolName: input.toolName,
        inputHash: stableHash(input.input),
        costUsd: input.estimatedCostUsd,
        latencyMs: null,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

type CostGuard = {
  reserve(costUsd: number, label: string): void;
  totalCostUsd(): number;
};

function createCostGuard(maxCostUsd: number | undefined): CostGuard {
  let total = 0;

  return {
    reserve(costUsd, label) {
      if (maxCostUsd !== undefined && total + costUsd > maxCostUsd) {
        throw new Error(`Cost limit exceeded before ${label}`);
      }

      total += costUsd;
    },
    totalCostUsd() {
      return Math.round(total * 10_000) / 10_000;
    }
  };
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

  return JSON.parse(JSON.stringify(value)) as unknown;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
