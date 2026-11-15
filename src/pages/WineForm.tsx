import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { drinkWindow, estimateWindow, windowStatus } from '../../shared/drinkWindow.ts'
import { GRAPES, findGrape } from '../../shared/grapes.ts'
import { normalizeWine } from '../../shared/normalize.ts'
import { WINE_TYPES, WINE_TYPE_LABELS, type LookupResult, type Wine } from '../../shared/types.ts'
import { useDeleteWine, useLookup, useSaveWine, winesQuery } from '../api.ts'
import { Icon } from '../components/Icon.tsx'
import { Bottle, StatusBadge, WindowBar, wineMeta, wineTitle } from '../components/WineCard.tsx'

const STYLES = [...new Set([...GRAPES.map((g) => g.style), 'Rosé', 'Sparkling', 'Dessert', 'Fortified'])]

type Form = Record<
  | 'producer' | 'name' | 'vintage' | 'type' | 'style' | 'varietals' | 'region' | 'country' | 'quantity'
  | 'purchaseDate' | 'purchasePrice' | 'location' | 'notes' | 'drinkFrom' | 'drinkTo'
  | 'vivinoId' | 'rating' | 'ratingsCount' | 'imageUrl',
  string
>

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function toForm(wine?: Wine): Form {
  return {
    producer: s(wine?.producer),
    name: s(wine?.name),
    vintage: s(wine?.vintage),
    type: wine?.type ?? 'red',
    style: s(wine?.style),
    varietals: wine?.varietals.join(', ') ?? '',
    region: s(wine?.region),
    country: s(wine?.country),
    quantity: s(wine?.quantity ?? 1),
    purchaseDate: s(wine?.purchaseDate ?? new Date().toISOString().slice(0, 10)),
    purchasePrice: s(wine?.purchasePrice),
    location: s(wine?.location),
    notes: s(wine?.notes),
    drinkFrom: s(wine?.drinkFrom),
    drinkTo: s(wine?.drinkTo),
    vivinoId: s(wine?.vivinoId),
    rating: s(wine?.rating),
    ratingsCount: s(wine?.ratingsCount),
    imageUrl: s(wine?.imageUrl),
  }
}

/** Use the vintage's own rating when Vivino has enough reviews of it. */
function ratingFor(match: LookupResult, vintage: string) {
  const v = match.vintages.find((x) => String(x.year) === vintage && x.rating !== null)
  return v ? { rating: s(v.rating), ratingsCount: s(v.ratingsCount) } : { rating: s(match.rating), ratingsCount: s(match.ratingsCount) }
}

