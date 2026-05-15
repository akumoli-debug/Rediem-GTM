import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MCPResearchProvider,
  MockProvider,
  type CompanyProviderInput,
  type CompanyProvider,
  type CompanyEnrichmentResult,
  type ContactProvider,
  type EmailVerificationProvider,
  type PeopleProvider,
  type WebResearchProvider
} from "../src/server/providers";
import {
  enrichContacts,
  researchAccount,
  resolveBuyingCommittee,
  type EnrichContactsClient,
  type ResearchAccountClient,
  type ResolveBuyingCommitteeClient
} from "../src/server/workflows/enrichment";

type GoldenAccount = {
  domain: string;
  expectedCompanyName: string;
  expectedPersonas: string[];
  expectedSignalTypes: string[];
  mustNotClaim: string[];
  motion?: string;
};

type GoldenPeople = {
  domain: string;
  expectedPeople: Array<{
    persona: string;
    titleKeywords: string[];
    expectedEmailStatus: string;
  }>;
};

type ExpectedSignals = {
  domain: string;
  expectedSignalTypes: string[];
  sourceCoverageRequired: boolean;
};

type AccountRecord = {
  id: string;
  workspaceId: string;
  domain?: string | null;
  name: string;
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

type PersonRecord = {
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
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  location?: string | null;
  personaType?: string | null;
  roleScore?: number | null;
  contactabilityScore?: number | null;
  sourceConfidence?: number | null;
  lastEnrichedAt?: Date | null;
};

type SignalRecord = {
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
  createdAt: Date;
};

type EvidenceRecord = {
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

type EvalStore = ReturnType<typeof createEvalClient>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ID = "eval_workspace";
const LIVE_EVAL = process.env.EVAL_LIVE === "true";

async function main() {
  const [goldenAccounts, goldenPeople, expectedSignals] = await Promise.all([
    readJson<GoldenAccount[]>("golden_accounts.json"),
    readJson<GoldenPeople[]>("golden_people.json"),
    readJson<ExpectedSignals[]>("expected_signals.json")
  ]);
  const store = createEvalClient();
  const providers = createProviders();
  const failures: Array<{ domain: string; error: string }> = [];
  const accountLatencies: number[] = [];

  for (const golden of goldenAccounts) {
    const startedAt = Date.now();

    try {
      const research = await researchAccount(
        store.client,
        {
          company: providers.company,
          webResearch: providers.webResearch
        },
        {
          workspaceId: WORKSPACE_ID,
          domain: golden.domain,
          focus: golden.motion,
          maxCostUsd: LIVE_EVAL ? 5 : 1,
          forceRefresh: true
        }
      );
      await resolveBuyingCommittee(
        store.client,
        {
          people: providers.people,
          company: providers.company,
          webResearch: providers.webResearch
        },
        {
          workspaceId: WORKSPACE_ID,
          accountId: research.accountId,
          motion: golden.motion ?? "GTM enrichment",
          maxPeople: 5,
          forceRefresh: true
        }
      );
      await enrichContacts(
        store.client,
        {
          contactProviders: [providers.contact],
          emailVerificationProvider: providers.emailVerification
        },
        {
          workspaceId: WORKSPACE_ID,
          accountId: research.accountId,
          maxCostUsd: LIVE_EVAL ? 2 : 1,
          requireVerifiedEmail: true,
          forceRefresh: true
        }
      );
    } catch (error) {
      failures.push({
        domain: golden.domain,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      accountLatencies.push(Date.now() - startedAt);
    }
  }

  const metrics = calculateMetrics(store, {
    goldenAccounts,
    goldenPeople,
    expectedSignals,
    failures,
    accountLatencies
  });
  const report = renderReport(metrics, {
    mode: LIVE_EVAL ? "live" : "mock",
    goldenAccounts,
    failures,
    store
  });
  const reportPath = path.join(__dirname, "reports", "latest.md");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report);

  console.log(`Eval report written to ${path.relative(process.cwd(), reportPath)}`);
  console.log(formatMetricsForConsole(metrics));

  if (metrics.workflow_failure_rate > 0.25) {
    process.exitCode = 1;
  }
}

async function readJson<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(path.join(__dirname, fileName), "utf8")) as T;
}

function createProviders(): {
  company: CompanyProvider;
  people: PeopleProvider;
  contact: ContactProvider;
  emailVerification: EmailVerificationProvider;
  webResearch: WebResearchProvider;
} {
  if (LIVE_EVAL) {
    const provider = new MCPResearchProvider({ mockResponses: false });
    const contactFallback = new EvalMockProvider();

    return {
      company: provider,
      people: provider,
      contact: contactFallback,
      emailVerification: contactFallback,
      webResearch: provider
    };
  }

  const provider = new EvalMockProvider();

  return {
    company: provider,
    people: provider,
    contact: provider,
    emailVerification: provider,
    webResearch: provider
  };
}

class EvalMockProvider extends MockProvider {
  override async enrichCompany(
    input: CompanyProviderInput
  ): Promise<CompanyEnrichmentResult> {
    const result = await super.enrichCompany(input);
    const domain = input.domain ?? result.domain ?? "sample.example";

    return {
      ...result,
      name: titleizeDomain(domain),
      linkedinUrl: `https://www.linkedin.com/company/${domain.replace(/[^a-z0-9]+/gi, "-")}`
    };
  }
}

function createEvalClient() {
  let idCounter = 1;
  const accounts: AccountRecord[] = [];
  const people: PersonRecord[] = [];
  const signals: SignalRecord[] = [];
  const evidence: EvidenceRecord[] = [];
  const providerResults: ProviderResultRecord[] = [];
  const cacheEntries: Array<{
    id: string;
    namespace: string;
    key: string;
    value: unknown;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const client = {
    account: {
      async findFirst(args: {
        where: {
          id?: string;
          workspaceId: string;
          OR?: Array<{ domain?: string; linkedinUrl?: string; name?: string }>;
        };
      }) {
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
                  ([key, value]) => account[key as keyof AccountRecord] === value
                )
              )
            );
          }) ?? null
        );
      },
      async create(args: { data: Record<string, unknown> }) {
        const account = {
          id: `account_${idCounter++}`,
          ...(args.data as Omit<AccountRecord, "id">)
        };
        accounts.push(account);
        return account;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const account = accounts.find((item) => item.id === args.where.id);

        if (!account) {
          throw new Error(`Missing account ${args.where.id}`);
        }

        Object.assign(account, args.data);
        return account;
      }
    },
    person: {
      async findFirst(args: {
        where: {
          id?: string;
          workspaceId: string;
          OR?: Array<{ linkedinUrl?: string; email?: string; fullName?: string }>;
        };
      }) {
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
                  ([key, value]) => person[key as keyof PersonRecord] === value
                )
              )
            );
          }) ?? null
        );
      },
      async findMany(args: {
        where: {
          workspaceId: string;
          id?: { in: string[] };
          accountId?: string;
        };
      }) {
        return people.filter(
          (person) =>
            person.workspaceId === args.where.workspaceId &&
            (!args.where.accountId || person.accountId === args.where.accountId) &&
            (!args.where.id || args.where.id.in.includes(person.id))
        );
      },
      async create(args: { data: Record<string, unknown> }) {
        const person = {
          id: `person_${idCounter++}`,
          ...(args.data as Omit<PersonRecord, "id">)
        };
        people.push(person);
        return person;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const person = people.find((item) => item.id === args.where.id);

        if (!person) {
          throw new Error(`Missing person ${args.where.id}`);
        }

        Object.assign(person, args.data);
        return person;
      }
    },
    signal: {
      async create(args: { data: Record<string, unknown> }) {
        const signal = {
          id: `signal_${idCounter++}`,
          createdAt: new Date(),
          ...(args.data as Omit<SignalRecord, "id" | "createdAt">)
        };
        signals.push(signal);
        return signal;
      },
      async findMany(args: {
        where: { workspaceId: string; accountId: string };
        orderBy?: { createdAt?: "asc" | "desc"; totalScore?: "asc" | "desc" };
        take?: number;
      }) {
        const rows = signals.filter(
          (signal) =>
            signal.workspaceId === args.where.workspaceId &&
            signal.accountId === args.where.accountId
        );

        rows.sort((left, right) => {
          if (args.orderBy?.totalScore) {
            return args.orderBy.totalScore === "desc"
              ? (right.totalScore ?? 0) - (left.totalScore ?? 0)
              : (left.totalScore ?? 0) - (right.totalScore ?? 0);
          }

          return args.orderBy?.createdAt === "asc"
            ? left.createdAt.getTime() - right.createdAt.getTime()
            : right.createdAt.getTime() - left.createdAt.getTime();
        });

        return rows.slice(0, args.take ?? rows.length);
      }
    },
    evidence: {
      async create(args: {
        data: Omit<EvidenceRecord, "id" | "createdAt">;
      }) {
        const row = {
          id: `evidence_${idCounter++}`,
          ...args.data,
          createdAt: new Date()
        };
        evidence.push(row);
        return row;
      },
      async findMany(args: {
        where: {
          workspaceId: string;
          entityType: EvidenceRecord["entityType"];
          entityId: string;
          fieldName?: string;
        };
      }) {
        return evidence
          .filter(
            (row) =>
              row.workspaceId === args.where.workspaceId &&
              row.entityType === args.where.entityType &&
              row.entityId === args.where.entityId &&
              (!args.where.fieldName || row.fieldName === args.where.fieldName)
          )
          .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime());
      }
    },
    providerResult: {
      async create(args: { data: ProviderResultRecord }) {
        providerResults.push({ ...args.data, createdAt: new Date() });
        return args.data;
      }
    },
    cacheEntry: {
      async findFirst(args: { where: { namespace: string; key: string } }) {
        return (
          cacheEntries.find(
            (entry) =>
              entry.namespace === args.where.namespace &&
              entry.key === args.where.key
          ) ?? null
        );
      },
      async upsert(args: {
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
      }) {
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
  } as ResearchAccountClient & ResolveBuyingCommitteeClient & EnrichContactsClient;

  return {
    client,
    accounts,
    people,
    signals,
    evidence,
    providerResults,
    cacheEntries
  };
}

