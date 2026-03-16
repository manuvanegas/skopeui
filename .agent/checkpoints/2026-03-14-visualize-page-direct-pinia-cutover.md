# Checkpoint: Visualize Page Direct Pinia Cutover

## Date
2026-03-14

## Scope
- Migrated `app/pages/dataset/_id/visualize/_variable.vue` off `$api()` compatibility calls.
- Replaced page-level action helper dependencies with local request helpers using `fetch` and existing endpoint constants.

## Changes
- Added direct Pinia store accessors for `app`, `dataset`, and `metadata` stores.
- Rewired lifecycle and computed properties that previously used `$api()` to direct store access.
- Implemented local methods for:
  - metadata refresh (`METADATA_ENDPOINT`)
  - dataset initialization
  - warehouse geojson restore
  - time series retrieval (`TIMESERIES_ENDPOINT`)
- Kept route flow and watcher-driven update behavior aligned with previous implementation.

## Validation
- File-level diagnostics: no errors reported for `app/pages/dataset/_id/visualize/_variable.vue`.
- No local test run in this shell; `npm` and `npx` are unavailable.

## Impact
- Removes the remaining page-level `$api()` dependency in the core dataset visualize/analyze routes.
- Remaining compatibility cleanup is now concentrated in shared helpers/components and persistence plugin edges.
