export type CrmExportTarget = "hubspot" | "salesforce" | "csv";

export type CrmExportConfig = {
  target: CrmExportTarget;
  includeEvidence: boolean;
  includeScores: boolean;
};

export const defaultCrmExportConfig: CrmExportConfig = {
  target: "csv",
  includeEvidence: true,
  includeScores: true
};

export * from "./fieldMapping";
export * from "./hubspot";
export * from "./salesforce";
export * from "./syncRules";
export * from "./types";