function calculateMetrics(
  store: EvalStore,
  input: {
    goldenAccounts: GoldenAccount[];
    goldenPeople: GoldenPeople[];
    expectedSignals: ExpectedSignals[];
    failures: Array<{ domain: string; error: string }>;
    accountLatencies: number[];
  }
) {
  const successfulAccounts = input.goldenAccounts.filter((golden) =>
    store.accounts.some((account) => account.domain === golden.domain)
  );
  const fieldNames: Array<keyof AccountRecord> = [
    "domain",
    "name",
    "industry",
    "employeeCount",
    "websiteSummary",
    "pricingSummary",
    "careersSummary",
    "accountScore",
    "confidenceScore",
    "lastEnrichedAt"
  ];
  const companyMatches = successfulAccounts.filter((golden) => {
    const account = store.accounts.find((item) => item.domain === golden.domain);
    return normalize(account?.name) === normalize(golden.expectedCompanyName);
  }).length;
  const accountFillRate = average(
    successfulAccounts.map((golden) => {
      const account = store.accounts.find((item) => item.domain === golden.domain);
      return account
        ? fieldNames.filter((field) => isFilled(account[field])).length / fieldNames.length
        : 0;
    })
  );
  const decisionPrecision = average(
    input.goldenPeople.map((golden) => {
      const account = store.accounts.find((item) => item.domain === golden.domain);
      const topPeople = store.people
        .filter((person) => person.accountId === account?.id)
        .sort((left, right) => (right.roleScore ?? 0) - (left.roleScore ?? 0))
        .slice(0, 5);
      const matches = topPeople.filter((person) =>
        golden.expectedPeople.some((expected) =>
          expected.titleKeywords.some((keyword) =>
            normalize(person.title).includes(normalize(keyword))
          )
        )
      ).length;

      return topPeople.length === 0 ? 0 : matches / Math.min(5, topPeople.length);
    })
  );
  const verifiedEmailRate =
    store.people.length === 0
      ? 0
      : store.people.filter((person) => person.emailStatus === "VERIFIED").length /
        store.people.length;
  const signalRelevance = average(
    input.expectedSignals.map((expected) => {
      const account = store.accounts.find((item) => item.domain === expected.domain);
      const actualTypes = new Set(
        store.signals
          .filter((signal) => signal.accountId === account?.id)
          .map((signal) => signal.type)
      );
      const matched = expected.expectedSignalTypes.filter((type) => actualTypes.has(type)).length;

      return expected.expectedSignalTypes.length === 0
        ? 1
        : matched / expected.expectedSignalTypes.length;
    })
  );
  const sourceCoverage =
    store.evidence.length === 0
      ? 0
      : store.evidence.filter((row) => Boolean(row.sourceUrl)).length /
        store.evidence.length;
  const hallucinationChecks = input.goldenAccounts.flatMap((golden) =>
    golden.mustNotClaim.map((claim) => ({
      domain: golden.domain,
      claim
    }))
  );
  const hallucinations = hallucinationChecks.filter(({ domain, claim }) => {
    const account = store.accounts.find((item) => item.domain === domain);
    const accountText = account
      ? [
          account.websiteSummary,
          account.pricingSummary,
          account.careersSummary,
          account.blogSummary,
          account.pressSummary,
          ...store.signals
            .filter((signal) => signal.accountId === account.id)
            .flatMap((signal) => [signal.type, signal.title, signal.description]),
          ...store.evidence
            .filter((row) => row.entityId === account.id)
            .flatMap((row) => [row.value, row.rawExcerpt])
        ]
          .filter(Boolean)
          .join(" ")
      : "";

    return normalize(accountText).includes(normalize(claim));
  }).length;
  const totalCost = store.providerResults.reduce(
    (sum, result) => sum + Number(result.costUsd ?? 0),
    0
  );
  const successfulCount = Math.max(1, successfulAccounts.length);

  return {
    company_match_accuracy: ratio(companyMatches, input.goldenAccounts.length),
    account_field_fill_rate: roundMetric(accountFillRate),
    decision_maker_precision_at_5: roundMetric(decisionPrecision),
    verified_email_rate: roundMetric(verifiedEmailRate),
    signal_relevance_score: roundMetric(signalRelevance),
    source_coverage_rate: roundMetric(sourceCoverage),
    hallucination_rate: ratio(hallucinations, Math.max(1, hallucinationChecks.length)),
    cost_per_successful_account: roundMoney(totalCost / successfulCount),
    latency_per_account: Math.round(average(input.accountLatencies)),
    workflow_failure_rate: ratio(input.failures.length, input.goldenAccounts.length)
  };
}

