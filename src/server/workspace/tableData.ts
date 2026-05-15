import { prisma } from "@/server/db/client";
import type {
  AccountTableRow,
  EvidenceItem,
  FormulaCell,
  PeopleTableRow,
  PlaybookOption
} from "@/components/workspace/types";
import {
  calculateFieldFillRates,
  calculateProviderHealth,
  calculateRunCostMetrics,
  defaultBudgetControls,
  groupErrorsByProviderTool,
  type ProviderCallMetric
} from "@/server/observability";
import { previewFormulaTemplate } from "@/server/formulas";

type FormulaResultWithColumn = {
  entityId: string;
  formulaColumnId: string;
  value: unknown;
  error: string | null;
  formulaColumn: {
    name: string;
  };
};

export async function getWorkspaceSummary() {
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" }
  });

  return workspace;
}

export async function getAccountTableData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return {
      workspace: null,
      rows: [],
      formulaColumns: [],
      signalTypes: [],
      playbooks: []
    };
  }

  const [accounts, formulaColumns, playbooks] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId: workspace.id },
      include: {
        signals: {
          orderBy: [{ signalDate: "desc" }, { createdAt: "desc" }]
        },
        people: {
          orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }]
        }
      },
      orderBy: [{ accountScore: "desc" }, { createdAt: "asc" }]
    }),
    prisma.formulaColumn.findMany({
      where: { workspaceId: workspace.id, scope: "ACCOUNT", enabled: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.playbook.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" }
    })
  ]);

  const entityIds = accounts.map((account) => account.id);
  const signalIds = accounts.flatMap((account) => account.signals.map((signal) => signal.id));
  const [evidence, formulaResults] = await Promise.all([
    prisma.evidence.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { entityType: "ACCOUNT", entityId: { in: entityIds } },
          { entityType: "SIGNAL", entityId: { in: signalIds } }
        ]
      },
      orderBy: { capturedAt: "desc" }
    }),
    prisma.formulaResult.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "ACCOUNT",
        formulaColumnId: { in: formulaColumns.map((column) => column.id) }
      },
      include: { formulaColumn: true },
      orderBy: { evaluatedAt: "desc" }
    })
  ]);

  const evidenceByEntity = groupEvidence(evidence);
  const signalToAccount = new Map(
    accounts.flatMap((account) =>
      account.signals.map((signal) => [signal.id, account.id] as const)
    )
  );
  const signalEvidenceByAccount = new Map<string, EvidenceItem[]>();
  for (const item of evidence) {
    if (item.entityType !== "SIGNAL") {
      continue;
    }
    const accountId = signalToAccount.get(item.entityId);
    if (!accountId) {
      continue;
    }
    const list = signalEvidenceByAccount.get(accountId) ?? [];
    list.push(toEvidenceItem(item));
    signalEvidenceByAccount.set(accountId, list);
  }

  const formulasByEntity = groupFormulaResults(formulaResults);
  const signalTypes = Array.from(
    new Set(accounts.flatMap((account) => account.signals.map((signal) => signal.type)))
  ).sort();

  return {
    workspace,
    formulaColumns: formulaColumns.map((column) => column.name),
    playbooks: playbooks.map(toPlaybookOption),
    signalTypes,
    rows: accounts.map((account): AccountTableRow => {
      const latestSignal = account.signals[0];
      const maxSignalScore = Math.max(
        0,
        ...account.signals.map((signal) => signal.totalScore ?? 0)
      );
      const recommendedPerson = account.people[0];
      const accountEvidence = evidenceByEntity.get(account.id) ?? [];
      const relatedSignalEvidence = signalEvidenceByAccount.get(account.id) ?? [];

      return {
        id: account.id,
        domain: account.domain ?? "—",
        name: account.name,
        industry: account.industry ?? "—",
        employeeCount: account.employeeCount?.toLocaleString() ?? "—",
        accountScore: account.accountScore,
        latestSignal: latestSignal?.title ?? "—",
        signalTypes: account.signals.map((signal) => signal.type),
        maxSignalScore: account.signals.length > 0 ? maxSignalScore : null,
        recommendedPersona: recommendedPerson?.personaType ?? "UNKNOWN",
        lastEnrichedAt: account.lastEnrichedAt?.toISOString() ?? "Never",
        formulas: fillFormulaCells(
          formulaColumns.map((column) => column.name),
          formulasByEntity.get(account.id) ?? []
        ),
        evidence: [...accountEvidence, ...relatedSignalEvidence]
      };
    })
  };
}

