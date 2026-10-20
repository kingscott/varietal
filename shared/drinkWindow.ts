import { findGrape } from './grapes.ts'
import type { Wine, WineType } from './types.ts'

export type WindowInput = Pick<
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
>

export interface DrinkWindow {
  from: number
  to: number
  source: 'manual' | 'estimate'
  /** Human-readable reasons behind the estimate */
  basis: string[]
}

interface RegionRule {
  pattern: RegExp
  types?: WineType[]
  grape?: string
  /** Only applies when the wine has (true) or lacks (false) a vintage */
  vintage?: boolean
  window: [number, number]
  label: string
}

// Ordered most specific first; the first matching rule wins. Matched against
// region + wine name, so "Barolo" in either place counts.
const REGION_RULES: RegionRule[] = [
  { pattern: /tawny|colheita|\bruby\b|\blbv\b|late bottled/i, types: ['fortified'], window: [0, 10], label: 'Tawny/LBV/ruby port is ready on release' },
  { pattern: /port|porto|douro/i, types: ['fortified'], vintage: true, window: [15, 40], label: 'Vintage Port' },
  { pattern: /sauternes|barsac|tokaj|asz[uú]|beerenauslese|trockenbeeren|eiswein|ice ?wine/i, types: ['dessert', 'white'], window: [5, 30], label: 'Botrytis/ice wine' },
  { pattern: /barolo/i, window: [8, 25], label: 'Barolo' },
  { pattern: /barbaresco/i, window: [6, 20], label: 'Barbaresco' },
  { pattern: /brunello/i, window: [7, 22], label: 'Brunello di Montalcino' },
  { pattern: /amarone/i, window: [5, 20], label: 'Amarone' },
  { pattern: /taurasi/i, window: [7, 20], label: 'Taurasi' },
  { pattern: /vino nobile/i, window: [4, 14], label: 'Vino Nobile di Montepulciano' },
  { pattern: /chianti classico/i, types: ['red'], window: [3, 12], label: 'Chianti Classico' },
  { pattern: /gran reserva/i, types: ['red'], window: [6, 20], label: 'Gran Reserva' },
  { pattern: /ribera del duero|\btoro\b/i, types: ['red'], window: [4, 15], label: 'Ribera del Duero/Toro' },
  { pattern: /pauillac|margaux|saint-julien|st\.?-julien|saint-est[eè]phe|st\.?-est[eè]phe|pessac|graves|m[eé]doc/i, types: ['red'], window: [8, 25], label: 'Left Bank Bordeaux' },
  { pattern: /pomerol|saint-[eé]milion|st\.?-[eé]milion/i, types: ['red'], window: [6, 20], label: 'Right Bank Bordeaux' },
  { pattern: /bordeaux/i, types: ['red'], window: [3, 10], label: 'Bordeaux' },
  { pattern: /crozes|saint-joseph|st\.?-joseph/i, types: ['red'], window: [3, 10], label: 'Crozes-Hermitage/Saint-Joseph' },
  { pattern: /hermitage|c[oô]te[- ]r[oô]tie|cornas/i, types: ['red'], window: [7, 20], label: 'Northern Rhône' },
  { pattern: /ch[aâ]teauneuf/i, types: ['red'], window: [5, 18], label: 'Châteauneuf-du-Pape' },
  { pattern: /ch[aâ]teauneuf/i, types: ['white'], window: [2, 8], label: 'Châteauneuf-du-Pape blanc' },
  { pattern: /gevrey|chambolle|vosne|vougeot|nuits|morey|pommard|volnay|corton|c[oô]te de nuits|c[oô]te de beaune|beaune|chambertin|musigny|richebourg|roman[eé]e|grands? cru/i, types: ['red'], window: [5, 15], label: 'Côte d’Or red Burgundy' },
  { pattern: /meursault|puligny|chassagne|corton|montrachet/i, types: ['white'], window: [3, 12], label: 'Côte d’Or white Burgundy' },
  { pattern: /chablis/i, types: ['white'], window: [2, 10], label: 'Chablis' },
  { pattern: /bourgogne|burgundy/i, types: ['red'], window: [2, 7], label: 'Bourgogne' },
  { pattern: /bourgogne|burgundy|m[aâ]connais|m[aâ]con/i, types: ['white'], window: [1, 5], label: 'Bourgogne/Mâconnais' },
  { pattern: /morgon|moulin[- ][aà][- ]vent|fleurie|juli[eé]nas|brouilly|chiroubles|ch[eé]nas|r[eé]gni[eé]|saint-amour/i, types: ['red'], window: [2, 8], label: 'Cru Beaujolais' },
  { pattern: /napa/i, types: ['red'], grape: 'Cabernet Sauvignon', window: [5, 20], label: 'Napa Cabernet' },
  { pattern: /vouvray|savenni[eè]res|montlouis/i, types: ['white'], window: [3, 20], label: 'Loire Chenin Blanc' },
  { pattern: /mosel|rheingau|nahe|pfalz|rheinhessen|wachau|alsace|clare|eden valley/i, types: ['white'], grape: 'Riesling', window: [3, 20], label: 'Classic Riesling region' },
  { pattern: /hunter valley/i, types: ['white'], grape: 'Sémillon', window: [5, 20], label: 'Hunter Valley Sémillon' },
  { pattern: /champagne/i, types: ['sparkling'], vintage: true, window: [5, 20], label: 'Vintage Champagne' },
  { pattern: /sancerre|pouilly-fum/i, types: ['white'], window: [1, 5], label: 'Sancerre/Pouilly-Fumé' },
]

