import { drinkWindow, windowStatus, type DrinkWindow, type WindowStatus } from './drinkWindow.ts'
import type { Wine } from './types.ts'

export type TuesdayNightWine = Pick<
  Wine,
  | 'producer'
  | 'name'
  | 'vintage'
  | 'type'
  | 'varietals'
  | 'region'
  | 'rating'
  | 'ratingsCount'
  | 'purchasePrice'
  | 'purchaseDate'
  | 'drinkFrom'
  | 'drinkTo'
  | 'quantity'
>

/** A wine counts as cheap when it costs no more than this share of the cellar's priced bottles. */
export const CHEAP_SHARE = 0.4

/** Fewer priced wines than this and a percentile says nothing, so a fixed ceiling is used instead. */
export const MIN_PRICED_WINES = 5

/** Price ceiling for small cellars: the point where drinkWindow starts reading a price as "extra ageing potential". */
export const SMALL_CELLAR_CEILING = 50

/** Ratings at or above this (from enough raters) mark a wine as important, as in drinkWindow's "exceptional". */
export const IMPORTANT_RATING = 4.3
/** Without a price, a wine must be rated below this (from enough raters) to be trusted as everyday. */
export const EVERYDAY_RATING = 4.0
export const MIN_RATINGS = 25

/** A price of zero is a gift or a blank, not a real cost. */
const hasPrice = (price: number | null): price is number => price !== null && Number.isFinite(price) && price > 0

function ratedAtLeast(wine: TuesdayNightWine, threshold: number) {
  return wine.rating !== null && (wine.ratingsCount ?? 0) >= MIN_RATINGS && wine.rating >= threshold
}

function ratedBelow(wine: TuesdayNightWine, threshold: number) {
  return wine.rating !== null && (wine.ratingsCount ?? 0) >= MIN_RATINGS && wine.rating < threshold
}

/**
 * The highest price that still counts as cheap for this cellar, taken from every
 * bottle still in stock (in window or not) so that the cutoff describes the
 * cellar rather than tonight's shelf.
 */
export function cheapCeiling(wines: TuesdayNightWine[]): number {
  const prices = wines
    .filter((w) => w.quantity > 0 && hasPrice(w.purchasePrice))
    .map((w) => w.purchasePrice!)
    .sort((a, b) => a - b)
  if (prices.length < MIN_PRICED_WINES) return SMALL_CELLAR_CEILING
  return prices[Math.max(1, Math.floor(prices.length * CHEAP_SHARE)) - 1]
}

export interface TuesdayNightPick<T> {
  wine: T
  window: DrinkWindow
  status: WindowStatus
}

const URGENCY: Partial<Record<WindowStatus, number>> = { 'last-call': 0, ready: 1 }

/**
 * Wines to open on an ordinary night: in stock, inside their drinking window,
 * and cheap or unimportant. Most urgent first.
 *
 * - Highly rated wines are never picked, whatever they cost.
 * - A priced wine is picked when it costs no more than the cellar's cheap ceiling.
 * - A wine with no usable price is only picked when enough raters score it below
 *   EVERYDAY_RATING; with nothing to go on it stays on the shelf for a better night.
 */
export function tuesdayNightWines<T extends TuesdayNightWine>(wines: T[], currentYear = new Date().getFullYear()): TuesdayNightPick<T>[] {
  const ceiling = cheapCeiling(wines)
  const picks: TuesdayNightPick<T>[] = []
  for (const wine of wines) {
    if (wine.quantity <= 0 || ratedAtLeast(wine, IMPORTANT_RATING)) continue
    const cheap = hasPrice(wine.purchasePrice) ? wine.purchasePrice <= ceiling : ratedBelow(wine, EVERYDAY_RATING)
    if (!cheap) continue
    const window = drinkWindow(wine)
    const status = windowStatus(window, currentYear)
    if (status === 'ready' || status === 'last-call') picks.push({ wine, window, status })
  }
  return picks.sort((a, b) => URGENCY[a.status]! - URGENCY[b.status]! || a.window.to - b.window.to)
}
