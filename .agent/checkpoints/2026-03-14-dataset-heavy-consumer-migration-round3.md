# Checkpoint: Dataset-Heavy Consumer Migration (Round 3)

Date: 2026-03-14
Status: completed

## Scope
Continue direct Pinia consumer migration for dataset-heavy components and keep parity coverage in tests.

## Completed
- Migrated direct store usage in:
  - app/components/dataset/Map.vue
  - app/components/dataset/TimeSeriesPlot.vue
- Replaced direct `$api().app` / `$api().dataset` reads and writes in these components with Pinia store accessors/actions.
- Extended store tests to cover additional parity behavior and status/error branches.

## Test Result
- Command: `npx vitest run` (containerized JSON summary)
- Suites: 4/4 passed
- Tests: 12/12 passed

## Notes
- `Map.vue` and `TimeSeriesPlot.vue` still rely on action helpers that use the compatibility API for shared workflow operations.
- This round reduces direct `$api()` coupling while preserving behavior.

## Next Actions
1. Migrate dataset analysis page consumers in `pages/dataset/_id/analyze/_variable.vue` from `$api()` reads to direct Pinia stores.
2. Introduce composable wrappers where needed for action helper interop.
3. Retire `api-compat` after all `$api()` call sites are removed.
