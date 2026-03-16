# Checkpoint: Analysis Page Direct Pinia Cutover

## Date
2026-03-14

## Scope
- Migrated `app/pages/dataset/_id/analyze/_variable.vue` off `$api()` compatibility calls.
- Replaced page-level legacy action helper usage with local request helpers using `fetch` + existing endpoint constants.

## Changes
- Added direct Pinia store accessors for `analysis`, `dataset`, and `metadata` stores.
- Rewired all computed properties and methods previously using `$api()` to store getters/actions.
- Implemented local methods in page for:
  - metadata refresh (`METADATA_ENDPOINT`)
  - dataset initialization
  - request-data initialization
  - analysis retrieval (`TIMESERIES_ENDPOINT`)
- Kept route and UI behavior consistent with previous implementation (form/watch flow unchanged).

## Validation
- File-level diagnostics: no errors reported for `app/pages/dataset/_id/analyze/_variable.vue`.
- Test execution in this workspace shell is blocked (`npm` and `npx` binaries unavailable).

## Impact
- Removes one major page-level dependency on `api-compat`.
- Narrows remaining migration surface to other page consumers and shared helper interop.
