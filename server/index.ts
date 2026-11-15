import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { createCellarExport, parseCellarExport } from '../shared/cellarExport.ts'
import { normalizeWine } from '../shared/normalize.ts'
import { closeDb, createWine, createWines, deleteWine, listWines, replaceCellar, updateWine } from './db.ts'
import { readImage, saveImages } from './images.ts'
import { searchWines } from './vivino.ts'

const app = new Hono()
const desktop = Boolean(process.env.VARIETAL_DESKTOP)

// Any website can send requests to a local server, so the desktop app only accepts its own window's.
if (desktop) {
  app.use('*', async (c, next) => {
    const host = c.req.header('host') ?? ''
    const origin = c.req.header('origin')
    const allowed = /^127\.0\.0\.1:\d+$/.test(host) && (origin === undefined || origin === `http://${host}`)
    return allowed ? next() : c.text('Forbidden', 403)
  })
}

app.get('/healthz', (c) => c.text('ok'))

app.get('/api/wines', (c) => c.json(listWines()))

app.post('/api/wines', async (c) => {
  const wine = createWine(normalizeWine(await c.req.json()))
  void saveImages([wine.imageUrl])
  return c.json(wine, 201)
})

app.post('/api/wines/import', async (c) => {
  const rows = (await c.req.json()) as Record<string, unknown>[]
  const wines = createWines(rows.map(normalizeWine))
  void saveImages(wines.map((w) => w.imageUrl))
  return c.json(wines, 201)
})

app.put('/api/wines/:id', async (c) => {
  const wine = updateWine(Number(c.req.param('id')), normalizeWine(await c.req.json()))
  if (wine) void saveImages([wine.imageUrl])
  return wine ? c.json(wine) : c.notFound()
})

app.delete('/api/wines/:id', (c) => (deleteWine(Number(c.req.param('id'))) ? c.body(null, 204) : c.notFound()))

app.get('/api/cellar/export', (c) => {
  const file = createCellarExport(listWines())
  c.header('Content-Disposition', `attachment; filename="varietal-cellar-${file.exportedAt.slice(0, 10)}.json"`)
  return c.json(file)
})

app.post('/api/cellar/import', async (c) => {
  let wines
  try {
    wines = parseCellarExport(await c.req.text())
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }
  replaceCellar(wines)
  void saveImages(wines.map((w) => w.imageUrl))
  return c.json({ imported: wines.length }, 201)
})

app.get('/api/images/:id', (c) => {
  const image = readImage(c.req.param('id'))
  if (!image) return c.notFound()
  // The file for a URL never changes, so the browser can keep it.
  c.header('Cache-Control', 'public, max-age=31536000, immutable')
  c.header('Content-Type', image.type)
  return c.body(image.bytes)
})

app.get('/api/lookup', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json([])
  try {
    return c.json(await searchWines(q))
  } catch (error) {
    return c.json({ error: (error as Error).message }, 502)
  }
})

if (process.env.NODE_ENV === 'production') {
  const root = process.env.STATIC_ROOT ?? './dist'
  app.use('/*', serveStatic({ root }))
  app.get('*', serveStatic({ path: join(root, 'index.html') }))
}

const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001))
let resolveListening: (port: number) => void
export const listening = new Promise<number>((resolve) => {
  resolveListening = resolve
})
const server = serve({ fetch: app.fetch, port, hostname: desktop ? '127.0.0.1' : undefined }, (info) => {
  console.log(`Varietal server on http://localhost:${info.port}`)
  resolveListening(info.port)
})

// Store labels for wines saved before this version, or whose download failed earlier.
void saveImages(listWines().map((w) => w.imageUrl))

// Close cleanly on `docker stop` (SIGTERM) and Ctrl-C so in-flight requests finish and SQLite is closed.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => {
      closeDb()
      process.exit(0)
    })
  })
}