function Lookup({ initialQuery, onPick }: { initialQuery: string; onPick: (match: LookupResult, vintage: string | null) => void }) {
  const [query, setQuery] = useState(initialQuery)
  const [submitted, setSubmitted] = useState('')
  const [open, setOpen] = useState(false)
  const lookup = useLookup(submitted)
  const vintage = query.match(/\b(19|20)\d{2}\b/)?.[0] ?? null

  const search = () => {
    setSubmitted(query.replace(/\b(19|20)\d{2}\b/, '').trim())
    setOpen(true)
  }

  const results = open ? lookup.data : undefined
  return (
    <section className="panel lookup">
      <h3 className="panel-title">Look it up on the web</h3>
      <div className="lookup-form">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="e.g. Ridge Monte Bello 2019"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                search()
              }
            }}
            aria-label="Wine search"
          />
        </label>
        <button type="button" className="primary" onClick={search} disabled={lookup.isFetching}>
          {lookup.isFetching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {open && lookup.error && <p className="error">{lookup.error.message}</p>}
      {results?.length === 0 && <p className="muted">No matches. Try the producer and wine name without extra words.</p>}
      {results && results.length > 0 && (
        <ul className="results">
          {results.map((r) => (
            <li key={r.vivinoId}>
              <button
                type="button"
                className="result"
                onClick={() => {
                  onPick(r, vintage)
                  setOpen(false)
                }}
              >
                <span className="result-bottle">
                  <Bottle imageUrl={r.imageUrl} type={r.type} />
                </span>
                <span className="result-info">
                  <strong>
                    {r.producer} {r.name}
                  </strong>
                  <span className="muted">{wineMeta(r)}</span>
                </span>
                {r.rating && (
                  <span className="rating" title={`${r.ratingsCount.toLocaleString()} ratings on Vivino`}>
                    ★ {r.rating.toFixed(1)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Wine data from Vivino. Matching fills in the details so you can review them before saving.</p>
    </section>
  )
}

const editRoute = getRouteApi('/wine/$id')

export function NewWine() {
  return <WineForm />
}

export function EditWine() {
  const { id } = editRoute.useParams()
  const { data: wines } = useSuspenseQuery(winesQuery)
  const wine = wines.find((w) => w.id === Number(id))
  return wine ? <WineForm key={wine.id} wine={wine} /> : <p className="muted">That wine isn’t in your cellar.</p>
}

function WineForm({ wine }: { wine?: Wine }) {
  const [form, setForm] = useState<Form>(() => toForm(wine))
  const [match, setMatch] = useState<LookupResult | null>(null)
  const navigate = useNavigate()
  const save = useSaveWine()
  const del = useDeleteWine()

  const set = (key: keyof Form, value: string) =>
    setForm((f) => ({ ...f, [key]: value, ...(key === 'vintage' && match ? ratingFor(match, value) : {}) }))

  const pick = (m: LookupResult, vintage: string | null) => {
    setMatch(m)
    setForm((f) => {
      const v = vintage ?? f.vintage
      const grapeStyle = m.type === 'red' || m.type === 'white' ? findGrape(m.varietals[0] ?? '')?.style : undefined
      // Keep anything already entered that Vivino has no better answer for.
      return {
        ...f,
        producer: m.producer,
        name: m.name,
        vintage: v,
        type: m.type,
        style: f.style || grapeStyle || WINE_TYPE_LABELS[m.type],
        varietals: m.varietals.length > 0 ? m.varietals.join(', ') : f.varietals,
        region: m.region || f.region,
        country: m.country || f.country,
        vivinoId: String(m.vivinoId),
        imageUrl: m.imageUrl ?? '',
        ...ratingFor(m, v),
      }
    })
  }

  const normalized = normalizeWine(form)
  const estimate = estimateWindow(normalized)
  const hasManual = form.drinkFrom !== '' || form.drinkTo !== ''
  const effective = drinkWindow(normalized)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ id: wine?.id, wine: normalized }, { onSuccess: () => navigate({ to: '/cellar' }) })
  }

  const remove = () => {
    if (!wine || !confirm(`Delete ${wineTitle(wine)}? This can’t be undone.`)) return
    del.mutate(wine.id, { onSuccess: () => navigate({ to: '/cellar' }) })
  }

  const field = (key: keyof Form, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
    </label>
  )

  return (
    <form onSubmit={submit} className="wine-form">
      <header className="page-intro">
        <p className="eyebrow">{wine ? 'In your cellar' : 'New bottle'}</p>
        <h1 className="display">{wine ? wineTitle(wine) : 'Add a wine'}</h1>
      </header>

      <div className="form-layout">
        <div className="form-col">
          <Lookup initialQuery={wine ? wineTitle(wine).replace(/ NV$/, '') : ''} onPick={pick} />

          <section className="panel">
            <h3 className="panel-title">The wine</h3>
            {field('producer', 'Producer', { required: true, placeholder: 'e.g. Ridge Vineyards' })}
            {field('name', 'Wine', { placeholder: 'e.g. Monte Bello' })}
            <div className="row">
              {field('vintage', 'Vintage', { inputMode: 'numeric', placeholder: 'NV' })}
              <label className="field">
                <span>Type</span>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {WINE_TYPES.map((t) => (
                    <option key={t} value={t}>{WINE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </label>
            </div>
            {field('varietals', 'Varietal(s)', { placeholder: 'e.g. Cabernet Sauvignon, Merlot', list: 'grape-list' })}
            <datalist id="grape-list">
              {GRAPES.map((g) => (
                <option key={g.name} value={g.name} />
              ))}
            </datalist>
            <label className="field">
              <span>Style</span>
              <input value={form.style} onChange={(e) => set('style', e.target.value)} list="style-list" placeholder="e.g. Full-bodied red" />
              <datalist id="style-list">
                {STYLES.map((st) => (
                  <option key={st} value={st} />
                ))}
              </datalist>
            </label>
            <div className="row">
              {field('region', 'Region', { placeholder: 'e.g. Santa Cruz Mountains' })}
              {field('country', 'Country', { placeholder: 'e.g. United States' })}
            </div>
            {form.vivinoId && (
              <p className="muted small">
                Matched on{' '}
                <a href={`https://www.vivino.com/w/${form.vivinoId}`} target="_blank" rel="noreferrer">Vivino</a>
                {form.rating && ` · ★ ${Number(form.rating).toFixed(1)} from ${Number(form.ratingsCount).toLocaleString()} ratings`}
              </p>
            )}
          </section>
        </div>

        <div className="form-col side">
          <section className="panel window-panel">
            <div className="window-head">
              <div className="window-bottle">
                <Bottle
                  imageUrl={form.imageUrl || null}
                  localImageUrl={form.imageUrl === wine?.imageUrl ? wine.localImageUrl : null}
                  type={normalized.type}
                />
              </div>
              <div>
                <p className="eyebrow">Drinking window</p>
                <strong className="window-big">
                  {effective.from}–{effective.to}
                </strong>
                <StatusBadge status={windowStatus(effective)} />
              </div>
            </div>
            <WindowBar window={effective} vintage={normalized.vintage} />
            <ul className="basis">
              {hasManual ? <li>Set manually (estimate is {estimate.from}–{estimate.to})</li> : estimate.basis.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <div className="row">
              {field('drinkFrom', 'Drink from', { inputMode: 'numeric', placeholder: String(estimate.from) })}
              {field('drinkTo', 'Drink until', { inputMode: 'numeric', placeholder: String(estimate.to) })}
            </div>
            {hasManual && (
              <button type="button" className="link" onClick={() => setForm((f) => ({ ...f, drinkFrom: '', drinkTo: '' }))}>
                Use the estimate instead
              </button>
            )}
          </section>

          <section className="panel">
            <h3 className="panel-title">In your cellar</h3>
            <div className="row">
              {field('quantity', 'Bottles', { type: 'number', min: 0 })}
              {field('location', 'Location / bin', { placeholder: 'e.g. Rack B, row 3' })}
            </div>
            <div className="row">
              {field('purchaseDate', 'Purchased', { type: 'date' })}
              {field('purchasePrice', 'Price per bottle', { inputMode: 'decimal', placeholder: '$' })}
            </div>
            <label className="field">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
            </label>
          </section>

          {save.error && <p className="error">{save.error.message}</p>}
          <div className="actions">
            <button type="submit" className="primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : wine ? 'Save changes' : 'Add to cellar'}
            </button>
            <Link className="button" to="/cellar">Cancel</Link>
            {wine && (
              <button type="button" className="danger" onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
