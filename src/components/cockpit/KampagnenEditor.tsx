'use client'

/**
 * Kampagne bearbeiten — Zielgruppe zusammenklicken statt eintippen.
 *
 * Die Regeln stehen hier als Zeilen, jede mit eigenem Schalter: Eine Regel
 * lässt sich abschalten, ohne sie zu verlieren. Das ist der übliche Weg, eine
 * Zielgruppe einzugrenzen — erst weit fassen, dann nachschärfen, dabei mehrfach
 * durchrechnen.
 *
 * Der Feldkatalog kommt aus dem Code; Merkmale hochgeladener Listen werden als
 * `merkmal:<spalte>` frei eingegeben, damit eine fremde Liste keine
 * Schemaänderung braucht.
 */
import { useState } from 'react'
import { FELDER, MERKMAL, OHNE_WERT, OPERATOREN, type Feldname } from '@/lib/kampagnen/regeln'

export type RegelEntwurf = {
  aktiv: boolean
  feld: string
  operator: string
  wert: string
}

export type ErgebnisEntwurf = {
  code: string
  label: string
  wirkung: string
  standardWiedervorlageTage: number | null
  notizPflicht: boolean
}

export type KampagnenEntwurf = {
  id?: number | string
  name: string
  kennung: string
  beschreibung: string
  gespraechsleitfaden: string
  kanal: string
  status: string
  rechtsgrundlage: string
  herkunft: string
  loeschenNachTagen: number
  maxVersuche: number
  sperreMinuten: number
  kontoAbgleich: string
  regelVerknuepfung: string
  regeln: RegelEntwurf[]
  ergebnisse: ErgebnisEntwurf[]
}

export const LEERE_KAMPAGNE: KampagnenEntwurf = {
  name: '',
  kennung: '',
  beschreibung: '',
  gespraechsleitfaden: '',
  kanal: 'telefon',
  status: 'entwurf',
  rechtsgrundlage: '',
  herkunft: '',
  loeschenNachTagen: 90,
  maxVersuche: 3,
  sperreMinuten: 15,
  kontoAbgleich: 'aus',
  regelVerknuepfung: 'und',
  regeln: [],
  ergebnisse: [],
}

const KANAELE = [
  { wert: 'telefon', label: 'Telefon', hinweis: 'Jeder Fall braucht eine Telefonnummer.' },
  { wert: 'email', label: 'E-Mail', hinweis: 'Jeder Fall braucht eine E-Mail-Adresse.' },
  { wert: 'brief', label: 'Brief', hinweis: 'Kein Kontaktfeld zwingend.' },
  { wert: 'sonstiges', label: 'Anderer Weg', hinweis: 'Kein Kontaktfeld zwingend.' },
]

/**
 * Was ein bestehendes Konto in der App bedeutet, hängt vom Zweck der Aktion ab
 * — deshalb eine Auswahl und keine Annahme.
 */
const KONTO_ABGLEICH = [
  {
    wert: 'aus',
    label: 'Nicht prüfen',
    hinweis: 'Keine Abfrage bei Keycloak. Schnellste Zuteilung.',
  },
  {
    wert: 'ueberspringen',
    label: 'Fall entfällt, wenn ein Konto besteht',
    hinweis: 'Für Aktionen, deren Anlass mit dem Konto erledigt ist — etwa Hilfe beim Einrichten.',
  },
  {
    wert: 'hinweis',
    label: 'Fall zeigen, aber auf das Konto hinweisen',
    hinweis: 'Für Aktionen, die unabhängig vom Konto stattfinden — etwa eine Befragung.',
  },
]

const WIRKUNGEN = [
  { wert: 'abschluss', label: 'Erledigt — Fall ist abgeschlossen' },
  { wert: 'wiedervorlage', label: 'Wiedervorlage — zu einem Datum erneut' },
  { wert: 'erneut', label: 'Erneut versuchen — zurück in die Liste' },
  { wert: 'entfaellt', label: 'Entfällt — nicht weiter verfolgen' },
  { wert: 'sperren', label: 'Sperren — nie wieder kontaktieren' },
]

