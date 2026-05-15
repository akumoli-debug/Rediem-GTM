export type ProviderCapability =
  | "company"
  | "people"
  | "contact"
  | "emailVerification"
  | "webResearch"
  | "browser";

export type ProviderHealthState =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export type ProviderHealthStatus = {
  providerName: string;
  capability: ProviderCapability;
  state: ProviderHealthState;
  checkedAt: Date;
  latencyMs?: number;
  message?: string;
};

export type ProviderEvidence = {
  sourceUrl?: string;
  provider?: string;
  rawExcerpt?: string;
  confidence?: number;
  capturedAt?: Date;
};

export type CompanyProviderInput = {
  domain?: string;
  linkedinUrl?: string;
  companyName?: string;
};

export type CompanyEnrichmentResult = {
  domain?: string;
  name?: string;
  linkedinUrl?: string;
  industry?: string;
  employeeCount?: number;
  hqLocation?: string;
  websiteSummary?: string;
  pricingSummary?: string;
  careersSummary?: string;
  blogSummary?: string;
  pressSummary?: string;
  confidenceScore?: number;
  evidence?: ProviderEvidence[];
  raw?: unknown;
};

export type PeopleProviderInput = {
  domain?: string;
  linkedinCompanyUrl?: string;
  roleHints?: string[];
  maxResults?: number;
};

export type PersonResult = {
  fullName: string;
  title?: string;
  seniority?: string;
  department?: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  personaType?:
    | "ECONOMIC_BUYER"
    | "TECHNICAL_BUYER"
    | "DAY_TO_DAY_OWNER"
    | "INFLUENCER"
    | "CHAMPION_CANDIDATE"
    | "BLOCKER_CANDIDATE"
    | "UNKNOWN";
  roleScore?: number;
  sourceConfidence?: number;
  evidence?: ProviderEvidence[];
  raw?: unknown;
};

export type ContactProviderInput = {
  fullName: string;
  companyDomain: string;
  linkedinUrl?: string;
};

export type ContactResult = {
  fullName: string;
  companyDomain: string;
  linkedinUrl?: string;
  email?: string;
  emailStatus?:
    | "UNKNOWN"
    | "VERIFIED"
    | "RISKY"
    | "CATCH_ALL"
    | "INVALID"
    | "SUPPRESSED";
  phone?: string;
  contactabilityScore?: number;
  sourceConfidence?: number;
  evidence?: ProviderEvidence[];
  raw?: unknown;
};

export type EmailVerificationProviderInput = {
  email: string;
};

export type EmailVerificationResult = {
  email: string;
  status:
    | "UNKNOWN"
    | "VERIFIED"
    | "RISKY"
    | "CATCH_ALL"
    | "INVALID"
    | "SUPPRESSED";
  confidence?: number;
  reason?: string;
  raw?: unknown;
};

export type WebPageResult = {
  url: string;
  statusCode?: number;
  title?: string;
  text?: string;
  html?: string;
  capturedAt: Date;
  raw?: unknown;
};

export type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  rank?: number;
  source?: string;
  capturedAt: Date;
  raw?: unknown;
};

export type StructuredExtractResult<TData = Record<string, unknown>> = {
  url: string;
  schema: object;
  data: TData;
  confidence?: number;
  evidence?: ProviderEvidence[];
  raw?: unknown;
};

export type StyleInspectionResult = {
  url: string;
  selector?: string;
  computedStyles: Record<string, string>;
  matchedElementCount?: number;
  screenshotUrl?: string;
  capturedAt: Date;
  raw?: unknown;
};

export interface NamedProvider {
  name: string;
}

export interface CompanyProvider extends NamedProvider {
  enrichCompany(
    input: CompanyProviderInput
  ): Promise<CompanyEnrichmentResult>;
}

export interface PeopleProvider extends NamedProvider {
  findPeople(input: PeopleProviderInput): Promise<PersonResult[]>;
}

export interface ContactProvider extends NamedProvider {
  enrichContact(input: ContactProviderInput): Promise<ContactResult>;
}

export interface EmailVerificationProvider extends NamedProvider {
  verifyEmail(
    input: EmailVerificationProviderInput
  ): Promise<EmailVerificationResult>;
}

export interface WebResearchProvider extends NamedProvider {
  scrapePage(url: string): Promise<WebPageResult>;
  searchWeb(
    query: string,
    options?: { maxResults?: number }
  ): Promise<WebSearchResult[]>;
  extractStructured(
    input: { url: string; schema: object; prompt?: string }
  ): Promise<StructuredExtractResult>;
}

export interface BrowserProvider extends NamedProvider {
  inspectStyles(input: {
    url: string;
    selector?: string;
  }): Promise<StyleInspectionResult>;
}

export type ProviderByCapability = {
  company: CompanyProvider;
  people: PeopleProvider;
  contact: ContactProvider;
  emailVerification: EmailVerificationProvider;
  webResearch: WebResearchProvider;
  browser: BrowserProvider;
};

export type ProviderForCapability<TCapability extends ProviderCapability> =
  ProviderByCapability[TCapability];
