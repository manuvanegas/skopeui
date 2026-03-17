# Copilot Agent Instructions

> Authoritative full context lives in `AGENTS.md` at the repo root. This file is a compressed sync.
> When `AGENTS.md` changes, update this file to match.

---

## Codebase: SkopeUI

Nuxt 3 SPA for spatiotemporal paleoclimate dataset discovery, visualization, and time-series analysis (SKOPE platform).

**Stack:** Nuxt 3 + Vue 3 + TypeScript · Pinia stores · Vuetify 3 · Leaflet (legacy) → MapLibre GL JS + maplibre-geoman-free (target) · COG tile gateway via FastAPI (target, replacing GeoServer WMS).

**User flow:** search datasets → select dataset → draw study area on map → visualize variable raster → analyze time series.

### Key files

| Path | Purpose |
|---|---|
| `app/components/dataset/Map.client.vue` | Adapter: renders Leaflet or MapLibre by engine flag |
| `app/components/dataset/LeafletMap.client.vue` | Legacy map (keep as fallback) |
| `app/components/dataset/MapLibrePoc.client.vue` | Active migration target |
| `app/composables/useLegacyStoreActions.ts` | Bridge legacy actions → Pinia |
| `app/composables/usePersistenceStorage.ts` | localStorage with SSR safety |
| `app/stores/` | Pinia stores (authoritative) |
| `app/store/` | Legacy Vuex-style (phase out) |
| `app/nuxt.config.ts` | `runtimeConfig.public.mapEngine` defaults to `"leaflet"` |

### Map engine flag

URL param `?map_engine=maplibre` or `nuxt.config.ts` `public.mapEngine` switches the adapter.
**Current state:** MapLibrePoc renders, geoman draw/edit/remove is wired, persisted geometry is imported into geoman for editability, and MapLibre now supports base-layer selection parity (CartoDB/Esri providers).

### Dev commands (all inside Docker container — npm not on host)

```bash
docker compose -f base.yml -f dev.yml run --rm web npm run test
docker compose -f base.yml -f dev.yml run --rm web npm run test:components
docker compose -f base.yml -f dev.yml run --rm web npm exec vitest run tests/pages/dataset-id.spec.ts
docker compose -f base.yml -f dev.yml up
```

`app/store/modules/_constants.js` is gitignored — copy from template before running.

### Conventions

- `.client.vue` suffix for browser-only components.
- New state → Pinia `app/stores/`. Do not extend legacy `app/store/`.
- Geometry persistence always through `useLegacyStoreActions` (`saveGeoJson`, `clearGeoJson`, `initializeDatasetGeoJson`).
- Circle GeoJSON must be converted to polygon before store save / API submission.
- Route guards gate visualize/analyze on `hasGeoJson` — do not remove.
- No new WMS/GeoServer dependencies; migrate toward COG-only.

### Migration roadmap (PR order)

~~PR-01~~(done) → ~~PR-02~~(done) → PR-03: Circle normalization → PR-04: COG metadata contract → PR-05: COG raster resolver → PR-06: Workflow parity → PR-07: MapLibre-mode tests (in progress: `tests/components/maplibre-baselayer.spec.ts`) → PR-08: Feature-flag flip + Leaflet/GeoServer removal.

### Handoff

Active handoff state: `.agent/handoffs/handoff.md`. Read on resume. Delete after completion.

---

## Context Window Management

When the context window usage exceeds 60%, perform a graceful handoff so work can resume in a new conversation without losing progress.

### Handoff Procedure (on exceeding 60% context)

1. **Save state to handoff file** — write a file at `.agent/handoffs/handoff.md` containing:
   - Current task list with statuses (copy from todo list)
   - Key decisions made and rationale
   - Files modified so far (paths + brief description of changes)
   - Next steps to continue (in order)
   - Any unresolved blockers or open questions
   - Relevant repo/build commands needed to continue

2. **Notify the user** — end your turn with a clear handoff message:
   ```
   Context window is near capacity (>60%). I've saved progress to session memory.
   To continue, start a new conversation and say: "Resume from handoff."
   ```

> Handoff files are stored in `.agent/handoffs/` (workspace-local, not in session memory).

3. **Do not continue work** after issuing the handoff message.

### Resume Procedure (when user says "Resume from handoff")

1. Read `.agent/handoffs/handoff.md` immediately.
2. Reconstruct the todo list from saved state and mark completed items.
3. Briefly summarize what was done and what comes next.
4. Continue from the next pending task without asking for re-explanation.

### General Guidelines

- Monitor context pressure proactively. If approaching 60%, finish the current atomic step, then handoff — do not start a new major task.
- Keep `.agent/handoffs/handoff.md` updated after each significant step so an accidental interruption loses minimal work.
- After a successful resume and task completion, delete `.agent/handoffs/handoff.md` to keep the handoffs directory clean.
