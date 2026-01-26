# syntax=docker/dockerfile:1

# Monorepo build: install + build with Bun, run with Node.

FROM oven/bun:1.3.3 AS deps
WORKDIR /app

# Copy only manifests first for better layer caching.
COPY package.json bun.lock ./
COPY api/package.json api/package.json
COPY dashboard/package.json dashboard/package.json
COPY icons/package.json icons/package.json
COPY supabase/package.json supabase/package.json

RUN bun install --frozen-lockfile


FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run --filter=@post-for-me/api build


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules

# Keep workspace dirs that node_modules symlinks may point at.
COPY --from=build /app/supabase ./supabase

COPY --from=build /app/api ./api

EXPOSE 3000

CMD ["node", "api/dist/main"]
