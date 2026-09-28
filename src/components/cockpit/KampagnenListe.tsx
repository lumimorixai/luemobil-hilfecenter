'use client'

/**
 * Kampagnen anlegen, bearbeiten und Listen erzeugen — die ganze Leitungsarbeit
 * an einer Stelle.
 *
 * Bewusst nicht im Payload-Admin: Wer Kampagnen führt, braucht keinen Zugang
 * zum CMS, und die Prüfungen (Rechtsgrundlage, gültige Felder, Kennung) sollen
 * an einer Stelle stehen statt einmal hier und einmal dort.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Karte } from './bausteine'
import { KampagnenAktionen } from './KampagnenAktionen'
import { KampagnenEditor, LEERE_KAMPAGNE, type KampagnenEntwurf } from './KampagnenEditor'
import { MERKMAL, OPERATOREN, OHNE_WERT, feldLabel } from '@/lib/kampagnen/regeln'

export type KampagnenAnsicht = KampagnenEntwurf & {
  id: number | string
  faelleGesamt: number
  faelleOffen: number
  faelleErledigt: number
  erzeugtAm: string | null
}

const de = (n: number) => n.toLocaleString('de-DE')

const STATUS: Record<string, { label: string; klasse: string }> = {
  entwurf: { label: 'Entwurf', klasse: '' },
  aktiv: { label: 'Aktiv', klasse: '' },
  pausiert: { label: 'Pausiert', klasse: 'amber' },
  beendet: { label: 'Beendet', klasse: '' },
}

const KANAL: Record<string, string> = {
  telefon: 'Telefon',
  email: 'E-Mail',
  brief: 'Brief',
  sonstiges: 'Anderer Weg',
}

function datum(wert: string | null): string {
  if (!wert) return '—'
  const d = new Date(wert)
  if (Number.isNaN(d.getTime())) return '—'
  return (
    d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' Uhr'
  )
}

export function KampagnenListe({ kampagnen }: { kampagnen: KampagnenAnsicht[] }) {
  const router = useRouter()
  const [neu, setNeu] = useState(false)

  return (
    <>
      {!neu && (
        <div className="cx-knopfreihe" style={{ marginBottom: 18 }}>
          <button type="button" className="cx-knopf cx-knopf--akzent" onClick={() => setNeu(true)}>
            Neue Kampagne
          </button>
        </div>
      )}

      {neu && (
        <Karte>
          <KampagnenEditor
            start={LEERE_KAMPAGNE}
            onFertig={() => {
              setNeu(false)
              router.refresh()
            }}
            onAbbruch={() => setNeu(false)}
          />
        </Karte>
      )}

      {kampagnen.length === 0 && !neu && (
        <Karte>
          <div className="cx-leer">
            Es ist noch keine Kampagne angelegt.
            <br />
            Eine Kampagne bestimmt, wer kontaktiert wird, womit und mit welchem Ergebnis.
          </div>
        </Karte>
      )}

      {kampagnen.map((k) => (
        <KampagneKarte key={k.id} k={k} />
      ))}
    </>
  )
}

function KampagneKarte({ k }: { k: KampagnenAnsicht }) {
  const router = useRouter()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [loeschfrage, setLoeschfrage] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const status = STATUS[k.status] ?? STATUS.entwurf
  const anteil = k.faelleGesamt > 0 ? Math.round((k.faelleErledigt / k.faelleGesamt) * 100) : 0
  const aktiveRegeln = k.regeln.filter((r) => r.aktiv)
  const aktivierbar = Boolean(k.rechtsgrundlage) && aktiveRegeln.length > 0

  async function loeschen() {
    setFehler(null)
    try {
      const res = await fetch('/api/cockpit/kampagnen', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: k.id }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setFehler(data.error ?? `Die Anfrage schlug fehl (HTTP ${res.status}).`)
        return
      }
      setLoeschfrage(false)
      router.refresh()
    } catch (err) {
      setFehler(`Der Server war nicht erreichbar: ${(err as Error).message}`)
    }
  }

  if (bearbeiten) {
    return (
      <Karte>
        <KampagnenEditor
          start={k}
          onFertig={() => {
            setBearbeiten(false)
            router.refresh()
          }}
          onAbbruch={() => setBearbeiten(false)}
        />
      </Karte>
    )
  }

  return (
    <Karte>
      <div className="cx-kampagne">
        <div className="cx-kampagne-kopf">
          <h2>{k.name}</h2>
          <span className={`cx-pill ${status.klasse}`}>{status.label}</span>
          <span className="cx-pill">{KANAL[k.kanal] ?? k.kanal}</span>
          <span className="cx-karte-quelle" style={{ marginLeft: 'auto' }}>
            {k.kennung}
          </span>
        </div>

        {k.beschreibung && <p className="cx-card-hint">{k.beschreibung}</p>}

        <div className="cx-paare">
          <div>
            <span className="k">Fälle gesamt</span>
            <span className="v">{de(k.faelleGesamt)}</span>
          </div>
          <div>
            <span className="k">Davon offen</span>
            <span className="v">{de(k.faelleOffen)}</span>
          </div>
          <div>
            <span className="k">Davon erledigt</span>
            <span className="v">
              {de(k.faelleErledigt)}
              {k.faelleGesamt > 0 && <em className="cx-toplist-sub"> · {anteil} %</em>}
            </span>
          </div>
          <div>
            <span className="k">Liste erzeugt</span>
            <span className="v">{datum(k.erzeugtAm)}</span>
          </div>
        </div>

        {k.faelleGesamt > 0 && (
          <div className="cx-bar">
            <i style={{ width: `${anteil}%` }} />
          </div>
        )}

        {k.regeln.length > 0 && (
          <div className="cx-kampagne-regeln">
            {k.regeln.map((r, i) => (
              <span className={`cx-regel${r.aktiv ? '' : ' aus'}`} key={i}>
                <b>{feldLabel(r.feld)}</b>
                {OPERATOREN[r.operator as keyof typeof OPERATOREN] ?? r.operator}
                {!OHNE_WERT.has(r.operator) && r.wert ? <b>{r.wert}</b> : null}
                {!r.aktiv && <em>aus</em>}
              </span>
            ))}
            {aktiveRegeln.length > 1 && (
              <span className="cx-regel-verknuepfung">
                {k.regelVerknuepfung === 'oder' ? 'eine genügt' : 'alle müssen zutreffen'}
              </span>
            )}
          </div>
        )}

        {k.regeln.some((r) => r.feld.startsWith(MERKMAL)) && (
          <p className="cx-card-hint">
            Diese Kampagne bezieht sich auf Merkmale einer hochgeladenen Liste. Aus dem
            Ticketbestand entstehen dafür keine Fälle.
          </p>
        )}

        {!k.rechtsgrundlage && (
          <p className="cx-fehler">
            Ohne Angabe der Rechtsgrundlage wird keine Liste erzeugt. Bei Kontaktaufnahme gegenüber
            Verbrauchern ist neben der DSGVO auch § 7 UWG zu beachten.
          </p>
        )}

        <KampagnenAktionen kampagne={k.id} name={k.name} aktivierbar={aktivierbar} />

        <div className="cx-knopfreihe">
          <button type="button" className="cx-knopf" onClick={() => setBearbeiten(true)}>
            Bearbeiten
          </button>
          {k.faelleGesamt === 0 && !loeschfrage && (
            <button type="button" className="cx-knopf" onClick={() => setLoeschfrage(true)}>
              Löschen
            </button>
          )}
        </div>

        {loeschfrage && (
          <div className="cx-hinweis">
            <p>Die Kampagne „{k.name}" wird gelöscht. Sie hat noch keine Fälle.</p>
            <div className="cx-knopfreihe">
              <button type="button" className="cx-knopf cx-knopf--akzent" onClick={() => void loeschen()}>
                Ja, löschen
              </button>
              <button type="button" className="cx-knopf" onClick={() => setLoeschfrage(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {fehler && <p className="cx-fehler">{fehler}</p>}
      </div>
    </Karte>
  )
}