function toPlaybookOption(playbook: {
  id: string;
  name: string;
  description: string;
  targetMotion: string;
  targetPersonas: unknown;
  signalTypes: unknown;
}): PlaybookOption {
  return {
    id: playbook.id,
    name: playbook.name,
    description: playbook.description,
    targetMotion: playbook.targetMotion,
    targetPersonas: arrayOfStrings(playbook.targetPersonas),
    signalTypes: arrayOfStrings(playbook.signalTypes)
  };
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getPeopleTableData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return {
      workspace: null,
      rows: [],
      formulaColumns: [],
      emailStatuses: [],
      personaTypes: []
    };
  }

  const [people, formulaColumns] = await Promise.all([
    prisma.person.findMany({
      where: { workspaceId: workspace.id },
      include: { account: true },
      orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }]
    }),
    prisma.formulaColumn.findMany({
      where: { workspaceId: workspace.id, scope: "PERSON", enabled: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const personIds = people.map((person) => person.id);
  const [evidence, formulaResults] = await Promise.all([
    prisma.evidence.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "PERSON",
        entityId: { in: personIds }
      },
      orderBy: { capturedAt: "desc" }
    }),
    prisma.formulaResult.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "PERSON",
        formulaColumnId: { in: formulaColumns.map((column) => column.id) }
      },
      include: { formulaColumn: true },
      orderBy: { evaluatedAt: "desc" }
    })
  ]);

  const evidenceByEntity = groupEvidence(evidence);
  const formulasByEntity = groupFormulaResults(formulaResults);

  return {
    workspace,
    formulaColumns: formulaColumns.map((column) => column.name),
    emailStatuses: Array.from(new Set(people.map((person) => person.emailStatus))).sort(),
    personaTypes: Array.from(new Set(people.map((person) => person.personaType))).sort(),
    rows: people.map((person): PeopleTableRow => ({
      id: person.id,
      fullName: person.fullName,
      account: person.account?.name ?? "—",
      title: person.title ?? "—",
      personaType: person.personaType,
      roleScore: person.roleScore,
      email: person.email ?? "—",
      emailStatus: person.emailStatus,
      contactabilityScore: person.contactabilityScore,
      linkedinUrl: person.linkedinUrl ?? "",
      lastEnrichedAt: person.lastEnrichedAt?.toISOString() ?? "Never",
      formulas: fillFormulaCells(
        formulaColumns.map((column) => column.name),
        formulasByEntity.get(person.id) ?? []
      ),
      evidence: evidenceByEntity.get(person.id) ?? []
    }))
  };
}

export async function getSignalsPageData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return { workspace: null, signals: [] };
  }

  const signals = await prisma.signal.findMany({
    where: { workspaceId: workspace.id },
    include: { account: true },
    orderBy: [{ signalDate: "desc" }, { createdAt: "desc" }]
  });

  return { workspace, signals };
}

