import assert from "node:assert/strict";
import { test } from "node:test";
import type { PeopleProvider, PersonResult } from "../src/server/providers";
import {
  resolveRediemBuyingCommittee,
  type ResolveRediemBuyingCommitteeClient
} from "../src/server/workflows/resolveRediemBuyingCommittee";

function createClient() {
  let id = 1;
  const accounts = [
    {
      id: "account_1",
      workspaceId: "workspace_1",
      domain: "beauty.example",
      name: "Beauty Example",
      linkedinUrl: "https://linkedin.com/company/beauty-example"
    }
  ];
  const people: Array<Record<string, unknown>> = [];
  const evidence: Array<Record<string, unknown>> = [];
  const providerResults: Array<Record<string, unknown>> = [];
  const cacheEntries: Array<Record<string, unknown>> = [];
  const brandProfile = {
    id: "brand_profile_1",
    workspaceId: "workspace_1",
    accountId: "account_1",
    rediemFitScore: 91,
    shopifyDetected: true,
    shopifyPlusLikely: true,
    hasSubscription: true,
    hasLoyaltyProgram: true,
    hasUGC: true,
    socialCommunityScore: 88,
    migrationPainScore: 72
  };
  const signals = [
    {
      type: "SUBSCRIPTION",
      title: "Subscription and loyalty page detected",
      description: "Rewards, subscription, and UGC community signals.",
      totalScore: 88
    }
  ];
  const client: ResolveRediemBuyingCommitteeClient = {
    account: {
      async findFirst(args) {
        return (
          accounts.find((account) => {
            if (args.where.id) {
              return account.id === args.where.id && account.workspaceId === args.where.workspaceId;
            }

            return (
              account.workspaceId === args.where.workspaceId &&
              (args.where.OR ?? []).some((clause) => account.domain === clause.domain)
            );
          }) ?? null
        );
      },
      async create(args) {
        const account = {
          id: `account_${id++}`,
          ...args.data
        };
        accounts.push(account as never);
        return account as never;
      },
      async update(args) {
        const account = accounts.find((item) => item.id === args.where.id);
        if (!account) throw new Error(`Missing account ${args.where.id}`);
        Object.assign(account, args.data);
        return account;
      }
    },
    person: {
      async findFirst(args) {
        return (
          people.find(
            (person) =>
              person.workspaceId === args.where.workspaceId &&
              (args.where.OR ?? []).some((clause) =>
                Object.entries(clause).every(([key, value]) => person[key] === value)
              )
          ) ?? null
        ) as never;
      },
      async create(args) {
        const person = {
          id: `person_${id++}`,
          ...args.data
        };
        people.push(person);
        return person as never;
      },
      async update(args) {
        const person = people.find((item) => item.id === args.where.id);
        if (!person) throw new Error(`Missing person ${args.where.id}`);
        Object.assign(person, args.data);
        return person as never;
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
    brandProfile: {
      async findFirst(args) {
        return args.where.workspaceId === "workspace_1" &&
          args.where.accountId === "account_1"
          ? brandProfile
          : null;
      }
    },
    evidence: {
      async create(args) {
        const row = {
          id: `evidence_${id++}`,
          ...args.data
        };
        evidence.push(row);
        return row as never;
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
            (entry) => entry.namespace === args.where.namespace && entry.key === args.where.key
          ) ?? null
        ) as never;
      },
      async upsert(args) {
        const existing = cacheEntries.find(
          (entry) =>
            entry.namespace === args.where.namespace_key.namespace &&
            entry.key === args.where.namespace_key.key
        );
        if (existing) {
          Object.assign(existing, args.update);
          return existing as never;
        }
        const entry = {
          id: `cache_${id++}`,
          ...args.create
        };
        cacheEntries.push(entry);
        return entry as never;
      }
    }
  };

  return { client, people, evidence, providerResults };
}

class RediemPeopleProvider implements PeopleProvider {
  name = "rediem-people-provider";
  lastInput: Parameters<PeopleProvider["findPeople"]>[0] | null = null;

  async findPeople(input: Parameters<PeopleProvider["findPeople"]>[0]): Promise<PersonResult[]> {
    this.lastInput = input;
    return [
      {
        fullName: "Maya Retention",
        title: "Director of Retention",
        linkedinUrl: "https://linkedin.com/in/maya-retention",
        email: "maya@beauty.example",
        sourceConfidence: 0.84
      },
      {
        fullName: "Nora CMO",
        title: "CMO",
        linkedinUrl: "https://linkedin.com/in/nora-cmo",
        sourceConfidence: 0.8
      },
      {
        fullName: "Theo Shopify",
        title: "Shopify Plus Manager",
        linkedinUrl: "https://linkedin.com/in/theo-shopify",
        sourceConfidence: 0.78
      },
      {
        fullName: "Sofia Social",
        title: "Social Media Manager",
        linkedinUrl: "https://linkedin.com/in/sofia-social",
        sourceConfidence: 0.75
      }
    ];
  }
}

function makePeopleProvider(people: PersonResult[]): PeopleProvider {
  return {
    name: "mock-people",
    async findPeople() {
      return people;
    }
  };
}

