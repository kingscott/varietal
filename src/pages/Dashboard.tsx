import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { STATUS_LABELS, drinkWindow, windowStatus, type WindowStatus } from '../../shared/drinkWindow.ts'
import { WINE_TYPE_LABELS, type Wine } from '../../shared/types.ts'
import { tuesdayNightWines } from '../../shared/tuesdayNight.ts'
import { winesQuery } from '../api.ts'
import { Bottle, DrinkButton, ShelfCard, StatusBadge, WindowBar, WindowYears, wineMeta, wineTitle } from '../components/WineCard.tsx'

function BarList({ title, data, limit = 8 }: { title: string; data: Map<string, number>; limit?: number }) {
  const rows = [...data].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const max = Math.max(1, ...rows.map(([, v]) => v))
  return (
    <section className="panel">
      <h3 className="panel-title">{title}</h3>
      {rows.length === 0 && <p className="muted small">Match wines on the web to fill this in.</p>}
      <ul className="bars">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span className="bar-label">{label}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${(value / max) * 100}%` }} />
            </span>
            <span className="bar-value">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function tally(wines: Wine[], keys: (w: Wine) => string[]) {
  const map = new Map<string, number>()
  for (const w of wines) for (const k of keys(w)) if (k) map.set(k, (map.get(k) ?? 0) + w.quantity)
  return map
}

const URGENCY: Record<WindowStatus, number> = { past: 0, 'last-call': 1, ready: 2, 'not-ready': 3 }

const HERO_EYEBROW: Record<WindowStatus, string> = {
  past: 'Open this one first',
  'last-call': 'Drink this soon',
  ready: 'Ready tonight',
  'not-ready': 'Next up',
}

const SHELF_FILTERS = { ready: 'Ready now', tuesday: 'Tuesday night' } as const

export function Dashboard() {
  const { data: wines } = useSuspenseQuery(winesQuery)
  const [shelfFilter, setShelfFilter] = useState<keyof typeof SHELF_FILTERS>('ready')
  const now = new Date().getFullYear()
  const inCellar = wines
    .filter((w) => w.quantity > 0)
    .map((wine) => {
      const window = drinkWindow(wine)
      return { wine, window, status: windowStatus(window) }
    })

  if (inCellar.length === 0) {
    return (
      <div className="empty">
        <p className="eyebrow">Welcome</p>
        <h1 className="display">Good things mature here.</h1>
        <p className="muted">Add a bottle by looking it up on the web, or bring in your existing spreadsheet.</p>
        <div className="actions">
          <Link className="button primary" to="/add">Add a wine</Link>
          <Link className="button" to="/import">Import spreadsheet</Link>
        </div>
      </div>
    )
  }

  const bottleCount = (status: WindowStatus) =>
    inCellar.filter((x) => x.status === status).reduce((sum, x) => sum + x.wine.quantity, 0)
  const total = inCellar.reduce((sum, x) => sum + x.wine.quantity, 0)
  const value = inCellar.reduce((sum, x) => sum + (x.wine.purchasePrice ?? 0) * x.wine.quantity, 0)

  const drinkNow = inCellar
    .filter((x) => x.status !== 'not-ready')
    .sort((a, b) => URGENCY[a.status] - URGENCY[b.status] || a.window.to - b.window.to)
  const upcoming = inCellar.filter((x) => x.status === 'not-ready').sort((a, b) => a.window.from - b.window.from)
  // Feature the most urgent bottle that is still in its window; past-window
  // bottles stay at the front of the shelf instead.
  const hero = drinkNow.find((x) => x.status !== 'past') ?? drinkNow[0] ?? upcoming[0]
  const shelf = drinkNow.filter((x) => x !== hero)

  const timeline = new Map<string, number>()
  for (let year = now; year <= now + 10; year++) {
    timeline.set(
      String(year),
      inCellar.filter((x) => x.window.from <= year && year <= x.window.to).reduce((s, x) => s + x.wine.quantity, 0),
    )
  }
  const timelineMax = Math.max(1, ...timeline.values())
  const cellarWines = inCellar.map((x) => x.wine)
  const tuesdayNight = tuesdayNightWines(cellarWines)

  return (
    <div className="dashboard">
      <header className="page-intro">
        <h1 className="display">Good things mature here.</h1>
        <p className="muted">
          {bottleCount('ready') + bottleCount('last-call')} of your {total} bottles are ready to open.
        </p>
      </header>

      <section className="stats-row">
        <div className="stat">
          <strong>{total}</strong>
          <span>bottles</span>
        </div>
        {(['ready', 'last-call', 'not-ready', 'past'] as const).map((s) => (
          <Link key={s} className={`stat status-${s}`} to="/cellar" search={{ status: s }}>
            <strong>{bottleCount(s)}</strong>
            <span>{STATUS_LABELS[s].toLowerCase()}</span>
          </Link>
        ))}
        {value > 0 && (
          <div className="stat">
            <strong>${Math.round(value).toLocaleString()}</strong>
            <span>cellar value</span>
          </div>
        )}
      </section>

      <div className="tonight">
        <article className="hero">
          <div className="hero-bottle">
            <Bottle imageUrl={hero.wine.imageUrl} localImageUrl={hero.wine.localImageUrl} type={hero.wine.type} />
          </div>
          <div className="hero-body">
            <p className="eyebrow">{HERO_EYEBROW[hero.status]}</p>
            <Link to="/wine/$id" params={{ id: String(hero.wine.id) }} className="hero-title">
              {wineTitle(hero.wine)}
            </Link>
            <p className="muted">{wineMeta(hero.wine)}</p>
            <div className="window-row">
              <StatusBadge status={hero.status} />
              <WindowYears window={hero.window} />
            </div>
            <WindowBar window={hero.window} vintage={hero.wine.vintage} />
            <p className="hero-basis muted small">{hero.window.basis[0]}</p>
            <div className="hero-actions">
              <DrinkButton wine={hero.wine} className="primary" />
              <span className="muted">{hero.wine.quantity} left</span>
            </div>
          </div>
        </article>

        <section className="shelf-section">
          <div className="section-head">
            <h2>{shelfFilter === 'tuesday' ? 'For a Tuesday night' : drinkNow.length > 0 ? 'More to drink now' : 'Nothing is ready yet'}</h2>
            <div className="segmented" role="group" aria-label="Filter the shelf">
              {Object.entries(SHELF_FILTERS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="small"
                  aria-pressed={shelfFilter === value}
                  onClick={() => setShelfFilter(value as keyof typeof SHELF_FILTERS)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {shelfFilter === 'tuesday' ? (
            tuesdayNight.length === 0 ? (
              <p className="muted">Nothing cheap is in its window. Tuesday night wines are in-window bottles from the lower end of your cellar’s prices.</p>
            ) : (
              <div className="shelf">
                {tuesdayNight.map(({ wine }) => (
                  <ShelfCard key={wine.id} wine={wine} />
                ))}
              </div>
            )
          ) : shelf.length === 0 ? (
            <p className="muted">{drinkNow.length > 0 ? 'That’s the only bottle in its window.' : 'Patience. The bottle on the left is next.'}</p>
          ) : (
            <div className="shelf">
              {shelf.map(({ wine }) => (
                <ShelfCard key={wine.id} wine={wine} />
              ))}
            </div>
          )}
        </section>
      </div>

      {upcoming.length > 0 && (
        <section className="shelf-section">
          <div className="section-head">
            <h2>Coming into window</h2>
            <Link to="/cellar" search={{ status: 'not-ready' }} className="more">
              See all {upcoming.length} →
            </Link>
          </div>
          <div className="shelf">
            {upcoming.slice(0, 8).map(({ wine }) => (
              <ShelfCard key={wine.id} wine={wine} />
            ))}
          </div>
        </section>
      )}

      <h2>Cellar stats</h2>
      <section className="panel">
        <h3 className="panel-title">Bottles in their window, next 10 years</h3>
        <div className="timeline">
          {[...timeline].map(([year, count]) => (
            <div key={year} className="timeline-col">
              <span className="timeline-value">{count}</span>
              <span className="timeline-bar" style={{ height: `${(count / timelineMax) * 100}%` }} />
              <span className="timeline-year">{year}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="stats-grid">
        <BarList title="By type" data={tally(cellarWines, (w) => [WINE_TYPE_LABELS[w.type]])} />
        <BarList title="By varietal" data={tally(cellarWines, (w) => w.varietals)} />
        <BarList title="By style" data={tally(cellarWines, (w) => [w.style])} />
        <BarList title="By country" data={tally(cellarWines, (w) => [w.country])} />
        <BarList title="By region" data={tally(cellarWines, (w) => [w.region])} />
        <BarList title="By vintage" data={tally(cellarWines, (w) => [w.vintage ? String(w.vintage) : 'NV'])} limit={12} />
      </div>
    </div>
  )
}
