'use client'

/**
 * Der Arbeitsplatz: einen Fall holen, bearbeiten, Ergebnis festhalten.
 *
 * Es gibt keine Liste zum Durchstöbern. Wer arbeitet, klickt „Nächster Fall"
 * und bekommt zugeteilt — das verhindert Rosinenpicken und hält die Zuteilung
 * nachvollziehbar. Die Person, um die es geht, steht dabei im Vordergrund,
 * nicht die Kampagne.
 */
import { useEffect, useState } from 'react'
import { Karte } from './bausteine'

export type Ergebnisknopf = {
  code: string
  label: string
  wirkung: string
  standardWiedervorlageTage: number | null
  notizPflicht: boolean
}

export type KampagneKurz = {
  id: number | string
  name: string
  kanal: string
  gespraechsleitfaden: string
  faelleOffen: number
  ergebnisse: Ergebnisknopf[]
}

type Fall = {
  id: number | string
  vorname: string
  nachname: string
  telefon: string
  email: string
  kundennummer: string
  produktnummer: string
  geburtsdatum: string | null
  merkmale: Record<string, string> | null
  versuche: number
  letzterVersuchAm: string | null
  wiedervorlageAm: string | null
  kontoVorhanden: boolean | null
}

type Verlauf = { zeitpunkt: string; bearbeiter: string; ergebnisCode: string; notiz: string }

type Uebersprungen = { konto: number; widerspruch: number }

/**
 * Was beim Zuteilen still aussortiert wurde, in einem Satz.
 *
 * Ohne diesen Satz stünde hier nur „kein Fall offen", während im Hintergrund
 * die halbe Liste verschwindet — genau die Frage, die sonst als Störung
 * gemeldet wird.
 */
function uebersprungenText(u: Uebersprungen | undefined): string {
  if (!u) return ''
  const teile: string[] = []
  if (u.konto > 0) {
    teile.push(
      `${u.konto} ${u.konto === 1 ? 'Person hat' : 'Personen haben'} inzwischen ein Konto in der App`,
    )
  }
  if (u.widerspruch > 0) {
    teile.push(
      `${u.widerspruch} ${u.widerspruch === 1 ? 'Person steht' : 'Personen stehen'} auf der Sperrliste`,
    )
  }
  if (teile.length === 0) return ''
  const gesamt = u.konto + u.widerspruch
  return `${gesamt} ${gesamt === 1 ? 'Fall wurde' : 'Fälle wurden'} übersprungen und abgeschlossen: ${teile.join(', ')}.`
}

