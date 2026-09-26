/** Anmeldungen — erfolgreiche und fehlgeschlagene, Verlauf und Ursachen. */
import { seiteCockpit } from '@/lib/auth/guard'
import { getDayEvents, getIntraday, getNewUsers, getStats } from '@/lib/cockpit/stats'
import type { DayEvents, Intraday, NewUsers, CockpitStats } from '@/lib/cockpit/types'
import {
  ChartCard,
  DualLineChart,
  LoginsRangeChart,
  NewUsersChart,
} from '@/components/cockpit/charts'
import {
  ErrorSection,
  KeycloakStats,
  KpiRow,
  Seitenkopf,
  Unavailable,
} from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function AnmeldungenSeite() {
  await seiteCockpit('/cockpit/anmeldungen')

  let stats: CockpitStats | null = null
  let intraday: Intraday | null = null
  let day: DayEvents | null = null
  let newUsers: NewUsers | null = null
  try {
    stats = await getStats()
  } catch {
    stats = null
  }
  try {
    intraday = await getIntraday()
  } catch {
    intraday = null
  }
  try {
    day = await getDayEvents()
  } catch {
    day = null
  }
  try {
    newUsers = await getNewUsers()
  } catch {
    newUsers = null
  }

  return (
    <>
      <Seitenkopf
        titel="Anmeldungen"
        unterzeile="Tageswerte aus der eigenen Datenbank · aktuelle Fehler live aus Keycloak"
      />

      {stats ? <KpiRow stats={stats} /> : <Unavailable />}

      <h2 className="cx-h2">
        Tagesverlauf <span>· letzte 24 Stunden und letzte Stunde</span>
      </h2>
      {intraday ? (
        <div className="cx-charts cx-charts--even">
          <ChartCard title="Letzte 24 Stunden" hint="Anmeldungen und Fehlversuche je Stunde">
            <DualLineChart
              points={intraday.hourly.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))}
              maxTicks={7}
            />
          </ChartCard>
          <ChartCard title="Letzte Stunde" hint="Anmeldungen und Fehlversuche je Minute">
            <DualLineChart
              points={intraday.minutely.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))}
              maxTicks={7}
            />
          </ChartCard>
        </div>
      ) : (
        <Unavailable />
      )}

      <h2 className="cx-h2">
        Zeitreihe <span>· bis zu einem Jahr zurück</span>
      </h2>
      {stats ? (
        <ChartCard
          title="Anmeldungen und Fehlversuche"
          hint="Quelle: eigene Datenbank · umschaltbar zwischen Tag und Stunde"
        >
          <LoginsRangeChart daily={stats.series} hourly={intraday?.hourly ?? null} />
        </ChartCard>
      ) : (
        <Unavailable />
      )}

      <h2 className="cx-h2">
        Neue Konten <span>· alle Anlagen, nicht nur übernommene</span>
      </h2>
      {newUsers ? (
        <ChartCard
          title="Neu angelegte Konten"
          hint="Alle an dem Tag angelegten Konten — aus dem Altsystem übernommene und selbst registrierte"
        >
          <NewUsersChart data={newUsers} />
        </ChartCard>
      ) : (
        <Unavailable />
      )}

      <h2 className="cx-h2">
        Realm <span>· Bestand und Aktivität</span>
      </h2>
      {intraday && stats ? (
        <KeycloakStats totalUsers={stats.kpis.totalUsers} m={intraday.metrics} />
      ) : (
        <Unavailable />
      )}

      <h2 className="cx-h2">
        Warum Anmeldungen scheitern <span>· heute</span>
      </h2>
      {day ? <ErrorSection day={day} /> : <Unavailable />}
    </>
  )
}
