import { describe, expect, it } from 'vitest'
import { normalizeWine, parseDate, parseFinished, parseWindow } from './normalize.ts'

describe('parseWindow', () => {
  it.each([
    ['2025-2035', 2025, 2035],
    ['2025 – 2035', 2025, 2035],
    ['2025-30', 2025, 2030],
    ['2028 to 32', 2028, 2032],
    ['by 2030', null, 2030],
    ['2028+', 2028, null],
    ['2027', 2027, 2027],
    ['now', null, null],
  ])('%s', (input, from, to) => {
    expect(parseWindow(input)).toEqual({ from, to })
  })
})

describe('parseDate', () => {
  it.each([
    ['2023-03-15', '2023-03-15'],
    ['3/5/2023', '2023-03-05'],
    ['3/5/23', '2023-03-05'],
    ['2021', '2021-01-01'],
    ['', null],
  ])('%s', (input, expected) => {
    expect(parseDate(input)).toBe(expected)
  })
})

describe('parseFinished', () => {
  it.each([
    ['yes', true],
    ['Y', true],
    ['TRUE', true],
    ['x', true],
    ['✓', true],
    ['1', true],
    ['2024-03-15', true],
    ['', false],
    ['  ', false],
    ['No', false],
    ['FALSE', false],
    ['0', false],
    ['-', false],
    ['n/a', false],
    [undefined, false],
  ])('%s', (input, expected) => {
    expect(parseFinished(input)).toBe(expected)
  })
})

describe('normalizeWine', () => {
  it('sets finished wines to zero bottles, whatever the bottle count says', () => {
    expect(normalizeWine({ producer: 'Ridge', quantity: '3', finished: 'yes' }).quantity).toBe(0)
    expect(normalizeWine({ producer: 'Ridge', finished: '2024-03-15' }).quantity).toBe(0)
  })

  it('keeps the bottle count when a wine is not finished', () => {
    expect(normalizeWine({ producer: 'Ridge', quantity: '3', finished: 'no' }).quantity).toBe(3)
    expect(normalizeWine({ producer: 'Ridge', finished: '' }).quantity).toBe(1)
  })

  it('cleans up a typical spreadsheet row', () => {
    const wine = normalizeWine({
      producer: ' Ridge ',
      vintage: 'NV',
      style: 'Sparkling',
      varietals: 'Chardonnay / pinot noir & Pinot Meunier',
      purchasePrice: '$45.00',
      quantity: '',
    })
    expect(wine).toMatchObject({
      producer: 'Ridge',
      vintage: null,
      type: 'sparkling',
      style: 'Sparkling',
      varietals: ['Chardonnay', 'Pinot Noir', 'Pinot Meunier'],
      purchasePrice: 45,
      quantity: 1,
    })
  })

  it('infers type and style from the grape when the sheet has neither', () => {
    expect(normalizeWine({ varietals: 'Sauv Blanc' })).toMatchObject({
      type: 'white',
      style: 'Crisp white',
      varietals: ['Sauvignon Blanc'],
    })
  })
})
