import { describe, expect, it } from 'vitest'
import { drinkWindow, estimateWindow, windowStatus, type WindowInput } from './drinkWindow.ts'

const wine = (overrides: Partial<WindowInput>): WindowInput => ({
  producer: '',
  name: '',
  vintage: 2020,
  type: 'red',
  varietals: [],
  region: '',
  rating: null,
  ratingsCount: null,
  purchasePrice: null,
  purchaseDate: null,
  ...overrides,
})

const years = (w: { from: number; to: number }) => [w.from, w.to]

describe('estimateWindow', () => {
  it('uses appellation rules ahead of grape profiles', () => {
    expect(years(estimateWindow(wine({ vintage: 2016, varietals: ['Nebbiolo'], region: 'Barolo' })))).toEqual([2024, 2041])
    // "Crozes-Hermitage" contains "Hermitage" but ages far less.
    expect(years(estimateWindow(wine({ varietals: ['Syrah'], region: 'Crozes-Hermitage' })))).toEqual([2023, 2030])
    expect(years(estimateWindow(wine({ varietals: ['Syrah'], region: 'Hermitage' })))).toEqual([2027, 2040])
  })

  it('only applies grape-specific region rules to that grape', () => {
    expect(years(estimateWindow(wine({ varietals: ['Cabernet Sauvignon'], region: 'Napa Valley' })))).toEqual([2025, 2040])
    expect(years(estimateWindow(wine({ varietals: ['Zinfandel'], region: 'Napa Valley' })))).toEqual([2022, 2027])
  })

  it('weights the first grape of a blend double', () => {
    // Cabernet 4–15, Merlot 3–10 → (4+4+3)/3, (15+15+10)/3
    expect(years(estimateWindow(wine({ varietals: ['Cabernet Sauvignon', 'Merlot'] })))).toEqual([2024, 2033])
    expect(years(estimateWindow(wine({ varietals: ['Merlot', 'Cabernet Sauvignon'] })))).toEqual([2023, 2032])
  })

  it('ignores red-grape profiles for rosé and sparkling', () => {
    expect(years(estimateWindow(wine({ type: 'rose', varietals: ['Pinot Noir'] })))).toEqual([2020, 2022])
  })

  it('stretches the window for highly rated wines and trusts price only without enough ratings', () => {
    const cab = { vintage: 2018, varietals: ['Cabernet Sauvignon'] }
    expect(years(estimateWindow(wine({ ...cab, rating: 4.4, ratingsCount: 900 })))).toEqual([2022, 2039])
    // Five ratings are noise, so the cheap price decides instead.
    expect(years(estimateWindow(wine({ ...cab, rating: 4.4, ratingsCount: 5, purchasePrice: 12 })))).toEqual([2021, 2029])
  })

  it('caps how far quality can stretch an already long window', () => {
    const port = wine({ vintage: 2017, type: 'fortified', name: 'Vintage Port', purchasePrice: 110 })
    expect(years(estimateWindow(port))).toEqual([2032, 2072])
  })

  it('dates non-vintage wines from purchase', () => {
    const nv = estimateWindow(wine({ vintage: null, type: 'sparkling', region: 'Champagne', purchaseDate: '2024-05-01' }))
    expect(years(nv)).toEqual([2024, 2027])
  })
})

describe('drinkWindow', () => {
  it('fills a one-sided manual window without inverting it', () => {
    // Estimate is 2022–2027; a manual start after the estimate's end must not produce from > to.
    const w = drinkWindow({ ...wine({ varietals: ['Zinfandel'] }), drinkFrom: 2030, drinkTo: null })
    expect(years(w)).toEqual([2030, 2030])
    expect(w.source).toBe('manual')
  })
})

describe('windowStatus', () => {
  const status = (from: number, to: number) => windowStatus({ from, to, source: 'estimate', basis: [] }, 2026)
  it('classifies around the boundaries', () => {
    expect(status(2027, 2030)).toBe('not-ready')
    expect(status(2026, 2030)).toBe('ready')
    expect(status(2020, 2028)).toBe('ready')
    expect(status(2020, 2027)).toBe('last-call')
    expect(status(2020, 2026)).toBe('last-call')
    expect(status(2020, 2025)).toBe('past')
  })
})
