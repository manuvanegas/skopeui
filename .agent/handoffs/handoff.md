# Handoff: Compressed Plan for Full MapLibre + Geoman + COG Rollout

## Scope
Replace Leaflet drawing and GeoServer/WMS rendering with MapLibre GL + maplibre-geoman-free and raster rendering sourced directly from SKOPE COG GeoTIFF assets.

## Priority 0 Blocker (Must Fix First)
- Current `MapLibrePoc.client.vue` behavior is blocked: the PoC is currently not displaying a base map and not showing draw control tools from `maplibre-geoman-free`.
- This is the first priority before COG rendering, metadata contract updates, and GeoServer decommission steps.
- Do not start downstream migration work until this P0 is green in local and containerized runs.

## Current State (Done)
- Hybrid adapter is in place: `map_engine=leaflet|maplibre` switch in app map wrapper.
- MapLibre PoC wiring exists, but the active blocker is that base map rendering and geoman draw controls are not currently visible.
- Route-level page tests pass for dataset, visualize, and analyze routes.

## Delivery Plan (Compressed)
1. Drawing migration
   - Replace Mapbox Draw in `app/components/dataset/MapLibrePoc.client.vue` with maplibre-geoman-free.
   - Enable point, circle, polygon create/edit/delete.
   - Enforce single active study feature.
   - Convert circles to polygon before store save for downstream API compatibility.

2. COG raster renderer
   - Add a COG layer resolver that builds map sources/layers from metadata-driven URLs.
   - Keep layer lifecycle deterministic (remove stale source/layer IDs on year/variable changes).
   - Maintain existing opacity and visibility behavior.

3. Data contract updates
   - Extend metadata variable schema to include COG fields (for example: `cogUrl`, `cogTemplate`, `band`, `colormap`, `valueRange`).
   - Make COG fields required for variables rendered on the map.

4. Workflow parity
   - Keep upload/download GeoJSON actions and persistence semantics unchanged.
   - Verify select -> visualize -> analyze continuity for point/circle/polygon study areas.

5. Rollout
   - Keep Leaflet default until parity and QA are complete.
   - Promote `public.mapEngine=maplibre` when COG rendering and geoman tools are validated.

## COG Data References (SKOPE S3)
Listing page:
- http://skope.s3-website-us-west-2.amazonaws.com/

Direct object host pattern:
- https://skope.s3.us-west-2.amazonaws.com/<path>.tif

Verified example GeoTIFF paths for map rendering tests:
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/gdd_maize_maysept/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/ppt_wateryear/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/prediction.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/pi_deviation.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/pi_deviation_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/prediction.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/pi_deviation.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/pi_deviation_scaled.tif

Additional discovered prefixes to include in ingest mapping:
- `paleocar_v3/gdd_cotton_*`
- `paleocar_v3/gdd_wheat_*`
- `paleocar_v3/ppt_annual`
- `paleocar_v3/ppt_maysept`
- `paleocar_v3/ppt_wateryear`

## Validation Checklist
- Geoman tools: point/circle/polygon draw/edit/delete all persist correctly.
- Circle conversion output is valid GeoJSON polygon and accepted by API.
- COG layers load for sample URLs and react to opacity/year/variable changes.
- Existing page tests still pass; add maplibre-mode component tests for draw + raster lifecycle.

## Implementation Checklist (Owner + PR Slices)

Use owner placeholders and replace with actual assignees.

### PR-01 (P0): Restore visible MapLibre basemap and geoman controls
- Owner: FE-Map-1
- Scope:
   - Ensure MapLibre base style and base raster layer are visibly rendering.
   - Add `maplibre-geoman-free` and CSS and verify draw controls render in UI.
   - Verify control attachment order and map load lifecycle so controls are visible after map init.
- Files:
   - `app/package.json`
   - `app/components/dataset/MapLibrePoc.client.vue`
- Acceptance:
   - Base map is visible in `?map_engine=maplibre` mode.
   - Geoman draw toolbar is visible and interactive.
   - No console errors related to map or control initialization.

### PR-02: Draw tools parity (point, polygon, circle)
- Owner: FE-Map-1
- Scope:
   - Replace Mapbox Draw integration with geoman controls.
   - Implement create/edit/delete handlers.
   - Enforce single active study feature.
