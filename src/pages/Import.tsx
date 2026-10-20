import Papa from 'papaparse'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { drinkWindow, windowStatus } from '../../shared/drinkWindow.ts'
import { normalizeWine, parseWindow } from '../../shared/normalize.ts'
import { WINE_TYPE_LABELS } from '../../shared/types.ts'
import { useImportWines } from '../api.ts'
import { StatusBadge, wineTitle } from '../components/WineCard.tsx'

// Matched against spreadsheet headers in this order; each column is used once.
const FIELDS = [
  { key: 'drinkFrom', label: 'Drink from', pattern: /drink.*(from|after|start)|ready|window.*(start|from|open)/i },
  { key: 'drinkTo', label: 'Drink until', pattern: /drink.*(to|by|until|before|end)|window.*(end|to|close)/i },
  { key: 'drinkWindow', label: 'Drink window (e.g. 2025–2035)', pattern: /window|drink/i },
  { key: 'purchaseDate', label: 'Purchase date', pattern: /purchase.*date|bought|acquired|date/i },
  { key: 'purchasePrice', label: 'Price', pattern: /price|cost|paid|\$/i },
  { key: 'producer', label: 'Producer', pattern: /producer|winery|maker|brand|ch[aâ]teau|domaine|estate/i },
  { key: 'name', label: 'Wine name', pattern: /^(wine|name|wine name|label|cuv[eé]e|bottling|wine\/name)$/i },
  { key: 'vintage', label: 'Vintage', pattern: /vintage|^year$/i },
  { key: 'varietals', label: 'Varietal(s)', pattern: /variet|grape|blend/i },
  { key: 'type', label: 'Type / colour', pattern: /^(type|colou?r|wine type|category)$/i },
  { key: 'style', label: 'Style', pattern: /style/i },
  { key: 'region', label: 'Region', pattern: /region|appellation|\bava\b|area/i },
  { key: 'country', label: 'Country', pattern: /country/i },
  { key: 'quantity', label: 'Bottles', pattern: /qty|quantity|bottles|count|^#$|number/i },
  { key: 'location', label: 'Location / bin', pattern: /location|bin|rack|shelf|slot/i },
  { key: 'notes', label: 'Notes', pattern: /note|comment|remark/i },
] as const

type FieldKey = (typeof FIELDS)[number]['key']
type Mapping = Partial<Record<FieldKey, string>>

function guessMapping(headers: string[]): Mapping {
  const mapping: Mapping = {}
  const used = new Set<string>()
  for (const field of FIELDS) {
    const header = headers.find((h) => !used.has(h) && field.pattern.test(h.trim()))
    if (header) {
      mapping[field.key] = header
      used.add(header)
    }
  }
  return mapping
}

function toRaw(row: Record<string, string>, mapping: Mapping): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const [key, header] of Object.entries(mapping)) {
    if (header) raw[key] = row[header]
  }
  if (raw.drinkWindow !== undefined) {
    const { from, to } = parseWindow(raw.drinkWindow)
    raw.drinkFrom ??= from
    raw.drinkTo ??= to
    delete raw.drinkWindow
  }
  return raw
}

export function Import() {
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [status, setStatus] = useState<string | null>(null)
  const importWines = useImportWines()

  const load = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const fields = result.meta.fields ?? []
        setHeaders(fields)
        setMapping(guessMapping(fields))
        setRows(result.data.filter((r) => Object.values(r).some((v) => v?.trim())))
        setStatus(null)
      },
    })
  }

  const wines = rows.map((r) => normalizeWine(toRaw(r, mapping)))
  const importable = wines.filter((w) => w.producer || w.name)

  const run = () => {
    const raws = rows.map((r) => toRaw(r, mapping)).filter((_, i) => wines[i].producer || wines[i].name)
    importWines.mutate(raws, {
      onSuccess: (created) => {
        setStatus(`Imported ${created.length} wines.`)
        setRows([])
      },
      onError: (err) => setStatus(`Import failed: ${err.message}`),
    })
  }

  return (
    <div className="import">
      <header className="page-intro">
        <p className="eyebrow">Bring your cellar over</p>
        <h1 className="display">Import your spreadsheet</h1>
      </header>
      <p className="muted">
        Export your sheet as CSV (Google Sheets: File → Download → CSV; Excel or Numbers: Export → CSV), then choose the
        file. One row per wine; a bottle count column is optional. Drink windows you already have are kept as-is, and
        wines without one get an estimate.
      </p>
      <label className="file-drop">
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        <span>Choose a CSV file</span>
      </label>
      {status && <p className={status.startsWith('Import failed') ? 'error' : 'success'}>{status}{!status.startsWith('Import failed') && <> <Link to="/">See what’s ready →</Link></>}</p>}

      {rows.length > 0 && (
        <>
          <section className="panel">
            <h3 className="panel-title">Match your columns</h3>
            <div className="mapping">
              {FIELDS.map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}
                  >
                    <option value="">—</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3 className="panel-title">Preview ({importable.length} of {rows.length} rows have a producer or name)</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Wine</th>
                    <th>Type</th>
                    <th>Varietal(s)</th>
                    <th>Style</th>
                    <th>Bottles</th>
                    <th>Purchased</th>
                    <th>Window</th>
                  </tr>
                </thead>
                <tbody>
                  {wines.slice(0, 50).map((w, i) => {
                    const dw = drinkWindow(w)
                    return (
                      <tr key={i} className={w.producer || w.name ? '' : 'skipped'}>
                        <td>{wineTitle(w)}</td>
                        <td>{WINE_TYPE_LABELS[w.type]}</td>
                        <td>{w.varietals.join(', ')}</td>
                        <td>{w.style}</td>
                        <td>{w.quantity}</td>
                        <td>{w.purchaseDate}</td>
                        <td className="nowrap">
                          {dw.from}–{dw.to} {dw.source === 'estimate' && <span className="muted">est.</span>}{' '}
                          <StatusBadge status={windowStatus(dw)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {wines.length > 50 && <p className="muted">Showing the first 50 rows.</p>}
          </section>
          <div className="actions">
            <button type="button" className="primary" onClick={run} disabled={importWines.isPending || importable.length === 0}>
              {importWines.isPending ? 'Importing…' : `Import ${importable.length} wines`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
