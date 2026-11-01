# Varietal

A free and self-hostable way to track you cellar.

A personal wine cellar tracker. Look wines up on the web, keep track of bottles, and see what's in its drinking window.

- **Tonight**: the bottle to open next, what else is ready to drink (most urgent first), what's coming into its window, and stats by type, varietal, style, country, region and vintage.
- **Add wine**: search the web (Vivino's catalogue) to fill in producer, region, grapes, type, rating and label image.
- **Drinking windows**: every wine gets an estimated window from its appellation, grapes, type and quality (rating or price), with the reasoning shown. Enter your own window to override it.
- **Import**: bring in an existing spreadsheet as CSV. Columns are matched automatically, and windows like `2025-2035`, `2025-30`, `by 2030` or `2028+` are kept.

## Running it

Requires Node 24+ (uses the built-in `node:sqlite` and native TypeScript support) and pnpm.

```sh
pnpm install
pnpm dev                 # API on :3001, app on http://localhost:5173
```

For everyday use, build once and run a single server:

```sh
pnpm build
pnpm start               # http://localhost:3000
```

Your cellar is stored in `data/cellar.db` (SQLite). Set `DB_PATH` to keep it elsewhere and `PORT` to change the port.

## Running it with Docker

```sh
docker compose up -d --build       # or: docker build -t varietal . && docker run -p 127.0.0.1:3000:3000 -v varietal:/app/data varietal
```

The app is served on port 3000, bound to localhost only because the API has no authentication. To expose it on your network, change the port mapping in `docker-compose.yml` to `"3000:3000"` (and put auth or a reverse proxy in front). The SQLite database lives in the `varietal-data` volume mounted at `/app/data`, so your cellar survives container upgrades. The container runs as an unprivileged user (uid/gid 1000); if you bind-mount a host directory instead of a named volume, make sure it's writable by uid 1000 (e.g. `chown 1000:1000 /path/to/data`).

## Layout

- `server/`: Hono API, SQLite storage, and wine lookup
- `shared/`: drink window estimator, grape catalogue, and input normalization, shared by client and server
- `src/`: React app using TanStack Router (pages and URLs) and TanStack Query (data loading and saving)

`pnpm test` runs the estimator and import-parsing tests.
