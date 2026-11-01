import { beforeAll, describe, expect, it } from 'vitest'
import { normalizeWine } from '../shared/normalize.ts'
import type { ExportedWine } from '../shared/cellarExport.ts'

// db.ts opens its database on import, so the path has to be set first.
process.env.DB_PATH = ':memory:'
let db: typeof import('./db.ts')

beforeAll(async () => {
  db = await import('./db.ts')
})

const exported = (producer: string, createdAt: string | null = null): ExportedWine => ({
  ...normalizeWine({ producer }),
  createdAt,
})

describe('replaceCellar', () => {
  it('replaces the old wines and keeps the dates from the file', () => {
    db.createWine(normalizeWine({ producer: 'Old' }))
    db.replaceCellar([exported('Ridge', '2020-01-02 03:04:05'), exported('Tablas')])
    const wines = db.listWines()
    expect(wines.map((w) => w.producer)).toEqual(['Ridge', 'Tablas'])
    expect(wines[0].createdAt).toBe('2020-01-02 03:04:05')
    expect(wines[1].createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('leaves the old cellar in place when an insert fails', () => {
    db.replaceCellar([exported('Keep')])
    const unstorable = { ...exported('Bad'), quantity: {} } as unknown as ExportedWine
    expect(() => db.replaceCellar([exported('New'), unstorable])).toThrow()
    expect(db.listWines().map((w) => w.producer)).toEqual(['Keep'])
  })
})
