# COG Rendering Approach: Client-Side vs Server-Side

**Date:** 2026-03-16  
**Context:** SkopeUI — Nuxt 3 SPA on MapLibre GL JS, replacing legacy WMS/GeoServer raster pipeline with COG-native rendering on the visualize page (`/dataset/:id/visualize/:variable`).

---

## The Two Options

### Option A: Client-Side COG Rendering

The browser fetches COG tiles directly from S3 via HTTP range requests using a MapLibre custom protocol.

**Key library:** [`@geomatico/maplibre-cog-protocol`](https://github.com/geomatico/maplibre-cog-protocol)

```ts
import { cogProtocol } from '@geomatico/maplibre-cog-protocol';
maplibregl.addProtocol('cog', cogProtocol);

map.addSource('raster', {
  type: 'raster',
  url: 'cog://https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/gdd_maize_maysept/prediction_scaled.tif',
  tileSize: 256,
});
```

Color ramps and nodata are applied in the client. No server tile service is needed.

---

### Option B: Server-Side Dynamic Tiling

A FastAPI tile gateway (in skope-api) reads COGs from S3 and renders PNG tiles on demand. The client consumes a TileJSON endpoint and a standard MapLibre raster source.

**Target API contract (already in AGENTS.md):**

```
GET /v2/map/tilejson/{dataset_id}/{variable_id}?year=&colormap=&rescale=
GET /v2/map/tiles/{dataset_id}/{variable_id}/{z}/{x}/{y}.png
```

```ts
const tilejson = await fetch(`/v2/map/tilejson/${datasetId}/${variableId}?year=${year}`);
map.addSource('raster', { type: 'raster', url: tilejson.tiles[0], tileSize: 256 });
```

---

### Option B-Lite: Lightweight Server-Side COG Delivery

A minimal server layer does not render tiles. Instead, it acts as a control plane that:

- validates dataset and variable IDs,
- returns canonical render defaults (rescale, colormap, nodata, band),
- returns the resolved public COG URL template,
- can enforce policy (allowlists, deprecation, variable-level flags),
- leaves tile fetching and COG decoding in the browser.

Example endpoint shape:

```
GET /v2/map/cog-config/{dataset_id}/{variable_id}?year=
-> { cog_url, render_defaults, constraints, cache_ttl }
```

The SKOPE UI then uses maplibre-cog-protocol with those server-provided settings.

---

## Pros and Cons

| Concern | Client-Side (Option A) | Server-Side (Option B) |
|---|---|---|
| **Architecture complexity** | Low — no tile service to build or operate | Higher — requires maintaining a FastAPI endpoint in skope-api |
| **Infrastructure cost** | Low — S3 + CloudFront serves COGs directly | Higher — compute per tile request; can be offset with a caching layer |
| **Auth / access control** | N/A for fully public data | Centralizes access; easier to add auth later |
| **COG projection requirement** | Must be EPSG:3857; the library does not reproject | Server can reproject on the fly from any CRS |
| **COG overview requirement** | Critical — missing overviews means loading full resolution at low zoom | Less critical; server can generate overviews or downsample per request |
| **Rendering consistency** | Depends on client enforcing colormap and rescale per dataset | Server is authoritative; same output regardless of client |
| **Colormap / rescale UX** | Encoded in the URL fragment or via `setColorFunction()` | Server-side params; easily changed without redeploying client |
| **Advanced band math / mosaics** | Not supported by maplibre-cog-protocol | Supported via rio-tiler / TiTiler-style extensions |
| **Browser memory/CPU** | Higher — browser decodes floats, applies color functions per tile | Lower — client only paints PNGs |
| **Low-end device support** | Degraded — decode cost is real for large float COGs | Uniform — PNG tiles are light |
| **Observability / throttling** | Harder — traffic bypasses the API | Easy — standard API logging, rate limiting, circuit breakers |
| **Future non-public data** | Requires signed URLs per request | Transparent — auth at the API boundary only |
| **Time to implement (frontend)** | Fast — add protocol, wire source/layer in `MapLibrePoc.client.vue` | Moderate — wire TileJSON fetch + dynamic source update on year change |
| **Time to implement (backend)** | None required in skope-api | Requires PR-04 metadata contract + PR-05 tile endpoints in skope-api |

---

## Focused Comparison: Pure Client vs Lightweight Server

This section directly answers the SKOPE decision point raised in discussion.

| Concern | Pure Client-Side | Lightweight Server-Side (No Tile Rendering) |
|---|---|---|
| **Who defines render defaults** | Client code + metadata payload | API response is source of truth |
| **Policy and rollout control** | Harder, requires frontend deploys | Easier, can gate variables centrally |
| **Operational complexity** | Lowest | Low, still much lower than full dynamic tiler |
| **Runtime cost** | Lowest | Low (small JSON responses only) |
| **Client performance** | Same decode load | Same decode load |
| **Consistency across clients/agents** | Can drift | Stronger consistency via one config contract |
| **Future migration to auth/private** | Bigger jump later | Smaller jump, API boundary already exists |
| **Fallback routing** | Client owns all logic | Server can mark variable as client-safe or tile-gateway-only |

Net: Option B-Lite does not solve browser decode cost, but it improves governance, consistency, and future-proofing with limited backend burden.

---

## How Our COG Control Changes the Balance

The paleoclimate datasets on S3 are fully public. We control COG production, so we can guarantee:

- Reprojected to **EPSG:3857** at generation time.
- **Internal tile size of 256×256** matching the Google Maps tiling scheme.
- **Overview pyramid** generated down to zoom 0.
- Consistent **nodata, scale/offset, and value domain** per variable, known ahead of time from metadata.
- **Float32** single-band with well-known min/max ranges (per `variable.min` / `variable.max` already in dataset metadata).
- Lossless **Deflate** compression (good decode performance in browser workers).

With these guarantees, the main remaining client-side risks (projection, overview, unknown nodata) are eliminated by data management rather than by the server.

---

## Recommendation for SkopeUI

**Use a phased hybrid: Option A for rendering + Option B-Lite for control and policy.**

Rationale specific to this project:
1. All datasets are public; auth is not a near-term concern.
2. We control COG generation and can enforce the required profile.
3. `maplibre-cog-protocol` integrates directly with MapLibre GL JS, which is already on the stack.
4. A lightweight config endpoint gives centralized defaults and rollout control without paying full tile-render compute cost.
5. It unblocks PR-05 raster rendering immediately while preserving an upgrade path to full tile endpoints if needed.
6. Map tiles still load from S3/CDN, so the hot rendering path remains cheap and scalable.

**Maintain a server-side fallback for:**
- Datasets that cannot meet the client-safe COG profile (wrong projection, missing overviews).
- Future authenticated datasets.
- On-the-fly band math, mosaics, or multi-variable composites.

---

## Client-Safe COG Checklist

Before enabling client-side rendering for a dataset variable, verify:

- [ ] COG is in **EPSG:3857** (Web Mercator).
- [ ] Internal tiling uses **256×256 blocks** with `TILING_SCHEME=GoogleMapsCompatible`.
- [ ] Overview levels generated **down to zoom 0** (`OVERVIEWS=IGNORE_EXISTING`).
- [ ] **Nodata value** is set and documented in dataset metadata (`variable.nodata`).
- [ ] **Value domain** (`variable.min`, `variable.max`) is documented and stable enough to drive a colormap.
- [ ] Compression is **Deflate** (lossless, fast browser decode) or JPEG yCbCr for RGB imagery.
- [ ] File is **publicly readable** from S3 without credentials.

If any box is unchecked, route the variable through the server-side tile gateway instead.

---

## Implementation Path in the Roadmap

| PR | Approach | Notes |
|---|---|---|
| PR-04 | Add `cog_path_template`, `default_render` fields to variable metadata (frontend stores + API contract) | Required by both paths to locate the COG and set render params |
| PR-05 | Wire `cogProtocol` in `MapLibrePoc.client.vue`; add/update raster source on `year` change | Pure client rendering path |
| PR-05.5 | Add lightweight `/v2/map/cog-config/...` endpoint in skope-api | Centralized render defaults and policy, no tile rendering |
| PR-05 alt | Add `/v2/map/tilejson/` + `/v2/map/tiles/` to skope-api; fetch TileJSON and drive raster source | Full dynamic tiling fallback for non-conforming datasets |
| PR-06 | Workflow parity (year slider drives raster update, visualize → analyze handoff) | Same regardless of rendering path |

---

## References

- [COG spec and tools](https://cogeo.org/)
- [maplibre-cog-protocol](https://github.com/geomatico/maplibre-cog-protocol) — MapLibre custom protocol for direct COG access
- [geotiff.js](https://geotiffjs.github.io/geotiff.js/) — underlying browser COG decoder
- [TiTiler dynamic tiling docs](https://developmentseed.org/titiler/user_guide/dynamic_tiling/) — server-side alternative
- AGENTS.md — authoritative roadmap, S3 COG paths, and target API contract for this project
