import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { STATUS_LABELS, drinkWindow, windowStatus, type WindowStatus } from '../../shared/drinkWindow.ts'
import { WINE_TYPES, WINE_TYPE_LABELS, type Wine } from '../../shared/types.ts'
import { winesQuery } from '../api.ts'
import { Icon } from '../components/Icon.tsx'
import { WineCard } from '../components/WineCard.tsx'

interface Row {
  wine: Wine
  window: ReturnType<typeof drinkWindow>
  status: WindowStatus
}

const SORTS = {
  window: { label: 'By drink window', compare: (a: Row, b: Row) => a.window.from - b.window.from || a.window.to - b.window.to },
  ending: { label: 'By window ending', compare: (a: Row, b: Row) => a.window.to - b.window.to },
  vintage: { label: 'By vintage', compare: (a: Row, b: Row) => (a.wine.vintage ?? 9999) - (b.wine.vintage ?? 9999) },
  producer: { label: 'By producer', compare: (a: Row, b: Row) => a.wine.producer.localeCompare(b.wine.producer) },
  added: { label: 'Recently added', compare: (a: Row, b: Row) => b.wine.createdAt.localeCompare(a.wine.createdAt) },
}

const route = getRouteApi('/cellar')

export function Cellar() {
  const { data: wines } = useSuspenseQuery(winesQuery)
  const { status } = route.useSearch()
  const navigate = route.useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<keyof typeof SORTS>('window')
  const [showFinished, setShowFinished] = useState(false)

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  const rows: Row[] = wines
    .map((wine) => {
      const window = drinkWindow(wine)
      return { wine, window, status: windowStatus(window) }
    })
    .filter(({ wine, status: s }) => {
      if (!showFinished && wine.quantity === 0) return false
      if (status && s !== status) return false
      if (type && wine.type !== type) return false
      const text = [wine.producer, wine.name, wine.vintage, wine.region, wine.country, wine.style, wine.location, ...wine.varietals]
        .join(' ')
        .toLowerCase()
      return terms.every((t) => text.includes(t))
    })
    .sort(SORTS[sort].compare)

  const bottles = rows.reduce((sum, r) => sum + r.wine.quantity, 0)

  return (
    <div>
      <header className="page-intro split">
        <div>
          <h1 className="display">Cellar</h1>
          <p className="muted">
            {rows.length} {rows.length === 1 ? 'wine' : 'wines'} · {bottles} {bottles === 1 ? 'bottle' : 'bottles'}
          </p>
        </div>
        <div className="intro-actions">
          <a className="button" href="/api/cellar/export" download>Export cellar</a>
          <Link className="button primary" to="/add">Add wine</Link>
        </div>
      </header>
      <div className="filters">
        <label className="search">
          <Icon name="search" />
          <input type="search" placeholder="Search producer, varietal, region, bin…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <select
          value={status ?? ''}
          onChange={(e) => navigate({ search: { status: (e.target.value || undefined) as WindowStatus | undefined }, replace: true })}
          aria-label="Window status"
        >
          <option value="">Any window</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="">Any type</option>
          {WINE_TYPES.map((t) => (
            <option key={t} value={t}>{WINE_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} aria-label="Sort">
          {Object.entries(SORTS).map(([value, { label }]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} /> Show finished
        </label>
      </div>
      <div className="card-grid">
        {rows.map(({ wine }) => (
          <WineCard key={wine.id} wine={wine} />
        ))}
      </div>
    </div>
  )
}