- Files:
   - `app/components/dataset/MapLibrePoc.client.vue`
- Acceptance:
   - User can draw point, polygon, circle.
   - Edit/delete works for the selected feature.

### PR-03: Circle normalization and persistence contract
- Owner: FE-Map-2
- Scope:
   - Convert circles to polygon on save.
   - Preserve circle metadata in feature properties.
   - Keep `useLegacyStoreActions` compatibility unchanged.
- Files:
   - `app/components/dataset/MapLibrePoc.client.vue`
   - `app/composables/useLegacyStoreActions.ts`
   - `app/stores/dataset.ts`
- Acceptance:
   - Saved geometry remains valid GeoJSON.
   - Analyze/visualize requests receive valid `selected_area`.

### PR-04: COG metadata contract extension
- Owner: FE-Data-1
- Scope:
   - Add required variable fields (`cogUrl` or `cogTemplate`, `band`, `colormap`, `valueRange`).
   - Add validation so variables without COG metadata are excluded from map rendering with a clear warning.
- Files:
   - `app/stores/metadata.ts`
   - `app/store/modules/metadata.js` (legacy defaults)
- Acceptance:
   - COG-enabled variables resolve URLs correctly.
   - Non-COG variables are surfaced as unsupported with explicit diagnostics.

### PR-05: COG raster layer resolver
- Owner: FE-Map-2
- Scope:
   - Add source/layer builder from COG metadata.
   - Deterministic add/remove IDs on year/variable change.
   - Preserve opacity and visibility behavior.
- Files:
   - `app/components/dataset/MapLibrePoc.client.vue`
   - `app/store/modules/constants.js` (if endpoint constants are needed)
- Acceptance:
   - Sample COG files render correctly.
   - No stale layers after variable/year changes.

### PR-06: Workflow parity and UX hardening
- Owner: FE-App-1
- Scope:
   - Validate select -> visualize -> analyze flow with point/circle/polygon.
   - Preserve upload/download GeoJSON actions.
   - Ensure study area prompt logic remains unchanged.
- Files:
   - `app/pages/dataset/[id]/index.vue`
   - `app/pages/dataset/[id]/visualize/[variable].vue`
   - `app/pages/dataset/[id]/analyze/[variable].vue`
- Acceptance:
   - Navigation gating still honors `hasGeoJson`.
   - No regressions in persisted geometry behavior.

### PR-07: Tests for MapLibre mode
- Owner: FE-Test-1
- Scope:
   - Add tests for geoman event handling and persistence.
   - Add tests for COG layer lifecycle updates.
   - Keep existing route tests passing.
- Files:
   - `app/tests/pages/dataset-id.spec.ts`
   - `app/tests/pages/visualize-variable.spec.ts`
   - `app/tests/pages/analyze-variable.spec.ts`
   - New maplibre-focused component tests under `app/tests/components/`.
- Acceptance:
   - Targeted tests pass in containerized run.

### PR-08: Feature-flag flip and cleanup
- Owner: FE-Lead
- Scope:
   - Set maplibre as default engine when QA is green.
   - Remove deprecated mapbox-draw wiring.
   - Remove GeoServer/WMS client constants and layer code paths.
   - Remove Leaflet map path after rollout sign-off.
- Files:
   - `app/nuxt.config.ts`
   - `app/components/dataset/Map.client.vue`
   - `app/components/dataset/LeafletMap.client.vue`
   - `app/store/modules/constants.js`
- Acceptance:
   - Default experience runs on MapLibre.
   - No runtime dependency on GeoServer endpoints remains in app map flow.

## Suggested Execution Order
1. PR-01
2. PR-02
3. PR-03
4. PR-04
5. PR-05
6. PR-06
7. PR-07
8. PR-08

## COG Smoke Test Set (Use in PR-05 and PR-07)
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/gdd_maize_maysept/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/ppt_wateryear/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/prediction.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/prediction_scaled.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/prediction.tif
- https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/gdd_maize_maysept/prediction_scaled.tif

## Run Commands (Containerized)
- `docker compose -f base.yml -f dev.yml run --rm web npm exec vitest run tests/pages/dataset-id.spec.ts tests/pages/visualize-variable.spec.ts tests/pages/analyze-variable.spec.ts`
- `docker compose -f base.yml -f dev.yml run --rm web npm run test`

