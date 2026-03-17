# Active Tasks

## In Progress
- (mapping) MapLibre migration continuation
  - Scope: complete the Leaflet → MapLibre cutover while keeping the Leaflet fallback available until MapLibre workflow parity is validated.
  - Current state: basemap selection parity is in place, Geoman draw/edit/remove is wired, visualize mode is intentionally rasterless until the COG tile flow lands.
  - Related files: `app/components/dataset/Map.client.vue`, `app/components/dataset/MapLibrePoc.client.vue`, `app/components/dataset/LeafletMap.client.vue`, `app/tests/components/maplibre-baselayer.spec.ts`.
  - Next roadmap item: PR-03 circle normalization.

- (visualization) Plotly time-series hardening
  - Scope: keep the existing Plotly-based analyze/visualize flow stable while trimming unnecessary bundle weight and fixing first-render layout issues.
  - Current state: local Plotly wrapper uses `plotly.js/lib/core` plus `scatter`, async ref access is hardened, and the `TimeSeriesPlot` toolbar/plot layout has been made responsive.
  - Related files: `app/components/dataset/PlotlyClient.vue`, `app/components/dataset/TimeSeriesPlot.vue`, `app/pages/dataset/[id]/visualize/[variable].vue`, `app/pages/dataset/[id]/analyze/[variable].vue`.

- (raster) COG transition preparation
  - Scope: keep the frontend free of legacy WMS/GeoServer runtime paths while preparing for TileJSON/COG-based raster rendering.
  - Current state: active frontend GeoServer/WMS code has been removed from both map engines, shared constants, and default metadata/config scaffolding.
  - Next roadmap items: PR-04 COG metadata contract, PR-05 COG raster resolver.

## Next Up
- Manually verify visualize first-load sizing, toolbar wrapping, and year-click behavior in a browser.
- Manually verify analyze export still returns valid PNG/SVG output after the Plotly wrapper resize changes.
- Implement PR-03 circle normalization before persisted geometry is sent to the API.
- Extend MapLibre-mode tests once the next workflow-parity increment lands.

## Latest Progress (2026-03-16)
- Removed active frontend GeoServer/WMS code from:
  - `app/components/dataset/MapLibrePoc.client.vue`
  - `app/components/dataset/LeafletMap.client.vue`
  - `app/plugins/leaflet.client.ts`
  - `app/store/modules/constants.js`, `app/store/modules/_constants.js.template`, `app/store/modules/metadata.js`
  - `config.mk.template`, `README.md`
- Updated visualize mode to render basemap + study area only with `map-engine="maplibre"` and `display-raster="false"`.
- Hardened `app/components/dataset/TimeSeriesPlot.vue`:
  - fixed the Plotly child ref/exposed API access path
  - replaced brittle toolbar height math with a responsive flex layout
  - enabled autosizing and kept export support intact
- Optimized `app/components/dataset/PlotlyClient.vue`:
  - switched to `plotly.js/lib/core` + `scatter`
  - added `ResizeObserver` and deferred resize scheduling for reliable first render
- Consolidated handoff workflow to `.agent/handoffs/handoff.md` and removed the redundant `current.md` file.

## Validation Snapshot
- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts"`
  - `Test Files 2 passed`
  - `Tests 5 passed`
- Broader focused suite previously green:
  - `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/components/maplibre-baselayer.spec.ts tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts tests/stores.migrated.spec.ts"`

## Definition of Done (Current Focus)
- MapLibre workflow parity continues without reintroducing legacy raster code.
- Plotly visualize/analyze charts render reliably in fresh sessions and preserve export behavior.
- Active agent state is captured in `.agent/handoffs/handoff.md` and relevant checkpoints.