test("resolveRediemBuyingCommittee groups buyers and builds multithread plan", async () => {
  const { client, evidence, providerResults } = createClient();
  const provider = new RediemPeopleProvider();
  const dossier = await resolveRediemBuyingCommittee(
    client,
    { people: provider },
    {
      workspaceId: "workspace_1",
      accountId: "account_1"
    }
  );

  assert.equal(dossier.operatorBuyers[0]?.fullName, "Maya Retention");
  assert.equal(dossier.economicBuyers[0]?.fullName, "Nora CMO");
  assert.equal(dossier.technicalBuyers[0]?.fullName, "Theo Shopify");
  assert.equal(dossier.influencers[0]?.fullName, "Sofia Social");
  assert.equal(dossier.recommendedFirstContact?.fullName, "Maya Retention");
  assert.match(
    dossier.multithreadPlan.personaAngles.operatorBuyers,
    /loyalty|lifecycle|campaign/i
  );
  assert.ok(provider.lastInput?.roleHints?.includes("Director of Retention"));
  assert.ok(evidence.length > 0);
  assert.ok(
    providerResults.some(
      (result) =>
        result.toolName === "PeopleProvider.findPeople.rediem" &&
        result.status === "SUCCESS"
    )
  );
});

test("scoreBreakdown is present on every committee person", async () => {
  const { client } = createClient();
  const dossier = await resolveRediemBuyingCommittee(
    client,
    { people: new RediemPeopleProvider() },
    { workspaceId: "workspace_1", accountId: "account_1" }
  );

  const allPeople = [
    ...dossier.operatorBuyers,
    ...dossier.economicBuyers,
    ...dossier.technicalBuyers,
    ...dossier.influencers
  ];
  assert.ok(allPeople.length > 0);
  for (const person of allPeople) {
    assert.ok(typeof person.scoreBreakdown.titleFit === "number");
    assert.ok(typeof person.scoreBreakdown.departmentFit === "number");
    assert.ok(typeof person.scoreBreakdown.seniorityFit === "number");
    assert.ok(typeof person.scoreBreakdown.brandProfileFit === "number");
    assert.ok(typeof person.scoreBreakdown.recentSignalRelevance === "number");
    assert.ok(typeof person.scoreBreakdown.contactability === "number");
    assert.ok(typeof person.scoreBreakdown.sourceConfidence === "number");
  }
});

test("empty people list produces all-empty groups and null first contact", async () => {
  const { client } = createClient();
  const dossier = await resolveRediemBuyingCommittee(
    client,
    { people: makePeopleProvider([]) },
    { workspaceId: "workspace_1", accountId: "account_1" }
  );

  assert.equal(dossier.operatorBuyers.length, 0);
  assert.equal(dossier.economicBuyers.length, 0);
  assert.equal(dossier.technicalBuyers.length, 0);
  assert.equal(dossier.influencers.length, 0);
  assert.equal(dossier.recommendedFirstContact, null);
  assert.equal(dossier.multithreadPlan.whoToContactFirst, null);
  assert.equal(dossier.multithreadPlan.ccOrSequenceLater.length, 0);
});

test("founder-only brand routes all people to economicBuyers and picks founder as first contact", async () => {
  const { client } = createClient();
  const dossier = await resolveRediemBuyingCommittee(
    client,
    {
      people: makePeopleProvider([
        {
          fullName: "Alex Founder",
          title: "Founder & CEO",
          linkedinUrl: "https://linkedin.com/in/alex-founder",
          email: "alex@brand.example",
          sourceConfidence: 0.9
        },
        {
          fullName: "Sam Co-Founder",
          title: "Co-Founder",
          linkedinUrl: "https://linkedin.com/in/sam-cofounder",
          sourceConfidence: 0.85
        }
      ])
    },
    { workspaceId: "workspace_1", accountId: "account_1" }
  );

  assert.ok(dossier.economicBuyers.length >= 2);
  assert.equal(dossier.operatorBuyers.length, 0);
  assert.equal(dossier.technicalBuyers.length, 0);
  // First contact falls back to economicBuyers when no operatorBuyers exist
  assert.ok(dossier.recommendedFirstContact !== null);
  assert.ok(
    dossier.economicBuyers.some((p) => p.id === dossier.recommendedFirstContact?.id)
  );
});

test("unreachable top operator yields to reachable operator for first contact", async () => {
  const { client } = createClient();
  // Ghost has a stronger title but no contact channels (contactabilityScore = 30)
  // Reachable has a slightly weaker title but has email (contactabilityScore = 60)
  const dossier = await resolveRediemBuyingCommittee(
    client,
    {
      people: makePeopleProvider([
        {
          fullName: "Ghost Retention",
          title: "Head of Retention",
          // no linkedinUrl, no email — contactabilityScore = 30
          sourceConfidence: 0.9
        },
        {
          fullName: "Reachable Loyalty",
          title: "Loyalty Manager",
          email: "loyalty@brand.example",
          // contactabilityScore = 30 base + 30 email = 60
          sourceConfidence: 0.8
        }
      ])
    },
    { workspaceId: "workspace_1", accountId: "account_1" }
  );

  // Both are operatorBuyers; Ghost should sort first by score (Head > Manager),
  // but Reachable Loyalty should be the recommended first contact
  assert.ok(dossier.operatorBuyers.length >= 2);
  assert.equal(dossier.recommendedFirstContact?.fullName, "Reachable Loyalty");
});

test("recommended first contact is not included in ccOrSequenceLater", async () => {
  const { client } = createClient();
  const dossier = await resolveRediemBuyingCommittee(
    client,
    { people: new RediemPeopleProvider() },
    { workspaceId: "workspace_1", accountId: "account_1" }
  );

  const firstContact = dossier.recommendedFirstContact;
  assert.ok(firstContact !== null);
  assert.ok(
    !dossier.multithreadPlan.ccOrSequenceLater.some(
      (entry) => entry.fullName === firstContact.fullName
    )
  );
});
