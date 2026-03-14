# Project Overview

## Purpose
SkopeUI is a Nuxt/Vue frontend for dataset discovery, metadata exploration, analysis, and visualization.

## Tech Stack
- Nuxt.js (Vue 2)
- Vuex store modules
- Vuetify + SCSS theme variables
- Axios plugins and server middleware

## High-Level Architecture
- `app/pages/`: route-level views and dataset flows
- `app/components/`: reusable UI components (global + dataset-specific)
- `app/store/modules/`: domain-oriented Vuex modules (`dataset`, `analysis`, `metadata`, etc.)
- `app/plugins/`: app bootstrap and framework integrations
- `app/server/`: local backend/SSR runtime hooks
- Root `*.yml`: environment deployment configs (dev/staging/prod)

## Runtime Data Flow
1. Route in `pages/` loads context (dataset, variable, etc.)
2. Vuex actions fetch and normalize API responses
3. Store modules expose derived state to components
4. Components render views, controls, and messages

## Key Constraints
- Preserve existing route contracts under `app/pages/dataset/_id/*`
- Keep Vuex module boundaries clear (avoid cross-module side effects)
- Prefer plugin/store integrations over ad hoc global state

## Agent Working Notes
- Start with smallest safe change in existing patterns
- Update adjacent docs/state files in `.agent/` for non-trivial changes
- Record meaningful milestones in `.agent/checkpoints/`
