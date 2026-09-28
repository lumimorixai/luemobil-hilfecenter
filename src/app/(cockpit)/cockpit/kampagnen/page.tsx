/** Kampagnen — Übersicht der Kontaktaktionen und Erzeugung der Arbeitslisten. */
import { seiteCockpit } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { Karte, Seitenkopf, de } from '@/components/cockpit/bausteine'
import { KampagnenAktionen } from '@/components/cockpit/KampagnenAktionen'
import { FELDER } from '@/lib/kampagnen/regeln'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { label: string; klasse: string }> = {
  entwurf: { label: 'Entwurf', klasse: '' },
  aktiv: { label: 'Aktiv', klasse: '' },
  pausiert: { label: 'Pausiert', klasse: 'amber' },
  beendet: { label: 'Beendet', klasse: '' },
}

const OPERATOREN: Record<string, string> = {
  ist: 'ist',
  ist_nicht: 'ist nicht',
  ist_eines_von: 'ist eines von',
  enthaelt: 'enthält',
  ist_gesetzt: 'ist gesetzt',
  ist_leer: 'ist leer',
}

function datum(wert: unknown): string {
  if (typeof wert !== 'string' || !wert) return '—'
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

export default async function KampagnenSeite() {
  await seiteCockpit('/cockpit/kampagnen')

  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'kampagnen',
    limit: 50,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  return (
    <>
      <Seitenkopf
        titel="Kampagnen"
        unterzeile="Kontaktaktionen: Zielgruppe festlegen, Liste erzeugen, Ergebnisse auswerten"
      />

      {res.docs.length === 0 && (
        <Karte>
          <div className="cx-leer">
            Es ist noch keine Kampagne angelegt.
            <br />
            Kampagnen entstehen im Admin unter <strong>Aktionen → Kampagnen</strong>: Name,
            Rechtsgrundlage, Gesprächsleitfaden, Auswahlregeln und Ergebniskatalog. Danach wird die
            Liste hier erzeugt.
          </div>
        </Karte>
      )}

      {res.docs.map((k) => {
        const regeln = (k.regeln ?? []) as { feld?: string | null; operator?: string | null; wert?: string | null }[]
        const aktivierbar = Boolean(k.rechtsgrundlage) && regeln.length > 0
        const gesamt = k.faelleGesamt ?? 0
        const erledigt = k.faelleErledigt ?? 0
        const anteil = gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0
        const status = STATUS[k.status ?? 'entwurf'] ?? STATUS.entwurf

        return (
          <Karte key={k.id}>
            <div className="cx-kampagne">
              <div className="cx-kampagne-kopf">
                <h2>{k.name}</h2>
                <span className={`cx-pill ${status.klasse}`}>{status.label}</span>
                <span className="cx-pill">{k.kanal === 'email' ? 'E-Mail' : 'Telefon'}</span>
                <span className="cx-karte-quelle" style={{ marginLeft: 'auto' }}>
                  {k.kennung}
                </span>
              </div>

              {k.beschreibung && <p className="cx-card-hint">{k.beschreibung}</p>}

              <div className="cx-paare">
                <div>
                  <span className="k">Fälle gesamt</span>
                  <span className="v">{de(gesamt)}</span>
                </div>
                <div>
                  <span className="k">Davon offen</span>
                  <span className="v">{de(k.faelleOffen ?? 0)}</span>
                </div>
                <div>
                  <span className="k">Davon erledigt</span>
                  <span className="v">
                    {de(erledigt)}
                    {gesamt > 0 && <em className="cx-toplist-sub"> · {anteil} %</em>}
                  </span>
                </div>
                <div>
                  <span className="k">Liste erzeugt</span>
                  <span className="v">{datum(k.erzeugtAm)}</span>
                </div>
              </div>

              {gesamt > 0 && (
                <div className="cx-bar">
                  <i style={{ width: `${anteil}%` }} />
                </div>
              )}

              {regeln.length > 0 && (
                <div className="cx-kampagne-regeln">
                  {regeln.map((r, i) => (
                    <span className="cx-regel" key={i}>
                      <b>{FELDER[r.feld as keyof typeof FELDER]?.label ?? r.feld}</b>
                      {OPERATOREN[r.operator ?? ''] ?? r.operator}
                      {r.wert ? <b>{r.wert}</b> : null}
                      {i < regeln.length - 1 && (
                        <span className="leise">
                          {k.regelVerknuepfung === 'oder' ? 'ODER' : 'UND'}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {!k.rechtsgrundlage && (
                <p className="cx-fehler">
                  Ohne Angabe der Rechtsgrundlage wird keine Liste erzeugt. Bei Telefonaktionen
                  gegenüber Verbrauchern ist neben der DSGVO auch § 7 UWG zu beachten.
                </p>
              )}

              <KampagnenAktionen kampagne={k.id} name={k.name} aktivierbar={aktivierbar} />
            </div>
          </Karte>
        )
      })}
    </>
  )
}
