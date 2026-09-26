/** Daten und Jobs — Patris-Upload, Quellenübersicht, Berichte, Job-Läufe. */
import { seiteCockpit } from '@/lib/auth/guard'
import { JOB_STILL_MIN, getCronStatus } from '@/lib/cockpit/stats'
import type { CronStatus } from '@/lib/cockpit/types'
import { getPatrisStatus } from '@/lib/cockpit/patris'
import { PatrisUpload, type PatrisUploadStatus } from '@/components/cockpit/PatrisUpload'
import { ReportButtons } from '@/components/cockpit/ReportButtons'
import { Karte, Seitenkopf } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

const QUELLEN = [
  {
    name: 'Keycloak',
    liefert: 'Konten, Anmeldungen, Ereignisse',
    frische: 'live',
    aufbewahrung: 'Ereignisse verfallen im Realm',
  },
  {
    name: 'Eigene Datenbank',
    liefert: 'Tageswerte, Verfügbarkeit',
    frische: 'minütlich',
    aufbewahrung: 'Tageswerte dauerhaft · Minutenwerte 35 Tage',
  },
  {
    name: 'Reporting',
    liefert: 'Aktivierung, Umsatz, Segmente',
    frische: 'nachts',
    aufbewahrung: 'im Reporting-Stack',
  },
  {
    name: 'Patris-Export',
    liefert: 'Ticketberechtigung im Kundencheck',
    frische: 'von Hand hochgeladen',
    aufbewahrung: 'bis zum nächsten Upload',
  },
  {
    name: 'Ticket-API',
    liefert: 'Käufe einer einzelnen Person',
    frische: 'live je Abfrage',
    aufbewahrung: 'nichts gespeichert',
  },
]

export default async function DatenSeite() {
  await seiteCockpit('/cockpit/daten')

  let patris: PatrisUploadStatus = {
    importedAt: null,
    fileName: null,
    importedBy: null,
    rowCount: 0,
  }
  try {
    const st = await getPatrisStatus()
    patris = {
      importedAt: st.importedAt
        ? new Date(st.importedAt).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' Uhr'
        : null,
      fileName: st.fileName,
      importedBy: st.importedBy,
      rowCount: st.rowCount,
    }
  } catch {
    // Ohne Status bleibt der Upload trotzdem nutzbar.
  }

  let cron: CronStatus | null = null
  try {
    cron = await getCronStatus()
  } catch {
    cron = null
  }

  return (
    <>
      <Seitenkopf
        titel="Daten und Jobs"
        unterzeile="Woher die Zahlen kommen, wie frisch sie sind und wie lange sie bleiben"
      />

      <Karte
        titel="Ticketdaten aus Patris"
        quelle="Quelle der Wahrheit für den Kundencheck"
      >
        <p className="cx-card-hint">
          Der Kundencheck beantwortet die Frage „Welches Ticket steht dieser Person zu?" aus diesem
          Export — nicht aus dem Reporting. Deshalb ist sein Alter eine überwachte Kennzahl.
        </p>
        <PatrisUpload status={patris} />
      </Karte>

      <Karte titel="Datenquellen" quelle="jede Zahl im Cockpit stammt aus einer dieser Quellen">
        <div className="cx-tablewrap">
          <table className="cx-table">
            <thead>
              <tr>
                <th>Quelle</th>
                <th>Liefert</th>
                <th>Frische</th>
                <th>Aufbewahrung</th>
              </tr>
            </thead>
            <tbody>
              {QUELLEN.map((q) => (
                <tr key={q.name}>
                  <td style={{ fontWeight: 500 }}>{q.name}</td>
                  <td>{q.liefert}</td>
                  <td>{q.frische}</td>
                  <td className="leise">{q.aufbewahrung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <div className="cx-split">
        <Karte titel="Bericht verschicken" quelle="Mail und PDF an die Alarm-Adresse">
          <p className="cx-card-hint">
            Enthält dieselben Zahlen wie diese Bereiche, als Grafik und als PDF-Anhang.
          </p>
          <ReportButtons />
        </Karte>

        <Karte titel="Hintergrund-Aufgaben" quelle="per Cron">
          <div className="cx-paare">
            <div>
              <span className="k">Systemstatus prüfen · jede Minute</span>
              <span className="v">
                {cron?.lastHealth ?? 'noch nie'}
                {cron?.healthAlterMin != null && cron.healthAlterMin > JOB_STILL_MIN && (
                  <em className="cx-toplist-sub"> · seit {cron.healthAlterMin} Minuten nicht</em>
                )}
              </span>
            </div>
            <div>
              <span className="k">Tageswerte fortschreiben · jede Minute</span>
              <span className="v">
                {cron?.lastAggregate ?? 'noch nie'}
                {cron?.aggregateAlterMin != null && cron.aggregateAlterMin > JOB_STILL_MIN && (
                  <em className="cx-toplist-sub"> · seit {cron.aggregateAlterMin} Minuten nicht</em>
                )}
              </span>
            </div>
            <div>
              <span className="k">Verfügbarkeit verdichten · stündlich</span>
              <span className="v">Teil der Tageswerte</span>
            </div>
          </div>
        </Karte>
      </div>
    </>
  )
}