function datum(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nurDatum(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Arbeitsplatz({ kampagnen }: { kampagnen: KampagneKurz[] }) {
  const [kampagneId, setKampagneId] = useState<string>(String(kampagnen[0]?.id ?? ''))
  const [fall, setFall] = useState<Fall | null>(null)
  const [verlauf, setVerlauf] = useState<Verlauf[]>([])
  const [meldung, setMeldung] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [notiz, setNotiz] = useState('')
  const [wiedervorlage, setWiedervorlage] = useState('')
  const [begonnen, setBegonnen] = useState<number | null>(null)
  const [erledigt, setErledigt] = useState(0)

  const kampagne = kampagnen.find((k) => String(k.id) === kampagneId) ?? kampagnen[0]

  // Wer den Browser schließt, soll den Fall nicht blockieren. Die Haltefrist
  // regelt das ohnehin, aber sofort freigeben ist freundlicher zu den Übrigen.
  useEffect(() => {
    if (!fall) return
    const beimVerlassen = () => {
      navigator.sendBeacon?.(
        '/api/cockpit/kampagnen/arbeiten',
        new Blob([JSON.stringify({ was: 'freigeben', fall: fall.id })], {
          type: 'application/json',
        }),
      )
    }
    window.addEventListener('pagehide', beimVerlassen)
    return () => window.removeEventListener('pagehide', beimVerlassen)
  }, [fall])

  async function ruf(daten: Record<string, unknown>) {
    const res = await fetch('/api/cockpit/kampagnen/arbeiten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(daten),
    })
    const antwort = (await res.json()) as Record<string, unknown>
    if (!res.ok) throw new Error((antwort.error as string) ?? `Fehler (HTTP ${res.status}).`)
    return antwort
  }

  async function naechster() {
    if (!kampagne) return
    setLaeuft(true)
    setFehler(null)
    setMeldung(null)
    try {
      const a = await ruf({ was: 'naechster', kampagne: kampagne.id })
      const u = uebersprungenText(a.uebersprungen as Uebersprungen | undefined)
      if (a.art === 'fall') {
        setFall(a.fall as Fall)
        setVerlauf((a.verlauf as Verlauf[]) ?? [])
        setNotiz('')
        setWiedervorlage('')
        setBegonnen(Date.now())
        setMeldung(u)
      } else {
        setFall(null)
        setVerlauf([])
        setMeldung([String(a.grund ?? 'Kein Fall offen.'), u].filter(Boolean).join(' '))
      }
    } catch (err) {
      setFehler((err as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  async function abschliessen(knopf: Ergebnisknopf) {
    if (!fall || !kampagne) return
    if (knopf.notizPflicht && !notiz.trim()) {
      setFehler(`Für „${knopf.label}" ist eine Notiz erforderlich.`)
      return
    }
    setLaeuft(true)
    setFehler(null)
    try {
      await ruf({
        was: 'ergebnis',
        kampagne: kampagne.id,
        fall: fall.id,
        ergebnis: knopf.code,
        notiz,
        wiedervorlageAm: wiedervorlage ? new Date(wiedervorlage).toISOString() : null,
        dauerSekunden: begonnen ? Math.round((Date.now() - begonnen) / 1000) : null,
      })
      setErledigt((n) => n + 1)
      setFall(null)
      setVerlauf([])
      setNotiz('')
      setWiedervorlage('')
      // Gleich den nächsten holen: Wer abarbeitet, will weiter, nicht klicken.
      await naechster()
    } catch (err) {
      setFehler((err as Error).message)
      setLaeuft(false)
    }
  }

  async function freigeben() {
    if (!fall) return
    setLaeuft(true)
    setFehler(null)
    try {
      await ruf({ was: 'freigeben', fall: fall.id })
      setFall(null)
      setVerlauf([])
      setMeldung('Der Fall wurde zurückgegeben.')
    } catch (err) {
      setFehler((err as Error).message)
    } finally {
      setLaeuft(false)
    }
  }

  if (kampagnen.length === 0) {
    return (
      <Karte>
        <div className="cx-leer">
          Es läuft gerade keine Kampagne.
          <br />
          Eine Kampagne gibt Fälle erst aus, wenn sie den Status „Aktiv" hat und eine Liste erzeugt
          wurde.
        </div>
      </Karte>
    )
  }

  return (
    <>
      <Karte>
        <div className="cx-arbeit-kopf">
          <label className="cx-feld">
            <span>Kampagne</span>
            <select
              value={kampagneId}
              onChange={(ev) => {
                setKampagneId(ev.target.value)
                setFall(null)
                setMeldung(null)
              }}
              disabled={Boolean(fall)}
            >
              {kampagnen.map((k) => (
                <option key={k.id} value={String(k.id)}>
                  {k.name} · {k.faelleOffen} offen
                </option>
              ))}
            </select>
          </label>
          <div className="cx-arbeit-zaehler">
            <div className="cx-kpi-n">{erledigt}</div>
            <div className="cx-kpi-l">in dieser Sitzung</div>
          </div>
        </div>

        {!fall && (
          <div className="cx-knopfreihe">
            <button
              type="button"
              className="cx-knopf cx-knopf--akzent"
              onClick={() => void naechster()}
              disabled={laeuft}
            >
              {laeuft ? 'Hole …' : 'Nächster Fall'}
            </button>
          </div>
        )}

        {meldung && <p className="cx-card-hint">{meldung}</p>}
        {fehler && <p className="cx-fehler">{fehler}</p>}
      </Karte>

      {fall && (
        <>
          <Karte titel="Person" quelle={`Versuch ${fall.versuche + 1}`}>
            <div className="cx-person">
              <div className="cx-person-name">
                {fall.vorname} {fall.nachname}
              </div>
              {kampagne?.kanal === 'telefon' && fall.telefon && (
                <a className="cx-telefon" href={`tel:${fall.telefon}`}>
                  {fall.telefon}
                </a>
              )}
              {kampagne?.kanal === 'email' && fall.email && (
                <a className="cx-telefon" href={`mailto:${fall.email}`}>
                  {fall.email}
                </a>
              )}
            </div>

            {fall.kontoVorhanden === true && (
              <p className="cx-hinweis-zeile">
                Diese Person hat bereits ein Konto in der App. Die Kampagne führt sie trotzdem —
                ob das für das Gespräch eine Rolle spielt, steht im Leitfaden.
              </p>
            )}

            <div className="cx-paare">
              {fall.email && kampagne?.kanal !== 'email' && (
                <div>
                  <span className="k">E-Mail</span>
                  <span className="v">{fall.email}</span>
                </div>
              )}
              {fall.kundennummer && (
                <div>
                  <span className="k">Kundennummer</span>
                  <span className="v">{fall.kundennummer}</span>
                </div>
              )}
              {fall.produktnummer && (
                <div>
                  <span className="k">Produkt</span>
                  <span className="v">{fall.produktnummer}</span>
                </div>
              )}
              {fall.geburtsdatum && (
                <div>
                  <span className="k">Geburtsdatum</span>
                  <span className="v">{nurDatum(fall.geburtsdatum)}</span>
                </div>
              )}
              {fall.letzterVersuchAm && (
                <div>
                  <span className="k">Letzter Versuch</span>
                  <span className="v">{datum(fall.letzterVersuchAm)}</span>
                </div>
              )}
              {fall.merkmale &&
                Object.entries(fall.merkmale).map(([k, v]) => (
                  <div key={k}>
                    <span className="k">{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
            </div>
          </Karte>

          {kampagne?.gespraechsleitfaden && (
            <Karte titel="Leitfaden" quelle="aus der Kampagne">
              <p className="cx-leitfaden">{kampagne.gespraechsleitfaden}</p>
            </Karte>
          )}

          {verlauf.length > 0 && (
            <Karte titel="Bisherige Versuche">
              <div className="cx-tablewrap">
                <table className="cx-table">
                  <thead>
                    <tr>
                      <th>Wann</th>
                      <th>Wer</th>
                      <th>Ergebnis</th>
                      <th>Notiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verlauf.map((v, i) => (
                      <tr key={i}>
                        <td>{datum(v.zeitpunkt)}</td>
                        <td>{v.bearbeiter}</td>
                        <td>
                          {kampagne?.ergebnisse.find((e) => e.code === v.ergebnisCode)?.label ??
                            v.ergebnisCode}
                        </td>
                        <td className="leise">{v.notiz || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Karte>
          )}

          <Karte titel="Ergebnis festhalten">
            <label className="cx-feld">
              <span>Notiz</span>
              <textarea
                value={notiz}
                onChange={(ev) => setNotiz(ev.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Nur sachbezogene Vermerke zum Anliegen. Keine Angaben zu Gesundheit, Herkunft oder Ähnlichem, keine Werturteile."
              />
            </label>

            <label className="cx-feld" style={{ maxWidth: 240 }}>
              <span>Wiedervorlage am (wenn abweichend)</span>
              <input
                type="date"
                value={wiedervorlage}
                onChange={(ev) => setWiedervorlage(ev.target.value)}
              />
            </label>

            <div className="cx-knopfreihe">
              {kampagne?.ergebnisse.map((e) => (
                <button
                  key={e.code}
                  type="button"
                  className={`cx-knopf${e.wirkung === 'sperren' ? '' : e.wirkung === 'abschluss' ? ' cx-knopf--akzent' : ''}`}
                  onClick={() => void abschliessen(e)}
                  disabled={laeuft}
                  title={
                    e.wirkung === 'wiedervorlage' && e.standardWiedervorlageTage
                      ? `Wiedervorlage in ${e.standardWiedervorlageTage} Tagen`
                      : undefined
                  }
                >
                  {e.label}
                  {e.notizPflicht && <em className="cx-pflicht"> · Notiz nötig</em>}
                </button>
              ))}
            </div>

            {kampagne?.ergebnisse.length === 0 && (
              <p className="cx-fehler">
                Diese Kampagne hat keine Ergebnisse hinterlegt. Ohne sie lässt sich kein Fall
                abschließen.
              </p>
            )}

            <div className="cx-knopfreihe">
              <button type="button" className="cx-knopf" onClick={() => void freigeben()} disabled={laeuft}>
                Ohne Ergebnis zurückgeben
              </button>
            </div>

            {fehler && <p className="cx-fehler">{fehler}</p>}
          </Karte>
        </>
      )}
    </>
  )
}
