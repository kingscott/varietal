import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { normalizeWine } from '../shared/normalize.ts'
import { createWine, createWines, deleteWine, listWines, updateWine } from './db.ts'
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
  const root = process.env.STATIC_ROOT ?? './dist'
  app.use('/*', serveStatic({ root }))
  app.get('*', serveStatic({ path: join(root, 'index.html') }))
}

const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001))
export const listening = new Promise<number>((resolve) => {
  serve({ fetch: app.fetch, port, hostname: desktop ? '127.0.0.1' : undefined }, (info) => {
    console.log(`Varietal server on http://localhost:${info.port}`)
    resolve(info.port)
  })
})
