/**
 * Geschäftszahlen aus der Reporting-Datenbank für das Migrations-Cockpit.
 *
 * Es werden ausschließlich die vier aggregierten Views ohne Personenbezug
 * gelesen: rpt.aktivierung_segment, rpt.aktivierung_plz, rpt.tagesreihe und
 * rpt.trichter. Views mit E-Mail, Name oder Geburtsdatum (rpt.abo_berechtigung,
 * rpt.kunde_360, rpt.bestellung, rpt.bestellposition) sind für den Lese-Account
 * bewusst gesperrt — siehe docs/REPORTING.md.
 *
 * WICHTIG: Diese Zahlen sind Auswertung, nicht Wahrheit. Die Ticketberechtigung
 * im Kundencheck kommt weiterhin aus dem hochgeladenen Patris-Export.
 *
 * Die Reporting-Datenbank wird nachts neu aufgebaut; die Werte werden daher
 * 10 Minuten zwischengespeichert.
 */
import { abfrage, reportingConfigured } from './db'
import type { Reporting, ReportingPlz, ReportingSegment, ReportingTag } from './types'

const CACHE_MS = 10 * 60 * 1000
/** Kleinste PLZ-Gruppe, die angezeigt wird — schützt vor Rückschluss auf Einzelne. */
const PLZ_MINDESTGROESSE = 20

let cache: { at: number; data: Reporting } | null = null

type AktivierungZeile = {
  berechtigte_gesamt: string | number | null
  mit_konto: string | number | null
  berechtigt_ohne_konto: string | number | null
  quote_prozent: string | number | null
}

type VerkaufZeile = {
  bestellungen_gesamt: string | number | null
  verkaeufe_gesamt: string | number | null
  umsatz_brutto: string | number | null
  anteil_erfolgreich_prozent: string | number | null
  abgebrochene_bestellungen: string | number | null
}

/** Postgres liefert numeric als Text — hier in Zahlen wandeln. */
function zahl(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function getReporting(): Promise<Reporting> {
  if (!reportingConfigured()) {
    return { verfuegbar: false, grund: 'nicht konfiguriert' }
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data

  const [aktivierung, neu7, segmente, plz, verkauf, tagesreihe, trichter] = await Promise.all([
    abfrage<AktivierungZeile>(`
      SELECT
        sum(berechtigte)                                                AS berechtigte_gesamt,
        sum(aktivierte)                                                 AS mit_konto,
        sum(offen)                                                      AS berechtigt_ohne_konto,
        round(100.0 * sum(aktivierte) / nullif(sum(berechtigte), 0), 1) AS quote_prozent
      FROM rpt.aktivierung_segment`),
    // Bezug ist der letzte Tag mit Daten, nicht „heute": Die Tagesreihe endet
    // beim letzten Kauftag und wäre sonst nach einem ruhigen Wochenende leer.
    abfrage<{ neu: string | number | null; von: string | null; bis: string | null }>(`
      SELECT coalesce(sum(neue_konten), 0) AS neu, min(tag) AS von, max(tag) AS bis
      FROM rpt.tagesreihe
      WHERE tag > (SELECT max(tag) FROM rpt.tagesreihe) - INTERVAL '7 days'`),
    abfrage<ReportingSegment>(`
      SELECT bestandssegment, berechtigte, aktivierte, offen, quote_prozent
      FROM rpt.aktivierung_segment
      WHERE bestandssegment IS NOT NULL
      ORDER BY berechtigte DESC`),
    abfrage<ReportingPlz>(`
      SELECT plz, ort, berechtigte, aktivierte, offen, quote_prozent
      FROM rpt.aktivierung_plz
      WHERE berechtigte >= $1
      ORDER BY quote_prozent ASC, offen DESC
      LIMIT 5`, [PLZ_MINDESTGROESSE]),
    abfrage<VerkaufZeile>(`
      SELECT
        sum(bestellungen)                                              AS bestellungen_gesamt,
        sum(verkaeufe)                                                 AS verkaeufe_gesamt,
        round(sum(umsatz_brutto), 2)                                   AS umsatz_brutto,
        round(100.0 * sum(verkaeufe) / nullif(sum(bestellungen), 0), 1) AS anteil_erfolgreich_prozent,
        sum(abbrueche)                                                 AS abgebrochene_bestellungen
      FROM rpt.tagesreihe`),
    abfrage<{
      tag: string
      bestellungen: string | number
      verkaeufe: string | number
      abbrueche: string | number
      umsatz_brutto: string | number
    }>(`
      SELECT tag, bestellungen, verkaeufe, abbrueche, round(umsatz_brutto, 2) AS umsatz_brutto
      FROM rpt.tagesreihe
      ORDER BY tag DESC
      LIMIT 30`),
    abfrage<{ stufe: number; schritt: string; anzahl: string | number }>(`
      SELECT stufe, schritt, anzahl FROM rpt.trichter ORDER BY stufe`),
  ])

  if (!aktivierung || !verkauf) {
    return { verfuegbar: false, grund: 'nicht erreichbar' }
  }

  const a = aktivierung[0] ?? ({} as AktivierungZeile)
  const v = verkauf[0] ?? ({} as VerkaufZeile)
  const n = neu7?.[0]

  const tage: ReportingTag[] = (tagesreihe ?? [])
    .map((t) => ({
      tag: String(t.tag).slice(0, 10),
      bestellungen: zahl(t.bestellungen),
      verkaeufe: zahl(t.verkaeufe),
      abbrueche: zahl(t.abbrueche),
      umsatzBrutto: zahl(t.umsatz_brutto),
    }))
    .reverse()

  const data: Reporting = {
    verfuegbar: true,
    aktivierung: {
      berechtigteGesamt: zahl(a.berechtigte_gesamt),
      mitKonto: zahl(a.mit_konto),
      ohneKonto: zahl(a.berechtigt_ohne_konto),
      quotePct: zahl(a.quote_prozent),
      neu7Tage: zahl(n?.neu),
      zeitraum: n?.von && n?.bis ? { von: String(n.von).slice(0, 10), bis: String(n.bis).slice(0, 10) } : null,
    },
    segmente: (segmente ?? []).map((s) => ({
      bestandssegment: s.bestandssegment,
      berechtigte: zahl(s.berechtigte),
      aktivierte: zahl(s.aktivierte),
      offen: zahl(s.offen),
      quote_prozent: zahl(s.quote_prozent),
    })),
    plz: (plz ?? []).map((p) => ({
      plz: p.plz,
      ort: p.ort,
      berechtigte: zahl(p.berechtigte),
      aktivierte: zahl(p.aktivierte),
      offen: zahl(p.offen),
      quote_prozent: zahl(p.quote_prozent),
    })),
    verkauf: {
      bestellungen: zahl(v.bestellungen_gesamt),
      verkaeufe: zahl(v.verkaeufe_gesamt),
      umsatzBrutto: zahl(v.umsatz_brutto),
      erfolgPct: zahl(v.anteil_erfolgreich_prozent),
      abbrueche: zahl(v.abgebrochene_bestellungen),
    },
    tage,
    trichter: (trichter ?? []).map((t) => ({
      stufe: Number(t.stufe),
      schritt: t.schritt,
      anzahl: zahl(t.anzahl),
    })),
    stand: new Date().toISOString(),
  }

  cache = { at: Date.now(), data }
  return data
}
