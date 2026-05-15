export type CRMProviderName = "hubspot" | "salesforce" | "csv";

export type CRMObjectType = "company" | "contact";

export type CRMFieldValue = string | number | boolean | Date | null;

export type CRMOverwritePolicy =
  | "BLANK_ONLY"
  | "HIGHER_CONFIDENCE"
  | "NEVER_OVERWRITE"
  | "ALWAYS_OVERWRITE";

export type CRMFieldState = {
  value: CRMFieldValue;
  confidence?: number | null;
  updatedBy?: "GTM_ENGINE" | "CRM_USER" | "UNKNOWN";
  manuallyEdited?: boolean;
  updatedAt?: Date;
};

export type CRMRecordSnapshot = {
  id?: string;
  objectType: CRMObjectType;
  fields: Record<string, CRMFieldState>;
};

export type CRMFieldMutation = {
  sourceField: string;
  crmField: string;
  value: CRMFieldValue;
  confidence?: number | null;
  sourceUrls?: string[];
};

export type CRMCompanyInput = {
  domain: string;
  name?: string;
  fields: CRMFieldMutation[];
};

export type CRMContactInput = {
  email: string;
  accountDomain?: string;
  fullName?: string;
  fields: CRMFieldMutation[];
};

export type CRMSyncOptions = {
  dryRun?: boolean;
  overwritePolicy?: CRMOverwritePolicy;
  allowAlwaysOverwrite?: boolean;
  allowManualOverwrite?: boolean;
};

export type CRMResolvedMutation = {
  provider: CRMProviderName;
  objectType: CRMObjectType;
  operation:
    | "UPSERT_COMPANY"
    | "UPSERT_CONTACT"
    | "UPDATE_COMPANY_FIELDS"
    | "UPDATE_CONTACT_FIELDS";
  externalId?: string;
  domain?: string;
  email?: string;
  sourceField: string;
  crmField: string;
  previousValue: CRMFieldValue;
  nextValue: CRMFieldValue;
  policy: CRMOverwritePolicy;
  allowed: boolean;
  dryRun: boolean;
  reason: string;
  sourceUrls: string[];
  createdAt: Date;
};

export type CRMFieldMappingEntry = {
  sourceField: string;
  crmField: string;
  overwritePolicy?: CRMOverwritePolicy;
};

export type CRMExportMapping = {
  provider: CRMProviderName;
  dryRun: boolean;
  allowAlwaysOverwrite: boolean;
  company: CRMFieldMappingEntry[];
  contact: CRMFieldMappingEntry[];
};

export interface CRMProvider {
  name: CRMProviderName;
  upsertCompany(
    input: CRMCompanyInput,
    options?: CRMSyncOptions
  ): Promise<CRMResolvedMutation[]>;
  upsertContact(
    input: CRMContactInput,
    options?: CRMSyncOptions
  ): Promise<CRMResolvedMutation[]>;
  updateCompanyFields(
    externalId: string,
    fields: CRMFieldMutation[],
    options?: CRMSyncOptions
  ): Promise<CRMResolvedMutation[]>;
  updateContactFields(
    externalId: string,
    fields: CRMFieldMutation[],
    options?: CRMSyncOptions
  ): Promise<CRMResolvedMutation[]>;
  findCompanyByDomain(domain: string): Promise<CRMRecordSnapshot | null>;
  findContactByEmail(email: string): Promise<CRMRecordSnapshot | null>;
}

