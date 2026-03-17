# Checkpoint: maplibre-geoman-draw-parity-and-baselayer-tests

Date: 2026-03-16
Status: completed

## Scope
- Completed MapLibre migration parity updates in the active map component:
	- Geoman draw/edit/remove wiring (Mapbox Draw removed).
	- Store geometry sync imports persisted GeoJSON into Geoman-managed features for editability.
	- Base-layer selection parity restored (CartoDB/Esri options) via toolbar selector.
- Added focused MapLibre component coverage for basemap selection behavior.
- Added package script for component-only test runs.
- Synced agent documentation to current migration state.

## Files Touched
- `.agent/handoffs/handoff.md` (deleted)
- `.github/copilot-instructions.md`
- `.gitignore`
- `AGENTS.md`
- `app/components/Navigation.vue`
- `app/components/dataset/Map.client.vue`
- `app/components/dataset/MapLibrePoc.client.vue`
- `app/package-lock.json`
- `app/package.json`
- `app/pages/dataset/[id]/analyze/[variable].vue`
- `app/pages/dataset/[id]/index.vue`
- `app/pages/dataset/[id]/visualize/[variable].vue`
- `app/tests/components/maplibre-baselayer.spec.ts` (added)

## Behavior / Contract Impact
- MapLibre mode now supports:
	- Editable rehydration of persisted study area geometry.
	- Base-layer switching from UI selector with provider parity.
- Package scripts now include `test:components` (full `test` already includes component specs).
- No backend API contract change introduced.

## Risks / Follow-ups
- Known risks:
	- Existing unrelated workspace edits are included in this checkpoint set.
	- Debug logging present in `app/components/dataset/Map.client.vue` may be noisy.
- Required follow-up tasks:
	- Continue PR-03 circle-normalization contract hardening.
	- Extend MapLibre-mode test coverage beyond basemap behavior.

## Validation
- Tests run:
	- `docker compose -f base.yml -f dev.yml run --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts"`
	- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/components/maplibre-baselayer.spec.ts"`
	- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm run test:components -- tests/components/maplibre-baselayer.spec.ts"`
- Manual checks:
	- Basemap select control renders in MapLibre toolbar.
	- Basemap layer visibility toggles via MapLibre layout visibility updates.
- Outstanding verification:
	- Run full `npm run test` once before merge.

## Rollback Notes (Optional)
- Revert `app/components/dataset/MapLibrePoc.client.vue` to previous map-draw and basemap behavior.
- Remove `app/tests/components/maplibre-baselayer.spec.ts` and `test:components` script from `app/package.json`.
- Revert AGENTS/copilot instruction updates if roadmap/status text needs to be restored.
