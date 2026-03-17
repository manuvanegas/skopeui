# Checkpoint: raster-removal-plotly-hardening-and-agent-doc-sync

Date: 2026-03-16
Status: completed

## Scope
- Removed active frontend GeoServer/WMS runtime paths from the map stack and related config/docs.
- Hardened Plotly time-series rendering for fresh-session sizing and off-screen toolbar issues.
- Consolidated agent handoff workflow to a single `.agent/handoffs/handoff.md` file and refreshed live agent context docs.

## Files Touched
- `app/components/dataset/Map.client.vue`
- `app/components/dataset/MapLibrePoc.client.vue`
- `app/components/dataset/LeafletMap.client.vue`
- `app/components/dataset/PlotlyClient.vue`
- `app/components/dataset/TimeSeriesPlot.vue`
- `app/pages/dataset/[id]/visualize/[variable].vue`
- `app/plugins/leaflet.client.ts`
- `app/store/modules/constants.js`
- `app/store/modules/_constants.js.template`
- `app/store/modules/metadata.js`
- `app/stores/dataset.ts`
- `app/tests/components/maplibre-baselayer.spec.ts`
- `app/tests/pages/visualize-variable.spec.ts`
- `app/tests/stores.migrated.spec.ts`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.agent/context/project.md`
- `.agent/context/domain.md`
- `.agent/context/conventions.md`
- `.agent/tasks/active.md`
- `.agent/handoffs/handoff.md`
- `README.md`
- `config.mk.template`

## Behavior / Contract Impact
- Visualize mode now intentionally renders basemap + study area only; frontend raster rendering is deferred until the COG/TileJSON flow lands.
- Plotly now renders through a local core+scatter wrapper with resize-aware behavior.
- Time-series controls wrap within the available width instead of forcing the chart off-screen.
- Agent workflow now treats `.agent/handoffs/handoff.md` as the single live handoff file.

## Validation
- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts"`
- Previously green broader focused suite:
  - `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/components/maplibre-baselayer.spec.ts tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts tests/stores.migrated.spec.ts"`

## Follow-up
- Manually verify visualize first-load sizing and analyze export in a browser.
- Continue PR-03 circle normalization.
- Implement the COG metadata contract and raster resolver without reintroducing legacy raster endpoints.
