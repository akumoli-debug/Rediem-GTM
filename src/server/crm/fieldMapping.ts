import type {
  CRMExportMapping,
  CRMFieldMappingEntry,
  CRMFieldMutation,
  CRMFieldValue
} from "./types";

export const supportedCompanyFields = [
  "accountScore",
  "signalSummary",
  "latestSignalDate",
  "recommendedPersona",
  "lastEnrichedAt",
  "confidenceScore",
  "sourceUrls"
] as const;

export const supportedContactFields = [
  "roleScore",
  "personaType",
  "contactabilityScore",
  "emailStatus",
  "sourceUrls",
  "lastEnrichedAt"
] as const;

export type SupportedCompanyField = (typeof supportedCompanyFields)[number];
export type SupportedContactField = (typeof supportedContactFields)[number];

export const defaultCRMExportMapping: CRMExportMapping = {
  provider: "csv",
  dryRun: true,
  allowAlwaysOverwrite: false,
  company: [
    { sourceField: "accountScore", crmField: "gtm_account_score" },
    { sourceField: "signalSummary", crmField: "gtm_signal_summary" },
    { sourceField: "latestSignalDate", crmField: "gtm_latest_signal_date" },
    { sourceField: "recommendedPersona", crmField: "gtm_recommended_persona" },
    { sourceField: "lastEnrichedAt", crmField: "gtm_last_enriched_at" },
    { sourceField: "confidenceScore", crmField: "gtm_confidence_score" },
    { sourceField: "sourceUrls", crmField: "gtm_source_urls" }
  ],
  contact: [
    { sourceField: "roleScore", crmField: "gtm_role_score" },
    { sourceField: "personaType", crmField: "gtm_persona_type" },
    { sourceField: "contactabilityScore", crmField: "gtm_contactability_score" },
    { sourceField: "emailStatus", crmField: "gtm_email_status" },
    { sourceField: "sourceUrls", crmField: "gtm_source_urls" },
    { sourceField: "lastEnrichedAt", crmField: "gtm_last_enriched_at" }
  ]
};

export function buildCRMFieldMutations(
  source: Record<string, CRMFieldValue | string[] | undefined>,
  mapping: CRMFieldMappingEntry[]
): CRMFieldMutation[] {
  return mapping.map((entry) => ({
    sourceField: entry.sourceField,
    crmField: entry.crmField,
    value: normalizeCRMValue(source[entry.sourceField]),
    confidence:
      typeof source.confidenceScore === "number" ? source.confidenceScore : undefined,
    sourceUrls: Array.isArray(source.sourceUrls) ? source.sourceUrls : undefined
  }));
}

export function validateCRMExportMapping(mapping: CRMExportMapping) {
  const companyFields = new Set<string>(supportedCompanyFields);
  const contactFields = new Set<string>(supportedContactFields);
  const unsupportedCompanyFields = mapping.company.filter(
    (entry) => !companyFields.has(entry.sourceField)
  );
  const unsupportedContactFields = mapping.contact.filter(
    (entry) => !contactFields.has(entry.sourceField)
  );

  return {
    valid:
      unsupportedCompanyFields.length === 0 && unsupportedContactFields.length === 0,
    unsupportedCompanyFields,
    unsupportedContactFields
  };
}

function normalizeCRMValue(value: CRMFieldValue | string[] | undefined): CRMFieldValue {
  if (Array.isArray(value)) {
    return value.join(" | ");
  }

  return value ?? null;
}

