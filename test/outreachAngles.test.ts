import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateOutreachAngles,
  type OutreachAngleClient
} from "../src/server/workflows/outreachAngles";

type StoredAccount = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
  industry?: string | null;
  websiteSummary?: string | null;
  pricingSummary?: string | null;
  careersSummary?: string | null;
  blogSummary?: string | null;
  pressSummary?: string | null;
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
  personaType?: string | null;
  roleScore?: number | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
};

type StoredSignal = {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  title: string;
  description?: string | null;
  signalDate?: Date | null;
  totalScore?: number | null;
  sourceUrl?: string | null;
  createdAt?: Date;
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
  createdAt?: Date;
};

function createClient(seed: {
  accounts?: StoredAccount[];
  people?: StoredPerson[];
  signals?: StoredSignal[];
  evidence?: StoredEvidence[];
}) {
  let idCounter = 1;
  const accounts = [...(seed.accounts ?? [])];
  const people = [...(seed.people ?? [])];
  const signals = [...(seed.signals ?? [])];
  const evidence = [...(seed.evidence ?? [])];
  const client: OutreachAngleClient = {
    account: {
      async findFirst(args) {
        return (
          accounts.find(
            (account) =>
              account.id === args.where.id &&
              account.workspaceId === args.where.workspaceId
          ) ?? null
        );
      }
    },
    person: {
      async findFirst(args) {
        return (
          people.find(
            (person) =>
              person.id === args.where.id &&
              person.workspaceId === args.where.workspaceId
          ) ?? null
        );
      }
    },
    signal: {
      async findMany(args) {
        return signals
          .filter(
            (signal) =>
              signal.workspaceId === args.where.workspaceId &&
              signal.accountId === args.where.accountId
          )
          .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
          .slice(0, args.take ?? signals.length);
      }
    },
    evidence: {
      async findMany(args) {
        return evidence
          .filter(
            (row) =>
              row.workspaceId === args.where.workspaceId &&
              row.entityType === args.where.entityType &&
              row.entityId === args.where.entityId
          )
          .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
      },
      async create(args) {
        const row = {
          id: `generated_evidence_${idCounter++}`,
          ...args.data,
          createdAt: new Date()
        };
        evidence.push(row);
        return row;
      }
    }
  };

  return { client, evidence };
}

const account: StoredAccount = {
  id: "account_1",
  workspaceId: "workspace_1",
  domain: "example.com",
  name: "Example Co",
  industry: "B2B Software",
  websiteSummary: "Workflow software for revenue teams",
  pricingSummary: "Enterprise plan available",
  careersSummary: "Hiring RevOps and GTM Systems roles",
  accountScore: 86,
  confidenceScore: 0.82
};

const hiringSignal: StoredSignal = {
  id: "signal_1",
  workspaceId: "workspace_1",
  accountId: "account_1",
  type: "HIRING",
  title: "Hiring RevOps and GTM Systems roles",
  description: "Careers page lists revenue operations and GTM systems roles.",
  signalDate: new Date("2026-05-10T12:00:00.000Z"),
  totalScore: 92,
  sourceUrl: "https://example.com/careers",
  createdAt: new Date("2026-05-14T12:00:00.000Z")
};

const accountEvidence: StoredEvidence = {
  id: "evidence_1",
  workspaceId: "workspace_1",
  entityType: "ACCOUNT",
  entityId: "account_1",
  fieldName: "careersSummary",
  value: "Hiring RevOps and GTM Systems roles",
  sourceUrl: "https://example.com/careers",
  provider: "mock-web-research",
  rawExcerpt: "Open roles include RevOps Manager and GTM Systems Lead.",
  confidence: 0.88,
  capturedAt: new Date("2026-05-14T12:00:00.000Z")
};

