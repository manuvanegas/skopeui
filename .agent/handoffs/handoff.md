# Handoff: Plotly Visualize Fix + Prior Raster Removal

Date: 2026-03-16
Status: implemented and validated

## Summary
- Legacy frontend raster code remains removed; visualize mode is still basemap + selected study area until COG tiles are implemented.
- The visualize/analyze Plotly path was further stabilized for a fresh browser session where the chart and controls could render off-screen or size incorrectly.
- Plotly usage was reduced from the full package import to a scatter-only core registration inside the wrapper.
- Focused visualize/analyze route tests pass after the Plotly changes.

## What Changed
1. `app/components/dataset/PlotlyClient.vue`
  - Switched from `plotly.js` full import to `plotly.js/lib/core` with `scatter` registered, which matches current app usage.
  - Added `ResizeObserver` + `requestAnimationFrame` resize scheduling so Plotly resizes after its container settles.
  - Added explicit width/min-height handling to avoid zero-size or bad first-render layout in fresh sessions.

2. `app/components/dataset/TimeSeriesPlot.vue`
  - Replaced brittle fixed-height toolbar/card math with a flex-column layout.
  - Converted the toolbar into wrapping flex groups so the temporal controls and step controls stay on-screen instead of pushing the plot out of view.
  - Added `autosize: true` to the layout metadata and kept the existing external export flow (`toImage`) intact.
  - Retained the earlier async Plotly ref hardening for `update` and `toImage` calls.

3. Previously completed in this branch
  - `app/components/dataset/MapLibrePoc.client.vue`, `app/components/dataset/LeafletMap.client.vue`, `app/store/modules/constants.js`, `app/store/modules/_constants.js`, `app/store/modules/_constants.js.template`, `app/store/modules/metadata.js`, `config.mk.template`, `README.md`
  - These changes removed active GeoServer/WMS frontend code and synced the repo/docs to the rasterless-until-COG state.

## Validation Commands
- `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts"`
- Previously green broader focused suite:
  - `docker compose -f base.yml -f dev.yml run -T --rm web sh -c "npm install 2>/dev/null && npm exec vitest run tests/components/maplibre-baselayer.spec.ts tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts tests/stores.migrated.spec.ts"`

## Next Session
1. Manually verify the visualize page in a browser with real metadata/time-series data, specifically checking first-load sizing, toolbar wrapping, and year-click behavior.
2. Manually verify analyze export still produces valid PNG/SVG output from the resized Plotly chart.
3. If bundle pressure is still noticeable, consider a further Plotly trim via a custom core registration set, but only after measuring the current improvement.
4. Resume the larger roadmap work: COG metadata/tile resolver, then PR-03 circle normalization.
