import { redactSensitiveValue } from "@/server/providers/redaction";

export type ProviderCacheNamespace =
  | "company_enrichment"
  | "people_lookup"
  | "contact_enrichment"
  | "email_verification"
  | "web_scrape"
  | "web_search"
  | "structured_extract"
  | "browser_styles";

export type CacheEntryRecord = {
  id?: string;
  namespace: string;
  key: string;
  value: unknown;
  expiresAt?: Date | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CacheEntryClient = {
  cacheEntry: {
    findFirst(args: {
      where: { namespace: string; key: string };
    }): Promise<CacheEntryRecord | null>;
    upsert(args: {
      where: { namespace_key: { namespace: string; key: string } };
      create: {
        namespace: string;
        key: string;
        value: unknown;
        expiresAt?: Date | null;
      };
      update: {
        value: unknown;
        expiresAt?: Date | null;
      };
    }): Promise<CacheEntryRecord>;
  };
};

export type ProviderResultCacheLogger = (input: {
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
}) => Promise<void>;

export const PROVIDER_CACHE_TTLS_MS: Record<ProviderCacheNamespace, number> = {
  company_enrichment: days(30),
  people_lookup: days(14),
  contact_enrichment: days(30),
  email_verification: days(30),
  web_scrape: days(7),
  web_search: days(1),
  structured_extract: days(7),
  browser_styles: days(14)
};

export async function getCache<T>(
  client: CacheEntryClient,
  input: {
    namespace: ProviderCacheNamespace;
    key: string;
    now?: Date;
  }
): Promise<T | null> {
  const entry = await client.cacheEntry.findFirst({
    where: {
      namespace: input.namespace,
      key: input.key
    }
  });

  if (!entry) {
    return null;
  }

  if (isExpired(entry, input.now ?? new Date())) {
    return null;
  }

  return reviveDates(entry.value) as T;
}

export async function setCache<T>(
  client: CacheEntryClient,
  input: {
    namespace: ProviderCacheNamespace;
    key: string;
    value: T;
    ttlMs?: number;
    now?: Date;
  }
): Promise<CacheEntryRecord> {
  const ttlMs = input.ttlMs ?? PROVIDER_CACHE_TTLS_MS[input.namespace];
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  return client.cacheEntry.upsert({
    where: {
      namespace_key: {
        namespace: input.namespace,
        key: input.key
      }
    },
    create: {
      namespace: input.namespace,
      key: input.key,
      value: toJsonCompatible(input.value),
      expiresAt
    },
    update: {
      value: toJsonCompatible(input.value),
      expiresAt
    }
  });
}

export async function withCache<T>(
  client: CacheEntryClient,
  input: {
    workspaceId: string;
    namespace: ProviderCacheNamespace;
    provider: string;
    toolName: string;
    providerInput: unknown;
    forceRefresh?: boolean;
    ttlMs?: number;
    recordProviderResult?: ProviderResultCacheLogger;
    call: () => Promise<T>;
  }
): Promise<{ value: T; cached: boolean; inputHash: string; latencyMs: number }> {
  const inputHash = stableHash(normalizeCacheInput(input.providerInput));
  const key = buildProviderCacheKey({
    provider: input.provider,
    toolName: input.toolName,
    inputHash
  });

  if (!input.forceRefresh) {
    const cached = await getCache<T>(client, {
      namespace: input.namespace,
      key
    });

    if (cached !== null) {
      await input.recordProviderResult?.({
        workspaceId: input.workspaceId,
        provider: input.provider,
        toolName: input.toolName,
        inputHash,
        normalizedResponse: redactSensitiveValue(cached),
        costUsd: 0,
        latencyMs: 0,
        status: "CACHED"
      });

      return {
        value: cached,
        cached: true,
        inputHash,
        latencyMs: 0
      };
    }
  }

  const startedAt = Date.now();
  const value = await input.call();
  const latencyMs = Date.now() - startedAt;

  await setCache(client, {
    namespace: input.namespace,
    key,
    value,
    ttlMs: input.ttlMs
  });

  return {
    value,
    cached: false,
    inputHash,
    latencyMs
  };
}

export function buildProviderCacheKey(input: {
  provider: string;
  toolName: string;
  inputHash: string;
}) {
  return [
    normalizeCacheToken(input.provider),
    normalizeCacheToken(input.toolName),
    input.inputHash
  ].join(":");
}

export function stableHash(value: unknown): string {
  const json = JSON.stringify(sortJsonValue(value));
  let hash = 0;

  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

export function isExpired(entry: Pick<CacheEntryRecord, "expiresAt">, now = new Date()) {
  if (!entry.expiresAt) {
    return false;
  }

  return new Date(entry.expiresAt).getTime() <= now.getTime();
}

function normalizeCacheInput(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCacheInput);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalizeCacheInput(child)])
    );
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizeCacheToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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

function reviveDates(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, reviveDates(child)])
    );
  }

  return value;
}

function days(count: number) {
  return count * 24 * 60 * 60 * 1000;
}