/**
 * Vorlagen statt fester Vorgaben: Die meisten Aktionen brauchen dieselben
 * Grundergebnisse, aber jede Leitung soll sie anpassen können.
 */
const VORLAGEN: { name: string; ergebnisse: Omit<ErgebnisEntwurf, 'code'>[] }[] = [
  {
    name: 'Gespräch geführt',
    ergebnisse: [
      { label: 'Anliegen erledigt', wirkung: 'abschluss', standardWiedervorlageTage: null, notizPflicht: false },
      { label: 'Später noch einmal', wirkung: 'wiedervorlage', standardWiedervorlageTage: 7, notizPflicht: false },
      { label: 'Kein Interesse', wirkung: 'abschluss', standardWiedervorlageTage: null, notizPflicht: false },
    ],
  },
  {
    name: 'Nicht erreicht',
    ergebnisse: [
      { label: 'Nicht erreicht', wirkung: 'erneut', standardWiedervorlageTage: null, notizPflicht: false },
      { label: 'Kontaktweg stimmt nicht', wirkung: 'entfaellt', standardWiedervorlageTage: null, notizPflicht: false },
    ],
  },
  {
    name: 'Widerspruch',
    ergebnisse: [
      { label: 'Möchte nicht kontaktiert werden', wirkung: 'sperren', standardWiedervorlageTage: null, notizPflicht: false },
    ],
  },
]

function codeAus(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'ergebnis'
  )
}