const signalEvidence: StoredEvidence = {
  id: "evidence_2",
  workspaceId: "workspace_1",
  entityType: "SIGNAL",
  entityId: "signal_1",
  fieldName: "title",
  value: "Hiring RevOps and GTM Systems roles",
  sourceUrl: "https://example.com/careers",
  provider: "mock-web-research",
  confidence: 0.9,
  capturedAt: new Date("2026-05-14T12:01:00.000Z")
};

test("generates three evidence-backed angles from account evidence", async () => {
  const { client, evidence } = createClient({
    accounts: [account],
    signals: [hiringSignal],
    evidence: [accountEvidence, signalEvidence]
  });

  const dossier = await generateOutreachAngles(client, {
    workspaceId: "workspace_1",
    accountId: "account_1",
    motion: "AI GTM workflow software"
  });

  assert.equal(dossier.status, "READY");
  assert.equal(dossier.angles.length, 3);
  assert.ok(dossier.confidence >= 0.5);
  assert.ok(dossier.sourceUrls.includes("https://example.com/careers"));
  assert.equal(
    dossier.angles.every((angle) => angle.relevantSignals.length > 0),
    true
  );
  assert.equal(
    dossier.angles.every((angle) => angle.citedEvidence.length > 0),
    true
  );
  assert.equal(
    evidence.filter((row) => row.provider === "outreach-angle-generator").length,
    3
  );
});

test("uses person context when a person is provided", async () => {
  const person: StoredPerson = {
    id: "person_1",
    workspaceId: "workspace_1",
    accountId: "account_1",
    fullName: "Avery Johnson",
    title: "Director of GTM Systems and RevOps",
    personaType: "DAY_TO_DAY_OWNER",
    roleScore: 91,
    contactabilityScore: 80,
    sourceConfidence: 0.82
  };
  const personEvidence: StoredEvidence = {
    id: "evidence_3",
    workspaceId: "workspace_1",
    entityType: "PERSON",
    entityId: "person_1",
    fieldName: "title",
    value: "Director of GTM Systems and RevOps",
    sourceUrl: "https://www.linkedin.com/in/avery-johnson-sample",
    provider: "mock-people-provider",
    confidence: 0.82,
    capturedAt: new Date("2026-05-14T12:02:00.000Z")
  };
  const { client, evidence } = createClient({
    accounts: [account],
    people: [person],
    signals: [hiringSignal],
    evidence: [accountEvidence, signalEvidence, personEvidence]
  });

  const dossier = await generateOutreachAngles(client, {
    workspaceId: "workspace_1",
    accountId: "account_1",
    personId: "person_1",
    motion: "AI GTM workflow software"
  });

  assert.equal(dossier.status, "READY");
  assert.equal(dossier.personId, "person_1");
  assert.equal(dossier.angles[0]?.suggestedPersona, "Day To Day Owner");
  assert.match(dossier.angles[2]?.angleTitle ?? "", /Avery Johnson/);
  assert.ok(
    dossier.angles.some((angle) =>
      angle.personalizationBullets.some((bullet) =>
        bullet.includes("Director of GTM Systems")
      )
    )
  );
  assert.equal(
    evidence.filter(
      (row) =>
        row.provider === "outreach-angle-generator" &&
        row.entityType === "PERSON" &&
        row.entityId === "person_1"
    ).length,
    3
  );
});

test("returns insufficient evidence instead of drafting unsupported angles", async () => {
  const { client, evidence } = createClient({
    accounts: [account],
    signals: [],
    evidence: [accountEvidence]
  });

  const dossier = await generateOutreachAngles(client, {
    workspaceId: "workspace_1",
    accountId: "account_1",
    motion: "AI GTM workflow software"
  });

  assert.equal(dossier.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(dossier.reason, "insufficient evidence");
  assert.deepEqual(dossier.angles, []);
  assert.equal(dossier.doNotUseIfLowConfidence, true);
  assert.equal(
    evidence.filter((row) => row.provider === "outreach-angle-generator").length,
    0
  );
});
