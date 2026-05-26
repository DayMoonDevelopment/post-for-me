# syntax=docker/dockerfile:1
#
# Multi-stage build for the PostForMe API.
#
# NOTE: ./Dockerfile.railway is a near-copy of this file for Railway's Metal
# builder, which cannot use the --mount=type=secret below. Keep them in sync.
#
# Stages:
#   deps    — install dependencies with Bun (cached layer, reused by build)
#   build   — compile TypeScript, upload Sentry source maps
#   runtime — minimal Node.js image that actually runs in production
#
# Build context is the api/ directory.
#
# Required build args (all non-sensitive, safe to pass via --build-arg):
#   SENTRY_ORG      — Sentry organisation slug
#   SENTRY_PROJECT  — Sentry project slug
#   SENTRY_RELEASE  — release identifier (typically the git SHA)
#
# Required build secret (never written to an image layer):
#   sentry_auth_token — Sentry auth token for source map upload
#                       Pass via: --secret id=sentry_auth_token,src=<file>
#                       Omitting or providing an empty file skips the upload
#                       gracefully (safe for local builds).

# -----------------------------------------------------------------------------
# Stage 1 — deps
# Install all dependencies. Kept as its own stage so the node_modules layer is
# shared with `build` without re-running install when source files change.
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2 — build
# Compile TypeScript and upload Sentry source maps.
#
# ca-certificates is installed here because the base image (debian:bookworm-slim)
# strips the system CA bundle. Without it, sentry-cli's HTTPS upload fails with
# "unable to get local issuer certificate". It's installed before COPY . . so
# it gets its own cached layer and doesn't re-run on every code change.
# -----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY . .
RUN bun run build

ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
RUN --mount=type=secret,id=sentry_auth_token \
    if [ -s /run/secrets/sentry_auth_token ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" && \
      bunx sentry-cli sourcemaps inject ./dist && \
      bunx sentry-cli sourcemaps upload \
        --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" \
        ${SENTRY_RELEASE:+--release "$SENTRY_RELEASE"} ./dist; \
    else \
      echo "sentry_auth_token secret not set — skipping Sentry source map upload"; \
    fi

# -----------------------------------------------------------------------------
# Stage 3 — runtime
# Minimal Node.js image. Bun is not present here — only the compiled output
# from the build stage and its node_modules are copied across.
#
# node_modules is copied from the build stage rather than re-installed so that
# the runtime image uses exactly the same dependency tree that was compiled
# against.
# -----------------------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Baked in so the Sentry runtime SDK reports the same release that source maps
# were uploaded under. Declared after the COPYs so node_modules remains
# cacheable across commits (ARG changes invalidate all subsequent layers).
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE

EXPOSE 3000
CMD ["node", "dist/src/main"]