## Detailed Plan: Replace GeoServer WMS with COG Programmatic Access

### Goal
Serve map rasters from COG assets without GeoServer while keeping current SKOPE workflows intact.

### Decision Frame
Two viable access patterns exist and can be combined during migration.

1. Client filename manipulation (direct S3 object addressing)
    - Client constructs COG URL from metadata template and selection context.
    - Pros: minimal backend work, simple deployment.
    - Cons: hard to manage band selection, color ramps, auth, and future path/schema changes.

2. FastAPI COG processing gateway in skope-api (recommended)
    - Client asks API for tilejson and map tiles; API resolves filenames and processing details.
    - Pros: thin client, centralized logic, secure URL handling, easy caching and observability.
    - Cons: adds server compute and dependency footprint.

### Recommended Architecture
Use FastAPI as the canonical COG resolver and tile service while still allowing a deterministic filename template strategy internally.

#### A. Metadata and Path Contract
- Add map-specific COG descriptors to API metadata output for each variable:
   - `cog_path_template` or `cog_static_path`
   - `time_resolution` (year or month)
   - `time_origin` and `time_bounds`
   - `default_render` (`band`, `rescale`, `colormap`, `nodata`)
   - `overviews_available` flag
- Keep these fields in one source of truth and generate both API metadata views from it to avoid drift.

#### B. Filename Manipulation Rules
- Standardize placeholders to avoid ad hoc string concatenation in client code:
   - `{dataset_id}` `{variable_id}` `{year}` `{month}` `{stat}` `{scale}`
- Add a backend validator that rejects templates with path traversal or unresolved tokens.
- Add a dry-run endpoint to return the resolved object key for diagnostics.

#### C. New FastAPI Endpoints
- `GET /v2/map/metadata/{dataset_id}/{variable_id}`
   - Returns render defaults, temporal mapping, and resolved COG identity metadata.
- `GET /v2/map/tilejson/{dataset_id}/{variable_id}`
   - Query params: `year`, `month`, `rescale`, `colormap`, `opacity`, `bidx`.
   - Returns tilejson with one tiles URL template.
- `GET /v2/map/tiles/{dataset_id}/{variable_id}/{z}/{x}/{y}.png`
   - Returns rendered PNG tile from COG source.
   - Supports server-side `bidx` selection derived from `year` and metadata.
- `GET /v2/map/legend/{dataset_id}/{variable_id}`
   - Returns a compact legend image/json matching colormap and value range.

#### D. Server Processing Model
- Add rio-tiler based tile rendering in skope-api.
- Resolve COG URL per request from metadata + temporal inputs.
- Compute band index from `year` or `year-month` using existing time-range logic already used by timeseries extraction.
- Apply nodata masking, rescale, and colormap server-side.
- Emit cache headers and stable cache keys from `dataset_id + variable_id + time + render params + z/x/y`.

#### E. Client Integration in skopeui
- Replace WMS URL creation with tilejson fetch on variable/year change.
- Add raster source from returned tile URL template.
- Keep existing per-variable visibility and opacity behavior.
- Keep study area drawing, persistence, and analysis payload path unchanged.

### Migration Phases

Phase 0: Contracts and fixtures
- Define COG metadata schema.
- Add fixture metadata entries for 3 to 5 verified COG assets.

Phase 1: API gateway foundation
- Implement map metadata and tile endpoints in skope-api.
- Add unit tests for template resolution and band-index translation.

Phase 2: UI COG renderer switch
- Update MapLibre component to consume API tilejson and tile endpoints.
- Remove WMS-specific map code.

Phase 3: Validation and hardening
- Test point, circle, polygon workflows across select/visualize/analyze routes.
- Add performance tests for pan/zoom and year changes.
- Add error-path tests for missing object, invalid year, and out-of-range band selection.

Phase 4: GeoServer retirement
- Remove GeoServer env variables and constants from skopeui.
- Remove GeoServer references in deploy docs and compose config.
- Remove GeoServer dependencies from skope-api deployment.

