# syntax=docker/dockerfile:1

FROM node:lts-bookworm

ENV NODE_OPTIONS="--openssl-legacy-provider"

LABEL maintainer="Allen Lee <allen.lee@asu.edu>"

EXPOSE 3000

WORKDIR /code

COPY package.json package-lock.json /code/
RUN set -ex; \
    if [ "$NODE_ENV" = "production" ]; then \
        npm ci --omit=dev; \
    elif [ "$NODE_ENV" = "test" ]; then \
        npm ci; \
    else \
        npm install; \
    fi; \
    npm cache clean --force;

COPY . /code

CMD ["npm", "run", "dev"]
