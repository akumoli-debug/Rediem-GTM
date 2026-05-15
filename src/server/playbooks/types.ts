export type PlaybookFormulaColumn = {
  name: string;
  scope: "ACCOUNT" | "PERSON";
  expression: string;
  outputType: "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON";
};

export type PlaybookBudgetDefaults = {
  maxCostPerAccount: number;
  maxCostPerContact: number;
  maxTotalRunCost: number;
  stopRunOnBudgetExceeded: boolean;
};

export type PlaybookDefinition = {
  name: string;
  description: string;
  targetMotion: string;
  targetPersonas: string[];
  accountFitRules: string[];
  signalTypes: string[];
  formulaColumns: PlaybookFormulaColumn[];
  workflowSteps: string[];
  exportFields: string[];
  budgetDefaults: PlaybookBudgetDefaults;
};

export type SavedPlaybook = PlaybookDefinition & {
  id: string;
  workspaceId: string;
};

export type PlaybookClient = {
  playbook?: {
    findFirst(args: {
      where: {
        id: string;
        workspaceId: string;
      };
    }): Promise<SavedPlaybook | null>;
  };
};