const TYPE_DEFAULTS: Record<WineType, [number, number]> = {
  red: [2, 8],
  white: [1, 4],
  rose: [0, 2],
  sparkling: [3, 12],
  dessert: [3, 20],
  fortified: [3, 30],
}

/** Years to drink a non-vintage wine within, counted from purchase */
const NV_YEARS: Record<WineType, number> = {
  red: 3,
  white: 2,
  rose: 1,
  sparkling: 3,
  dessert: 5,
  fortified: 10,
}

function baseWindow(wine: WindowInput): { window: [number, number]; basis: string } {
  const haystack = `${wine.region} ${wine.name}`
  const grapes = wine.varietals.map((v) => findGrape(v)).filter((g) => g !== undefined)

  const rule = REGION_RULES.find(
    (r) =>
      r.pattern.test(haystack) &&
      (!r.types || r.types.includes(wine.type)) &&
      (!r.grape || grapes[0]?.name === r.grape) &&
      (r.vintage === undefined || r.vintage === (wine.vintage !== null)),
  )
  if (rule) {
    return { window: rule.window, basis: `${rule.label}: typically ${rule.window[0]}–${rule.window[1]} years after vintage` }
  }

  // Grape profiles only describe still red and white wines; a rosé or sparkling
  // Pinot Noir does not age like a red Burgundy.
  if (grapes.length > 0 && (wine.type === 'red' || wine.type === 'white')) {
    // The first listed grape dominates the blend, so it counts twice.
    const weighted = [grapes[0], ...grapes]
    const avg = (i: 0 | 1) => weighted.reduce((sum, g) => sum + g.window[i], 0) / weighted.length
    const window: [number, number] = [Math.round(avg(0)), Math.round(avg(1))]
    const label = grapes.length === 1 ? grapes[0].name : `${grapes.map((g) => g.name).join('/')} blend`
    return { window, basis: `${label}: typically ${window[0]}–${window[1]} years after vintage` }
  }

  const window = TYPE_DEFAULTS[wine.type]
  return { window, basis: `Typical ${wine.type} wine: ${window[0]}–${window[1]} years after vintage` }
}

function qualityFactor(wine: WindowInput): { factor: number; basis?: string } {
  if (wine.rating !== null && (wine.ratingsCount ?? 0) >= 25) {
    const r = wine.rating.toFixed(1)
    if (wine.rating >= 4.3) return { factor: 1.4, basis: `Exceptional rating (${r}★) extends the window` }
    if (wine.rating >= 4.0) return { factor: 1.2, basis: `High rating (${r}★) extends the window` }
    if (wine.rating < 3.7) return { factor: 0.75, basis: `Modest rating (${r}★) shortens the window` }
    return { factor: 1 }
  }
  if (wine.purchasePrice !== null) {
    if (wine.purchasePrice >= 100) return { factor: 1.4, basis: `Price ($${wine.purchasePrice}) suggests a long-lived wine` }
    if (wine.purchasePrice >= 50) return { factor: 1.2, basis: `Price ($${wine.purchasePrice}) suggests extra ageing potential` }
    if (wine.purchasePrice < 15) return { factor: 0.7, basis: `Price ($${wine.purchasePrice}) suggests drinking young` }
  }
  return { factor: 1 }
}

export function estimateWindow(wine: WindowInput, currentYear = new Date().getFullYear()): DrinkWindow {
  if (wine.vintage === null) {
    const purchased = wine.purchaseDate ? Number(wine.purchaseDate.slice(0, 4)) : currentYear
    const years = NV_YEARS[wine.type]
    return {
      from: purchased,
      to: purchased + years,
      source: 'estimate',
      basis: [`Non-vintage ${wine.type}: drink within ${years} years of purchase`],
    }
  }

  const base = baseWindow(wine)
  const quality = qualityFactor(wine)
  const [start, end] = base.window
  // Better wines last longer (by at most 15 years); lesser wines are ready
  // sooner and fade sooner.
  const startYears = Math.round(quality.factor < 1 ? start * quality.factor : start)
  const endYears = Math.max(startYears + 1, Math.round(Math.min(end * quality.factor, end + 15)))
  return {
    from: wine.vintage + startYears,
    to: wine.vintage + endYears,
    source: 'estimate',
    basis: quality.basis ? [base.basis, quality.basis] : [base.basis],
  }
}

/** The window to use for a wine: manual values win, gaps are filled by the estimate. */
export function drinkWindow(wine: WindowInput & Pick<Wine, 'drinkFrom' | 'drinkTo'>): DrinkWindow {
  if (wine.drinkFrom === null && wine.drinkTo === null) return estimateWindow(wine)
  const estimate = estimateWindow(wine)
  return {
    from: wine.drinkFrom ?? Math.min(estimate.from, wine.drinkTo!),
    to: wine.drinkTo ?? Math.max(estimate.to, wine.drinkFrom!),
    source: 'manual',
    basis: ['Set manually'],
  }
}

export type WindowStatus = 'not-ready' | 'ready' | 'last-call' | 'past'

export const STATUS_LABELS: Record<WindowStatus, string> = {
  'not-ready': 'Not ready',
  ready: 'In window',
  'last-call': 'Drink soon',
  past: 'Past window',
}

export function windowStatus(window: DrinkWindow, currentYear = new Date().getFullYear()): WindowStatus {
  if (currentYear < window.from) return 'not-ready'
  if (currentYear > window.to) return 'past'
  if (window.to - currentYear <= 1) return 'last-call'
  return 'ready'
}
