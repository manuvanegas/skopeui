# Handoff: MapLibre PR-02 + Baselayer Test (Ready to Commit)

Date: 2026-03-16
Status: ready-to-commit

## Summary
- MapLibre draw parity advanced:
  - Geoman draw/edit/remove wired.
  - Persisted geometry is imported into Geoman for editability.
- Base-layer selector parity restored in MapLibre (CartoDB/Esri).
- Focused component test added for basemap visibility switching.
- Added `test:components` script.
- Agent docs synced to current migration status.

## Checkpoint
- `.agent/checkpoints/2026-03-16-maplibre-geoman-draw-parity-and-baselayer-tests.md`

## Key Files
- `app/components/dataset/MapLibrePoc.client.vue`
- `app/tests/components/maplibre-baselayer.spec.ts`
- `app/package.json`
- `AGENTS.md`
- `.github/copilot-instructions.md`

## Validation
- `docker compose -f base.yml -f dev.yml run --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts"`
- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/components/maplibre-baselayer.spec.ts"`
- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm run test:components -- tests/components/maplibre-baselayer.spec.ts"`

## Next Session
1. Commit current changeset.
2. Continue PR-03 circle-normalization contract hardening.
3. Expand MapLibre component tests beyond basemap behavior.