export async function getRunsPageData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return {
      workspace: null,
      runs: [],
      metrics: calculateRunCostMetrics({ providerCalls: [], inputCount: 0 }),
      budgetControls: defaultBudgetControls
    };
  }

  const runs = await prisma.workflowRun.findMany({
    where: { workspaceId: workspace.id },
    include: { providerResults: true },
    orderBy: { createdAt: "desc" }
  });
  const providerCalls = runs.flatMap((run) =>
    run.providerResults.map((result) => toProviderCallMetric(result))
  );
  const metrics = calculateRunCostMetrics({
    providerCalls,
    inputCount: runs.reduce((sum, run) => sum + run.inputCount, 0)
  });

  return { workspace, runs, metrics, budgetControls: defaultBudgetControls };
}

export async function getRunDetailData(runId: string) {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { providerResults: { orderBy: { createdAt: "asc" } } }
  });

  if (!run) {
    return null;
  }

  const [accounts, signals, people] = await Promise.all([
    prisma.account.findMany({
      where: {
        workspaceId: run.workspaceId,
        createdAt: { gte: run.startedAt ?? run.createdAt }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.signal.findMany({
      where: {
        workspaceId: run.workspaceId,
        createdAt: { gte: run.startedAt ?? run.createdAt }
      },
      include: { account: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.person.findMany({
      where: {
        workspaceId: run.workspaceId,
        createdAt: { gte: run.startedAt ?? run.createdAt }
      },
      include: { account: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const providerCalls = run.providerResults.map((result) => toProviderCallMetric(result));
  const verifiedContacts = people.filter((person) => person.emailStatus === "VERIFIED").length;
  const metrics = calculateRunCostMetrics({
    providerCalls,
    inputCount: run.inputCount,
    generatedAccountCount: accounts.length || run.inputCount,
    verifiedContactCount: verifiedContacts
  });
  const fieldFillRates = {
    accounts: calculateFieldFillRates(accounts, [
      "domain",
      "industry",
      "websiteSummary",
      "accountScore",
      "confidenceScore",
      "lastEnrichedAt"
    ]),
    people: calculateFieldFillRates(people, [
      "title",
      "email",
      "emailStatus",
      "personaType",
      "roleScore",
      "contactabilityScore"
    ])
  };
  const timeline = [
    {
      timestamp: run.createdAt,
      label: "Run created",
      detail: run.workflowName
    },
    ...(run.startedAt
      ? [{ timestamp: run.startedAt, label: "Run started", detail: run.status }]
      : []),
    ...run.providerResults.map((result) => ({
      timestamp: result.createdAt,
      label: `${result.provider}.${result.toolName}`,
      detail: result.errorMessage ?? result.status
    })),
    ...(run.completedAt
      ? [{ timestamp: run.completedAt, label: "Run completed", detail: run.status }]
      : [])
  ].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

  return {
    run,
    providerCalls,
    metrics,
    errorsByProviderTool: groupErrorsByProviderTool(providerCalls),
    cacheHits: providerCalls.filter((call) => call.status === "CACHED"),
    generated: { accounts, signals, people },
    fieldFillRates,
    timeline,
    budgetControls: defaultBudgetControls
  };
}

export async function getProviderSettingsData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return {
      workspace: null,
      providers: [],
      budgetControls: defaultBudgetControls
    };
  }

  const providerResults = await prisma.providerResult.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" }
  });
  const providers = calculateProviderHealth({
    providerCalls: providerResults.map((result) => toProviderCallMetric(result)),
    requiredKeysByProvider: {
      "mcp-research-provider": ["MCP_RESEARCH_SERVER_COMMAND"],
      "mock-provider": [],
      "sample-research-provider": [],
      apify: ["APIFY_TOKEN"],
      firecrawl: ["FIRECRAWL_API_KEY"],
      browserbase: ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID"],
      openai: ["OPENAI_API_KEY"],
      anthropic: ["ANTHROPIC_API_KEY"],
      hubspot: ["HUBSPOT_ACCESS_TOKEN"],
      salesforce: [
        "SALESFORCE_CLIENT_ID",
        "SALESFORCE_CLIENT_SECRET",
        "SALESFORCE_REFRESH_TOKEN"
      ]
    },
    env: process.env,
    estimatedCostByProvider: {
      "sample-research-provider": 0.06,
      "mock-provider": 0,
      apify: 0.02,
      firecrawl: 0.01,
      browserbase: 0.05,
      openai: 0.01,
      anthropic: 0.01,
      hubspot: 0,
      salesforce: 0
    }
  });

  return { workspace, providers, budgetControls: defaultBudgetControls };
}

export async function getFormulaSettingsData() {
  const workspace = await getWorkspaceSummary();

  if (!workspace) {
    return { workspace: null, formulas: [], templates: [] };
  }

  const [formulas, templates] = await Promise.all([
    prisma.formulaColumn.findMany({
      where: { workspaceId: workspace.id },
      include: { results: true },
      orderBy: [{ scope: "asc" }, { createdAt: "asc" }]
    }),
    prisma.formulaTemplate.findMany({
      orderBy: [{ scope: "asc" }, { name: "asc" }]
    })
  ]);
  const installedKeys = new Set(
    formulas.map((formula) => `${formula.scope}:${formula.name}`)
  );
  const previews = await Promise.all(
    templates.map((template) =>
      previewFormulaTemplate(prisma, {
        workspaceId: workspace.id,
        templateId: template.id
      })
    )
  );
  const previewByTemplateId = new Map(
    previews.map((preview) => [preview.templateId, preview])
  );

  return {
    workspace,
    formulas,
    templates: templates.map((template) => ({
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      scope: template.scope,
      expression: template.expression,
      outputType: template.outputType,
      installed: installedKeys.has(`${template.scope}:${template.name}`),
      preview: previewByTemplateId.get(template.id) ?? {
        templateId: template.id,
        value: null,
        error: "Preview unavailable."
      }
    }))
  };
}

function groupEvidence(items: Awaited<ReturnType<typeof prisma.evidence.findMany>>) {
  const map = new Map<string, EvidenceItem[]>();

  for (const item of items) {
    const list = map.get(item.entityId) ?? [];
    list.push(toEvidenceItem(item));
    map.set(item.entityId, list);
  }

  return map;
}

function toEvidenceItem(
  item: Awaited<ReturnType<typeof prisma.evidence.findMany>>[number]
): EvidenceItem {
  return {
    id: item.id,
    entityType: item.entityType,
    entityId: item.entityId,
    fieldName: item.fieldName,
    value: item.value,
    sourceUrl: item.sourceUrl,
    provider: item.provider,
    rawExcerpt: item.rawExcerpt,
    confidence: item.confidence,
    capturedAt: item.capturedAt.toISOString()
  };
}

function groupFormulaResults(results: FormulaResultWithColumn[]) {
  const map = new Map<string, FormulaCell[]>();

  for (const result of results) {
    const list = map.get(result.entityId) ?? [];
    list.push({
      columnId: result.formulaColumnId,
      name: result.formulaColumn.name,
      value: displayJsonValue(result.value),
      error: result.error
    });
    map.set(result.entityId, list);
  }

  return map;
}

function fillFormulaCells(names: string[], cells: FormulaCell[]) {
  return names.map((name) => {
    const cell = cells.find((item) => item.name === name);
    return (
      cell ?? {
        columnId: name,
        name,
        value: "—",
        error: null
      }
    );
  });
}

function displayJsonValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function toProviderCallMetric(result: {
  provider: string;
  toolName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "CACHED";
  costUsd: { toString(): string } | string | number | null;
  latencyMs: number | null;
  errorMessage?: string | null;
  createdAt: Date;
}): ProviderCallMetric {
  return {
    provider: result.provider,
    toolName: result.toolName,
    status: result.status,
    costUsd:
      result.costUsd === null || result.costUsd === undefined
        ? 0
        : Number(result.costUsd.toString()),
    latencyMs: result.latencyMs,
    errorMessage: result.errorMessage,
    createdAt: result.createdAt
  };
}
