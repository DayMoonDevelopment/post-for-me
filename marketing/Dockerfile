FROM oven/bun:1.3.3 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
COPY scripts ./scripts
RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "./node_modules/.bin/react-router-serve", "./build/server/index.js"]
