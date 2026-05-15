import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContactProvider,
  ContactProviderInput,
  ContactResult,
  EmailVerificationProvider,
  EmailVerificationProviderInput,
  EmailVerificationResult
} from "../src/server/providers";
import {
  enrichContacts,
  generateEmailPatterns,
  isSuppressedEmail,
  mapVerificationStatus,
  type EnrichContactsClient
} from "../src/server/workflows/enrichContacts";

type StoredPerson = {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  fullName: string;
  title?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  emailStatus?: string | null;
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
  lastEnrichedAt?: Date | null;
};

function createClient(seed: { people: StoredPerson[] }) {
  let idCounter = 1;
  const people = [...seed.people];
  const evidence: unknown[] = [];
  const providerResults: Array<{
    provider: string;
    toolName: string;
    costUsd?: number | string | null;
    latencyMs?: number | null;
    status: string;
  }> = [];
  const cacheEntries: Array<{
    id: string;
    namespace: string;
    key: string;
    value: unknown;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const client: EnrichContactsClient = {
    account: {
      async findFirst(args) {
        if (args.where.id === "account_1") {
          return {
            id: "account_1",
            workspaceId: args.where.workspaceId,
            name: "Example Co",
            domain: "example.com"
          };
        }

        return null;
      },
      async create() {
        throw new Error("account.create is not used in these tests");
      },
      async update() {
        throw new Error("account.update is not used in these tests");
      }
    },
    person: {
      async findFirst(args) {
        return (
          people.find((person) => {
            if (args.where.id) {
              return (
                person.id === args.where.id &&
                person.workspaceId === args.where.workspaceId
              );
            }

            return (
              person.workspaceId === args.where.workspaceId &&
              (args.where.OR ?? []).some((clause) =>
                Object.entries(clause).every(
                  ([key, value]) => person[key as keyof StoredPerson] === value
                )
              )
            );
          }) ?? null
        );
      },
      async findMany(args) {
        return people.filter(
          (person) =>
            person.workspaceId === args.where.workspaceId &&
            (!args.where.accountId || person.accountId === args.where.accountId) &&
            (!args.where.id || args.where.id.in.includes(person.id))
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
        throw new Error("signal.create is not used in these tests");
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

class TestContactProvider implements ContactProvider {
  name = "test-contact-provider";
  calls = 0;

  constructor(private email?: string) {}

  async enrichContact(input: ContactProviderInput): Promise<ContactResult> {
    this.calls += 1;
    return {
      fullName: input.fullName,
      companyDomain: input.companyDomain,
      linkedinUrl: input.linkedinUrl,
      email: this.email,
      contactabilityScore: this.email ? 60 : 20,
      sourceConfidence: this.email ? 0.7 : 0.2
    };
  }
}

class TestVerificationProvider implements EmailVerificationProvider {
  name = "test-verification-provider";
  calls: string[] = [];

  constructor(private statuses: Record<string, EmailVerificationResult["status"]>) {}

  async verifyEmail(
    input: EmailVerificationProviderInput
  ): Promise<EmailVerificationResult> {
    this.calls.push(input.email);
    return {
      email: input.email,
      status: this.statuses[input.email] ?? "INVALID",
      confidence: this.statuses[input.email] === "VERIFIED" ? 0.96 : 0.6
    };
  }
}

test("generates common email patterns", () => {
  assert.deepEqual(generateEmailPatterns("Avery Johnson", "example.com"), [
    "avery@example.com",
    "avery.johnson@example.com",
    "averyjohnson@example.com",
    "aJohnson@example.com",
    "avery_j@example.com"
  ]);
});

test("maps verification statuses and suppresses role-based emails", () => {
  assert.equal(isSuppressedEmail("sales@example.com"), true);
  assert.equal(isSuppressedEmail("avery@example.com"), false);
  assert.equal(
    mapVerificationStatus({ email: "sales@example.com", status: "VERIFIED" }),
    "SUPPRESSED"
  );
  assert.equal(
    mapVerificationStatus({ email: "avery@example.com", status: "CATCH_ALL" }),
    "CATCH_ALL"
  );
});

test("skips recently verified people without calling providers", async () => {
  const store = createClient({
    people: [
      {
        id: "person_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        fullName: "Avery Johnson",
        email: "avery@example.com",
        emailStatus: "VERIFIED",
        emailVerifiedAt: new Date(),
        contactabilityScore: 100
      }
    ]
  });
  const contactProvider = new TestContactProvider("avery@example.com");
  const verificationProvider = new TestVerificationProvider({
    "avery@example.com": "VERIFIED"
  });

  const result = await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    {
      workspaceId: "workspace_1",
      personIds: ["person_1"]
    }
  );

  assert.equal(result.skipped, 1);
  assert.equal(contactProvider.calls, 0);
  assert.equal(verificationProvider.calls.length, 0);
  assert.equal(store.providerResults.length, 0);
});

test("waterfall verifies provider email and updates contactability score", async () => {
  const store = createClient({
    people: [
      {
        id: "person_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        fullName: "Avery Johnson",
        linkedinUrl: "https://www.linkedin.com/in/avery"
      }
    ]
  });
  const contactProvider = new TestContactProvider("avery.johnson@example.com");
  const verificationProvider = new TestVerificationProvider({
    "avery.johnson@example.com": "VERIFIED"
  });

  const result = await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    {
      workspaceId: "workspace_1",
      accountId: "account_1"
    }
  );

  assert.equal(result.updated, 1);
  assert.equal(store.people[0]?.email, "avery.johnson@example.com");
  assert.equal(store.people[0]?.emailStatus, "VERIFIED");
  assert.equal(store.people[0]?.contactabilityScore, 90);
  assert.equal(result.results[0]?.sequenceReady, true);
  assert.equal(store.providerResults.length, 2);
  assert.equal(store.providerResults[0]?.costUsd, 0.03);
  assert.equal(typeof store.providerResults[0]?.latencyMs, "number");
  assert.ok(store.evidence.length > 0);
});

test("enrichContacts reuses email verification cache", async () => {
  const store = createClient({
    people: [
      {
        id: "person_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        fullName: "Avery Johnson",
        email: "avery@example.com",
        emailStatus: "UNKNOWN"
      }
    ]
  });
  const contactProvider = new TestContactProvider("avery@example.com");
  const verificationProvider = new TestVerificationProvider({
    "avery@example.com": "VERIFIED"
  });
  const input = {
    workspaceId: "workspace_1",
    personIds: ["person_1"]
  };

  await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    input
  );
  store.people[0]!.emailStatus = "UNKNOWN";
  store.people[0]!.emailVerifiedAt = null;
  const providerResultsAfterFirstRun = store.providerResults.length;

  await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    input
  );

  assert.deepEqual(verificationProvider.calls, ["avery@example.com"]);
  assert.equal(store.providerResults.length, providerResultsAfterFirstRun + 1);
  assert.equal(store.providerResults.at(-1)?.status, "CACHED");
});

test("waterfall stops at an existing verified email before contact providers", async () => {
  const store = createClient({
    people: [
      {
        id: "person_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        fullName: "Avery Johnson",
        linkedinUrl: "https://www.linkedin.com/in/avery",
        email: "avery@example.com",
        emailStatus: "UNKNOWN"
      }
    ]
  });
  const contactProvider = new TestContactProvider("avery.johnson@example.com");
  const verificationProvider = new TestVerificationProvider({
    "avery@example.com": "VERIFIED",
    "avery.johnson@example.com": "VERIFIED"
  });

  await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    {
      workspaceId: "workspace_1",
      accountId: "account_1"
    }
  );

  assert.equal(contactProvider.calls, 0);
  assert.deepEqual(verificationProvider.calls, ["avery@example.com"]);
  assert.equal(store.people[0]?.email, "avery@example.com");
  assert.equal(store.people[0]?.emailStatus, "VERIFIED");
});

test("falls back to generated patterns when providers do not return email", async () => {
  const store = createClient({
    people: [
      {
        id: "person_1",
        workspaceId: "workspace_1",
        accountId: "account_1",
        fullName: "Avery Johnson"
      }
    ]
  });
  const contactProvider = new TestContactProvider();
  const verificationProvider = new TestVerificationProvider({
    "avery@example.com": "INVALID",
    "avery.johnson@example.com": "VERIFIED"
  });

  await enrichContacts(
    store.client,
    {
      contactProviders: [contactProvider],
      emailVerificationProvider: verificationProvider
    },
    {
      workspaceId: "workspace_1",
      personIds: ["person_1"]
    }
  );

  assert.equal(store.people[0]?.email, "avery.johnson@example.com");
  assert.deepEqual(verificationProvider.calls.slice(0, 2), [
    "avery@example.com",
    "avery.johnson@example.com"
  ]);
});
