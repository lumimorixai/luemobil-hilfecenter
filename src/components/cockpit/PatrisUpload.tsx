'use client'

/**
 * Patris-CSV-Upload im Migrations-Cockpit. Zeigt den aktuellen Datenstand und
 * ersetzt beim Hochladen den gesamten Bestand (POST /api/cockpit/patris).
 */
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export type PatrisUploadStatus = {
  /** „TT.MM.JJJJ, HH:MM Uhr" oder null, wenn noch nie hochgeladen. */
  importedAt: string | null
  fileName: string | null
  importedBy: string | null
  rowCount: number
}

type Result = { kind: 'ok' | 'no'; text: string }

function de(n: number): string {
  return n.toLocaleString('de-DE')
}

export function PatrisUpload({ status }: { status: PatrisUploadStatus }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/cockpit/patris', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        const parts = [`${de(data.rowCount)} Tickets übernommen`]
        if (data.skippedRows) parts.push(`${de(data.skippedRows)} Zeilen ohne entitlement_id übersprungen`)
        if (data.invalidDates) parts.push(`${de(data.invalidDates)} Zeilen mit unlesbarem Datum`)
        setResult({ kind: 'ok', text: parts.join(' · ') })
        if (inputRef.current) inputRef.current.value = ''
        setFileName(null)
        router.refresh()
      } else if (res.status === 403) {
        setResult({ kind: 'no', text: 'Keine Berechtigung für den Upload.' })
      } else {
        setResult({ kind: 'no', text: data.error || 'Der Upload ist fehlgeschlagen.' })
      }
    } catch {
      setResult({ kind: 'no', text: 'Verbindungsfehler. Bitte erneut versuchen.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cx-card">
      <h3 className="cx-card-h">Patris-Ticketdaten hochladen</h3>
      <div className="cx-card-hint">
        CSV-Export aus Patris. Der Upload ersetzt den gesamten bisherigen Bestand. Übernommen werden
        nur entitlement_id, Gültigkeit, Produkt, Kundennummer, E-Mail und Name.
      </div>

      <dl className="cx-patris-status">
        <div>
          <dt>Stand</dt>
          <dd>{status.importedAt ?? 'Noch keine Daten hochgeladen'}</dd>
        </div>
        {status.importedAt && (
          <>
            <div>
              <dt>Tickets</dt>
              <dd>{de(status.rowCount)}</dd>
            </div>
            <div>
              <dt>Datei</dt>
              <dd className="cx-patris-mono">{status.fileName ?? '—'}</dd>
            </div>
            <div>
              <dt>Hochgeladen von</dt>
              <dd>{status.importedBy ?? '—'}</dd>
            </div>
          </>
        )}
      </dl>

      <form className="cx-patris-form" onSubmit={onSubmit}>
        <label className="cx-patris-file">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? null)
              setResult(null)
            }}
          />
          <span className="cx-patris-file-btn">Datei auswählen</span>
          <span className="cx-patris-file-name">{fileName ?? 'Keine Datei ausgewählt'}</span>
        </label>
        <button type="submit" className="cx-btn" disabled={!fileName || busy}>
          {busy ? 'Wird importiert …' : 'Hochladen und ersetzen'}
        </button>
      </form>

      {result && <div className={`cx-verdict cx-verdict--${result.kind}`}>{result.text}</div>}
    </div>
  )
}
