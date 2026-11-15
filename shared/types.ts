export const WINE_TYPES = ['red', 'white', 'rose', 'sparkling', 'dessert', 'fortified'] as const
export type WineType = (typeof WINE_TYPES)[number]

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
  dessert: 'Dessert',
  fortified: 'Fortified',
}

export interface Wine {
  id: number
  producer: string
  name: string
  /** null for non-vintage wines */
  vintage: number | null
  type: WineType
  style: string
  varietals: string[]
  region: string
  country: string
  quantity: number
  purchaseDate: string | null
  purchasePrice: number | null
  location: string
  notes: string
  /** Manual drink window; when null the app estimates one */
  drinkFrom: number | null
  drinkTo: number | null
  vivinoId: number | null
  rating: number | null
  ratingsCount: number | null
  imageUrl: string | null
  /** The copy of the label image stored by this server, when it has one */
  localImageUrl: string | null
  createdAt: string
}

export type WineInput = Omit<Wine, 'id' | 'createdAt' | 'localImageUrl'>

export interface LookupVintage {
  year: number | null
  rating: number | null
  ratingsCount: number
}

export interface LookupResult {
  vivinoId: number
  producer: string
  name: string
  type: WineType
  varietals: string[]
  region: string
  country: string
  rating: number | null
  ratingsCount: number
  imageUrl: string | null
  url: string
  vintages: LookupVintage[]
}
