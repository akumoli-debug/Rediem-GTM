# CRM Sync

The CRM sync layer is designed to be safe by default. It provides provider abstractions, field mapping, overwrite rules, dry-run planning, and CSV fallback before implementing full OAuth flows.

## Files

```text
src/server/crm/
  types.ts
  hubspot.ts
  salesforce.ts
  fieldMapping.ts
  syncRules.ts
crm-mapping.example.json
scripts/crm-dry-run.ts
```

## Provider Interface

`CRMProvider` supports:

- `upsertCompany`
- `upsertContact`
- `updateCompanyFields`
- `updateContactFields`
- `findCompanyByDomain`
- `findContactByEmail`

HubSpot and Salesforce classes are stubs with clear TODO boundaries for future API-specific implementation.

## Supported Company Fields

- `accountScore`
- `signalSummary`
- `latestSignalDate`
- `recommendedPersona`
- `lastEnrichedAt`
- `confidenceScore`
- `sourceUrls`

## Supported Contact Fields

- `roleScore`
- `personaType`
- `contactabilityScore`
- `emailStatus`
- `sourceUrls`
- `lastEnrichedAt`

## Sync Rules

Default rule:

- `BLANK_ONLY`

Other supported rules:

- `HIGHER_CONFIDENCE`
- `NEVER_OVERWRITE`
- `ALWAYS_OVERWRITE`

`ALWAYS_OVERWRITE` must be explicitly enabled. Manual CRM edits should not be overwritten by default.

## Dry Run

Preview intended mutations without writing to a CRM:

```bash
npm run crm:dry-run
```

Dry runs should show:

- Target object
- Field
- Current value
- Proposed value
- Rule used
- Whether the mutation would be applied or skipped

## Mapping Config

Use `crm-mapping.example.json` as the starting point for CRM-compatible field mappings.

## CSV Fallback

If live CRM API credentials are not configured, use CSV exports:

- `/api/export/accounts`
- `/api/export/people`

Exports include formula columns and source URLs where available.

## Safety Notes

- Do not sync unverified email claims as outbound-ready.
- Preserve source URLs and confidence fields for auditability.
- Use dry-run mode before enabling live mutations.
- Keep manual CRM edits protected unless a workspace explicitly enables broader overwrite rules.