### Acceptance Criteria
- No map requests depend on WMS endpoints.
- All rendered map layers come from COG-backed tile endpoints.
- Year/month switching produces correct raster band rendering.
- Existing timeseries and study-area workflows are unchanged.
- P95 tile response latency and cache hit rates are defined and tracked.

### Risks and Mitigations
- Risk: incorrect band mapping for temporal datasets.
   - Mitigation: share one band-range utility between map and timeseries code paths in skope-api.
- Risk: S3 object naming inconsistencies.
   - Mitigation: metadata registry with strict template validation and startup checks.
- Risk: higher tile server cost.
   - Mitigation: CDN caching, overview usage, and bounded tile parameter surface.

### Immediate Next Steps
1. Add COG schema fields to skope-api metadata models and output.
2. Implement `GET /v2/map/metadata/{dataset_id}/{variable_id}` and template resolver.
3. Implement `GET /v2/map/tiles/{dataset_id}/{variable_id}/{z}/{x}/{y}.png` using rio-tiler.
4. Switch `MapLibrePoc.client.vue` to API tilejson source loading.
5. Remove WMS constants and any map-time GeoServer URL usage in skopeui.

## PR-Ready Specs: openskope/skope-api

### API-PR-01: Metadata contract for map rendering
- Title: Add COG map metadata fields to v2 metadata responses
- Owner: API-Map-1
- Scope:
   - Extend metadata payload for each variable with COG render contract fields.
   - Ensure one source of truth drives both API metadata and runtime extraction metadata.
- Required fields:
   - `cog_path_template` or `cog_static_path`
   - `time_resolution`
   - `time_origin`
   - `time_bounds`
   - `default_render` (`bidx`, `rescale`, `colormap`, `nodata`)
- Acceptance:
   - `/metadata` includes these fields for COG-backed variables.
   - Invalid records fail startup validation.

### API-PR-02: COG template resolver and validation
- Title: Add secure template resolver for COG object paths
- Owner: API-Map-1
- Scope:
   - Resolve filename templates from `dataset_id`, `variable_id`, `year`, `month`, `stat`, `scale`.
   - Reject unresolved placeholders and path traversal.
   - Add diagnostics endpoint for resolved path inspection.
- Endpoints:
   - `GET /v2/map/resolve/{dataset_id}/{variable_id}`
- Acceptance:
   - Resolver output is deterministic for same inputs.
   - Unsafe path attempts are rejected with validation error.

### API-PR-03: Tile and tilejson endpoints
- Title: Serve COG-backed map tiles via FastAPI
- Owner: API-Map-2
- Scope:
   - Add tilejson endpoint for client source wiring.
   - Add tile rendering endpoint with server-side band selection.
   - Implement legend endpoint.
- Endpoints:
   - `GET /v2/map/metadata/{dataset_id}/{variable_id}`
   - `GET /v2/map/tilejson/{dataset_id}/{variable_id}`
   - `GET /v2/map/tiles/{dataset_id}/{variable_id}/{z}/{x}/{y}.png`
   - `GET /v2/map/legend/{dataset_id}/{variable_id}`
- Acceptance:
   - Returns valid PNG tiles for smoke-test COG assets.
   - Supports query params for `year`, `month`, `bidx`, `rescale`, `colormap`.

### API-PR-04: Band index parity with timeseries logic
- Title: Reuse temporal band mapping for map tiles
- Owner: API-Core-1
- Scope:
   - Reuse or extract common utility from existing band-range logic.
   - Ensure map `year/month -> band` translation matches timeseries extraction.
- Acceptance:
   - Given same dataset/time input, map and timeseries reference the same band index.
   - Unit tests cover annual and monthly mappings.

### API-PR-05: Caching and performance hardening
- Title: Add tile caching headers and key strategy
- Owner: API-Infra-1
- Scope:
   - Add cache-control headers to tile and legend responses.
   - Define deterministic cache key dimensions.
   - Add observability for tile latency and error rate.
- Acceptance:
   - P95 latency and cache-hit metrics are visible in logs/monitoring.
   - Repeated tile requests are cache-friendly.

### API-PR-06: Remove GeoServer coupling from API deployment
- Title: Remove GeoServer dependencies from deployment workflow
- Owner: API-Infra-1
- Scope:
   - Remove geoserver service references from compose/build docs and scripts.
   - Keep timeseries and map tile services self-contained.
