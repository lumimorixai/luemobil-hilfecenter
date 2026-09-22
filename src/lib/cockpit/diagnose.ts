/**
 * Kundencheck: prüft zu einer E-Mail das Ticket laut Patris (Ampel), den
 * Keycloak-Status und die letzten Ereignisse. Daraus ein Hinweis für das
 * Servicecenter (Texte im CMS, Global „Kundencheck-Hinweise").
 *
 * Hinweis: Die Aboonline-Webservice-Prüfung ist derzeit deaktiviert (Endpoint
 * noch nicht verfügbar). Die Logik dafür liegt weiterhin in src/lib/aboonline.ts
 * und kann später wieder als zweite Stufe eingehängt werden.
 */
import { findUserByEmail, getRecentUserEvents } from '../keycloak'
import { keycloakRealm } from './config'
import { HINT_SITUATIONS, fillPlaceholders, type HintSituationKey } from './hints'
import { findTickets, getHints, getPatrisStatus, type PatrisTicket } from './patris'
import { ticketsFuerEmail, type TicketApiError, type TicketOrder } from './ticketApi'
import type {
  Diagnosis,
  DiagnosisStep,
  EventItem,
  PurchaseOrder,
  TicketItem,
  TicketStatus,
} from './types'

/** Ein Kauf in der App zählt für die Ampel, wenn er höchstens so alt ist. */
const KAUF_FENSTER_TAGE = 35

