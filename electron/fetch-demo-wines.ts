import { writeFileSync } from 'node:fs'
import { normalizeWine } from '../shared/normalize.ts'
import { searchWines } from '../server/vivino.ts'

// The demo cellar `pnpm electron` starts with. Wine details come from Vivino; the rest is made up to fill out the app.
const CELLAR = [
  { query: 'Chateau Margaux Pavillon Rouge', vintage: 2015, quantity: 2, location: 'Rack A', purchasePrice: 210, purchaseDate: '2019-03-14' },
  { query: 'Vietti Castiglione Barolo', vintage: 2019, quantity: 3, location: 'Rack A', purchasePrice: 62, purchaseDate: '2023-09-02' },
  { query: 'Louis Jadot Gevrey-Chambertin', vintage: 2018, quantity: 2, location: 'Rack B', purchasePrice: 75, purchaseDate: '2021-11-20' },
  { query: 'Ridge Monte Bello', vintage: 2013, quantity: 1, location: 'Rack A', purchasePrice: 195, purchaseDate: '2017-05-06', notes: 'Birthday bottle.' },
  { query: 'La Rioja Alta Vina Ardanza Reserva', vintage: 2016, quantity: 4, location: 'Rack B', purchasePrice: 38, purchaseDate: '2024-02-10' },
  { query: 'Catena Zapata Malbec Argentino', vintage: 2020, quantity: 3, location: 'Rack C', purchasePrice: 110, purchaseDate: '2024-06-15' },
  { query: 'Pascal Jolivet Sancerre Blanc', vintage: 2023, quantity: 3, location: 'Fridge', purchasePrice: 34, purchaseDate: '2025-04-18' },
  { query: 'Dr. Loosen Wehlener Sonnenuhr Riesling Spatlese', vintage: 2021, quantity: 6, location: 'Rack C', purchasePrice: 36, purchaseDate: '2023-12-01', drinkFrom: 2027, drinkTo: 2045 },
  { query: 'Chateau d\'Esclans Whispering Angel', vintage: 2024, quantity: 2, location: 'Fridge', purchasePrice: 26, purchaseDate: '2026-05-30' },
  { query: 'Billecart-Salmon Brut Rose', vintage: null, quantity: 1, location: 'Fridge', purchasePrice: 95, purchaseDate: '2025-12-12', notes: 'Saving for New Year.' },
  { query: 'Chateau Coutet Barsac', vintage: 2017, quantity: 1, location: 'Rack C', purchasePrice: 48, purchaseDate: '2022-10-08' },
  { query: 'Graham\'s 20 Year Old Tawny Port', vintage: null, quantity: 0, location: '', purchasePrice: 60, purchaseDate: '2024-11-23', notes: 'Finished over the holidays.' },
]

const wines = []
for (const { query, vintage, ...cellar } of CELLAR) {
  const [hit] = await searchWines(query)
  if (!hit) throw new Error(`Nothing on Vivino for "${query}"`)
  const match = hit.vintages.find((v) => v.year === vintage)
  console.log(`${query} -> ${hit.producer} ${hit.name}`)
  wines.push(
    normalizeWine({
      ...hit,
      ...cellar,
      vintage,
      rating: match?.rating ?? hit.rating,
      ratingsCount: match?.rating ? match.ratingsCount : hit.ratingsCount,
    }),
  )
}

writeFileSync(new URL('demo-wines.json', import.meta.url), `${JSON.stringify(wines, null, 2)}\n`)