- Acceptance:
   - API deploys and serves timeseries + map tiles without GeoServer.

## PR-Ready Specs: openskope/skopeui

### UI-PR-01: Geoman migration
- Title: P0 restore basemap visibility and geoman controls, then replace mapbox draw
- Owner: FE-Map-1
- Scope:
   - Restore visible MapLibre basemap rendering in `?map_engine=maplibre` mode.
   - Ensure `maplibre-geoman-free` toolbar is visible and interactive after map init.
   - Point, circle, polygon draw/edit/delete.
   - Single-feature enforcement.
   - Circle-to-polygon conversion on save.
- File focus:
   - `app/components/dataset/MapLibrePoc.client.vue`
- Acceptance:
   - Basemap is visible and stable after route transitions.
   - Geoman toolbar is visible and interactive.
   - Geometry persistence and restore behavior matches existing flow.

### UI-PR-02: Tilejson-driven raster source integration
- Title: Replace WMS source generation with API tilejson
- Owner: FE-Map-2
- Scope:
   - Fetch `/v2/map/tilejson/...` on variable/year changes.
   - Create/update MapLibre raster source from API tiles.
   - Maintain opacity and variable visibility controls.
- File focus:
   - `app/components/dataset/MapLibrePoc.client.vue`
   - `app/store/modules/constants.js`
- Acceptance:
   - No client-side WMS URL construction remains.

### UI-PR-03: Metadata contract consumption
- Title: Require COG map fields in metadata usage path
- Owner: FE-Data-1
- Scope:
   - Update variable model assumptions to use COG fields.
   - Show clear unsupported state for variables missing COG descriptors.
- File focus:
   - `app/stores/metadata.ts`
   - `app/store/modules/metadata.js`
- Acceptance:
   - COG-enabled variables render; non-compliant records fail visibly.

### UI-PR-04: Remove WMS and GeoServer constants
- Title: Remove SKOPE_WMS endpoint usage from map flow
- Owner: FE-Lead
- Scope:
   - Remove WMS-specific helpers and constants usage in map components.
   - Remove GeoServer dependency from runtime behavior.
- File focus:
   - `app/components/dataset/MapLibrePoc.client.vue`
   - `app/components/dataset/LeafletMap.client.vue`
   - `app/store/modules/constants.js`
   - `app/nuxt.config.ts`
- Acceptance:
   - Map flow does not reference GeoServer host variables.

### UI-PR-05: Workflow and regression tests
- Title: Add maplibre COG mode tests and preserve route behavior
- Owner: FE-Test-1
- Scope:
   - Add map component tests for tile source lifecycle + geoman events.
   - Keep route tests green.
- File focus:
   - `app/tests/pages/dataset-id.spec.ts`
   - `app/tests/pages/visualize-variable.spec.ts`
   - `app/tests/pages/analyze-variable.spec.ts`
   - New component tests under `app/tests/components/`
- Acceptance:
   - All tests pass in containerized runs.

## GeoServer Decommission Checklist

1. Remove GeoServer runtime env vars from app and API deploy configs.
2. Remove WMS endpoint constants and helpers from client map code.
3. Remove GeoServer service/container from compose manifests.
4. Remove GeoServer mentions from README, ops docs, and runbooks.
5. Confirm smoke tests pass using only COG tile endpoints.
6. Verify no outbound requests target `/geoserver/` paths in browser network logs.
7. Freeze and archive GeoServer-specific scripts after cutover.

## Definition of Done

- Map rendering, legend, and variable/year switching work with COG-backed API endpoints only.
- Analyze and visualize workflows remain unchanged for study area handling.
- No source code path in skopeui requires WMS or GeoServer URLs.
- Production deployment can run without any GeoServer components.

## Sprint Board (Effort and Dependencies)

Assumed team capacity per sprint:
- 2 API engineers
- 2 FE engineers
- 1 QA engineer
- Sprint length: 10 working days

### Sprint 1: Contracts and Foundations
- Goal: Resolve P0 map visibility blocker first, then establish API contract baseline.
- Planned work:
   - UI-PR-01 (P0) (5 points, 2 to 3 days)
   - API-PR-01 (5 points, 2 to 3 days)
   - API-PR-02 (8 points, 3 to 4 days)