export function KampagnenEditor({
  start,
  onFertig,
  onAbbruch,
}: {
  start: KampagnenEntwurf
  onFertig: () => void
  onAbbruch: () => void
}) {
  const [e, setE] = useState<KampagnenEntwurf>(start)
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const neu = e.id == null
  const setzen = <K extends keyof KampagnenEntwurf>(k: K, v: KampagnenEntwurf[K]) =>
    setE((alt) => ({ ...alt, [k]: v }))

  // --- Regeln ---------------------------------------------------------------
  const regelAendern = (i: number, teil: Partial<RegelEntwurf>) =>
    setE((alt) => ({
      ...alt,
      regeln: alt.regeln.map((r, j) => (j === i ? { ...r, ...teil } : r)),
    }))

  const regelZu = () =>
    setE((alt) => ({
      ...alt,
      regeln: [...alt.regeln, { aktiv: true, feld: 'produktnummer', operator: 'ist', wert: '' }],
    }))

  const regelWeg = (i: number) =>
    setE((alt) => ({ ...alt, regeln: alt.regeln.filter((_, j) => j !== i) }))

  // --- Ergebnisse -----------------------------------------------------------
  const ergebnisAendern = (i: number, teil: Partial<ErgebnisEntwurf>) =>
    setE((alt) => ({
      ...alt,
      ergebnisse: alt.ergebnisse.map((r, j) => (j === i ? { ...r, ...teil } : r)),
    }))

  const ergebnisZu = () =>
    setE((alt) => ({
      ...alt,
      ergebnisse: [
        ...alt.ergebnisse,
        { code: '', label: '', wirkung: 'abschluss', standardWiedervorlageTage: null, notizPflicht: false },
      ],
    }))

  const ergebnisWeg = (i: number) =>
    setE((alt) => ({ ...alt, ergebnisse: alt.ergebnisse.filter((_, j) => j !== i) }))

  const vorlageZu = (name: string) => {
    const v = VORLAGEN.find((x) => x.name === name)
    if (!v) return
    setE((alt) => {
      const da = new Set(alt.ergebnisse.map((x) => x.label.toLowerCase()))
      const neue = v.ergebnisse
        .filter((x) => !da.has(x.label.toLowerCase()))
        .map((x) => ({ ...x, code: codeAus(x.label) }))
      return { ...alt, ergebnisse: [...alt.ergebnisse, ...neue] }
    })
  }

  // --- Speichern ------------------------------------------------------------
  async function speichern() {
    setSpeichert(true)
    setFehler(null)
    try {
      const res = await fetch('/api/cockpit/kampagnen', {
        method: neu ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...e,
          ergebnisse: e.ergebnisse.map((x) => ({ ...x, code: x.code || codeAus(x.label) })),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setFehler(data.error ?? `Die Anfrage schlug fehl (HTTP ${res.status}).`)
        return
      }
      onFertig()
    } catch (err) {
      setFehler(`Der Server war nicht erreichbar: ${(err as Error).message}`)
    } finally {
      setSpeichert(false)
    }
  }

  const kanalHinweis = KANAELE.find((k) => k.wert === e.kanal)?.hinweis ?? ''

  return (
    <div className="cx-form">
      <h3 className="cx-form-titel">{neu ? 'Neue Kampagne' : 'Kampagne bearbeiten'}</h3>

      {/* --- Grunddaten --- */}
      <div className="cx-form-zeile">
        <label className="cx-feld cx-feld--breit">
          <span>Name</span>
          <input
            value={e.name}
            onChange={(ev) => setzen('name', ev.target.value)}
            placeholder="Wofür wird kontaktiert?"
            maxLength={120}
          />
        </label>
        <label className="cx-feld">
          <span>Kennung</span>
          <input
            value={e.kennung}
            onChange={(ev) => setzen('kennung', ev.target.value)}
            placeholder="wird aus dem Namen gebildet"
            maxLength={60}
          />
        </label>
      </div>

      <label className="cx-feld">
        <span>Zweck</span>
        <textarea
          value={e.beschreibung}
          onChange={(ev) => setzen('beschreibung', ev.target.value)}
          rows={2}
          placeholder="Worum es geht — erscheint in der Auswertung, nicht im Gespräch."
        />
      </label>

      <div className="cx-form-zeile">
        <label className="cx-feld">
          <span>Kanal</span>
          <select value={e.kanal} onChange={(ev) => setzen('kanal', ev.target.value)}>
            {KANAELE.map((k) => (
              <option key={k.wert} value={k.wert}>
                {k.label}
              </option>
            ))}
          </select>
          <em>{kanalHinweis}</em>
        </label>
        <label className="cx-feld">
          <span>Status</span>
          <select value={e.status} onChange={(ev) => setzen('status', ev.target.value)}>
            <option value="entwurf">Entwurf</option>
            <option value="aktiv">Aktiv</option>
            <option value="pausiert">Pausiert</option>
            <option value="beendet">Beendet</option>
          </select>
          <em>Nur aktive Kampagnen geben Fälle aus.</em>
        </label>
      </div>

      <label className="cx-feld">
        <span>Rechtsgrundlage</span>
        <input
          value={e.rechtsgrundlage}
          onChange={(ev) => setzen('rechtsgrundlage', ev.target.value)}
          placeholder="Pflicht vor dem Aktivieren"
          maxLength={300}
        />
        <em>
          Bei Kontaktaufnahme gegenüber Verbrauchern ist neben der DSGVO auch § 7 UWG zu beachten.
        </em>
      </label>

      <label className="cx-feld">
        <span>Leitfaden für die Bearbeitung</span>
        <textarea
          value={e.gespraechsleitfaden}
          onChange={(ev) => setzen('gespraechsleitfaden', ev.target.value)}
          rows={4}
          placeholder="Wird bei jedem Fall angezeigt. Gehört hierher: Anrede, Anlass, Hinweis nach Art. 13/14 DSGVO."
        />
      </label>

      {/* --- Zielgruppe --- */}
      <label className="cx-feld">
        <span>Konto in der App beim Zuteilen prüfen</span>
        <select value={e.kontoAbgleich} onChange={(ev) => setzen('kontoAbgleich', ev.target.value)}>
          {KONTO_ABGLEICH.map((k) => (
            <option key={k.wert} value={k.wert}>
              {k.label}
            </option>
          ))}
        </select>
        <em>
          {KONTO_ABGLEICH.find((k) => k.wert === e.kontoAbgleich)?.hinweis}{' '}
          Die Sperrliste wird unabhängig davon immer geprüft — ein Widerspruch gilt dauerhaft.
        </em>
      </label>

      <div className="cx-form-abschnitt">
        <h4>Zielgruppe</h4>
        <p>
          Wer in die Liste kommt. Regeln lassen sich abschalten, ohne sie zu verlieren — so lässt
          sich eine Zielgruppe schrittweise eingrenzen und dazwischen durchrechnen.
        </p>
      </div>

      {e.regeln.length > 1 && (
        <label className="cx-feld">
          <span>Regeln verknüpfen</span>
          <select
            value={e.regelVerknuepfung}
            onChange={(ev) => setzen('regelVerknuepfung', ev.target.value)}
          >
            <option value="und">UND — alle eingeschalteten Regeln müssen zutreffen</option>
            <option value="oder">ODER — eine eingeschaltete Regel genügt</option>
          </select>
        </label>
      )}

      <div className="cx-regelliste">
        {e.regeln.map((r, i) => {
          const istMerkmal = r.feld.startsWith(MERKMAL)
          const art = istMerkmal ? 'text' : FELDER[r.feld as Feldname]?.art
          const ohneWert = OHNE_WERT.has(r.operator)
          return (
            <div className={`cx-regelzeile${r.aktiv ? '' : ' aus'}`} key={i}>
              <label className="cx-schalter" title="Regel anwenden">
                <input
                  type="checkbox"
                  checked={r.aktiv}
                  onChange={(ev) => regelAendern(i, { aktiv: ev.target.checked })}
                />
                <span aria-hidden="true" />
                <em className="cx-nur-vorleser">Regel anwenden</em>
              </label>

              <select
                value={istMerkmal ? MERKMAL : r.feld}
                onChange={(ev) =>
                  regelAendern(i, {
                    feld: ev.target.value === MERKMAL ? MERKMAL : ev.target.value,
                    wert: '',
                  })
                }
                aria-label="Feld"
              >
                <optgroup label="Ticketbestand">
                  {Object.entries(FELDER).map(([wert, f]) => (
                    <option key={wert} value={wert}>
                      {f.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hochgeladene Liste">
                  <option value={MERKMAL}>Merkmal aus der Liste …</option>
                </optgroup>
              </select>

              {istMerkmal && (
                <input
                  className="cx-merkmal"
                  value={r.feld.slice(MERKMAL.length)}
                  onChange={(ev) => regelAendern(i, { feld: MERKMAL + ev.target.value })}
                  placeholder="Spaltenname"
                  aria-label="Spaltenname"
                  maxLength={60}
                />
              )}

              <select
                value={r.operator}
                onChange={(ev) => regelAendern(i, { operator: ev.target.value })}
                aria-label="Vergleich"
              >
                {Object.entries(OPERATOREN).map(([wert, label]) => (
                  <option key={wert} value={wert}>
                    {label}
                  </option>
                ))}
              </select>

              {!ohneWert &&
                (art === 'bool' ? (
                  <select
                    value={r.wert || 'ja'}
                    onChange={(ev) => regelAendern(i, { wert: ev.target.value })}
                    aria-label="Wert"
                  >
                    <option value="ja">ja</option>
                    <option value="nein">nein</option>
                  </select>
                ) : (
                  <input
                    value={r.wert}
                    onChange={(ev) => regelAendern(i, { wert: ev.target.value })}
                    placeholder="Wert"
                    aria-label="Wert"
                    maxLength={200}
                  />
                ))}

              <button
                type="button"
                className="cx-weg"
                onClick={() => regelWeg(i)}
                aria-label="Regel entfernen"
                title="Regel entfernen"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="cx-knopfreihe">
        <button type="button" className="cx-knopf" onClick={regelZu}>
          Regel hinzufügen
        </button>
      </div>

      {e.regeln.length > 0 && e.regeln.every((r) => !r.aktiv) && (
        <p className="cx-fehler">
          Es ist keine Regel eingeschaltet. So wird keine Liste erzeugt — sonst stünde der gesamte
          Bestand darin.
        </p>
      )}

      {/* --- Ergebnisse --- */}
      <div className="cx-form-abschnitt">
        <h4>Mögliche Ergebnisse</h4>
        <p>
          Die Knöpfe, die nach der Bearbeitung zur Auswahl stehen. Die Wirkung bestimmt, was mit dem
          Fall geschieht.
        </p>
      </div>

      <div className="cx-regelliste">
        {e.ergebnisse.map((g, i) => (
          <div className="cx-ergebniszeile" key={i}>
            <input
              value={g.label}
              onChange={(ev) => ergebnisAendern(i, { label: ev.target.value })}
              placeholder="Beschriftung"
              aria-label="Beschriftung"
              maxLength={80}
            />
            <select
              value={g.wirkung}
              onChange={(ev) => ergebnisAendern(i, { wirkung: ev.target.value })}
              aria-label="Wirkung"
            >
              {WIRKUNGEN.map((w) => (
                <option key={w.wert} value={w.wert}>
                  {w.label}
                </option>
              ))}
            </select>
            {g.wirkung === 'wiedervorlage' && (
              <input
                type="number"
                className="cx-tage"
                value={g.standardWiedervorlageTage ?? ''}
                onChange={(ev) =>
                  ergebnisAendern(i, {
                    standardWiedervorlageTage: ev.target.value === '' ? null : Number(ev.target.value),
                  })
                }
                placeholder="Tage"
                aria-label="Wiedervorlage in Tagen"
                min={0}
                max={365}
              />
            )}
            <label className="cx-mini" title="Notiz erforderlich">
              <input
                type="checkbox"
                checked={g.notizPflicht}
                onChange={(ev) => ergebnisAendern(i, { notizPflicht: ev.target.checked })}
              />
              Notiz nötig
            </label>
            <button
              type="button"
              className="cx-weg"
              onClick={() => ergebnisWeg(i)}
              aria-label="Ergebnis entfernen"
              title="Ergebnis entfernen"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {e.ergebnisse.length === 0 && (
        <p className="cx-hinweis-zeile">
          Ohne mindestens ein Ergebnis lässt sich kein Fall abschließen — die Kampagne kann dann
          nicht gestartet werden. Am schnellsten geht es mit einer der Vorlagen unten.
        </p>
      )}

      <div className="cx-knopfreihe">
        <button type="button" className="cx-knopf" onClick={ergebnisZu}>
          Ergebnis hinzufügen
        </button>
        {VORLAGEN.map((v) => (
          <button key={v.name} type="button" className="cx-knopf" onClick={() => vorlageZu(v.name)}>
            + {v.name}
          </button>
        ))}
      </div>

      {/* --- Einstellungen --- */}
      <div className="cx-form-abschnitt">
        <h4>Ablauf und Aufbewahrung</h4>
      </div>

      <div className="cx-form-zeile">
        <label className="cx-feld">
          <span>Höchstzahl Versuche</span>
          <input
            type="number"
            value={e.maxVersuche}
            onChange={(ev) => setzen('maxVersuche', Number(ev.target.value))}
            min={1}
            max={50}
          />
        </label>
        <label className="cx-feld">
          <span>Haltefrist (Minuten)</span>
          <input
            type="number"
            value={e.sperreMinuten}
            onChange={(ev) => setzen('sperreMinuten', Number(ev.target.value))}
            min={1}
            max={480}
          />
          <em>So lange gehört ein zugeteilter Fall einer Person.</em>
        </label>
        <label className="cx-feld">
          <span>Fälle löschen nach (Tagen)</span>
          <input
            type="number"
            value={e.loeschenNachTagen}
            onChange={(ev) => setzen('loeschenNachTagen', Number(ev.target.value))}
            min={1}
            max={3650}
          />
          <em>Gerechnet ab Ende der Kampagne.</em>
        </label>
      </div>

      <label className="cx-feld">
        <span>Herkunft der Liste</span>
        <textarea
          value={e.herkunft}
          onChange={(ev) => setzen('herkunft', ev.target.value)}
          rows={2}
          placeholder="Pflicht bei hochgeladenen Listen: woher sie stammt und auf welcher Grundlage kontaktiert werden darf."
        />
      </label>

      {fehler && <p className="cx-fehler">{fehler}</p>}

      <div className="cx-knopfreihe">
        <button
          type="button"
          className="cx-knopf cx-knopf--akzent"
          onClick={() => void speichern()}
          disabled={speichert}
        >
          {speichert ? 'Speichere …' : neu ? 'Kampagne anlegen' : 'Änderungen speichern'}
        </button>
        <button type="button" className="cx-knopf" onClick={onAbbruch} disabled={speichert}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
