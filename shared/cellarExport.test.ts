import { describe, expect, it } from 'vitest'
import { createCellarExport, parseCellarExport } from './cellarExport.ts'
import { normalizeWine } from './normalize.ts'
import type { Wine } from './types.ts'

const wine = (overrides: Record<string, unknown> = {}, id = 1): Wine => ({
  ...normalizeWine({
    producer: 'Ridge',
    name: 'Monte Bello',
    vintage: 2016,
    type: 'red',
    style: 'Full-bodied',
    varietals: ['Cabernet Sauvignon', 'Merlot'],
    region: 'Santa Cruz Mountains',
    country: 'USA',
    quantity: 3,
    purchaseDate: '2021-03-04',
    purchasePrice: 195.5,
    location: 'A3',
    notes: 'Birthday bottle',
    drinkFrom: 2026,
    drinkTo: 2045,
    vivinoId: 1234,
    rating: 4.6,
    ratingsCount: 900,
    imageUrl: 'https://example.com/label.png',
    ...overrides,
  }),
  id,
  localImageUrl: null,
  createdAt: '2024-05-06 07:08:09',
})

const roundTrip = (wines: Wine[]) => parseCellarExport(JSON.stringify(createCellarExport(wines)))

describe('cellar export', () => {
  it('round-trips every field except the id and the stored image path', () => {
    const { id: _id, localImageUrl: _local, ...expected } = wine()
    const stored = { ...wine(), localImageUrl: '/api/images/abc' }
    expect(createCellarExport([stored]).wines[0]).not.toHaveProperty('localImageUrl')
    expect(roundTrip([stored])).toEqual([expected])
  })

  it('keeps finished wines, sparse wines and non-vintage wines as they are', () => {
    const sparse = wine({
      quantity: 0,
      vintage: null,
      style: '',
      varietals: [],
      purchaseDate: null,
      purchasePrice: null,
      drinkFrom: null,
      drinkTo: null,
      vivinoId: null,
      rating: null,
      ratingsCount: null,
      imageUrl: null,
    })
    const { id: _id, localImageUrl: _local, ...expected } = sparse
    expect(roundTrip([sparse])).toEqual([expected])
  })

  it('treats a missing or malformed date as added now', () => {
    const file = (createdAt: unknown) => JSON.stringify({ app: 'varietal', version: 1, wines: [{ producer: 'Ridge', createdAt }] })
    expect(parseCellarExport(file(undefined))[0].createdAt).toBeNull()
    expect(parseCellarExport(file('last week'))[0].createdAt).toBeNull()
  })

  it.each([
    ['invalid JSON', 'producer,name\nRidge,Monte Bello'],
    ['a different JSON file', '{"wines":[]}'],
    ['null', 'null'],
    ['missing wines', '{"app":"varietal","version":1}'],
    ['a missing version', '{"app":"varietal","wines":[]}'],
    ['an older version', '{"app":"varietal","version":0,"wines":[]}'],
    ['wines that aren’t objects', '{"app":"varietal","version":1,"wines":[null]}'],
  ])('rejects %s', (_, text) => {
    expect(() => parseCellarExport(text)).toThrow('isn’t a Varietal cellar export')
  })

  it('rejects an export from a newer version', () => {
    expect(() => parseCellarExport('{"app":"varietal","version":2,"wines":[]}')).toThrow('newer version')
  })
})
