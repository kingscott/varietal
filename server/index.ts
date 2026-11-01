import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { normalizeWine } from '../shared/normalize.ts'
import { closeDb, createWine, createWines, deleteWine, listWines, updateWine } from './db.ts'
import { searchWines } from './vivino.ts'

const app = new Hono()

app.get('/healthz', (c) => c.text('ok'))

app.get('/api/wines', (c) => c.json(listWines()))

app.post('/api/wines', async (c) => c.json(createWine(normalizeWine(await c.req.json())), 201))

app.post('/api/wines/import', async (c) => {
  const rows = (await c.req.json()) as Record<string, unknown>[]
  return c.json(createWines(rows.map(normalizeWine)), 201)
})

app.put('/api/wines/:id', async (c) => {
  const wine = updateWine(Number(c.req.param('id')), normalizeWine(await c.req.json()))
  return wine ? c.json(wine) : c.notFound()
})

app.delete('/api/wines/:id', (c) => (deleteWine(Number(c.req.param('id'))) ? c.body(null, 204) : c.notFound()))

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
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001))
const server = serve({ fetch: app.fetch, port }, () => console.log(`Varietal server on http://localhost:${port}`))

// Close cleanly on `docker stop` (SIGTERM) and Ctrl-C so in-flight requests finish and SQLite is closed.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close(() => {
      closeDb()
      process.exit(0)
    })
  })
}