- Dependencies:
   - UI-PR-01 is P0 and must complete first for maplibre-mode execution.
   - API-PR-02 depends on API-PR-01 metadata schema.
   - UI-PR-01 has no API dependency.
- Exit criteria:
   - Basemap and geoman controls are visible in maplibre mode.
   - COG metadata fields available and validated in API.
   - Geoman drawing is merged and stable in MapLibre path.

### Sprint 2: Tile Service and UI Integration
- Goal: Replace WMS map rendering with COG tilejson and tiles.
- Planned work:
   - API-PR-03 (13 points, 5 to 6 days)
   - API-PR-04 (5 points, 2 to 3 days)
   - UI-PR-02 (8 points, 3 to 4 days)
   - UI-PR-03 (5 points, 2 to 3 days)
- Dependencies:
   - API-PR-03 depends on API-PR-02 resolver.
   - API-PR-04 depends on API-PR-01 and existing timeseries mapping utilities.
   - UI-PR-02 depends on API-PR-03 tilejson and tile endpoints.
   - UI-PR-03 depends on API-PR-01 metadata fields.
- Exit criteria:
   - Map renders from API COG tile endpoints in visualize flow.
   - Temporal band selection is parity-tested between tiles and timeseries.

### Sprint 3: Hardening and Decommission
- Goal: Remove GeoServer/WMS dependencies and complete regression hardening.
- Planned work:
   - API-PR-05 (5 points, 2 to 3 days)
   - API-PR-06 (5 points, 2 to 3 days)
   - UI-PR-04 (8 points, 3 to 4 days)
   - UI-PR-05 (8 points, 3 to 4 days)
- Dependencies:
   - API-PR-05 depends on API-PR-03 endpoint behavior being stable.
   - API-PR-06 depends on API-PR-03 in production-like environment.
   - UI-PR-04 depends on UI-PR-02 completion.
   - UI-PR-05 depends on UI-PR-01 through UI-PR-04 completion.
- Exit criteria:
   - No GeoServer/WMS calls or runtime config dependencies remain.
   - Full route and component regression tests pass.

## Cross-Sprint Dependency Graph

1. API-PR-01 -> API-PR-02 -> API-PR-03 -> API-PR-05
2. API-PR-01 -> API-PR-04
3. API-PR-03 + API-PR-04 -> UI-PR-02
4. API-PR-01 -> UI-PR-03
5. UI-PR-01 -> UI-PR-02 -> UI-PR-04 -> UI-PR-05
6. API-PR-03 -> API-PR-06

## Critical Path

1. UI-PR-01 (P0)
2. API-PR-01
3. API-PR-02
4. API-PR-03
5. UI-PR-02
6. UI-PR-04
7. UI-PR-05

Total critical-path estimate: 6 to 8 weeks including QA buffer and staged release checks.

## Risk Buffer and Parallelization Guidance

- Reserve 20 percent sprint buffer for COG edge cases (band mapping, nodata, path irregularities).
- Parallel lane A: API-PR-01 and UI-PR-01 in Sprint 1.
- Parallel lane B: API-PR-04 can run while API-PR-03 is in progress.
- Parallel lane C: UI-PR-03 can run before UI-PR-02 is fully complete.

## Release Gates

1. Gate A (end Sprint 1): P0 fixed (visible basemap + visible geoman toolbar) and contracts frozen.
2. Gate B (end Sprint 2): COG tile rendering functional for smoke set.
3. Gate C (end Sprint 3): GeoServer removed and full regression green.

## Condensed GitHub Issue Set

Use one issue per block below.

Priority order
- Create and execute `UI-01 (P0)` first. Do not begin downstream COG tile integration until P0 acceptance is met.

### 1) Epic: Replace GeoServer WMS with COG map pipeline
Labels: epic, map, cogs, migration

Summary
- Replace WMS map rendering with COG-backed tile endpoints and MapLibre integration.

Success Criteria
- No map request depends on GeoServer.
- Map rendering and study-area workflows are unchanged for users.
- GeoServer can be removed from production deployment.

Child Issues
- API-01, API-02, API-03, API-04, API-05, API-06
- UI-01 (P0), UI-02, UI-03, UI-04, UI-05

