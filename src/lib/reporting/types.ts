/** Datentypen der Reporting-Kennzahlen (aggregiert, ohne Personenbezug). */

export type ReportingSegment = {
  bestandssegment: string
  berechtigte: number
  aktivierte: number
  offen: number
  quote_prozent: number
}

export type ReportingPlz = {
  plz: string
  ort: string
  berechtigte: number
  aktivierte: number
  offen: number
  quote_prozent: number
}

export type ReportingTag = {
  /** JJJJ-MM-TT. */
  tag: string
  bestellungen: number
  verkaeufe: number
  abbrueche: number
  umsatzBrutto: number
}

export type ReportingTrichter = { stufe: number; schritt: string; anzahl: number }

export type Reporting =
  | { verfuegbar: false; grund: 'nicht konfiguriert' | 'nicht erreichbar' }
  | {
      verfuegbar: true
      aktivierung: {
        berechtigteGesamt: number
        mitKonto: number
        ohneKonto: number
        quotePct: number
        neu7Tage: number
        /** Zeitraum, auf den sich neu7Tage bezieht (letzte sieben Tage mit Daten). */
        zeitraum: { von: string; bis: string } | null
      }
      segmente: ReportingSegment[]
      plz: ReportingPlz[]
      verkauf: {
        bestellungen: number
        verkaeufe: number
        umsatzBrutto: number
        erfolgPct: number
        abbrueche: number
      }
      /** Letzte 30 Tage, aufsteigend. */
      tage: ReportingTag[]
      trichter: ReportingTrichter[]
      /** Zeitpunkt der Abfrage (ISO). */
      stand: string
    }
