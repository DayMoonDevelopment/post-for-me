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


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/src/main"]