---

### 2) API-01: Add COG map metadata fields to metadata endpoint
Labels: api, metadata, cogs
Depends on: none

Scope
- Extend variable metadata with COG render fields.
- Validate required COG fields at startup.

Acceptance
- Metadata includes COG path and render defaults.
- Invalid metadata fails with explicit errors.

---

### 3) API-02: Add secure COG filename resolver
Labels: api, validation, security
Depends on: API-01

Scope
- Resolve COG path templates from dataset and temporal parameters.
- Reject unresolved placeholders and unsafe paths.

Acceptance
- Deterministic resolution for same inputs.
- Invalid template or traversal attempt returns validation error.

---

### 4) API-03: Implement tilejson, tile, and legend endpoints
Labels: api, map, tiles
Depends on: API-02

Scope
- Add endpoints for map metadata, tilejson, png tiles, and legend.
- Render from COG assets with server-side band selection.

Acceptance
- Smoke-test COG files render as map tiles.
- Endpoints support year or month and render params.

---

### 5) API-04: Guarantee band-index parity with timeseries logic
Labels: api, timeseries, parity
Depends on: API-01

Scope
- Reuse shared time-range to band-index logic for map tiles.
- Add annual and monthly parity tests.

Acceptance
- Tile band selection matches timeseries extraction for same inputs.

---

### 6) API-05: Add tile caching and observability
Labels: api, perf, ops
Depends on: API-03

Scope
- Add cache headers and stable cache key strategy.
- Emit metrics/logs for latency and error rates.

Acceptance
- P95 latency is trackable.
- Repeated tile requests are cache friendly.

---

### 7) API-06: Remove GeoServer from API deployment flow
Labels: api, infra, decommission
Depends on: API-03

Scope
- Remove GeoServer dependencies from compose/docs/scripts.

Acceptance
- API serves timeseries and map tiles without GeoServer.

---

### 8) UI-01 (P0): Restore visible basemap and geoman toolbar, then complete draw migration
Labels: ui, map, drawing
Depends on: none

Scope
- Restore visible MapLibre basemap in maplibre mode.
- Ensure geoman draw toolbar is visible and interactive.
- Replace mapbox draw with geoman.
- Support point, circle, polygon create-edit-delete.
- Enforce one active study feature.

Acceptance
- Basemap is visible in `?map_engine=maplibre` mode.
- Geoman controls are visible and interactive.
- Drawing and edit flows work across page transitions.

---

### 9) UI-02: Switch map raster source to API tilejson
Labels: ui, map, tiles
Depends on: UI-01, API-03

Scope
- Fetch tilejson for selected variable and time.
- Create and update MapLibre raster sources from API tile URLs.

Acceptance
- No client-side WMS URL construction remains.

---

### 10) UI-03: Consume required COG metadata and unsupported-state UX
Labels: ui, metadata, ux
Depends on: API-01

Scope
- Require COG map fields for renderable variables.
- Surface unsupported variables with clear user-facing diagnostics.

Acceptance
- COG-compliant variables render.
- Non-compliant variables do not fail silently.

---

### 11) UI-04: Remove WMS and GeoServer constants from map flow
Labels: ui, cleanup, decommission
Depends on: UI-02

Scope
- Remove WMS helpers and GeoServer map endpoint usage.
- Remove obsolete runtime config dependencies.

Acceptance
- Map code contains no GeoServer endpoint references.

---

### 12) UI-05: Add regression tests for COG map mode
Labels: ui, test, regression
Depends on: UI-01, UI-02, UI-03, UI-04

Scope
- Add tests for geoman event handling and tile source lifecycle.
- Keep existing route tests green.

Acceptance
- Containerized test runs pass.
- Selection, visualize, and analyze workflows remain stable.

---

### 13) Ops: GeoServer decommission completion checklist
Labels: ops, infra, decommission
Depends on: API-06, UI-04

Checklist
- Remove GeoServer env vars from deployments.
- Remove GeoServer service from compose manifests.
- Remove GeoServer references from docs and runbooks.
- Verify no outbound requests target geoserver paths.
- Archive obsolete GeoServer scripts.

Acceptance
- Production stack runs map and analysis without GeoServer components.
