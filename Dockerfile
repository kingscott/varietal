# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.22-alpine
# Matches the pnpm used for local development; the lockfile (v9) is shared.
ARG PNPM_VERSION=12.15.0

# ---- Base: Node plus pnpm, with the manifests every install stage needs ----
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ---- Production dependencies only ----
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

# ---- Build: install everything, typecheck, and build the client ----
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime: no pnpm, just Node, prod deps, and the built app ----
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/cellar.db
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared

# SQLite database lives here; mount a volume to persist it.
# Runs as the unprivileged `node` user (uid/gid 1000).
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data

USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz >/dev/null || exit 1
CMD ["node", "server/index.ts"]
