# Checkpoint: Compatibility Assets Retired

## Date
2026-03-14

## Scope
- Retire unused compatibility plugin files and bridge-only test assets after migration cutoff.

## Changes
- Deleted compatibility plugins:
  - `app/plugins/api-compat.ts`
  - `app/plugins/warehouse-compat.client.ts`
- Deleted obsolete bridge test suite:
  - `app/tests/api-compat.migrated.spec.ts`
- Verified no remaining bridge call sites:
  - no `$api()` references in `app/**/*.{vue,js,ts}`
  - no `$warehouse` references in `app/**/*.{vue,js,ts}`
  - no `api-compat` / `warehouse-compat` references in app source files

## Validation
- Containerized test run (`npm ci && npm exec vitest run`):
  - Test Files: 1 passed
  - Tests: 7 passed

## Impact
- Compatibility layer artifacts are now removed from the codebase.
- Remaining migration work is focused on staged runtime verification and residual architecture decisions (e.g., Hapi externalization).