/** TT.MM.JJJJ aus ISO-Datum/Zeitstempel. */
function deDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** TT.MM., HH:MM Uhr aus ISO-Zeitstempel. */
function deDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time} Uhr`
}

export async function runCustomerCheck(email: string, bearbeiter = ''): Promise<Diagnosis> {
  // Ticket-API parallel starten (Timeout 10 s), damit sie den Check nicht unnötig verzögert.
  const purchasePromise = ticketsFuerEmail(email, bearbeiter)
  const kcUser = await findUserByEmail(email)

  // Schritt 1 — Keycloak
  const keycloak: DiagnosisStep = kcUser
    ? {
        state: 'ok',
        label: 'Konto vorhanden',
        detail:
          `Kundennr. ${kcUser.kundennummer ?? '—'}` +
          (kcUser.createdAt ? ` · angelegt am ${deDate(kcUser.createdAt)}` : ''),
      }
    : {
        state: 'no',
        label: 'Nicht vorhanden',
        detail: `Kein Konto im Realm ${keycloakRealm()}`,
      }

  // Letzte Ereignisse — bis zu 10, neueste zuerst
  const raw = await getRecentUserEvents(email, kcUser?.id, 10)
  const events: EventItem[] = raw
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 10)
    .map((e) => ({
      time: deDateTime(e.time),
      kind: e.type === 'LOGIN' ? 'ok' : 'no',
      label: e.type === 'LOGIN' ? 'Erfolgreicher Login' : e.error ?? 'Login-Fehler',
      clientId: e.clientId,
    }))

  // Ticket laut Patris — Fehler hier dürfen den übrigen Check nicht mitreißen.
  let imported = false
  let dataAsOf: string | null = null
  let rawTickets: PatrisTicket[] = []
  try {
    const status = await getPatrisStatus()
    imported = Boolean(status.importedAt)
    dataAsOf = status.importedAt ? deDateTime(status.importedAt) : null
    if (imported) rawTickets = await findTickets(email, kcUser?.kundennummer)
  } catch {
    imported = false
  }
  const tickets = sortTickets(rawTickets.map(toTicketItem))

  const purchase = await purchasePromise
  const orders = purchase.ok ? purchase.orders : []
  const lastOk = orders.find((o) => o.erfolgreich)
  const recentOk = Boolean(lastOk && isRecent(lastOk.gekauft_am))

  const situation = pickSituation(imported, tickets, Boolean(kcUser), purchase.ok, recentOk)
  const primary = tickets[0]

  const hints = await getHints().catch(() => null)
  const def = HINT_SITUATIONS.find((s) => s.key === situation)!
  const hint = hints?.[situation] ?? { title: def.defaultTitle, text: def.defaultText }
  const values = {
    produkt: primary?.productName,
    von: primary?.validFrom,
    bis: primary?.validUntil,
    vorname: primary?.firstName,
    nachname: primary?.lastName,
    kundennummer: primary?.customerNumber || kcUser?.kundennummer,
    kaufdatum: lastOk ? deDate(lastOk.gekauft_am) : undefined,
    kaufprodukt: lastOk?.produkt,
    bestellnummer: lastOk?.bestellnummer,
  }

  return {
    keycloak,
    events,
    ticket: { lamp: def.lamp, label: ticketLabel(situation, primary), tickets, dataAsOf },
    purchases: purchase.ok
      ? { state: 'ok', orders: groupOrders(orders) }
      : { state: 'error', message: PURCHASE_ERROR[purchase.error], orders: [] },
    verdict: {
      kind: def.lamp,
      title: fillPlaceholders(hint.title, values),
      text: fillPlaceholders(hint.text, values),
    },
  }
}

function ticketStatus(t: PatrisTicket, now: number): TicketStatus {
  if (t.validFrom && Date.parse(t.validFrom) > now) return 'zukuenftig'
  if (t.validUntil && Date.parse(t.validUntil) < now) return 'abgelaufen'
  return 'aktiv'
}

type SortableTicket = TicketItem & { fromMs: number; untilMs: number }

function toTicketItem(t: PatrisTicket): SortableTicket {
  return {
    entitlementId: t.entitlementId,
    productName: t.productName,
    productNumber: t.productNumber,
    validFrom: deDate(t.validFrom ?? undefined),
    validUntil: deDate(t.validUntil ?? undefined),
    customerNumber: t.customerNumber,
    firstName: t.firstName,
    lastName: t.lastName,
    status: ticketStatus(t, Date.now()),
    fromMs: t.validFrom ? Date.parse(t.validFrom) : 0,
    untilMs: t.validUntil ? Date.parse(t.validUntil) : Number.MAX_SAFE_INTEGER,
  }
}

const STATUS_ORDER: Record<TicketStatus, number> = { aktiv: 0, zukuenftig: 1, abgelaufen: 2 }

/** Gültige zuerst (längste Laufzeit), dann zukünftige (nächster Beginn), dann abgelaufene (zuletzt geendet). */
function sortTickets(list: SortableTicket[]): TicketItem[] {
  return list
    .sort((a, b) => {
      if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (a.status === 'zukuenftig') return a.fromMs - b.fromMs
      return b.untilMs - a.untilMs
    })
    .map(({ fromMs: _f, untilMs: _u, ...t }) => t)
}

/**
 * Ampel-Situation aus Patris (Soll), Keycloak-Konto und App-Käufen (Ist).
 * Sind die Kaufdaten nicht abrufbar, entscheidet allein Patris + Konto.
 */
function pickSituation(
  imported: boolean,
  tickets: TicketItem[],
  hasAccount: boolean,
  purchasesKnown: boolean,
  recentPurchase: boolean,
): HintSituationKey {
  const first = tickets[0]
  if (first?.status === 'aktiv') {
    if (!hasAccount) return 'aktivOhneKonto'
    return purchasesKnown && !recentPurchase ? 'aktivOhneKauf' : 'aktivMitKonto'
  }
  if (first?.status === 'zukuenftig') return 'zukuenftig'
  // Kein gültiges Patris-Ticket: ein kürzlicher App-Kauf hat Vorrang.
  if (recentPurchase) return 'appKauf'
  if (!imported) return 'keineDaten'
  return first ? 'abgelaufen' : 'keinTicket'
}

/** gekauft_am (Ortszeit ohne Zone) liegt innerhalb des Kauf-Fensters. */
function isRecent(gekauftAm: string): boolean {
  const t = Date.parse(gekauftAm) // ohne Zone = lokale Zeit (Europe/Berlin)
  return !Number.isNaN(t) && Date.now() - t <= KAUF_FENSTER_TAGE * 24 * 60 * 60 * 1000
}

const PURCHASE_ERROR: Record<TicketApiError, string> = {
  unconfigured: 'Die Abfrage der App-Käufe ist nicht eingerichtet.',
  invalid_email: 'Die Ticket-API hat die E-Mail-Adresse als ungültig abgelehnt.',
  unauthorized: 'Die Ticket-API hat den Zugang abgelehnt. Der Betrieb wurde informiert.',
  forbidden: 'Die Ticket-API ist falsch konfiguriert (Zugriff verweigert). Bitte den Betrieb informieren.',
  rate_limited: 'Zu viele Abfragen bei der Ticket-API. Bitte kurz warten und erneut prüfen.',
  unavailable: 'Die Käufe sind derzeit nicht abrufbar. Bitte später erneut versuchen.',
}

/** Betrag „63.00" → „63,00 €" (ohne Float-Rundung). */
function euro(value: string): string {
  const m = value.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!m) return value ? `${value} €` : '—'
  const int = Number(m[2]).toLocaleString('de-DE')
  const dec = (m[3] ?? '').padEnd(2, '0')
  return `${m[1]}${int},${dec} €`
}

/** Positionen nach Bestellnummer gruppieren; Reihenfolge (neueste zuerst) bleibt. */
function groupOrders(orders: TicketOrder[]): PurchaseOrder[] {
  const byNumber = new Map<string, PurchaseOrder>()
  for (const o of orders) {
    let group = byNumber.get(o.bestellnummer)
    if (!group) {
      group = { bestellnummer: o.bestellnummer, gekauftAm: deDateTimeFull(o.gekauft_am), items: [] }
      byNumber.set(o.bestellnummer, group)
    }
    group.items.push({
      produkt: o.produkt,
      sku: o.sku,
      menge: o.menge,
      preis: euro(o.preis_brutto),
      status: o.status,
      erfolgreich: o.erfolgreich,
    })
  }
  return [...byNumber.values()]
}

/** TT.MM.JJJJ, HH:MM Uhr */
function deDateTimeFull(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${deDate(iso)}, ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
}

function ticketLabel(situation: HintSituationKey, t: TicketItem | undefined): string {
  switch (situation) {
    case 'aktivMitKonto':
    case 'aktivOhneKauf':
    case 'aktivOhneKonto':
      return t?.validUntil ? `Gültig bis ${t.validUntil}` : 'Gültig'
    case 'zukuenftig':
      return t?.validFrom ? `Gültig ab ${t.validFrom}` : 'Noch nicht gültig'
    case 'abgelaufen':
      return t?.validUntil ? `Abgelaufen am ${t.validUntil}` : 'Abgelaufen'
    case 'keinTicket':
      return 'Kein Ticket vorgesehen'
    case 'appKauf':
      return 'Kein Abo-Ticket, Kauf in der App'
    case 'keineDaten':
      return 'Keine Patris-Daten'
  }
}
