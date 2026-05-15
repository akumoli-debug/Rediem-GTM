import assert from "node:assert/strict";
import { test } from "node:test";
import type { PersonResult, PeopleProvider } from "../src/server/providers";
import {
  resolveBuyingCommittee,
  type ResolveBuyingCommitteeClient
} from "../src/server/workflows/resolveBuyingCommittee";

type StoredAccount = {
  id: string;
  workspaceId: string;
  name: string;
  domain?: string | null;
  linkedinUrl?: string | null;
  industry?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  accountScore?: number | null;
  confidenceScore?: number | null;
};

type StoredPerson = {
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

function createClient() {
  let idCounter = 1;
  const accounts: StoredAccount[] = [
    {
      id: "account_1",
      workspaceId: "workspace_1",
      name: "Example Co",
      domain: "example.com",
      industry: "B2B Software",
      websiteSummary: "AI workflow software for revenue teams",
      careersSummary: "Hiring RevOps and GTM Systems roles",
      accountScore: 82,
      confidenceScore: 0.8
    }
  ];
  const people: StoredPerson[] = [];
  const evidence: unknown[] = [];
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
  const signals = [
    {
      id: "signal_1",
      workspaceId: "workspace_1",
      accountId: "account_1",
      type: "HIRING",
      title: "Hiring RevOps and GTM Systems roles",
      description: "Revenue operations hiring spike",
      totalScore: 90,
      createdAt: new Date("2026-05-14T12:00:00.000Z")
    }
  ];

  const client: ResolveBuyingCommitteeClient = {
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
      async create() {
        throw new Error("account.create is not used in this test");
      },
      async update() {
        throw new Error("account.update is not used in this test");
      }
    },
    person: {
      async findFirst(args) {
        return (
          people.find(
            (person) =>
              person.workspaceId === args.where.workspaceId &&
              (args.where.OR ?? []).some((clause) =>
                Object.entries(clause).every(
                  ([key, value]) => person[key as keyof StoredPerson] === value
                )
              )
          ) ?? null
        );
      },
      async create(args) {
        const person = {
          id: `person_${idCounter++}`,
          ...(args.data as Omit<StoredPerson, "id">)
        };
        people.push(person);
        return person;
      },
      async update(args) {
        const person = people.find((item) => item.id === args.where.id);

        if (!person) {
          throw new Error(`Missing person ${args.where.id}`);
        }

        Object.assign(person, args.data);
        return person;
      }
    },
    signal: {
      async create() {
        throw new Error("signal.create is not used in this test");
      },
      async findMany() {
        return signals;
      }
    },
    evidence: {
      async create(args) {
        const row = {
          id: `evidence_${idCounter++}`,
          ...args.data
        };
        evidence.push(row);
        return row;
      },
      async findMany() {
        return [];
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

  return { client, people, evidence, providerResults, cacheEntries };
}

class TestPeopleProvider implements PeopleProvider {
  name = "test-people-provider";
  calls = 0;
  lastInput: Parameters<PeopleProvider["findPeople"]>[0] | null = null;

  async findPeople(input: Parameters<PeopleProvider["findPeople"]>[0]): Promise<PersonResult[]> {
    this.calls += 1;
    this.lastInput = input;
    return [
      {
        fullName: "Avery Johnson",
        title: "Director of GTM Systems and RevOps",
        linkedinUrl: "https://www.linkedin.com/in/avery-johnson-sample",
        email: "avery@example.com",
        sourceConfidence: 0.82
      },
      {
        fullName: "Riley Chen",
        title: "VP Platform Engineering",
        linkedinUrl: "https://www.linkedin.com/in/riley-chen-sample",
        sourceConfidence: 0.76
      },
      {
        fullName: "Casey Rivera",
        title: "Chief Financial Officer",
        email: "casey@example.com",
        sourceConfidence: 0.7
      }
    ];
  }
}

test("resolveBuyingCommittee stores people and groups them by persona type", async () => {
  const store = createClient();
  const provider = new TestPeopleProvider();
  const dossier = await resolveBuyingCommittee(
    store.client,
    {
      people: provider
    },
    {
      workspaceId: "workspace_1",
      domain: "example.com",
      motion: "AI GTM workflow software",
      maxPeople: 5
    }
  );

  assert.equal(dossier.account.id, "account_1");
  assert.equal(store.people.length, 3);
  assert.equal(store.providerResults.length, 1);
  assert.ok(store.evidence.length > 0);
  assert.equal(dossier.buyingCommittee.dayToDayOwner.length, 1);
  assert.equal(dossier.buyingCommittee.technicalBuyer.length, 1);
  assert.equal(dossier.buyingCommittee.economicBuyer.length, 1);
  assert.ok(dossier.buyingCommittee.dayToDayOwner[0]?.roleScore);
});

test("resolveBuyingCommittee accepts playbookId and adds playbook personas to role hints", async () => {
  const store = createClient();
  const provider = new TestPeopleProvider();
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
            workflowSteps: ["resolveBuyingCommittee"],
            exportFields: ["person.fullName"],
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

  const dossier = await resolveBuyingCommittee(
    store.client,
    {
      people: provider
    },
    {
      workspaceId: "workspace_1",
      domain: "example.com",
      motion: "fallback motion",
      playbookId: "playbook_1",
      maxPeople: 5
    }
  );

  assert.equal(dossier.motion, "fallback motion");
  assert.ok(provider.lastInput?.roleHints?.includes("RevOps"));
  assert.ok(provider.lastInput?.roleHints?.includes("CRO"));
});

test("resolveBuyingCommittee returns people lookup from cache on repeated input", async () => {
  const store = createClient();
  const provider = new TestPeopleProvider();
  const input = {
    workspaceId: "workspace_1",
    domain: "example.com",
    motion: "AI GTM workflow software",
    maxPeople: 5
  };

  await resolveBuyingCommittee(store.client, { people: provider }, input);
  const providerResultsAfterFirstRun = store.providerResults.length;

  await resolveBuyingCommittee(store.client, { people: provider }, input);

  assert.equal(provider.calls, 1);
  assert.equal(store.providerResults.length, providerResultsAfterFirstRun + 1);
  assert.equal(
    (store.providerResults.at(-1) as { status: string }).status,
    "CACHED"
  );
});