function renderReport(
  metrics: ReturnType<typeof calculateMetrics>,
  input: {
    mode: "mock" | "live";
    goldenAccounts: GoldenAccount[];
    failures: Array<{ domain: string; error: string }>;
    store: EvalStore;
  }
): string {
  const lines = [
    "# GTM Enrichment Eval Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${input.mode}`,
    "",
    "## Metrics",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...Object.entries(metrics).map(([name, value]) => `| ${name} | ${value} |`),
    "",
    "## Dataset",
    "",
    `Golden accounts: ${input.goldenAccounts.length}`,
    `Accounts enriched: ${input.store.accounts.length}`,
    `People stored: ${input.store.people.length}`,
    `Signals stored: ${input.store.signals.length}`,
    `Evidence rows: ${input.store.evidence.length}`,
    `Provider calls: ${input.store.providerResults.length}`,
    "",
    "## Account Results",
    "",
    "| Domain | Stored Name | Signals | People | Evidence Sources |",
    "| --- | --- | ---: | ---: | ---: |",
    ...input.goldenAccounts.map((golden) => {
      const account = input.store.accounts.find((item) => item.domain === golden.domain);
      const signalCount = input.store.signals.filter(
        (signal) => signal.accountId === account?.id
      ).length;
      const peopleCount = input.store.people.filter(
        (person) => person.accountId === account?.id
      ).length;
      const sourceCount = input.store.evidence.filter(
        (row) => row.entityId === account?.id && row.sourceUrl
      ).length;

      return `| ${golden.domain} | ${account?.name ?? "missing"} | ${signalCount} | ${peopleCount} | ${sourceCount} |`;
    }),
    "",
    "## Failures",
    "",
    input.failures.length === 0
      ? "No workflow failures."
      : input.failures
          .map((failure) => `- ${failure.domain}: ${failure.error}`)
          .join("\n"),
    ""
  ];

  return lines.join("\n");
}

function formatMetricsForConsole(metrics: ReturnType<typeof calculateMetrics>): string {
  return Object.entries(metrics)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleizeDomain(domain: string): string {
  const label = domain.replace(/^www\./, "").split(".")[0] ?? domain;

  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  return typeof value !== "string" || value.trim().length > 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number {
  return roundMetric(denominator === 0 ? 0 : numerator / denominator);
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
