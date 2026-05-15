# Archived Cleanup Plan

This file is archived for implementation history only. It is not part of the external-facing Rediem demo narrative.

Current external-facing follow-up work lives in:

- `docs/ROADMAP.md`
- `KNOWN_LIMITATIONS.md`
- `LEGACY_MODULES.md`

Summary of the cleanup direction:

- Keep the Rediem-specific path primary.
- Do not extend generic B2B enrichment modules.
- Use `analyzeBrandForRediem`, `scoreRediemFit`, `classifyCommunityArchetype`, `calculateCommunityFlywheelRatio`, `resolveRediemBuyingCommittee`, and `generateRediemActivationIdeas` for product work.
- Keep legacy generic modules only while tests or earlier scaffolding depend on them.
