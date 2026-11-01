import { describe, expect, it } from 'vitest'
import { normalizeWine, parseDate, parseFinished, parseQuantity, parseWindow } from './normalize.ts'

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

describe('parseQuantity', () => {
  it.each([
    ['12', 12],
    [12, 12],
    ['0', 0],
    ['12 bottles', 12],
    ['6-pack', 6],
    ['x12', 12],
    ['12 x 750ml', 12],
    ['6 x 1.5L', 6],
    ['Case', 12],
    ['1 case', 12],
    ['2 cases', 24],
    ['2 x case', 24],
    ['case of 6', 6],
    ['2 cases of 6', 12],
    ['6 bottle case', 6],
    ['6-pack case', 6],
    ['half case', 6],
    ['half-case', 6],
    ['dozen', 12],
    ['half dozen', 6],
    ['1 case + 3', 15],
    ['1 case + 3 bottles', 15],
    ['', null],
    ['-', null],
    ['750ml', null],
    ['some', null],
  ])('%s', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected)
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
    ['n.a.', false],
    ['no.', false],
    ['nope', false],
    ['never', false],
    ['Not yet', false],
    ['not finished', false],
    ['unfinished', false],
    ['✗', false],
    ['❌', false],
    ['0.0', false],
    ['finished', true],
    ['Nov 2024', true],
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

  it('counts a case of wine as its bottles, unless it is finished', () => {
    expect(normalizeWine({ producer: 'Ridge', quantity: '1 case' }).quantity).toBe(12)
    expect(normalizeWine({ producer: 'Ridge', quantity: '1 case', finished: 'yes' }).quantity).toBe(0)
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
