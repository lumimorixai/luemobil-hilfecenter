'use client'

/**
 * Kundencheck: E-Mail eingeben → Ampel mit Handlungstext aus dem CMS, dazu
 * Ticket laut Patris, Konto in Keycloak, Käufe in der App und die letzten
 * Ereignisse.
 *
 * Ruft /api/cockpit/check (Berechtigung wird serverseitig geprüft). Die Adresse
 * geht per POST raus, damit sie nicht in Logs, Proxy oder Browserverlauf landet.
 * Zustände: Ruhe, Laden, Ergebnis, Fehler (403 / Rate-Limit / Störung).
 *
 * Aufbau nach dem Cockpit-Entwurf: Suchzeile als Pille, das Ergebnis als eigene
 * Karte mit farbiger Kante. Darunter drei Karten nach Gewicht — was die Person
 * gekauft hat (breit), was ihr zusteht (mittel), ob sie ein Konto hat (schmal).
 * Statusfarben zeigen einen Zustand, nie Dekoration.
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
      const res = await fetch('/api/cockpit/check', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: q }),
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
    <>
      <form className="cx-searchrow cx-glas" onSubmit={onSubmit}>
        <label htmlFor="cx-check-mail">E-Mail</label>
        <input
          id="cx-check-mail"
          type="email"
          className="cx-input"
          placeholder="kunde@example.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="cx-btn" disabled={loading}>
          {loading ? 'Prüfe …' : 'Nachsehen'}
        </button>
      </form>

      {error && (
        <div className="cx-verdict cx-verdict--no cx-glas">
          <span className="cx-punkt cx-punkt--no" />
          {error}
        </div>
      )}

      {loading && (
        <div className="cx-skelett cx-glas" aria-live="polite" aria-busy="true">
          <i />
          <i />
          <i />
        </div>
      )}

      {result && !error && !loading && (
        <div className="cx-pipeline">
          <div className={`cx-result cx-glas cx-result--${result.verdict.kind}`}>
            <TrafficLight lamp={result.verdict.kind} />
            <div className="cx-result-body">
              <div className="cx-result-kicker">Ticket laut Patris · {result.ticket.label}</div>
              <h2 className="cx-result-title">{result.verdict.title}</h2>
              <p className="cx-result-text">{result.verdict.text}</p>
            </div>
            <span className="cx-result-quelle cx-pille">Text aus dem CMS</span>
          </div>

          {/*
            Reihenfolge nach Gewicht: Was die Person tatsächlich gekauft hat,
            steht zuerst und bekommt den meisten Platz. Dann, was ihr laut
            Patris zusteht. Das Konto in Keycloak ist nur noch die Randnotiz
            „kommt sie überhaupt rein" und sitzt schmal rechts.
          */}
          <div className="cx-check-cols">
            <Purchases data={result.purchases} />

            <TicketKarte tickets={result.ticket.tickets} stand={result.ticket.dataAsOf} />

            <section className="cx-step cx-step--schmal cx-glas">
              <div className="cx-step-who">
                <h3>Konto</h3>
              </div>
              <div className="cx-step-state">
                <span className={`cx-punkt cx-punkt--${result.keycloak.state}`} />
                <span>{result.keycloak.label}</span>
              </div>
              <div className="cx-step-detail">{result.keycloak.detail}</div>
              <div className="cx-step-fuss">live aus Keycloak</div>
            </section>
          </div>

          <section className="cx-step cx-glas">
            <div className="cx-step-who">
              <h3>Letzte Ereignisse</h3>
              <span className="quelle">live aus Keycloak · höchstens zehn</span>
            </div>
            {result.events.length === 0 ? (
              <div className="cx-ev-empty">Keine Ereignisse registriert.</div>
            ) : (
              <ul className="cx-evlist">
                {result.events.map((ev, i) => (
                  <li className="cx-ev" key={i}>
                    <span className={`cx-punkt cx-punkt--${ev.kind}`} />
                    <span className="cx-ev-time">{ev.time}</span>
                    <span className="cx-ev-label">{ev.label}</span>
                    {ev.clientId && <span className="cx-ev-client">{ev.clientId}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="cx-asof">
            Datenstand Patris: {result.ticket.dataAsOf ?? 'noch keine Daten hochgeladen'}
          </div>
        </div>
      )}
    </>
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

/** Das wichtigste Ticket ausführlich, weitere kompakt darunter. */
function TicketKarte({ tickets, stand }: { tickets: TicketItem[]; stand: string | null }) {
  if (tickets.length === 0) {
    return (
      <section className="cx-step cx-step--mittel cx-glas">
        <div className="cx-step-who">
          <h3>Ticket laut Patris</h3>
          <span className="quelle">{stand ? `Stand ${stand}` : 'kein Upload'}</span>
        </div>
        <div className="cx-ev-empty">
          Zu dieser Adresse ist im hochgeladenen Export kein Ticket vermerkt.
        </div>
      </section>
    )
  }

  const [main, ...more] = tickets
  const name = [main.firstName, main.lastName].filter(Boolean).join(' ') || '—'
  return (
    <section className="cx-step cx-step--mittel cx-glas">
      <div className="cx-step-who">
        <h3>Ticket laut Patris</h3>
        <span className="quelle">{stand ? `Stand ${stand}` : 'kein Upload'}</span>
      </div>

      <div className="cx-paare-liste">
        <div>
          <span className="k">Produkt</span>
          <span className="v">
            {main.productName || '—'}
            {main.productNumber && (
              <span className="cx-ticket-sub"> · Nr. {main.productNumber}</span>
            )}
          </span>
        </div>
        <div>
          <span className="k">Gültig</span>
          <span className="v">{validity(main)}</span>
        </div>
        <div>
          <span className="k">Status</span>
          <span className="v cx-ticket-status">
            <span className={`cx-punkt cx-punkt--${STATUS_TEXT[main.status].dot}`} />
            {STATUS_TEXT[main.status].text}
          </span>
        </div>
        <div>
          <span className="k">Name</span>
          <span className="v">{name}</span>
        </div>
        <div>
          <span className="k">Kundennummer</span>
          <span className="v cx-mono">{main.customerNumber || '—'}</span>
        </div>
        <div>
          <span className="k">Berechtigung</span>
          <span className="v cx-mono">{main.entitlementId}</span>
        </div>
      </div>

      {more.length > 0 && (
        <div className="cx-ticket-more">
          <div className="cx-step-who" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14 }}>Weitere Tickets ({more.length})</h3>
          </div>
          <ul className="cx-evlist">
            {more.map((t) => (
              <li className="cx-ev" key={t.entitlementId}>
                <span className={`cx-punkt cx-punkt--${STATUS_TEXT[t.status].dot}`} />
                <span className="cx-ev-label">
                  {t.productName || '—'} · {validity(t)}
                </span>
                <span className="cx-ev-client">Kd. {t.customerNumber || '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

const ORDERS_COLLAPSED = 5

/**
 * Käufe in der LüMobil-App (Ticket-API) — die wichtigste Karte des
 * Kundenchecks: Sie zeigt, was die Person tatsächlich hat.
 *
 * Bewusst als gruppierte Liste statt als Tabelle: Eine Bestellung mit mehreren
 * Positionen hatte in der Tabelle leere Zellen für Datum und Bestellnummer, und
 * die Tabelle brauchte mehr Breite, als die Karte hergibt.
 */
function Purchases({ data }: { data: Diagnosis['purchases'] }) {
  const [all, setAll] = useState(false)
  const shown: PurchaseOrder[] = all ? data.orders : data.orders.slice(0, ORDERS_COLLAPSED)
  const positionen = data.orders.reduce((n, o) => n + o.items.length, 0)
  const offen = data.orders.reduce(
    (n, o) => n + o.items.filter((i) => !i.erfolgreich).length,
    0,
  )

  return (
    <section className="cx-step cx-step--breit cx-glas">
      <div className="cx-step-who">
        <h3>Käufe in der App</h3>
        <span className="quelle">Ticket-API, live</span>
      </div>

      {data.state === 'error' ? (
        <div className="cx-buy-note">
          <span className="cx-punkt cx-punkt--warn" />
          {data.message}
        </div>
      ) : data.orders.length === 0 ? (
        <div className="cx-ev-empty">Keine Bestellungen zu dieser Adresse.</div>
      ) : (
        <>
          <div className="cx-buy-summe">
            <span>
              <b>{data.orders.length}</b> {data.orders.length === 1 ? 'Bestellung' : 'Bestellungen'}
            </span>
            <span>
              <b>{positionen}</b> {positionen === 1 ? 'Ticket' : 'Tickets'}
            </span>
            {offen > 0 && (
              <span className="nicht-ok">
                <span className="cx-punkt cx-punkt--no" />
                {offen} nicht ausgeliefert
              </span>
            )}
          </div>

          <ol className="cx-buy-liste">
            {shown.map((o) => (
              <li key={o.bestellnummer}>
                <div className="cx-buy-kopf">
                  <span className="cx-buy-datum">{o.gekauftAm}</span>
                  <span className="cx-buy-nr cx-mono">{o.bestellnummer}</span>
                </div>
                {o.items.map((it, i) => (
                  <div className="cx-buy-pos" key={`${o.bestellnummer}-${i}`}>
                    <span
                      className={`cx-punkt cx-punkt--${it.erfolgreich ? 'ok' : 'no'}`}
                      title={it.status || (it.erfolgreich ? 'Ausgeliefert' : 'Nicht ausgeliefert')}
                    />
                    <span className="cx-buy-produkt">
                      {it.menge > 1 && <span className="cx-buy-menge">{it.menge} ×</span>}
                      {it.produkt || '—'}
                      {it.sku && <span className="cx-buy-sku"> · Tarif {it.sku}</span>}
                    </span>
                    <span className="cx-buy-preis">{it.preis}</span>
                    <span className="cx-buy-status">
                      {it.status || (it.erfolgreich ? 'Ausgeliefert' : 'Nicht ausgeliefert')}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ol>

          {data.orders.length > ORDERS_COLLAPSED && (
            <button type="button" className="cx-buy-more" onClick={() => setAll((v) => !v)}>
              {all ? 'Weniger anzeigen' : `Alle ${data.orders.length} Bestellungen anzeigen`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
