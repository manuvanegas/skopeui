# Checkpoint: Direct Pinia Consumer Migration (Round 1)

Date: 2026-03-14
Status: completed (incremental migration)

## Scope
Begin migrating component consumers from `$api()` calls to direct Pinia store usage.

## Completed
- Migrated app store consumers in:
  - `app/components/Header.vue`
  - `app/components/Navigation.vue`
- Migrated messages store consumer in:
  - `app/components/Messages.vue`
- Migrated dataset store consumer in:
  - `app/components/dataset/SubHeader.vue`

## Notes
- Existing route and behavior flow preserved.
- Compatibility plugin remains in place for remaining components/pages still using `$api()`.

## Next Actions
1. Migrate dataset-heavy components (`Map.vue`, `TimeSeriesPlot.vue`) to direct stores.
2. Migrate metadata/analysis consumers on dataset pages.
3. Remove `api-compat` plugin after all direct consumers are migrated.
