import {
  buildCRMFieldMutations,
  defaultCRMExportMapping,
  formatCRMMutationLog,
  planCRMMutations
} from "../src/server/crm";

const source = {
  accountScore: 86,
  signalSummary: "HIRING: Revenue operations hiring spike",
  latestSignalDate: "2026-05-01T00:00:00.000Z",
  recommendedPersona: "DAY_TO_DAY_OWNER",
  lastEnrichedAt: "2026-05-14T16:00:00.000Z",
  confidenceScore: 0.82,
  sourceUrls: ["https://northstar-robotics.example/careers"]
};

const fields = buildCRMFieldMutations(source, defaultCRMExportMapping.company);
const mutations = planCRMMutations({
  provider: "csv",
  objectType: "company",
  operation: "UPSERT_COMPANY",
  domain: "northstar-robotics.example",
  existingFields: {
    gtm_account_score: {
      value: null,
      updatedBy: "UNKNOWN"
    },
    gtm_signal_summary: {
      value: "Manual note from CRM owner",
      manuallyEdited: true,
      updatedBy: "CRM_USER"
    }
  },
  incomingFields: fields,
  options: {
    dryRun: true,
    overwritePolicy: "BLANK_ONLY"
  }
});

for (const mutation of mutations) {
  console.log(formatCRMMutationLog(mutation));
}

