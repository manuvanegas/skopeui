# Checkpoint: Pinia Parity and Metadata Consumer Migration (Round 2)

Date: 2026-03-14
Status: completed

## Scope
Improve legacy action parity for Pinia stores and continue moving metadata consumers from `$api()` to direct store usage.

## Completed
- Expanded Pinia store parity for legacy action compatibility:
  - `app/stores/dataset.ts` (status methods, geojson helpers, request defaults, time series helpers)
  - `app/stores/metadata.ts` (refresh/filter criteria behavior)
  - `app/stores/analysis.ts` (request/response parity methods)
- Expanded `app/plugins/api-compat.ts` to expose parity methods for dataset, metadata, and analysis.
- Migrated metadata consumer components/pages to direct store usage:
  - `app/components/dataset/MetadataModal.vue`
  - `app/components/dataset/Search.vue`
  - `app/pages/index.vue`
- Added/updated tests to cover the newly migrated functionality.

## Test Result
- `npx vitest run` (containerized) passed.
- Suites: 4/4 passed
- Tests: 12/12 passed

## Next Actions
1. Migrate dataset-heavy components (`Map.vue`, `TimeSeriesPlot.vue`) to direct Pinia/composable usage.
2. Migrate analysis page consumers in `pages/dataset/_id/analyze/_variable.vue` off `$api()`.
3. Retire `api-compat` plugin once all consumers are direct-store based.
