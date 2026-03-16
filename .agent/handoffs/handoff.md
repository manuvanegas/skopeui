# Handoff: Explore Migration to MapLibre GL JS

## Objective
Investigate and prototype replacing Leaflet + leaflet-draw with MapLibre GL JS + maplibre-gl-draw in the Nuxt 3 app.

## Current Context
- The app currently renders study-area selection and raster overlays via `Map.client.vue` and Leaflet plugin wiring.
- Dataset detail, visualize, and analyze routes are currently returning 200 in isolated runtime checks.
- Next phase is exploratory migration planning/prototyping, not full cutover.

## Next Steps (Ordered)
1. Inventory current map feature usage in `app/components/dataset/Map.client.vue`:
   - Base layers/tile providers
   - WMS raster layer handling (including year template substitution)
   - Draw/edit/remove geometry flow
   - GeoJSON import/export and persistence behavior
2. Define a one-to-one capability matrix:
   - Leaflet feature -> MapLibre GL JS equivalent
   - leaflet-draw feature -> maplibre-gl-draw equivalent
   - Identify missing features and required workarounds/plugins
3. Create a minimal MapLibre proof-of-concept component:
   - New client-only component (parallel to existing map component)
   - Render map, one base style, and one raster/source-layer path
   - Integrate maplibre-gl-draw for polygon draw/edit/delete
4. Wire PoC to existing dataset store contract:
   - Read current metadata extents/center
   - Emit/update selected geometry compatible with existing `datasetStore.setGeoJson`
   - Preserve current persistence key behavior
5. Validate compatibility on key routes:
   - `/dataset/:id`
   - `/dataset/:id/visualize/:variable`
   - `/dataset/:id/analyze/:variable`
6. Produce migration decision doc in handoff update:
   - Keep Leaflet
   - Hybrid approach (feature flag)
   - Full MapLibre cutover
   - Risks, effort estimate, and recommended path

## Technical Considerations
- Keep migration client-only for map runtime code.
- Ensure CSS/assets for MapLibre and draw controls are loaded correctly in Nuxt 3.
- Confirm WMS integration strategy in MapLibre (`raster` source/layer, URL templating, reprojection constraints).
- Preserve current study-area UX and API request shape for downstream timeseries/analysis.

## Suggested First Commands
- `rg "leaflet|l-map|leaflet-draw|Map.client" app/components app/plugins app/pages`
- `rg "setGeoJson|geoJson|defaultApiRequestData|timeSeriesRequestData" app/stores app/composables`
- `npm info maplibre-gl version && npm info maplibre-gl-draw version`

## Exit Criteria for Exploration
- Working PoC map renders on one dataset route.
- Drawn polygon updates existing store geometry without breaking analysis flow.
- Clear recommendation documented with effort/risk tradeoffs.
