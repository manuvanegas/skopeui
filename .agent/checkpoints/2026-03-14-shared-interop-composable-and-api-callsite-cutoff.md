# Checkpoint: Shared Interop Composable and API Callsite Cutoff

## Date
2026-03-14

## Scope
- Introduced a shared composable for legacy dataset/helper interop.
- Removed remaining `$api()` usage from core pages/components.

## Changes
- Added `app/composables/useLegacyStoreActions.ts` with shared methods for:
  - metadata refresh and dataset initialization
  - warehouse geojson init/save/clear
  - loading persisted analysis request data
- Migrated remaining `$api()` call sites to direct Pinia/composable usage in:
  - `app/pages/index.vue`
  - `app/pages/dataset/_id/index.vue`
  - `app/components/dataset/Map.vue`
  - `app/components/dataset/LoadAnalysis.vue`

## Validation
- Diagnostics are clean for all edited files in this slice.
- Grep check: no `$api()` matches in `app/**/*.{vue,js,ts}`.
- Runtime test execution remains blocked in this shell because `npm`/`npx` are unavailable.

## Impact
- Compatibility migration has crossed the main cutoff: no direct app call sites depend on `$api()`.
- Remaining cleanup focuses on plugin/persistence wiring and test reruns in a node-enabled environment.
