/**
 * Aggregation der Zeitreihe: schreibt Tageswerte (Logins, Fehler, neue Konten,
 * Kontenbestand, Support-Ereignisse, Logins je Client) in die Collection
 * cockpit-daily. Der Minuten-Job aktualisiert den heutigen Datensatz per Upsert;
 * ältere Tage bleiben unverändert.
 *
 * Zwei Wege, bewusst getrennt:
 * - „schnell" (Minuten-Job, heute): eine Event-Abfrage plus der Keycloak-Zähler
 *   /users/count. Die neuen Konten ergeben sich als Zuwachs gegenüber dem
 *   Bestand des Vortages. Kein Durchblättern der Nutzerliste.
 * - „exakt" (Backfill): EIN Durchgang durch die Nutzerliste liefert für alle
 *   Tage die Zahl der Anlagen und daraus den Bestand. Teuer, deshalb nur auf
 *   Anforderung oder nachts.
 *
 * Maßgeblich für „neue Konten" ist `createdTimestamp`, nicht das REGISTER-Event:
 * Nur der Zeitstempel erklärt den Bestand vollständig (die Summe aller Anlagen
 * entspricht exakt /users/count). Das REGISTER-Event steht separat als „davon
 * Selbstregistrierungen".
 */
import type { Payload } from 'payload'
import { getDayDetail, getUserDayStats, usersCount } from '../keycloak'
import type { ClientLogin, SupportMetrics } from './types'
import { lastDays, todayIso } from './date'

type Tageswert = {
  logins: number
  loginErrors: number
  newUsers: number
  registrations: number
  migratedUsers?: number
  totalUsers?: number
  support?: SupportMetrics
  loginsByClient?: ClientLogin[]
}

type Vorhanden = { id: number | string; totalUsers?: number | null; newUsers?: number | null }

async function tag(payload: Payload, dayIso: string): Promise<Vorhanden | undefined> {
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { equals: dayIso } },
    limit: 1,
    overrideAccess: true,
  })
  return found.docs[0] as unknown as Vorhanden | undefined
}

async function schreibe(payload: Payload, dayIso: string, werte: Tageswert): Promise<void> {
  const existing = await tag(payload, dayIso)
  if (existing) {
    await payload.update({ collection: 'cockpit-daily', id: existing.id, data: werte, overrideAccess: true })
  } else {
    await payload.create({ collection: 'cockpit-daily', data: { datum: dayIso, ...werte }, overrideAccess: true })
  }
}

