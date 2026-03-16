# Checkpoint: Persistence Composable Cutover and Validation

## Date
2026-03-14

## Scope
- Replace remaining `$warehouse` plugin usage with direct persistence composable access.
- Validate migration results with containerized tests.

## Changes
- Added `app/composables/usePersistenceStorage.ts` for localStorage get/set/remove helpers.
- Refactored `app/composables/useLegacyStoreActions.ts` to use persistence composable internally.
- Migrated remaining warehouse call sites:
  - `app/pages/dataset/_id/index.vue`
  - `app/pages/dataset/_id/visualize/_variable.vue`
  - `app/pages/dataset/_id/analyze/_variable.vue`
  - `app/components/dataset/Map.vue`
  - `app/components/dataset/LoadAnalysis.vue`
  - `app/components/TermsOfUse.vue`
- Unwired `~/plugins/warehouse-compat.client.ts` from `app/nuxt.config.ts`.

## Validation
- Diagnostics: no errors on edited files.
- Search checks:
  - no `$warehouse` references in `app/**/*.{vue,js,ts}`
  - no `$api()` references in `app/**/*.{vue,js,ts}`
- Containerized test run (`npm ci && npm exec vitest run`):
  - Test Files: 2 passed
  - Tests: 12 passed

## Impact
- Both compatibility bridge surfaces (`$api`, `$warehouse`) are no longer used by app code.
- Remaining cleanup is primarily removing/archive of unused compatibility assets and aligning tests with post-bridge architecture.
