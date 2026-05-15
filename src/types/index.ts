export type CurrencyCents = number;

export type EvidenceReference = {
  source: string;
  url?: string;
  snippet?: string;
  confidence?: number;
  observedAt?: string;
};

export type AccountRecord = {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
};

export type ProviderCost = {
  estimatedCents?: CurrencyCents;
  actualCents?: CurrencyCents;
};
