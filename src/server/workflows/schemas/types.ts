export type ExtractionMetadata = {
  sourceUrl: string;
  provider: string;
  sourceConfidence: number | null;
};

export type CompanyProfileExtract = ExtractionMetadata & {
  companyName: string | null;
  oneLiner: string | null;
  targetCustomers: string[];
  productCategories: string[];
  mainPainPoints: string[];
  integrations: string[];
  complianceMentions: string[];
  securityMentions: string[];
  enterpriseMotion: boolean | null;
};

export type PricingPlanExtract = {
  name: string | null;
  price: string | null;
  description: string | null;
};

export type PricingPageExtract = ExtractionMetadata & {
  plans: PricingPlanExtract[];
  hasFreePlan: boolean | null;
  hasEnterprisePlan: boolean | null;
  pricingModel: string | null;
  usageBased: boolean | null;
  salesLed: boolean | null;
  selfServe: boolean | null;
  buyerSegment: string | null;
};

export type CareersPageExtract = ExtractionMetadata & {
  openRoles: string[];
  departmentsHiring: string[];
  seniorityHiring: string[];
  locations: string[];
  remoteFriendly: boolean | null;
  hiringThemes: string[];
  growthSignal: string | null;
};

export type BlogPageExtract = ExtractionMetadata & {
  recentTopics: string[];
  productThemes: string[];
  technicalThemes: string[];
  customerStories: string[];
  launchMentions: string[];
};

export type PressPageExtract = ExtractionMetadata & {
  recentAnnouncements: string[];
  fundingMentions: string[];
  partnerships: string[];
  executiveHires: string[];
  expansionMentions: string[];
};

export type WebsiteRootExtract = CompanyProfileExtract;

export type WebsitePageExtract =
  | CompanyProfileExtract
  | PricingPageExtract
  | CareersPageExtract
  | BlogPageExtract
  | PressPageExtract
  | WebsiteRootExtract;

export type StructuredSchema<TName extends string = string> = {
  name: TName;
  schema: object;
  prompt: string;
};

