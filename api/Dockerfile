# syntax=docker/dockerfile:1

# Self-contained API build: install + build with Bun, run with Node.
# Build context is the api/ directory.

FROM oven/bun:1.3.3 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run build

# Inject debug IDs into the built JS + source maps and upload them to Sentry.
# SENTRY_AUTH_TOKEN is a build secret — mounted only for this RUN, never written
# to an image layer or the build cache. The upload no-ops when the secret is
# absent (e.g. local docker builds). org/project/release are non-sensitive.
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


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Baked in so the runtime SDK reports the same release the source maps were
# uploaded under. After the COPYs so node_modules stays cacheable across commits.
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=$SENTRY_RELEASE

EXPOSE 3000

CMD ["node", "dist/src/main"]
