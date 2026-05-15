import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCRMFieldMutations,
  formatCRMMutationLog,
  planCRMMutations,
  shouldApplyCRMField,
  validateCRMExportMapping
} from "../src/server/crm";

const incoming = {
  sourceField: "accountScore",
  crmField: "gtm_account_score",
  value: 86,
  confidence: 0.82,
  sourceUrls: ["https://example.com"]
};

test("BLANK_ONLY fills blank CRM fields", () => {
  const decision = shouldApplyCRMField(
    { value: null },
    incoming,
    { overwritePolicy: "BLANK_ONLY" }
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "Existing CRM field is blank.");
});

test("BLANK_ONLY does not overwrite populated CRM fields", () => {
  const decision = shouldApplyCRMField(
    { value: 72, updatedBy: "GTM_ENGINE" },
    incoming,
    { overwritePolicy: "BLANK_ONLY" }
  );

  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /BLANK_ONLY/);
});

test("manual CRM edits are protected by default", () => {
  const decision = shouldApplyCRMField(
    { value: 72, manuallyEdited: true, updatedBy: "CRM_USER" },
    incoming,
    { overwritePolicy: "HIGHER_CONFIDENCE" }
  );

  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /manually edited/);
});

test("HIGHER_CONFIDENCE overwrites lower-confidence GTM fields", () => {
  const decision = shouldApplyCRMField(
    { value: 72, confidence: 0.4, updatedBy: "GTM_ENGINE" },
    incoming,
    { overwritePolicy: "HIGHER_CONFIDENCE" }
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.reason, "Incoming confidence is higher.");
});

test("HIGHER_CONFIDENCE preserves equal or stronger existing confidence", () => {
  const decision = shouldApplyCRMField(
    { value: 88, confidence: 0.9, updatedBy: "GTM_ENGINE" },
    incoming,
    { overwritePolicy: "HIGHER_CONFIDENCE" }
  );

  assert.equal(decision.allowed, false);
});

test("NEVER_OVERWRITE always skips nonblank incoming values", () => {
  const decision = shouldApplyCRMField(
    { value: null },
    incoming,
    { overwritePolicy: "NEVER_OVERWRITE" }
  );

  assert.equal(decision.allowed, false);
});

test("ALWAYS_OVERWRITE requires explicit enablement", () => {
  const blocked = shouldApplyCRMField(
    { value: 72 },
    incoming,
    { overwritePolicy: "ALWAYS_OVERWRITE" }
  );
  const allowed = shouldApplyCRMField(
    { value: 72 },
    incoming,
    { overwritePolicy: "ALWAYS_OVERWRITE", allowAlwaysOverwrite: true }
  );

  assert.equal(blocked.allowed, false);
  assert.equal(allowed.allowed, true);
});

test("blank incoming values are not synced", () => {
  const decision = shouldApplyCRMField(
    { value: null },
    { ...incoming, value: "" },
    { overwritePolicy: "BLANK_ONLY" }
  );

  assert.equal(decision.allowed, false);
});

test("dry-run mutation plans include allowed and skipped mutations", () => {
  const mutations = planCRMMutations({
    provider: "csv",
    objectType: "company",
    operation: "UPSERT_COMPANY",
    domain: "example.com",
    existingFields: {
      gtm_account_score: { value: null },
      gtm_signal_summary: {
        value: "Manual summary",
        manuallyEdited: true,
        updatedBy: "CRM_USER"
      }
    },
    incomingFields: [
      incoming,
      {
        sourceField: "signalSummary",
        crmField: "gtm_signal_summary",
        value: "New signal summary"
      }
    ],
    options: { dryRun: true }
  });

  assert.equal(mutations[0].allowed, true);
  assert.equal(mutations[0].dryRun, true);
  assert.equal(mutations[1].allowed, false);
});

test("dry-run formatter prints intended mutation details", () => {
  const [mutation] = planCRMMutations({
    provider: "csv",
    objectType: "company",
    operation: "UPSERT_COMPANY",
    domain: "example.com",
    existingFields: {},
    incomingFields: [incoming],
    options: { dryRun: true }
  });

  const log = formatCRMMutationLog(mutation);

  assert.match(log, /DRY_RUN/);
  assert.match(log, /gtm_account_score/);
  assert.match(log, /example\.com/);
});

test("field mapping builds CSV-compatible CRM mutations", () => {
  const fields = buildCRMFieldMutations(
    {
      accountScore: 86,
      sourceUrls: ["https://example.com/a", "https://example.com/b"],
      confidenceScore: 0.82
    },
    [
      { sourceField: "accountScore", crmField: "gtm_account_score" },
      { sourceField: "sourceUrls", crmField: "gtm_source_urls" }
    ]
  );

  assert.equal(fields[0].value, 86);
  assert.equal(fields[0].confidence, 0.82);
  assert.equal(fields[1].value, "https://example.com/a | https://example.com/b");
});

test("mapping validation rejects unsupported fields", () => {
  const validation = validateCRMExportMapping({
    provider: "csv",
    dryRun: true,
    allowAlwaysOverwrite: false,
    company: [{ sourceField: "unsupported", crmField: "bad_field" }],
    contact: []
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.unsupportedCompanyFields[0].sourceField, "unsupported");
});

