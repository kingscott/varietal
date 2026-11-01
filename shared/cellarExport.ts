import { normalizeWine } from './normalize.ts'
import type { Wine, WineInput } from './types.ts'

/**
 * The file that moves a cellar between Varietal instances. Ids aren't included
 * because the receiving instance assigns its own.
 */

const VERSION = 1
const NOT_AN_EXPORT = 'That file isn’t a Varietal cellar export.'

export interface ExportedWine extends WineInput {
  /** null when the file has no usable date, so the wine counts as added now */
  createdAt: string | null
}

export interface CellarExport {
  app: 'varietal'
  version: typeof VERSION
  exportedAt: string
  wines: ExportedWine[]
}

export function createCellarExport(wines: Wine[]): CellarExport {
  return {
    app: 'varietal',
    version: VERSION,
    exportedAt: new Date().toISOString(),
    wines: wines.map(({ id: _id, ...wine }) => wine),
  }
}

/** Read an export file's text into wines ready to store; throws a user-facing message if it can't. */
export function parseCellarExport(text: string): ExportedWine[] {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(NOT_AN_EXPORT)
  }
  if (data?.app !== 'varietal') throw new Error(NOT_AN_EXPORT)
  if (data.version > VERSION) throw new Error('That export is from a newer version of Varietal. Update this one first.')
  const isRecord = (w: unknown) => typeof w === 'object' && w !== null && !Array.isArray(w)
  if (data.version !== VERSION || !Array.isArray(data.wines) || !data.wines.every(isRecord)) throw new Error(NOT_AN_EXPORT)
  return (data.wines as Record<string, unknown>[]).map((raw) => ({
    ...normalizeWine(raw),
    // Same shape as SQLite's datetime('now'), which the cellar's sort by date relies on.
    createdAt: typeof raw.createdAt === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw.createdAt) ? raw.createdAt : null,
  }))
}
