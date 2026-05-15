import assert from "node:assert/strict";
import { test } from "node:test";
import { MockProvider } from "../src/server/providers/index";
import {
  canonicalizeDomain,
  researchAccount,
  type ResearchAccountClient
} from "../src/server/workflows/researchAccount";

type StoredAccount = {
  id: string;
  workspaceId: string;
  name: string;
  domain?: string | null;
  linkedinUrl?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  hqLocation?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  blogSummary?: string | null;
  pressSummary?: string | null;
  accountScore?: number | null;
  confidenceScore?: number | null;
  lastEnrichedAt?: Date | null;
};

type StoredEvidence = {
  id: string;
  workspaceId: string;
  entityType: "ACCOUNT" | "PERSON" | "SIGNAL" | "FORMULA_RESULT";
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl?: string | null;
  provider?: string | null;
  rawExcerpt?: string | null;
  confidence?: number | null;
  capturedAt: Date;
  createdAt: Date;
};

type StoredSignal = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  title: string;
  description?: string | null;
  signalDate?: Date | null;
  freshnessScore?: number | null;
  relevanceScore?: number | null;
  sourceQualityScore?: number | null;
  totalScore?: number | null;
  sourceUrl?: string | null;
  capturedAt: Date;
};

function createWorkflowClient() {
  let idCounter = 1;
  const accounts: StoredAccount[] = [];
  const evidence: StoredEvidence[] = [];
  const signals: StoredSignal[] = [];
  const providerResults: unknown[] = [];
  const cacheEntries: Array<{
    id: string;
    namespace: string;
    key: string;
    value: unknown;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const client: ResearchAccountClient = {
    account: {
      async findFirst(args) {
        return (
          accounts.find((account) => {
            if (args.where.id) {
              return (
                account.id === args.where.id &&
                account.workspaceId === args.where.workspaceId
              );
            }

            return (
              account.workspaceId === args.where.workspaceId &&
              (args.where.OR ?? []).some((clause) =>
                Object.entries(clause).every(
                  ([key, value]) =>
                    account[key as keyof StoredAccount] === value
                )
              )
            );
          }) ?? null
        );
      },
      async create(args) {
        const account = {
          id: `account_${idCounter++}`,
          ...(args.data as Omit<StoredAccount, "id">)
        };
        accounts.push(account);
        return account;
      },
      async update(args) {
        const account = accounts.find((item) => item.id === args.where.id);

        if (!account) {
          throw new Error(`Missing account ${args.where.id}`);
        }

        Object.assign(account, args.data);
        return account;
      }
    },
    person: {
      async findFirst() {
        return null;
      },
      async create() {
        throw new Error("person.create is not used in these tests");
      },
      async update() {
        throw new Error("person.update is not used in these tests");
      }
    },
    signal: {
      async create(args) {
        const signal = {
          id: `signal_${idCounter++}`,
          ...(args.data as Omit<StoredSignal, "id">)
        };
        signals.push(signal);
        return signal;
      }
    },
    evidence: {
      async create(args) {
        const row = {
          id: `evidence_${idCounter++}`,
          ...args.data,
          createdAt: new Date()
        };
        evidence.push(row);
        return row;
      },
      async findMany(args) {
        return evidence
          .filter(
            (row) =>
              row.workspaceId === args.where.workspaceId &&
              row.entityType === args.where.entityType &&
              row.entityId === args.where.entityId &&
              (!args.where.fieldName || row.fieldName === args.where.fieldName)
          )
          .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
      }
    },
    providerResult: {
      async create(args) {
        providerResults.push(args.data);
        return args.data;
      }
    },
    cacheEntry: {
      async findFirst(args) {
        return (
          cacheEntries.find(
            (entry) =>
              entry.namespace === args.where.namespace &&
              entry.key === args.where.key
          ) ?? null
        );
      },
      async upsert(args) {
        const existing = cacheEntries.find(
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
        cacheEntries.push(entry);
        return entry;
      }
    }
  };

  return { client, accounts, evidence, signals, providerResults, cacheEntries };
}

test("canonicalizeDomain normalizes URLs to hostnames", () => {
  assert.equal(canonicalizeDomain("https://www.linear.app/pricing"), "linear.app");
  assert.equal(canonicalizeDomain("WWW.EXAMPLE.COM"), "example.com");
});

test("researchAccount creates account, evidence, signals, provider results, and cache", async () => {
  const store = createWorkflowClient();
  const provider = new MockProvider();

  const dossier = await researchAccount(
    store.client,
    {
      company: provider,
      webResearch: provider
    },
    {
      workspaceId: "workspace_1",
      domain: "https://www.linear.app",
      focus: "engineering teams"
    }
  );

  assert.equal(dossier.domain, "linear.app");
  assert.equal(dossier.cached, false);
  assert.equal(store.accounts.length, 1);
  assert.equal(store.accounts[0]?.domain, "linear.app");
  assert.ok(store.accounts[0]?.accountScore);
  assert.ok(store.evidence.length > 0);
  assert.ok(store.signals.length > 0);
  assert.equal(store.providerResults.length, 14);
  assert.equal(store.cacheEntries.length, 15);
  assert.ok(dossier.sourceUrls.includes("https://linear.app/"));
  assert.equal(dossier.signals.length, store.signals.length);
});

test("researchAccount returns recent cached dossier without provider fanout", async () => {
  const store = createWorkflowClient();
  const provider = new MockProvider();
  const input = {
    workspaceId: "workspace_1",
    domain: "linear.app"
  };

  const first = await researchAccount(store.client, {
    company: provider,
    webResearch: provider
  }, input);
  const providerResultsAfterFirstRun = store.providerResults.length;

  const second = await researchAccount(store.client, {
    company: provider,
    webResearch: provider
  }, input);

  assert.equal(second.cached, true);
  assert.equal(second.accountId, first.accountId);
  assert.equal(store.providerResults.length, providerResultsAfterFirstRun + 1);
  assert.equal(store.accounts.length, 1);
});

test("researchAccount reuses expensive provider cache across workflow cache keys", async () => {
  const store = createWorkflowClient();
  const provider = new MockProvider();
  const input = {
    workspaceId: "workspace_1",
    domain: "linear.app"
  };

  await researchAccount(store.client, {
    company: provider,
    webResearch: provider
  }, input);
  const providerResultsAfterFirstRun = store.providerResults.length;

  await researchAccount(store.client, {
    company: provider,
    webResearch: provider
  }, { ...input, focus: "new motion" });

  const secondRunProviderResults = store.providerResults.slice(providerResultsAfterFirstRun);
  assert.equal(secondRunProviderResults.length, 14);
  assert.equal(
    secondRunProviderResults.filter(
      (result) => (result as { status: string }).status === "CACHED"
    ).length,
    13
  );
});

test("researchAccount accepts playbookId and applies playbook focus", async () => {
  const store = createWorkflowClient();
  const provider = new MockProvider();
  store.client.playbook = {
    async findFirst(args) {
      return args.where.id === "playbook_1"
        ? {
            id: "playbook_1",
            workspaceId: args.where.workspaceId,
            name: "AI GTM Workflow Sale",
            description: "AI GTM workflow playbook",
            targetMotion: "AI GTM workflow software",
            targetPersonas: ["RevOps", "Sales Ops", "Growth", "CRO"],
            accountFitRules: ["Revenue operations evidence"],
            signalTypes: ["hiring GTM roles", "enterprise plan"],
            formulaColumns: [],
            workflowSteps: ["researchAccount"],
            exportFields: ["account.domain"],
            budgetDefaults: {
              maxCostPerAccount: 0.75,
              maxCostPerContact: 0.35,
              maxTotalRunCost: 75,
              stopRunOnBudgetExceeded: true
            }
          }
        : null;
    }
  };

  const dossier = await researchAccount(
    store.client,
    {
      company: provider,
      webResearch: provider
    },
    {
      workspaceId: "workspace_1",
      domain: "linear.app",
      playbookId: "playbook_1"
    }
  );

  assert.equal(dossier.playbookId, "playbook_1");
  assert.equal(dossier.playbookName, "AI GTM Workflow Sale");
  assert.ok(store.signals.length > 0);
});

test("researchAccount respects maxCostUsd before provider calls exceed the limit", async () => {
  const store = createWorkflowClient();
  const provider = new MockProvider();

  await assert.rejects(
    () =>
      researchAccount(
        store.client,
        {
          company: provider,
          webResearch: provider
        },
        {
          workspaceId: "workspace_1",
          domain: "linear.app",
          maxCostUsd: 0.001
        }
      ),
    /Cost limit exceeded/
  );

  assert.equal(store.accounts.length, 0);
  assert.equal(store.providerResults.length, 1);
  assert.equal(
    (store.providerResults[0] as { status: string }).status,
    "FAILED"
  );
});
