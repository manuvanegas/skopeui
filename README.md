# Synthesizing Knowledge of Past Environments

[![DOI](https://zenodo.org/badge/159711888.svg)](https://zenodo.org/badge/latestdoi/159711888)
[![Build/Test Docker Image CI](https://github.com/openskope/skopeui/actions/workflows/docker-ci.yml/badge.svg)](https://github.com/openskope/skopeui/actions/workflows/docker-ci.yml)

This codebase provides a frontend only user interface for the [NSF supported](https://www.openskope.org/skope-nsf-proposal) [Synthesizing Knowledge of Past Environments](https://www.openskope.org/) project.

The current UI uses [Nuxt 2](https://nuxtjs.org/), [VueJS](https://vuejs.org/), [Leaflet](https://leafletjs.com/), and [Plotly JS](https://plotly.com/javascript/). 

The application has a basic [Makefile](https://www.gnu.org/software/make/) for configuration and deployment. A recent version of [Docker](https://docs.docker.com/get-docker/) and [docker compose](https://docs.docker.com/compose/install/) is recommended to set up a local development environment.

Running `make` for the first time will generate a default `config.mk` file that can be further customized:

- `DEPLOY_ENVIRONMENT` can be set to `dev`, `staging`, or `prod` (use `dev` for local development)
- `SKOPE_API_HOST_URL` should point at a SKOPE backend API to serve metadata and timeseries data (e.g., a deployed
  instance of https://github.com/openskope/skope-api/)

Run `make deploy` to redeploy the application with whatever settings are currently defined in `config.mk`

With `DEPLOY_ENVIRONMENT=dev` a hot-reloading development server should spin up at http://localhost:3000


## Contributors

- Allen Lee @alee
- Kyle Bocinsky @bocinsky
- Calvin Pritchard @cpritcha
- Christine Nguyễn @chrstngyn

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
