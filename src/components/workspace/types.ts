export type EvidenceItem = {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string | null;
  sourceUrl: string | null;
  provider: string | null;
  rawExcerpt: string | null;
  confidence: number | null;
  capturedAt: string;
};

export type FormulaCell = {
  columnId: string;
  name: string;
  value: string;
  error: string | null;
};

export type AccountTableRow = {
  id: string;
  domain: string;
  name: string;
  industry: string;
  employeeCount: string;
  accountScore: number | null;
  latestSignal: string;
  signalTypes: string[];
  maxSignalScore: number | null;
  recommendedPersona: string;
  lastEnrichedAt: string;
  formulas: FormulaCell[];
  evidence: EvidenceItem[];
};

export type PlaybookOption = {
  id: string;
  name: string;
  description: string;
  targetMotion: string;
  targetPersonas: string[];
  signalTypes: string[];
};

export type PeopleTableRow = {
  id: string;
  fullName: string;
  account: string;
  title: string;
  personaType: string;
  roleScore: number | null;
  email: string;
  emailStatus: string;
  contactabilityScore: number | null;
  linkedinUrl: string;
  lastEnrichedAt: string;
  formulas: FormulaCell[];
  evidence: EvidenceItem[];
};
