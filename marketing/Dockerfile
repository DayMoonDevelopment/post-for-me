FROM oven/bun:1.3.3 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
COPY scripts ./scripts
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.3 AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build

FROM oven/bun:1.3.3 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lockb ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["bun", "run", "start"]
