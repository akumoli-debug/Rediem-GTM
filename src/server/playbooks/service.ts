import type {
  PlaybookClient,
  PlaybookDefinition,
  SavedPlaybook
} from "./types";

export async function getPlaybookForWorkflow(
  client: PlaybookClient,
  input: {
    workspaceId: string;
    playbookId?: string;
  }
): Promise<SavedPlaybook | null> {
  if (!input.playbookId) {
    return null;
  }

  if (!client.playbook) {
    throw new Error("Playbook lookup is not available for this workflow client.");
  }

  const playbook = await client.playbook.findFirst({
    where: {
      id: input.playbookId,
      workspaceId: input.workspaceId
    }
  });

  if (!playbook) {
    throw new Error(`Playbook not found: ${input.playbookId}`);
  }

  return normalizePlaybook(playbook);
}

export function playbookMotion(
  playbook: PlaybookDefinition | null,
  fallback?: string
): string | undefined {
  return fallback ?? playbook?.targetMotion;
}

export function playbookRoleHints(
  playbook: PlaybookDefinition | null,
  fallbackHints: string[]
): string[] {
  if (!playbook) {
    return fallbackHints;
  }

  return Array.from(
    new Set([...playbook.targetPersonas, ...fallbackHints])
  );
}

export function normalizePlaybook<T extends PlaybookDefinition>(playbook: T): T {
  return {
    ...playbook,
    targetPersonas: arrayOfStrings(playbook.targetPersonas),
    accountFitRules: arrayOfStrings(playbook.accountFitRules),
    signalTypes: arrayOfStrings(playbook.signalTypes),
    formulaColumns: Array.isArray(playbook.formulaColumns)
      ? playbook.formulaColumns
      : [],
    workflowSteps: arrayOfStrings(playbook.workflowSteps),
    exportFields: arrayOfStrings(playbook.exportFields),
    budgetDefaults: {
      maxCostPerAccount: Number(playbook.budgetDefaults.maxCostPerAccount ?? 0),
      maxCostPerContact: Number(playbook.budgetDefaults.maxCostPerContact ?? 0),
      maxTotalRunCost: Number(playbook.budgetDefaults.maxTotalRunCost ?? 0),
      stopRunOnBudgetExceeded: Boolean(
        playbook.budgetDefaults.stopRunOnBudgetExceeded
      )
    }
  };
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
