import { describe, expect, it } from 'vitest'
import { cheapCeiling, tuesdayNightWines, type TuesdayNightWine } from './tuesdayNight.ts'

const NOW = 2026

// A plain red from 2020 has an estimated window of 2022–2028: in window in 2026.
const wine = (overrides: Partial<TuesdayNightWine> & { name?: string }): TuesdayNightWine => ({
  producer: '',
  name: '',
  vintage: 2020,
  type: 'red',
  varietals: [],
  region: '',
  rating: null,
  ratingsCount: null,
  purchasePrice: 20,
  purchaseDate: null,
  drinkFrom: null,
  drinkTo: null,
  quantity: 1,
  ...overrides,
})

const names = (wines: TuesdayNightWine[]) => tuesdayNightWines(wines, NOW).map((p) => p.wine.name)

// Priced cellar: $10, $15, $20, $60, $90, $150 → the cheap ceiling is $15 (bottom 40% of six).
const priced = (name: string, purchasePrice: number | null, overrides: Partial<TuesdayNightWine> = {}) =>
  wine({ name, purchasePrice, ...overrides })
// Unpriced but rated ordinary by plenty of people: picked without moving the price cutoff.
const everyday = (name: string, overrides: Partial<TuesdayNightWine> = {}) =>
  wine({ name, purchasePrice: null, rating: 3.5, ratingsCount: 300, ...overrides })
const cellar = () => [
  priced('ten', 10),
  priced('fifteen', 15),
  priced('twenty', 20),
  priced('sixty', 60),
  priced('ninety', 90),
  priced('onefifty', 150),
]

describe('tuesdayNightWines', () => {
  it('keeps the cheapest wines in the cellar and drops the rest', () => {
    expect(cheapCeiling(cellar())).toBe(15)
    expect(names(cellar()).sort()).toEqual(['fifteen', 'ten'])
  })

  it('leaves out wines that are not in their window yet or are past it', () => {
    const wines = [
      ...cellar(),
      everyday('young', { vintage: 2027 }),
      everyday('old', { vintage: 2005 }),
      everyday('manual-future', { drinkFrom: 2030, drinkTo: 2040 }),
      everyday('manual-past', { drinkFrom: 2010, drinkTo: 2020 }),
    ]
    expect(names(wines).sort()).toEqual(['fifteen', 'ten'])
  })

  it('includes a wine in its last year of drinking', () => {
    expect(names([...cellar(), everyday('last-call', { drinkFrom: 2020, drinkTo: 2026 })])).toContain('last-call')
  })

  it('leaves out finished wines, and does not let them set the price cutoff', () => {
    // Four $5 wines that are all finished would drag the ceiling down to $10 if counted.
    const finished = [1, 2, 3, 4].map((i) => priced(`gone${i}`, 5, { quantity: 0 }))
    const wines = [...cellar(), ...finished]
    expect(names(wines).sort()).toEqual(['fifteen', 'ten'])
    expect(cheapCeiling(wines)).toBe(15)
  })

  it('leaves out expensive wines even when they are in their window', () => {
    expect(names(cellar())).not.toContain('onefifty')
    expect(names(cellar())).not.toContain('sixty')
  })

  it('sets the cutoff from the whole cellar, including wines outside their window', () => {
    // All the in-window wines are dear, but the cellar's cheap end is $10, so none of them are cheap.
    const wines = [
      priced('a', 80), priced('b', 90), priced('c', 100),
      priced('cheap1', 10, { vintage: 2030 }), priced('cheap2', 10, { vintage: 2030 }), priced('cheap3', 10, { vintage: 2030 }),
    ]
    expect(cheapCeiling(wines)).toBe(10)
    expect(names(wines)).toEqual([])
  })

  it('never picks an exceptionally rated wine, however cheap', () => {
    const wines = [...cellar(), priced('gem', 10, { rating: 4.5, ratingsCount: 800 })]
    expect(names(wines)).not.toContain('gem')
  })

  it('ignores a high rating from too few raters', () => {
    const wines = [...cellar(), priced('unproven', 10, { rating: 4.8, ratingsCount: 3 })]
    expect(names(wines)).toContain('unproven')
  })

  it('orders drink-soon wines first, then by window end', () => {
    const wines = [
      ...cellar(),
      everyday('later', { drinkFrom: 2020, drinkTo: 2035 }),
      everyday('soon', { drinkFrom: 2020, drinkTo: 2027 }),
      everyday('soonest', { drinkFrom: 2020, drinkTo: 2026 }),
    ]
    expect(names(wines).filter((n) => ['soonest', 'soon', 'later'].includes(n))).toEqual(['soonest', 'soon', 'later'])
  })

  describe('missing price', () => {
    it('does not treat an unpriced wine as free, or let it lower the cutoff', () => {
      const wines = [...cellar(), priced('blank', null), priced('zero', 0)]
      expect(cheapCeiling(wines)).toBe(15)
      expect(names(wines)).not.toContain('blank')
      expect(names(wines)).not.toContain('zero')
    })

    it('picks an unpriced wine that enough people rate as ordinary', () => {
      const wines = [...cellar(), priced('plonk', null, { rating: 3.6, ratingsCount: 400 })]
      expect(names(wines)).toContain('plonk')
    })

    it('leaves out an unpriced wine with a good rating or too few ratings', () => {
      const wines = [
        ...cellar(),
        priced('good', null, { rating: 4.1, ratingsCount: 400 }),
        priced('thin', null, { rating: 3.5, ratingsCount: 4 }),
      ]
      expect(names(wines)).not.toContain('good')
      expect(names(wines)).not.toContain('thin')
    })
  })

  describe('small cellar', () => {
    const small = () => [priced('table', 18), priced('nice', 45), priced('fancy', 120), priced('unknown', null)]

    it('falls back to a fixed ceiling instead of a meaningless percentile', () => {
      expect(cheapCeiling(small())).toBe(50)
      expect(names(small()).sort()).toEqual(['nice', 'table'])
    })

    it('uses the percentile once there are enough priced wines', () => {
      const five = [10, 20, 30, 40, 50].map((p) => priced(`p${p}`, p))
      expect(cheapCeiling(five)).toBe(20)
      expect(names(five).sort()).toEqual(['p10', 'p20'])
    })

    it('returns nothing for an empty cellar', () => {
      expect(names([])).toEqual([])
    })
  })
})
