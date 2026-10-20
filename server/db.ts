import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Wine, WineInput } from '../shared/types.ts'

const path = process.env.DB_PATH ?? 'data/cellar.db'
if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })

const db = new DatabaseSync(path)
db.exec(`
  CREATE TABLE IF NOT EXISTS wines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producer TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    vintage INTEGER,
    type TEXT NOT NULL DEFAULT 'red',
    style TEXT NOT NULL DEFAULT '',
    varietals TEXT NOT NULL DEFAULT '[]',
    region TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_date TEXT,
    purchase_price REAL,
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    drink_from INTEGER,
    drink_to INTEGER,
    vivino_id INTEGER,
    rating REAL,
    ratings_count INTEGER,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const COLUMNS = {
  producer: 'producer',
  name: 'name',
  vintage: 'vintage',
  type: 'type',
  style: 'style',
  varietals: 'varietals',
  region: 'region',
  country: 'country',
  quantity: 'quantity',
  purchaseDate: 'purchase_date',
  purchasePrice: 'purchase_price',
  location: 'location',
  notes: 'notes',
  drinkFrom: 'drink_from',
  drinkTo: 'drink_to',
  vivinoId: 'vivino_id',
  rating: 'rating',
  ratingsCount: 'ratings_count',
  imageUrl: 'image_url',
} as const satisfies Record<keyof WineInput, string>

type Row = Record<string, string | number | null>

function fromRow(row: Row): Wine {
  const wine = { id: row.id, createdAt: row.created_at } as Record<string, unknown>
  for (const [key, column] of Object.entries(COLUMNS)) wine[key] = row[column]
  wine.varietals = JSON.parse(row.varietals as string)
  return wine as unknown as Wine
}

function toParams(input: WineInput): Row {
  const params: Row = {}
  for (const [key, column] of Object.entries(COLUMNS)) {
    params[column] = input[key as keyof WineInput] as string | number | null
  }
  params.varietals = JSON.stringify(input.varietals)
  return params
}

const columnList = Object.values(COLUMNS)
const insert = db.prepare(
  `INSERT INTO wines (${columnList.join(', ')}) VALUES (${columnList.map((c) => `:${c}`).join(', ')}) RETURNING *`,
)
const update = db.prepare(
  `UPDATE wines SET ${columnList.map((c) => `${c} = :${c}`).join(', ')} WHERE id = :id RETURNING *`,
)

export function listWines(): Wine[] {
  return (db.prepare('SELECT * FROM wines ORDER BY producer, name, vintage').all() as Row[]).map(fromRow)
}

export function createWine(input: WineInput): Wine {
  return fromRow(insert.get(toParams(input)) as Row)
}

export function createWines(inputs: WineInput[]): Wine[] {
  db.exec('BEGIN')
  try {
    const wines = inputs.map(createWine)
    db.exec('COMMIT')
    return wines
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function updateWine(id: number, input: WineInput): Wine | undefined {
  const row = update.get({ ...toParams(input), id }) as Row | undefined
  return row && fromRow(row)
}

export function deleteWine(id: number): boolean {
  return db.prepare('DELETE FROM wines WHERE id = ?').run(id).changes > 0
}
