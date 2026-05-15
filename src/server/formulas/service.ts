import { prisma } from "@/server/db/client";
import { Prisma } from "@/generated/prisma/client";
import { calculateLoyaltyPainScore } from "@/server/scoring/rediem";
import { evaluateFormula } from "./evaluator";
import { parseFormula } from "./parser";
import { extractDependencies } from "./dependencies";
import type {
  FormulaContext,
  FormulaOutputType,
  FormulaScope,
  FormulaValue
} from "./types";

type FormulaClient = typeof prisma;

export async function createFormulaColumn(
  client: FormulaClient,
  input: {
    workspaceId: string;
    name: string;
    scope: FormulaScope;
    expression: string;
    outputType: FormulaOutputType;
    enabled?: boolean;
  }
) {
  const ast = parseFormula(input.expression);
  return client.formulaColumn.create({
    data: {
      ...input,
      enabled: input.enabled ?? true,
      expression: input.expression.trim()
    }
  }).then((column) => ({
    ...column,
    dependencies: extractDependencies(ast)
  }));
}

export async function updateFormulaColumn(
  client: FormulaClient,
  formulaColumnId: string,
  input: Partial<{
    name: string;
    expression: string;
    outputType: FormulaOutputType;
    enabled: boolean;
  }>
) {
  if (input.expression) {
    parseFormula(input.expression);
  }

  return client.formulaColumn.update({
    where: { id: formulaColumnId },
    data: input
  });
}

export async function deleteFormulaColumn(
  client: FormulaClient,
  formulaColumnId: string
) {
  return client.formulaColumn.delete({
    where: { id: formulaColumnId }
  });
}

export async function evaluateFormulaForEntity(
  client: FormulaClient,
  input: {
    workspaceId: string;
    formulaColumnId: string;
    entityType: FormulaScope;
    entityId: string;
  }
) {
  const column = await client.formulaColumn.findFirst({
    where: {
      id: input.formulaColumnId,
      workspaceId: input.workspaceId
    }
  });

  if (!column) {
    throw new Error(`Formula column not found: ${input.formulaColumnId}`);
  }

  const context = await buildFormulaContext(client, input.workspaceId, input.entityType, input.entityId);

  try {
    const evaluation = evaluateFormula(column.expression, context);
    return client.formulaResult.upsert({
      where: {
        formulaColumnId_entityType_entityId: {
          formulaColumnId: column.id,
          entityType: input.entityType,
          entityId: input.entityId
        }
      },
      create: {
        workspaceId: input.workspaceId,
        formulaColumnId: column.id,
        entityType: input.entityType,
        entityId: input.entityId,
        value: toJsonValue(evaluation.value),
        evaluatedAt: new Date()
      },
      update: {
        value: toJsonValue(evaluation.value),
        error: null,
        evaluatedAt: new Date()
      }
    });
  } catch (error) {
    return client.formulaResult.upsert({
      where: {
        formulaColumnId_entityType_entityId: {
          formulaColumnId: column.id,
          entityType: input.entityType,
          entityId: input.entityId
        }
      },
      create: {
        workspaceId: input.workspaceId,
        formulaColumnId: column.id,
        entityType: input.entityType,
        entityId: input.entityId,
        error: error instanceof Error ? error.message : String(error),
        evaluatedAt: new Date()
      },
      update: {
        error: error instanceof Error ? error.message : String(error),
        evaluatedAt: new Date()
      }
    });
  }
}

export async function addFormulaTemplateToWorkspace(
  client: FormulaClient,
  input: {
    workspaceId: string;
    templateId: string;
  }
) {
  const template = await client.formulaTemplate.findFirst({
    where: { id: input.templateId }
  });

  if (!template) {
    throw new Error(`Formula template not found: ${input.templateId}`);
  }

  const existing = await client.formulaColumn.findFirst({
    where: {
      workspaceId: input.workspaceId,
      name: template.name,
      scope: template.scope
    }
  });
  const column =
    existing ??
    (await createFormulaColumn(client, {
      workspaceId: input.workspaceId,
      name: template.name,
      scope: template.scope,
      expression: template.expression,
      outputType: template.outputType,
      enabled: true
    }));
  const results = [];
  const entities =
    template.scope === "ACCOUNT"
      ? await client.account.findMany({ where: { workspaceId: input.workspaceId } })
      : await client.person.findMany({ where: { workspaceId: input.workspaceId } });

  for (const entity of entities) {
    results.push(
      await evaluateFormulaForEntity(client, {
        workspaceId: input.workspaceId,
        formulaColumnId: column.id,
        entityType: template.scope,
        entityId: entity.id
      })
    );
  }

  return {
    column,
    results,
    created: !existing
  };
}

