import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attachEvidence,
  getEvidenceForEntity,
  upsertAccountWithEvidence,
  type EvidenceClient
} from "../src/server/evidence/index";

type StoredAccount = {
  id: string;
  workspaceId: string;
  name: string;
  domain?: string | null;
  industry?: string | null;
  websiteSummary?: string | null;
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

function createEvidenceClient(seed: { accounts?: StoredAccount[] } = {}) {
  let idCounter = 1;
  const accounts = [...(seed.accounts ?? [])];
  const evidence: StoredEvidence[] = [];

  const client: EvidenceClient = {
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
      async create() {
        throw new Error("signal.create is not used in these tests");
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
    }
  };

  return { client, accounts, evidence };
}

test("blank fields get filled and evidence is created", async () => {
  const { client, accounts, evidence } = createEvidenceClient({
    accounts: [
      {
        id: "account_1",
        workspaceId: "workspace_1",
        name: "Northstar Robotics",
        domain: "northstar.example",
        industry: null
      }
    ]
  });

  const account = await upsertAccountWithEvidence(client, {
    workspaceId: "workspace_1",
    fields: {
      domain: { value: "northstar.example" },
      industry: {
        value: "Industrial Automation",
        sourceUrl: "https://northstar.example/about",
        provider: "mock-provider",
        confidence: 0.82,
        capturedAt: new Date("2026-05-14T12:00:00.000Z"),
        rawExcerpt: "Northstar builds automation systems."
      }
    }
  });

  assert.equal(account.industry, "Industrial Automation");
  assert.equal(accounts[0]?.industry, "Industrial Automation");
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.fieldName, "industry");
  assert.equal(evidence[0]?.value, "Industrial Automation");
  assert.equal(evidence[0]?.sourceUrl, "https://northstar.example/about");
  assert.equal(evidence[0]?.provider, "mock-provider");
  assert.equal(evidence[0]?.confidence, 0.82);
  assert.equal(evidence[0]?.rawExcerpt, "Northstar builds automation systems.");
});

test("existing fields are not overwritten under BLANK_ONLY", async () => {
  const { client, accounts, evidence } = createEvidenceClient({
    accounts: [
      {
        id: "account_1",
        workspaceId: "workspace_1",
        name: "Northstar Robotics",
        domain: "northstar.example",
        industry: "Robotics"
      }
    ]
  });

  const account = await upsertAccountWithEvidence(client, {
    workspaceId: "workspace_1",
    fields: {
      domain: { value: "northstar.example" },
      industry: {
        value: "Industrial Automation",
        sourceUrl: "https://northstar.example/about",
        provider: "mock-provider",
        confidence: 0.9
      }
    }
  });

  assert.equal(account.industry, "Robotics");
  assert.equal(accounts[0]?.industry, "Robotics");
  assert.equal(evidence.length, 0);
});

test("higher confidence fields overwrite under HIGHER_CONFIDENCE", async () => {
  const { client, accounts, evidence } = createEvidenceClient({
    accounts: [
      {
        id: "account_1",
        workspaceId: "workspace_1",
        name: "Northstar Robotics",
        domain: "northstar.example",
        industry: "Robotics"
      }
    ]
  });

  await attachEvidence(client, {
    workspaceId: "workspace_1",
    entityType: "ACCOUNT",
    entityId: "account_1",
    fieldName: "industry",
    field: {
      value: "Robotics",
      provider: "older-provider",
      confidence: 0.45,
      capturedAt: new Date("2026-05-13T12:00:00.000Z")
    }
  });

  const account = await upsertAccountWithEvidence(client, {
    workspaceId: "workspace_1",
    overwritePolicy: "HIGHER_CONFIDENCE",
    fields: {
      domain: { value: "northstar.example" },
      industry: {
        value: "Industrial Automation",
        sourceUrl: "https://northstar.example/about",
        provider: "new-provider",
        confidence: 0.91,
        capturedAt: new Date("2026-05-14T12:00:00.000Z")
      }
    }
  });

  assert.equal(account.industry, "Industrial Automation");
  assert.equal(accounts[0]?.industry, "Industrial Automation");
  assert.equal(evidence.length, 2);
  assert.equal(evidence[1]?.provider, "new-provider");
  assert.equal(evidence[1]?.confidence, 0.91);
});

test("getEvidenceForEntity returns evidence for an entity and field", async () => {
  const { client } = createEvidenceClient();

  await attachEvidence(client, {
    workspaceId: "workspace_1",
    entityType: "ACCOUNT",
    entityId: "account_1",
    fieldName: "websiteSummary",
    field: {
      value: "Builds automation systems.",
      sourceUrl: "https://northstar.example",
      provider: "mock-provider",
      confidence: 0.7,
      capturedAt: new Date("2026-05-14T12:00:00.000Z")
    }
  });

  const rows = await getEvidenceForEntity(client, {
    workspaceId: "workspace_1",
    entityType: "ACCOUNT",
    entityId: "account_1",
    fieldName: "websiteSummary"
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.fieldName, "websiteSummary");
  assert.equal(rows[0]?.value, "Builds automation systems.");
});
