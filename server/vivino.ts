import { grapeByVivinoId } from '../shared/grapes.ts'
import type { LookupResult, WineType } from '../shared/types.ts'

// Vivino's website searches wines through Algolia with this public, search-only key.
const SEARCH_URL =
  'https://9takgwjuxl-dsn.algolia.net/1/indexes/WINES_prod/query' +
  '?x-algolia-application-id=9TAKGWJUXL&x-algolia-api-key=60c11b2f1068885161d95ca068d3a6ae'

const TYPES: Record<number, WineType> = { 1: 'red', 2: 'white', 3: 'sparkling', 4: 'rose', 7: 'dessert', 24: 'fortified' }

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

interface Hit {
  id: number
  name: string
  type_id: number
  grapes: number[] | null
  region?: { name: string; country: string } | null
  winery?: { name: string } | null
  image?: { location?: string; variations?: { bottle_medium?: string; large?: string } } | null
  statistics?: { ratings_average?: number; ratings_count?: number } | null
  vintages?: { year: string; statistics?: { status?: string; ratings_average?: number; ratings_count?: number } }[]
}

function country(code: string | undefined): string {
  if (!code) return ''
  try {
    return countryNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

function rating(average: number | undefined): number | null {
  return average ? average : null
}

/** Prefer the transparent bottle shot, then a photo of the label; skip Vivino's placeholder label. */
function imageUrl(hit: Hit): string | null {
  const v = hit.image?.variations
  const url = v?.bottle_medium ?? (hit.image?.location?.includes('default_label') ? undefined : v?.large)
  return url ? `https:${url}` : null
}

export async function searchWines(query: string): Promise<LookupResult[]> {
  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    body: JSON.stringify({ params: new URLSearchParams({ query, hitsPerPage: '12' }).toString() }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Wine search failed (${response.status})`)
  const { hits } = (await response.json()) as { hits: Hit[] }

  return hits.map((hit) => ({
    vivinoId: hit.id,
    producer: hit.winery?.name ?? '',
    name: hit.name,
    type: TYPES[hit.type_id] ?? 'red',
    varietals: (hit.grapes ?? []).flatMap((id) => grapeByVivinoId(id)?.name ?? []),
    region: hit.region?.name ?? '',
    country: country(hit.region?.country),
    rating: rating(hit.statistics?.ratings_average),
    ratingsCount: hit.statistics?.ratings_count ?? 0,
    imageUrl: imageUrl(hit),
    url: `https://www.vivino.com/w/${hit.id}`,
    vintages: (hit.vintages ?? [])
      .map((v) => ({
        year: /^\d{4}$/.test(v.year) ? Number(v.year) : null,
        // Vivino only publishes an average once a vintage has enough ratings.
        rating: v.statistics?.status === 'Normal' ? rating(v.statistics.ratings_average) : null,
        ratingsCount: v.statistics?.ratings_count ?? 0,
      }))
      .filter((v) => v.year !== null),
  }))
}