/** Vortag als JJJJ-MM-TT. */
function vortag(dayIso: string): string {
  const d = new Date(Date.parse(dayIso) - 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Aktualisiert den heutigen Datensatz (Minuten-Job) auf dem günstigen Weg.
 *
 * Die neuen Konten ergeben sich aus dem Zuwachs des Kontenzählers gegenüber dem
 * gestrigen Bestand — dieselbe Bedeutung wie beim exakten Weg (alle Anlagen).
 * Ohne Bestand des Vortages bleibt der bisherige Wert stehen; der Backfill
 * setzt ihn dann richtig.
 */
export async function aggregateToday(payload: Payload): Promise<void> {
  const heute = todayIso()
  const [detail, bestand, gestern, heuteDoc] = await Promise.all([
    getDayDetail(heute),
    usersCount(),
    tag(payload, vortag(heute)),
    tag(payload, heute),
  ])

  const bestandGestern = gestern?.totalUsers ?? null
  const zuwachs = bestandGestern != null ? Math.max(0, bestand - bestandGestern) : null

  await schreibe(payload, heute, {
    logins: detail.logins,
    loginErrors: detail.loginErrors,
    registrations: detail.registrations,
    support: detail.support,
    loginsByClient: detail.loginsByClient,
    totalUsers: bestand,
    newUsers: zuwachs ?? heuteDoc?.newUsers ?? 0,
  })
}

/**
 * Berechnet die Tageswerte der letzten `days` Tage — exakt.
 *
 * Ein Durchgang durch die Nutzerliste liefert für jeden Tag die Zahl der
 * Anlagen; daraus ergibt sich der Bestand am Ende jedes Tages als Gesamtzahl
 * abzüglich aller später angelegten Konten. Das ist verlässlicher als die
 * frühere Rückwärts-Rechnung, die nur die migrierten Konten kannte und den
 * Bestand dadurch deutlich unterschätzte.
 *
 * - Standard: nur Tage ohne Datensatz werden ergänzt.
 * - `neuBerechnen`: alle Tage des Fensters erneut schreiben.
 */
export async function backfill(
  payload: Payload,
  days = 14,
  opts: { neuBerechnen?: boolean } = {},
): Promise<number> {
  const tage = lastDays(days)
  const { proTag, gesamt } = await getUserDayStats()

  // Bestand am Ende jedes Tages, rückwärts beim heutigen Zähler beginnend.
  const bestandJeTag = new Map<string, number>()
  let bestand = gesamt
  for (const t of [...tage].reverse()) {
    bestandJeTag.set(t, bestand)
    bestand -= proTag.get(t)?.alle ?? 0
  }

  let geschrieben = 0
  for (const day of tage) {
    const vorhanden = await tag(payload, day)
    if (vorhanden && !opts.neuBerechnen) continue

    const detail = await getDayDetail(day)
    const anlagen = proTag.get(day) ?? { alle: 0, migriert: 0 }
    await schreibe(payload, day, {
      logins: detail.logins,
      loginErrors: detail.loginErrors,
      registrations: detail.registrations,
      support: detail.support,
      loginsByClient: detail.loginsByClient,
      newUsers: anlagen.alle,
      migratedUsers: anlagen.migriert,
      totalUsers: bestandJeTag.get(day) ?? gesamt,
    })
    geschrieben++
  }

  return geschrieben
}

/** Alle Tage von `von` bis `bis` als JJJJ-MM-TT, lückenlos. */
function tageZwischen(von: string, bis: string): string[] {
  const out: string[] = []
  const ende = Date.parse(bis)
  for (let t = Date.parse(von); t <= ende; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t)
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }
  return out
}

/**
 * Schreibt die KOMPLETTE Kontenhistorie — vom ersten angelegten Konto bis
 * heute, lückenlos.
 *
 * Warum getrennt vom normalen Backfill: Keycloak-Events verfallen nach der im
 * Realm eingestellten Frist, das Anlagedatum eines Kontos bleibt dagegen für
 * immer erhalten. Die Kontenzahlen lassen sich deshalb beliebig weit
 * rekonstruieren, die Anmeldezahlen nicht. Dieser Lauf fasst Logins und Fehler
 * daher nicht an; er ergänzt nur neue Konten, davon übernommene und den
 * Bestand.
 *
 * Ein einziger Durchgang durch die Nutzerliste genügt für alle Tage.
 */
export async function backfillKonten(
  payload: Payload,
): Promise<{ tage: number; von: string; bis: string; gesamt: number; stimmt: boolean }> {
  const { proTag, gesamt } = await getUserDayStats()
  const mitAnlagen = [...proTag.keys()].sort()
  if (mitAnlagen.length === 0) {
    return { tage: 0, von: '', bis: '', gesamt, stimmt: true }
  }

  const heute = todayIso()
  const alle = tageZwischen(mitAnlagen[0], heute)

  // Bestand vorwärts aufsummieren: am Ende muss die Summe dem Zähler
  // entsprechen — sonst stimmt etwas nicht, und das soll auffallen.
  let bestand = 0
  for (const day of alle) {
    const anlagen = proTag.get(day) ?? { alle: 0, migriert: 0 }
    bestand += anlagen.alle

    const vorhanden = await tag(payload, day)
    const werte = {
      newUsers: anlagen.alle,
      migratedUsers: anlagen.migriert,
      totalUsers: bestand,
    }
    if (vorhanden) {
      await payload.update({
        collection: 'cockpit-daily',
        id: vorhanden.id,
        data: werte,
        overrideAccess: true,
      })
    } else {
      // Für diesen Tag gibt es keine Anmeldezahlen mehr (Events verfallen).
      // Die Kontenzahlen sind trotzdem belastbar.
      await payload.create({
        collection: 'cockpit-daily',
        data: { datum: day, logins: 0, loginErrors: 0, registrations: 0, ...werte },
        overrideAccess: true,
      })
    }
  }

  return {
    tage: alle.length,
    von: alle[0],
    bis: alle[alle.length - 1],
    gesamt,
    stimmt: bestand === gesamt,
  }
}

/** Einzelnen Tag exakt neu berechnen (Wartung). */
export async function upsertDay(payload: Payload, dayIso: string): Promise<void> {
  const [detail, { proTag, gesamt }] = await Promise.all([getDayDetail(dayIso), getUserDayStats()])
  const anlagen = proTag.get(dayIso) ?? { alle: 0, migriert: 0 }
  await schreibe(payload, dayIso, {
    logins: detail.logins,
    loginErrors: detail.loginErrors,
    registrations: detail.registrations,
    support: detail.support,
    loginsByClient: detail.loginsByClient,
    newUsers: anlagen.alle,
    migratedUsers: anlagen.migriert,
    ...(dayIso === todayIso() ? { totalUsers: gesamt } : {}),
  })
}
