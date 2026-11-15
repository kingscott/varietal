import { Link } from '@tanstack/react-router'
import { STATUS_LABELS, drinkWindow, windowStatus, type DrinkWindow, type WindowStatus } from '../../shared/drinkWindow.ts'
import { WINE_TYPE_LABELS, type Wine, type WineType } from '../../shared/types.ts'
import { useDrinkOne } from '../api.ts'

export function StatusBadge({ status }: { status: WindowStatus }) {
  return <span className={`pill status-${status}`}>{STATUS_LABELS[status]}</span>
}

export function wineTitle(wine: Pick<Wine, 'producer' | 'name' | 'vintage'>) {
  return [wine.producer, wine.name].filter(Boolean).join(' ') + (wine.vintage ? ` ${wine.vintage}` : ' NV')
}

export function wineMeta(wine: Pick<Wine, 'type' | 'varietals' | 'region' | 'country'>) {
  return [WINE_TYPE_LABELS[wine.type], wine.varietals.join(', '), [wine.region, wine.country].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Vivino's transparent bottle shot, a framed photo of the label when that is all
 * Vivino has, or a bottle silhouette in the wine's colour.
 */
export function Bottle({ imageUrl, type }: { imageUrl: string | null; type: WineType }) {
  if (imageUrl?.includes('_pb_')) return <img className="bottle" src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
  if (imageUrl) return <img className="label-photo" src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
  return (
    <svg className={`bottle bottle-svg type-${type}`} viewBox="0 0 40 120" aria-hidden>
      <path d="M16 4h8v26c0 4 8 9 8 20v62a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V50c0-11 8-16 8-20V4Z" className="glass" />
      <rect x="8" y="64" width="24" height="26" rx="1.5" className="label" />
      <rect x="15.5" y="2" width="9" height="12" rx="1.5" className="capsule" />
    </svg>
  )
}

/** Timeline of the drink window with a marker for the current year. */
export function WindowBar({ window: w, vintage }: { window: DrinkWindow; vintage: number | null }) {
  const now = new Date().getFullYear()
  const start = Math.min(vintage ?? w.from, w.from, now) - 1
  const end = Math.max(w.to, now) + 1
  const pct = (year: number) => ((year - start) / (end - start)) * 100
  return (
    <div className="window-bar" title={w.basis.join('\n')}>
      <div className={`window-range status-${windowStatus(w)}`} style={{ left: `${pct(w.from)}%`, width: `${pct(w.to + 1) - pct(w.from)}%` }} />
      <div className="window-now" style={{ left: `${pct(now + 0.5)}%` }} />
    </div>
  )
}

export function WindowYears({ window: w }: { window: DrinkWindow }) {
  return (
    <span className="window-years">
      {w.from}–{w.to}
      {w.source === 'estimate' && <span className="muted"> est.</span>}
    </span>
  )
}

export function DrinkButton({ wine, className = '' }: { wine: Wine; className?: string }) {
  const drink = useDrinkOne()
  return (
    <button type="button" className={`small ${className}`} disabled={wine.quantity === 0 || drink.isPending} onClick={() => drink.mutate(wine)}>
      Drink one
    </button>
  )
}

const bottles = (n: number) => `${n} ${n === 1 ? 'bottle' : 'bottles'}`

/** Horizontal card for lists. */
export function WineCard({ wine }: { wine: Wine }) {
  const w = drinkWindow(wine)
  return (
    <article className={`wine-card${wine.quantity === 0 ? ' finished' : ''}`}>
      <Link to="/wine/$id" params={{ id: String(wine.id) }} className="wine-card-main">
        <div className="bottle-frame">
          <Bottle imageUrl={wine.imageUrl} type={wine.type} />
        </div>
        <div className="wine-info">
          <h3>{wineTitle(wine)}</h3>
          <p className="muted ellipsis">{wineMeta(wine)}</p>
          <div className="window-row">
            <StatusBadge status={windowStatus(w)} />
            <WindowYears window={w} />
          </div>
          <WindowBar window={w} vintage={wine.vintage} />
        </div>
      </Link>
      <footer className="wine-card-foot">
        <span className="muted">{bottles(wine.quantity)}</span>
        <DrinkButton wine={wine} />
      </footer>
    </article>
  )
}

/** Vertical bottle card for the dashboard shelves. */
export function ShelfCard({ wine }: { wine: Wine }) {
  const w = drinkWindow(wine)
  return (
    <article className="shelf-card">
      <Link to="/wine/$id" params={{ id: String(wine.id) }} className="shelf-card-main">
        <div className="bottle-frame">
          <Bottle imageUrl={wine.imageUrl} type={wine.type} />
        </div>
        <h3>{wineTitle(wine)}</h3>
        <StatusBadge status={windowStatus(w)} />
        <WindowYears window={w} />
      </Link>
      <footer className="shelf-card-foot">
        <span className="muted">{bottles(wine.quantity)}</span>
        <DrinkButton wine={wine} className="ghost" />
      </footer>
    </article>
  )
}
