'use client'

/**
 * Kundencheck: E-Mail eingeben → Ticket-Ampel (Patris) mit Hinweis aus dem CMS,
 * Ticketdetails, Keycloak-Status und letzte Ereignisse.
 * Ruft /api/cockpit/check (nur Support-Rolle, serverseitig). Zustände:
 * Ruhe, Laden, Ergebnis, Fehler (403 / Rate-Limit / Störung).
 *
 * Statusfarben (grün/gelb/pink) sind hier zulässig — sie zeigen einen Status,
 * keine Dekoration und keine Diagrammserie (SWL-Design-System).
 * (Aboonline-Prüfung derzeit deaktiviert — Endpoint noch nicht verfügbar.)
 */
import { useState, type FormEvent } from 'react'
import type { Diagnosis, Lamp, PurchaseOrder, TicketItem, TicketStatus } from '@/lib/cockpit/types'
import './kundencheck.css'

export function Kundencheck() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Diagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(value: string) {
    const q = value.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/cockpit/check?email=${encodeURIComponent(q)}`, {
        headers: { Accept: 'application/json' },
      })
      if (res.status === 403) {
        setError('Keine Berechtigung für den Kundencheck.')
        return
      }
      if (res.status === 429) {
        setError('Zu viele Abfragen in kurzer Zeit. Bitte einen Moment warten.')
        return
      }
      if (res.status === 400) {
        setError('Bitte eine gültige E-Mail-Adresse eingeben.')
        return
      }
      if (!res.ok) {
        setError('Die Prüfung ist derzeit nicht möglich. Bitte später erneut versuchen.')
        return
      }
      setResult((await res.json()) as Diagnosis)
    } catch {
      setError('Verbindungsfehler. Bitte später erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(email)
  }

  return (
    <section className="cx-check">
      <h2 className="cx-check-title">Kundencheck</h2>
      <p className="cx-check-sub">
        Prüft zu einer E-Mail-Adresse, ob laut Patris ein Ticket vorgesehen ist, ob ein Konto in
        Keycloak besteht und welche Anmeldungen es zuletzt gab – und was dem Kunden zu sagen ist.
      </p>

      <form className="cx-searchrow" onSubmit={onSubmit}>
        <input
          type="email"
          className="cx-input"
          placeholder="kunde@example.de"
          aria-label="E-Mail-Adresse prüfen"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="cx-btn" disabled={loading}>
          {loading ? 'Prüfe …' : 'Prüfen'}
        </button>
      </form>

      {error && <div className="cx-verdict cx-verdict--no">{error}</div>}

      {result && !error && (
        <div className="cx-pipeline">
          <div className={`cx-result cx-result--${result.verdict.kind}`}>
            <TrafficLight lamp={result.verdict.kind} />
            <div className="cx-result-body">
              <div className="cx-result-kicker">Ticket laut Patris · {result.ticket.label}</div>
              <h3 className="cx-result-title">{result.verdict.title}</h3>
              <p className="cx-result-text">{result.verdict.text}</p>
            </div>
          </div>

          {result.ticket.tickets.length > 0 && <TicketDetails tickets={result.ticket.tickets} />}
          <div className="cx-asof">
            Datenstand Patris: {result.ticket.dataAsOf ?? 'noch keine Daten hochgeladen'}
          </div>

          <Purchases data={result.purchases} />

          <div className="cx-check-cols cx-check-cols--sep">
            <div className="cx-step">
              <div className="cx-step-who">Keycloak-Konto</div>
              <div className="cx-step-state">
                <span className={`cx-dot cx-dot--${result.keycloak.state}`} />
                <span>{result.keycloak.label}</span>
              </div>
              <div className="cx-step-detail">{result.keycloak.detail}</div>
            </div>

            <div className="cx-step">
              <div className="cx-step-who">Letzte Ereignisse (max. 10)</div>
              {result.events.length === 0 ? (
                <div className="cx-ev-empty">Keine Ereignisse registriert</div>
              ) : (
                <ul className="cx-evlist">
                  {result.events.map((ev, i) => (
                    <li className="cx-ev" key={i}>
                      <span className="cx-ev-time">{ev.time}</span>
                      <span className={`cx-dot cx-dot--${ev.kind}`} />
                      <span className="cx-ev-label">{ev.label}</span>
                      {ev.clientId && <span className="cx-ev-client">{ev.clientId}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const LAMP_TEXT: Record<Lamp, string> = { ok: 'Grün', warn: 'Gelb', no: 'Rot', off: 'Aus' }

/** Ampel mit drei Lichtern; nur das zutreffende leuchtet. */
function TrafficLight({ lamp }: { lamp: Lamp }) {
  return (
    <div className="cx-light" role="img" aria-label={`Ampel: ${LAMP_TEXT[lamp]}`}>
      <span className={`cx-light-l cx-light-l--no${lamp === 'no' ? ' on' : ''}`} />
      <span className={`cx-light-l cx-light-l--warn${lamp === 'warn' ? ' on' : ''}`} />
      <span className={`cx-light-l cx-light-l--ok${lamp === 'ok' ? ' on' : ''}`} />
    </div>
  )
}

const STATUS_TEXT: Record<TicketStatus, { dot: Lamp; text: string }> = {
  aktiv: { dot: 'ok', text: 'Gültig' },
  zukuenftig: { dot: 'warn', text: 'Noch nicht gültig' },
  abgelaufen: { dot: 'no', text: 'Abgelaufen' },
}

function validity(t: TicketItem): string {
  if (t.validFrom && t.validUntil) return `${t.validFrom} – ${t.validUntil}`
  if (t.validFrom) return `ab ${t.validFrom}`
  if (t.validUntil) return `bis ${t.validUntil}`
  return 'ohne Angabe'
}

/** Das relevanteste Ticket ausführlich, weitere kompakt darunter. */
function TicketDetails({ tickets }: { tickets: TicketItem[] }) {
  const [main, ...more] = tickets
  const name = [main.firstName, main.lastName].filter(Boolean).join(' ') || '—'
  return (
    <div className="cx-ticket">
      <dl className="cx-ticket-grid">
        <div className="cx-ticket-wide">
          <dt>Ticket</dt>
          <dd>
            {main.productName || '—'}
            {main.productNumber && <span className="cx-ticket-sub"> · Produktnr. {main.productNumber}</span>}
          </dd>
        </div>
        <div>
          <dt>Gültig</dt>
          <dd>{validity(main)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className="cx-ticket-status">
            <span className={`cx-dot cx-dot--${STATUS_TEXT[main.status].dot}`} />
            {STATUS_TEXT[main.status].text}
          </dd>
        </div>
        <div>
          <dt>Name laut Patris</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Kundennummer</dt>
          <dd className="cx-mono">{main.customerNumber || '—'}</dd>
        </div>
        <div>
          <dt>Entitlement-ID</dt>
          <dd className="cx-mono">{main.entitlementId}</dd>
        </div>
      </dl>

      {more.length > 0 && (
        <div className="cx-ticket-more">
          <div className="cx-step-who">Weitere Tickets ({more.length})</div>
          <ul className="cx-evlist">
            {more.map((t) => (
              <li className="cx-ev" key={t.entitlementId}>
                <span className={`cx-dot cx-dot--${STATUS_TEXT[t.status].dot}`} />
                <span className="cx-ev-label">
                  {t.productName || '—'} · {validity(t)}
                </span>
                <span className="cx-ev-client">
                  Kd.-Nr. {t.customerNumber || '—'} · {t.entitlementId}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const ORDERS_COLLAPSED = 5

/** Käufe in der LüMobil-App (Ticket-API), gruppiert nach Bestellnummer. */
function Purchases({ data }: { data: Diagnosis['purchases'] }) {
  const [all, setAll] = useState(false)
  const shown: PurchaseOrder[] = all ? data.orders : data.orders.slice(0, ORDERS_COLLAPSED)
  return (
    <div className="cx-buy">
      <div className="cx-step-who">Käufe in der LüMobil-App</div>
      {data.state === 'error' ? (
        <div className="cx-buy-note">
          <span className="cx-dot cx-dot--warn" />
          {data.message}
        </div>
      ) : data.orders.length === 0 ? (
        <div className="cx-ev-empty">Keine Bestellungen zu dieser E-Mail-Adresse.</div>
      ) : (
        <>
          <div className="cx-buy-scroll">
            <table className="cx-buy-table">
              <thead>
                <tr>
                  <th>Gekauft am</th>
                  <th>Produkt</th>
                  <th className="num">Menge</th>
                  <th className="num">Preis</th>
                  <th>Status</th>
                  <th>Bestellnr.</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) =>
                  o.items.map((it, i) => (
                    <tr key={`${o.bestellnummer}-${i}`} className={i === 0 ? 'first' : 'cont'}>
                      <td className="cx-buy-date">{i === 0 ? o.gekauftAm : ''}</td>
                      <td>
                        {it.produkt || '—'}
                        {it.sku && <span className="cx-buy-sku"> · Tarif {it.sku}</span>}
                      </td>
                      <td className="num">{it.menge}</td>
                      <td className="num">{it.preis}</td>
                      <td>
                        <span className="cx-buy-status">
                          <span className={`cx-dot cx-dot--${it.erfolgreich ? 'ok' : 'no'}`} />
                          {it.status || (it.erfolgreich ? 'Ausgeliefert' : 'Nicht ausgeliefert')}
                        </span>
                      </td>
                      <td className="cx-mono">{i === 0 ? o.bestellnummer : ''}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {data.orders.length > ORDERS_COLLAPSED && (
            <button type="button" className="cx-demo-btn cx-buy-more" onClick={() => setAll((v) => !v)}>
              {all ? 'Weniger anzeigen' : `Alle ${data.orders.length} Bestellungen anzeigen`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