export async function previewFormulaTemplate(
  client: FormulaClient,
  input: {
    workspaceId: string;
    templateId: string;
  }
) {
  const template = await client.formulaTemplate.findFirst({
    where: { id: input.templateId }
  });

  if (!template) {
    throw new Error(`Formula template not found: ${input.templateId}`);
  }

  const entity =
    template.scope === "ACCOUNT"
      ? await client.account.findFirst({
          where: { workspaceId: input.workspaceId },
          orderBy: [{ accountScore: "desc" }, { createdAt: "asc" }]
        })
      : await client.person.findFirst({
          where: { workspaceId: input.workspaceId },
          orderBy: [{ roleScore: "desc" }, { createdAt: "asc" }]
        });

  if (!entity) {
    return {
      templateId: input.templateId,
      value: null,
      error: `No ${template.scope.toLowerCase()} rows available for preview.`
    };
  }

  const context = await buildFormulaContext(
    client,
    input.workspaceId,
    template.scope,
    entity.id
  );

  try {
    return {
      templateId: input.templateId,
      entityId: entity.id,
      value: toJsonValue(evaluateFormula(template.expression, context).value),
      error: null
    };
  } catch (error) {
    return {
      templateId: input.templateId,
      entityId: entity.id,
      value: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function evaluateAllFormulasForWorkspace(
  client: FormulaClient,
  workspaceId: string
) {
  const [accountFormulas, personFormulas, accounts, people] = await Promise.all([
    client.formulaColumn.findMany({ where: { workspaceId, scope: "ACCOUNT", enabled: true } }),
    client.formulaColumn.findMany({ where: { workspaceId, scope: "PERSON", enabled: true } }),
    client.account.findMany({ where: { workspaceId } }),
    client.person.findMany({ where: { workspaceId } })
  ]);
  const results = [];

  for (const formula of accountFormulas) {
    for (const account of accounts) {
      results.push(await evaluateFormulaForEntity(client, {
        workspaceId,
        formulaColumnId: formula.id,
        entityType: "ACCOUNT",
        entityId: account.id
      }));
    }
  }

  for (const formula of personFormulas) {
    for (const person of people) {
      results.push(await evaluateFormulaForEntity(client, {
        workspaceId,
        formulaColumnId: formula.id,
        entityType: "PERSON",
        entityId: person.id
      }));
    }
  }

  return results;
}

export async function evaluateFormulasAfterEntityEnrichment(
  client: FormulaClient,
  input: {
    workspaceId: string;
    entityType: FormulaScope;
    entityId: string;
  }
) {
  const formulas = await client.formulaColumn.findMany({
    where: {
      workspaceId: input.workspaceId,
      scope: input.entityType,
      enabled: true
    }
  });

  return Promise.all(
    formulas.map((formula) =>
      evaluateFormulaForEntity(client, {
        workspaceId: input.workspaceId,
        formulaColumnId: formula.id,
        entityType: input.entityType,
        entityId: input.entityId
      })
    )
  );
}

export async function maybeEvaluateFormulasAfterEntityEnrichment(
  client: unknown,
  input: {
    workspaceId: string;
    entityType: FormulaScope;
    entityId: string;
  }
) {
  if (!hasFormulaDelegates(client)) {
    return [];
  }

  return evaluateFormulasAfterEntityEnrichment(client as FormulaClient, input);
}

async function buildFormulaContext(
  client: FormulaClient,
  workspaceId: string,
  entityType: FormulaScope,
  entityId: string
): Promise<FormulaContext> {
  const account =
    entityType === "ACCOUNT"
      ? await client.account.findFirst({ where: { id: entityId, workspaceId } })
      : null;
  const person =
    entityType === "PERSON"
      ? await client.person.findFirst({ where: { id: entityId, workspaceId } })
      : null;
  const accountId = account?.id ?? person?.accountId ?? undefined;
  const [signalSummary, brandProfile, communityFlywheel] = accountId
    ? await Promise.all([
        buildSignalSummary(client, workspaceId, accountId),
        buildBrandProfileContext(client, workspaceId, accountId),
        buildCommunityFlywheelContext(client, workspaceId, accountId)
      ])
    : [{}, {}, {}];
  const brandContext = { ...brandProfile, ...communityFlywheel };

  return {
    account: account ? { ...normalizeRecord(account), ...brandContext } : brandContext,
    brand: brandContext,
    person: person ? normalizeRecord(person) : {},
    signal: signalSummary
  };
}

async function buildBrandProfileContext(
  client: FormulaClient,
  workspaceId: string,
  accountId: string
): Promise<Record<string, FormulaValue>> {
  if (!hasBrandProfileDelegate(client)) {
    return {};
  }

  const brandProfile = await client.brandProfile.findFirst({
    where: { workspaceId, accountId }
  });

  if (!brandProfile) {
    return {};
  }

  const detections = await buildBrandDetectionsContext(client, workspaceId, accountId);
  const normalizedProfile = normalizeRecord(brandProfile);

  return {
    ...normalizedProfile,
    loyaltyPainScore: calculateLoyaltyPainScore(brandProfile, detections)
  };
}

async function buildCommunityFlywheelContext(
  client: FormulaClient,
  workspaceId: string,
  accountId: string
): Promise<Record<string, FormulaValue>> {
  if (!hasCommunityFlywheelSnapshotDelegate(client)) {
    return {};
  }

  const snapshot = await client.communityFlywheelSnapshot.findFirst({
    where: { workspaceId, accountId },
    orderBy: { snapshotDate: "desc" }
  });

  if (!snapshot) {
    return {};
  }

  return {
    ...normalizeRecord(snapshot),
    cfrTier: snapshot.cfrTier,
    recommendedPlay: snapshot.recommendedPlay,
    primaryLeak: snapshot.primaryLeak,
    secondaryLeak: snapshot.secondaryLeak
  };
}

async function buildBrandDetectionsContext(
  client: FormulaClient,
  workspaceId: string,
  accountId: string
) {
  if (!hasCompetitorToolDetectionDelegate(client)) {
    return [];
  }

  return client.competitorToolDetection.findMany({
    where: { workspaceId, accountId }
  });
}

async function buildSignalSummary(
  client: FormulaClient,
  workspaceId: string,
  accountId: string
): Promise<Record<string, FormulaValue>> {
  const signals = await client.signal.findMany({
    where: { workspaceId, accountId },
    orderBy: { signalDate: "desc" }
  });

  return {
    maxScore: Math.max(0, ...signals.map((signal) => signal.totalScore ?? 0)),
    latestSignalDate: signals[0]?.signalDate ?? signals[0]?.createdAt ?? null,
    types: signals.map((signal) => signal.type)
  };
}

function normalizeRecord(record: Record<string, unknown>): Record<string, FormulaValue> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value instanceof Date ? value : (value as FormulaValue)
    ])
  );
}

