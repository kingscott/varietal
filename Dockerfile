# syntax=docker/dockerfile:1

# ---- Build stage: install everything, typecheck, and build the client ----
FROM node:24-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime stage: production deps + built client, run the single server ----
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/cellar.db
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
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
  CMD wget -qO- http://127.0.0.1:${PORT}/api/wines >/dev/null || exit 1
CMD ["node", "server/index.ts"]
