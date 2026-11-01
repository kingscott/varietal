# Varietal

A free and self-hostable way to track you cellar.

A personal wine cellar tracker. Look wines up on the web, keep track of bottles, and see what's in its drinking window.

- **Tonight**: the bottle to open next, what else is ready to drink (most urgent first), what's coming into its window, and stats by type, varietal, style, country, region and vintage.
- **Add wine**: search the web (Vivino's catalogue) to fill in producer, region, grapes, type, rating and label image.
- **Drinking windows**: every wine gets an estimated window from its appellation, grapes, type and quality (rating or price), with the reasoning shown. Enter your own window to override it.
- **Import**: bring in an existing spreadsheet as CSV. Columns are matched automatically, and windows like `2025-2035`, `2025-30`, `by 2030` or `2028+` are kept. Map a finished column to import wines you've already finished.
- **Export**: download your whole cellar as a JSON file from the Cellar page, and bring it into another Varietal instance from the Import page. Importing replaces everything in the receiving cellar. Label images stay as links rather than being copied into the file.

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

The app is served on `http://127.0.0.1:3000` by default. The API has no authentication, so it's bound to localhost only. Change the host port and interface with `VARIETAL_PORT` and `VARIETAL_BIND`, either inline or in a `.env` file next to `docker-compose.yml`:

```sh
VARIETAL_PORT=8080 VARIETAL_BIND=0.0.0.0 docker compose up -d   # reachable on your LAN at :8080
```

Only bind to `0.0.0.0` on a trusted network, or put a reverse proxy with auth in front. Inside the container the app always listens on 3000.

The SQLite database lives in the `varietal-data` volume mounted at `/app/data`, so your cellar survives container upgrades. The container runs as an unprivileged user (uid/gid 1000); if you bind-mount a host directory instead of a named volume, make sure it's writable by uid 1000 (e.g. `chown 1000:1000 /path/to/data`).

## Desktop app

```sh
pnpm electron            # run the desktop app locally
pnpm run package         # build an installer for this OS into release/
```

The desktop app keeps its cellar in the OS app data folder rather than `data/cellar.db`.

`pnpm electron` doesn't touch an installed app's cellar. It runs from its own `Varietal Demo` app data folder, with a cellar filled from `electron/demo-wines.json` on first launch, and can run alongside the installed app. Delete that folder to start over, and run `node electron/fetch-demo-wines.ts` to refresh the wines from Vivino. Packaged builds, including releases, start with an empty cellar as usual.

Publishing a GitHub release builds the Linux, macOS and Windows apps and attaches them to the release. The app version comes from the release tag, so tag releases like `v1.2.3`. Merges to `main` don't trigger a build. The builds aren't signed with a developer certificate, so macOS and Windows warn on first launch.

The app icon in `build/icon.png` is the wine glass from [Noto Emoji](https://github.com/googlefonts/noto-emoji), used under the Apache License 2.0. electron-builder generates each platform's icon format from it.

## Layout

- `server/`: Hono API, SQLite storage, and wine lookup
- `shared/`: drink window estimator, grape catalogue, input normalization, and the cellar export format, shared by client and server
- `src/`: React app using TanStack Router (pages and URLs) and TanStack Query (data loading and saving)
- `electron/`: desktop shell that runs the server and opens it in a window

`pnpm test` runs the estimator, import-parsing and cellar export tests.