function toJsonValue(value: FormulaValue): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (value === null) {
    return Prisma.JsonNull;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)])
    ) as Prisma.InputJsonObject;
  }

  return value;
}

function hasFormulaDelegates(client: unknown): boolean {
  return (
    typeof client === "object" &&
    client !== null &&
    "formulaColumn" in client &&
    "formulaResult" in client
  );
}

function hasBrandProfileDelegate(
  client: FormulaClient
): client is FormulaClient & {
  brandProfile: {
    findFirst(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<Record<string, unknown> | null>;
  };
} {
  return "brandProfile" in client;
}

function hasCompetitorToolDetectionDelegate(
  client: FormulaClient
): client is FormulaClient & {
  competitorToolDetection: {
    findMany(args: {
      where: { workspaceId: string; accountId: string };
    }): Promise<Array<{
      category?: string | null;
      vendor?: string | null;
      confidence?: number | null;
      sourceUrl?: string | null;
      evidence?: string | null;
    }>>;
  };
} {
  return "competitorToolDetection" in client;
}

function hasCommunityFlywheelSnapshotDelegate(
  client: FormulaClient
): client is FormulaClient & {
  communityFlywheelSnapshot: {
    findFirst(args: {
      where: { workspaceId: string; accountId: string };
      orderBy: { snapshotDate: "desc" };
    }): Promise<(Record<string, unknown> & {
      cfrTier: string;
      recommendedPlay?: string | null;
      primaryLeak?: string | null;
      secondaryLeak?: string | null;
    }) | null>;
  };
} {
  return "communityFlywheelSnapshot" in client;
}
