'use client'

/**
 * Trockenlauf und Listenerzeugung einer Kampagne.
 *
 * Erzeugen ist erst freigeschaltet, wenn vorher gerechnet wurde: Eine Liste mit
 * mehreren tausend Personen entsteht nicht auf einen unbedachten Klick. Die
 * Bilanz des Trockenlaufs nennt jede Zahl, auch die aussortierten.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type Bilanz = {
  geprueft: number
  getroffen: number
  neu: number
  ohneKontakt: number
  dublette: number
  gesperrt: number
  schonVorhanden: number
  kontenAbgeglichen: boolean
}

const de = (n: number) => n.toLocaleString('de-DE')

export function KampagnenAktionen({
  kampagne,
  name,
  aktivierbar,
}: {
  kampagne: number | string
  name: string
  aktivierbar: boolean
}) {
  const router = useRouter()
  const [laeuft, setLaeuft] = useState<'probe' | 'erzeugen' | null>(null)
  const [bilanz, setBilanz] = useState<Bilanz | null>(null)
  const [erzeugt, setErzeugt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [nachfrage, setNachfrage] = useState(false)

  async function ruf(probe: boolean) {
    setLaeuft(probe ? 'probe' : 'erzeugen')
    setFehler(null)
    try {
      const res = await fetch('/api/cockpit/kampagnen/erzeugen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kampagne, probe }),
      })
      const data = (await res.json()) as { bilanz?: Bilanz; error?: string }
      if (!res.ok) {
        setFehler(data.error ?? `Die Anfrage schlug fehl (HTTP ${res.status}).`)
        return
      }
      setBilanz(data.bilanz ?? null)
      if (!probe) {
        setErzeugt(true)
        setNachfrage(false)
        router.refresh()
      }
    } catch (err) {
      setFehler(`Der Server war nicht erreichbar: ${(err as Error).message}`)
    } finally {
      setLaeuft(null)
    }
  }

  return (
    <div className="cx-kampagne-aktionen">
      <div className="cx-knopfreihe">
        <button
          type="button"
          className="cx-knopf"
          onClick={() => void ruf(true)}
          disabled={laeuft !== null}
        >
          {laeuft === 'probe' ? 'Rechne …' : 'Liste durchrechnen'}
        </button>
        {bilanz && !erzeugt && !nachfrage && (
          <button
            type="button"
            className="cx-knopf cx-knopf--akzent"
            onClick={() => setNachfrage(true)}
            disabled={laeuft !== null || bilanz.neu === 0 || !aktivierbar}
          >
            {bilanz.neu === 0 ? 'Nichts anzulegen' : `${de(bilanz.neu)} Fälle anlegen`}
          </button>
        )}
      </div>

      {nachfrage && bilanz && (
        <div className="cx-hinweis">
          <p>
            <strong>{de(bilanz.neu)} Personen</strong> werden in die Liste „{name}" aufgenommen und
            können danach kontaktiert werden. Name, Telefonnummer und Geburtsdatum werden dabei aus
            dem Patris-Bestand kopiert.
          </p>
          <div className="cx-knopfreihe">
            <button
              type="button"
              className="cx-knopf cx-knopf--akzent"
              onClick={() => void ruf(false)}
              disabled={laeuft !== null}
            >
              {laeuft === 'erzeugen' ? 'Lege an …' : 'Ja, Liste anlegen'}
            </button>
            <button type="button" className="cx-knopf" onClick={() => setNachfrage(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {!aktivierbar && (
        <p className="cx-card-hint">
          Erst ausfüllen: Rechtsgrundlage und mindestens eine Auswahlregel. Ohne beides wird keine
          Liste angelegt.
        </p>
      )}

      {fehler && <p className="cx-fehler">{fehler}</p>}

      {bilanz && (
        <div className="cx-tablewrap">
          <table className="cx-table">
            <tbody>
              <tr>
                <td>Geprüfte Berechtigungen</td>
                <td>{de(bilanz.geprueft)}</td>
              </tr>
              <tr>
                <td>Von den Regeln getroffen</td>
                <td>{de(bilanz.getroffen)}</td>
              </tr>
              <tr>
                <td className="leise">– ohne nutzbaren Kontaktweg</td>
                <td className="leise">{de(bilanz.ohneKontakt)}</td>
              </tr>
              <tr>
                <td className="leise">– mehrfach in der Auswahl</td>
                <td className="leise">{de(bilanz.dublette)}</td>
              </tr>
              <tr>
                <td className="leise">– auf der Sperrliste</td>
                <td className="leise">{de(bilanz.gesperrt)}</td>
              </tr>
              <tr>
                <td className="leise">– schon in dieser Kampagne</td>
                <td className="leise">{de(bilanz.schonVorhanden)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>{erzeugt ? 'Angelegt' : 'Neu anzulegen'}</td>
                <td style={{ fontWeight: 600 }}>{de(bilanz.neu)}</td>
              </tr>
            </tbody>
          </table>
          <p className="cx-card-hint">
            {bilanz.kontenAbgeglichen
              ? 'Konten wurden gegen Keycloak abgeglichen (Stand höchstens zehn Minuten alt).'
              : 'Keine Regel verlangte den Abgleich mit Keycloak — Konten wurden nicht geprüft.'}
          </p>
        </div>
      )}
    </div>
  )
}
