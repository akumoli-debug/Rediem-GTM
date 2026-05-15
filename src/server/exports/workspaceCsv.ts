import { prisma } from "@/server/db/client";
import { buildCsv, type CsvRow } from "./csv";

export async function exportAccountsCsv(workspaceId?: string) {
  const workspace = await resolveWorkspace(workspaceId);
  if (!workspace) {
    return buildCsv([]);
  }

  const accounts = await prisma.account.findMany({
    where: { workspaceId: workspace.id },
    include: {
      signals: { orderBy: [{ totalScore: "desc" }, { signalDate: "desc" }] },
      people: { orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }] }
    },
    orderBy: [{ accountScore: "desc" }, { createdAt: "asc" }]
  });
  const formulaColumns = await prisma.formulaColumn.findMany({
    where: { workspaceId: workspace.id, scope: "ACCOUNT", enabled: true },
    orderBy: { createdAt: "asc" }
  });
  const [formulaResults, evidence] = await Promise.all([
    prisma.formulaResult.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "ACCOUNT",
        formulaColumnId: { in: formulaColumns.map((column) => column.id) }
      },
      include: { formulaColumn: true }
    }),
    prisma.evidence.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: { in: ["ACCOUNT", "SIGNAL"] }
      }
    })
  ]);

  const formulaMap = groupFormulaResults(formulaResults);
  const accountSignalIds = new Map(
    accounts.flatMap((account) =>
      account.signals.map((signal) => [signal.id, account.id] as const)
    )
  );

  const sourceMap = new Map<string, Set<string>>();
  for (const item of evidence) {
    if (!item.sourceUrl) {
      continue;
    }

    const accountId =
      item.entityType === "SIGNAL" ? accountSignalIds.get(item.entityId) : item.entityId;
    if (!accountId) {
      continue;
    }

    const sources = sourceMap.get(accountId) ?? new Set<string>();
    sources.add(item.sourceUrl);
    sourceMap.set(accountId, sources);
  }

  const rows: CsvRow[] = accounts.map((account) => {
    const latestSignal = account.signals
      .slice()
      .sort(
        (left, right) =>
          (right.signalDate ?? right.createdAt).getTime() -
          (left.signalDate ?? left.createdAt).getTime()
      )[0];
    const formulas = formulaMap.get(account.id) ?? {};

    return {
      domain: account.domain ?? "",
      name: account.name,
      linkedinUrl: account.linkedinUrl ?? "",
      industry: account.industry ?? "",
      employeeCount: account.employeeCount?.toString() ?? "",
      hqLocation: account.hqLocation ?? "",
      websiteSummary: account.websiteSummary ?? "",
      pricingSummary: account.pricingSummary ?? "",
      careersSummary: account.careersSummary ?? "",
      accountScore: account.accountScore?.toString() ?? "",
      confidenceScore: account.confidenceScore?.toString() ?? "",
      latestSignal: latestSignal?.title ?? "",
      latestSignalDate: latestSignal?.signalDate?.toISOString() ?? "",
      signalSummary: account.signals
        .slice(0, 5)
        .map((signal) => `${signal.type}: ${signal.title}`)
        .join(" | "),
      maxSignalScore: maxScore(account.signals.map((signal) => signal.totalScore)).toString(),
      topBuyingCommitteePeople: account.people
        .slice(0, 5)
        .map((person) => `${person.fullName} - ${person.title ?? "Unknown"} (${person.personaType})`)
        .join(" | "),
      sourceUrls: Array.from(sourceMap.get(account.id) ?? []).join(" | "),
      ...Object.fromEntries(
        formulaColumns.map((column) => [
          `formula:${column.name}`,
          formulas[column.name] ?? ""
        ])
      )
    };
  });

  return buildCsv(rows);
}

export async function exportPeopleCsv(workspaceId?: string) {
  const workspace = await resolveWorkspace(workspaceId);
  if (!workspace) {
    return buildCsv([]);
  }

  const people = await prisma.person.findMany({
    where: { workspaceId: workspace.id },
    include: { account: true },
    orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }]
  });
  const formulaColumns = await prisma.formulaColumn.findMany({
    where: { workspaceId: workspace.id, scope: "PERSON", enabled: true },
    orderBy: { createdAt: "asc" }
  });
  const [formulaResults, evidence] = await Promise.all([
    prisma.formulaResult.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "PERSON",
        formulaColumnId: { in: formulaColumns.map((column) => column.id) }
      },
      include: { formulaColumn: true }
    }),
    prisma.evidence.findMany({
      where: {
        workspaceId: workspace.id,
        entityType: "PERSON"
      }
    })
  ]);

  const formulaMap = groupFormulaResults(formulaResults);
  const sourceMap = new Map<string, Set<string>>();
  for (const item of evidence) {
    if (!item.sourceUrl) {
      continue;
    }
    const sources = sourceMap.get(item.entityId) ?? new Set<string>();
    sources.add(item.sourceUrl);
    sourceMap.set(item.entityId, sources);
  }

  const rows: CsvRow[] = people.map((person) => {
    const formulas = formulaMap.get(person.id) ?? {};

    return {
      accountDomain: person.account?.domain ?? "",
      accountName: person.account?.name ?? "",
      fullName: person.fullName,
      title: person.title ?? "",
      seniority: person.seniority ?? "",
      department: person.department ?? "",
      linkedinUrl: person.linkedinUrl ?? "",
      email: person.email ?? "",
      emailStatus: person.emailStatus,
      phone: person.phone ?? "",
      location: person.location ?? "",
      personaType: person.personaType,
      roleScore: person.roleScore?.toString() ?? "",
      contactabilityScore: person.contactabilityScore?.toString() ?? "",
      sourceConfidence: person.sourceConfidence?.toString() ?? "",
      lastEnrichedAt: person.lastEnrichedAt?.toISOString() ?? "",
      evidenceSourceUrls: Array.from(sourceMap.get(person.id) ?? []).join(" | "),
      ...Object.fromEntries(
        formulaColumns.map((column) => [
          `formula:${column.name}`,
          formulas[column.name] ?? ""
        ])
      )
    };
  });

  return buildCsv(rows);
}

async function resolveWorkspace(workspaceId?: string) {
  if (workspaceId) {
    return prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  return prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
}

function groupFormulaResults(
  results: Array<{
    entityId: string;
    value: unknown;
    error: string | null;
    formulaColumn: { name: string };
  }>
) {
  const map = new Map<string, Record<string, string>>();

  for (const result of results) {
    const values = map.get(result.entityId) ?? {};
    values[result.formulaColumn.name] = result.error ?? displayValue(result.value);
    map.set(result.entityId, values);
  }

  return map;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function maxScore(scores: Array<number | null>) {
  return Math.max(0, ...scores.map((score) => score ?? 0));
}

