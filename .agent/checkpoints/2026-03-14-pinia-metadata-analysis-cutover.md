# Checkpoint: Pinia Metadata and Analysis Cutover

Date: 2026-03-14
Status: completed (incremental migration)

## Scope
Move metadata and analysis domains from compatibility-only state to Pinia stores.

## Completed
- Added metadata store at app/stores/metadata.ts.
- Added analysis store at app/stores/analysis.ts.
- Routed app/plugins/api-compat.ts so these domains use Pinia-backed state while preserving existing api shape.

## Notes
- This keeps current components working via the compatibility api while reducing shim-only state.
- Additional business logic parity work remains for full migration from legacy Vuex behavior.

## Next Actions
1. Start replacing api-compat usage in components with direct Pinia and composables.
2. Remove api-compat plugin after all consumers are migrated.
3. Migrate remaining legacy plugin files and Vue 2 patterns route by route.
