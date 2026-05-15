import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCache,
  setCache,
  withCache,
  type CacheEntryClient
} from "../src/server/cache";

function createCacheClient(): CacheEntryClient & {
  entries: Array<{
    id: string;
    namespace: string;
    key: string;
    value: unknown;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
} {
  let idCounter = 1;
  const entries: Array<{
    id: string;
    namespace: string;
    key: string;
    value: unknown;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  return {
    entries,
    cacheEntry: {
      async findFirst(args) {
        return (
          entries.find(
            (entry) =>
              entry.namespace === args.where.namespace &&
              entry.key === args.where.key
          ) ?? null
        );
      },
      async upsert(args) {
        const existing = entries.find(
          (entry) =>
            entry.namespace === args.where.namespace_key.namespace &&
            entry.key === args.where.namespace_key.key
        );

        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }

        const entry = {
          id: `cache_${idCounter++}`,
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        entries.push(entry);
        return entry;
      }
    }
  };
}

test("getCache returns null for expired entries", async () => {
  const client = createCacheClient();
  await setCache(client, {
    namespace: "company_enrichment",
    key: "provider:tool:hash",
    value: { name: "Expired Co" },
    ttlMs: 100,
    now: new Date("2026-05-14T00:00:00.000Z")
  });

  const cached = await getCache(client, {
    namespace: "company_enrichment",
    key: "provider:tool:hash",
    now: new Date("2026-05-14T00:00:01.000Z")
  });

  assert.equal(cached, null);
});

test("getCache returns unexpired entries", async () => {
  const client = createCacheClient();
  await setCache(client, {
    namespace: "web_search",
    key: "provider:tool:hash",
    value: { results: ["one"] },
    ttlMs: 1000,
    now: new Date("2026-05-14T00:00:00.000Z")
  });

  const cached = await getCache<{ results: string[] }>(client, {
    namespace: "web_search",
    key: "provider:tool:hash",
    now: new Date("2026-05-14T00:00:00.500Z")
  });

  assert.deepEqual(cached, { results: ["one"] });
});

test("withCache records miss then hit without rerunning provider", async () => {
  const client = createCacheClient();
  const providerResults: Array<{ status: string; costUsd?: number | string | null }> = [];
  let calls = 0;

  const first = await withCache(client, {
    workspaceId: "workspace_1",
    namespace: "people_lookup",
    provider: "Test Provider",
    toolName: "PeopleProvider.findPeople",
    providerInput: { domain: "Example.com" },
    recordProviderResult: async (result) => {
      providerResults.push(result);
    },
    call: async () => {
      calls += 1;
      return [{ fullName: "Avery Johnson" }];
    }
  });
  const second = await withCache(client, {
    workspaceId: "workspace_1",
    namespace: "people_lookup",
    provider: "test provider",
    toolName: "peopleprovider.findpeople",
    providerInput: { domain: "example.com" },
    recordProviderResult: async (result) => {
      providerResults.push(result);
    },
    call: async () => {
      calls += 1;
      return [];
    }
  });

  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
  assert.equal(providerResults[0]?.status, "CACHED");
  assert.equal(providerResults[0]?.costUsd, 0);
});

