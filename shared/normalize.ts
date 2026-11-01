import { canonicalGrapeName, findGrape } from './grapes.ts'
import { WINE_TYPES, type WineInput, type WineType } from './types.ts'

/**
 * Coerce loosely-typed input (form data, API bodies, spreadsheet rows) into a
 * valid WineInput. Every write goes through here.
 */

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

function num(v: unknown): number | null {
  const s = str(v).replace(/[$€£,\s]/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function year(v: unknown): number | null {
  const match = str(v).match(/\b(1[89]\d{2}|2\d{3})\b/)
  return match ? Number(match[1]) : null
}

export function parseType(v: unknown): WineType | null {
  const s = str(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (WINE_TYPES.includes(s as WineType)) return s as WineType
  if (/ros[ae]|pink|blush/.test(s)) return 'rose'
  if (/sparkl|champagne|cava|cremant|prosecco|fizz|pet[- ]nat|bubbl/.test(s)) return 'sparkling'
  if (/port|sherry|madeira|fortif|marsala/.test(s)) return 'fortified'
  if (/dessert|sweet|sauternes|ice ?wine|late harvest/.test(s)) return 'dessert'
  if (/white|blanc|bianco|blanco/.test(s)) return 'white'
  if (/red|rouge|rosso|tinto/.test(s)) return 'red'
  return null
}

export function parseVarietals(v: unknown): string[] {
  const parts = Array.isArray(v) ? v.map(str) : str(v).split(/\s*(?:[,/;&+]|\band\b)\s*/i)
  return [...new Set(parts.filter(Boolean).map(canonicalGrapeName))]
}

/** Parse "2025-2035", "2025 – 2035", "2025+", "by 2030" or "2028" into years. */
export function parseWindow(v: unknown): { from: number | null; to: number | null } {
  // Expand shorthand like "2025-30" to "2025-2030".
  const s = str(v).replace(/\b((?:19|20)(\d{2}))\s*[-–—to]+\s*(\d{2})\b(?!\d)/, (_, full, _yy, end) => `${full}-${full.slice(0, 2)}${end}`)
  const years = [...s.matchAll(/\b(1[89]\d{2}|2\d{3})\b/g)].map((m) => Number(m[1]))
  if (years.length >= 2) return { from: Math.min(...years), to: Math.max(...years) }
  if (years.length === 1) {
    if (/^\s*(by|before|until|thru|through|<|-)/i.test(s)) return { from: null, to: years[0] }
    if (/\+\s*$|after|from|onwards?/i.test(s)) return { from: years[0], to: null }
    return { from: years[0], to: years[0] }
  }
  return { from: null, to: null }
}

/** Accept ISO dates, US-style M/D/YYYY, or a bare year/month; return YYYY-MM-DD or null. */
export function parseDate(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  const pad = (n: string | number) => String(n).padStart(2, '0')
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3] ?? 1)}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${pad(m[1])}-${pad(m[2])}`
  if (/^\d{4}$/.test(s)) return year(s) ? `${s}-01-01` : null
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
  }
  const y = year(s)
  return y ? `${y}-01-01` : null
}

const CASES = /(?:(\d+)\s*(?:x\s*)?)?(half[- ]?)?(?:(\d+)[- ]?(?:bottles?|pack)[- ])?(?:cases?|dozen)(?:\s+of\s+(\d+))?/gi

/** Parse bottle counts like "12", "12 bottles", "6-pack", "12 x 750ml", "1 case", "2 cases of 6" or "1 case + 3". */
export function parseQuantity(v: unknown): number | null {
  const n = num(v)
  if (n !== null) return n
  let total = 0
  const rest = str(v)
    .replace(/\d+(\.\d+)?\s*(ml|cl|l|lit(er|re)s?)\b/gi, ' ')
    .replace(CASES, (_, cases, half, size, sizeOf) => {
      total += Number(cases ?? 1) * Number(size ?? sizeOf ?? (half ? 6 : 12))
      return ' '
    })
  const loose = rest.match(/\d+/)
  return total > 0 || loose ? total + Number(loose?.[0] ?? 0) : null
}

/** A finished column may hold a checkmark, "yes" or the date it was finished; blank or a negative means no. */
export function parseFinished(v: unknown): boolean {
  return !/^(|no?\.?|nope|never|not\b.*|unfinished|f|false|0+(\.0+)?|-+|–|—|n[/.]?a\.?|none|[✗✘❌])$/i.test(str(v))
}

export function normalizeWine(raw: Record<string, unknown>): WineInput {
  const quantity = parseFinished(raw.finished) ? 0 : parseQuantity(raw.quantity)
  const varietals = parseVarietals(raw.varietals)
  // Spreadsheets often put "Red"/"Sparkling" in the style column instead of a type column.
  const grapeStyle = findGrape(varietals[0] ?? '')?.style
  const type =
    parseType(raw.type) ?? parseType(raw.style) ?? (grapeStyle?.endsWith('white') ? 'white' : 'red')
  return {
    producer: str(raw.producer),
    name: str(raw.name),
    vintage: year(raw.vintage),
    type,
    style: str(raw.style) || grapeStyle || '',
    varietals,
    region: str(raw.region),
    country: str(raw.country),
    quantity: quantity === null ? 1 : Math.max(0, Math.round(quantity)),
    purchaseDate: parseDate(raw.purchaseDate),
    purchasePrice: num(raw.purchasePrice),
    location: str(raw.location),
    notes: str(raw.notes),
    drinkFrom: year(raw.drinkFrom),
    drinkTo: year(raw.drinkTo),
    vivinoId: num(raw.vivinoId),
    rating: num(raw.rating),
    ratingsCount: num(raw.ratingsCount),
    imageUrl: str(raw.imageUrl) || null,
  }
}
