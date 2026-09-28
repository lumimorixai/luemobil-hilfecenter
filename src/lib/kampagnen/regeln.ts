/**
 * Auswahlregeln einer Kampagne — welche Personen in die Liste kommen.
 *
 * Bewusst eine Whitelist aus benannten Feldern und Operatoren, kein freies
 * Ausdrucksfeld: Ein SQL- oder Formel-Eingabefeld wäre im Admin nicht
 * bedienbar, nicht prüfbar und bei einer Tabelle mit Klarnamen und
 * Telefonnummern das falsche Werkzeug.
 *
 * Ein neues Auswahlkriterium ist ein Eintrag in FELDER plus ein Zweig in
 * `wertVon` — kein neuer Codepfad und keine neue Kampagnenart.
 *
 * Ausgewertet wird im Speicher, nicht in der Datenbank. Der Patris-Bestand
 * umfasst gut 8.000 Zeilen; die einmal zu laden kostet wenige Megabyte und
 * erspart einen Abfrage-Übersetzer, der bei jedem neuen Feld mitwachsen müsste.
 */

/** Eine Regelzeile, wie sie an der Kampagne gespeichert ist. */
export type Regel = {
  feld?: string | null
  operator?: string | null
  wert?: string | null
}

/** Die Felder, auf die sich Regeln beziehen dürfen. */
export const FELDER = {
  produktnummer: { label: 'Produktnummer (Segment)', art: 'text' },
  produktname: { label: 'Produkt', art: 'text' },
  email: { label: 'E-Mail', art: 'text' },
  kundennummer: { label: 'Kundennummer', art: 'text' },
  gueltigJetzt: { label: 'Ticket heute gültig', art: 'bool' },
  telefonVorhanden: { label: 'Telefonnummer vorhanden', art: 'bool' },
  volljaehrig: { label: 'Volljährig', art: 'bool' },
  kontoVorhanden: { label: 'Konto in der App vorhanden', art: 'bool' },
} as const

export type Feldname = keyof typeof FELDER

/** Eine Zeile aus dem Patris-Bestand, wie die Regeln sie sehen. */
export type Kandidat = {
  email: string
  telefon: string
  vorname: string
  nachname: string
  kundennummer: string
  entitlementId: string
  produktnummer: string
  produktname: string
  gueltigAb: string | null
  gueltigBis: string | null
  geburtsdatum: string | null
}

/** Volljährig zum Stichtag? Ohne Geburtsdatum: unbekannt → nicht volljährig. */
export function istVolljaehrig(geburtsdatum: string | null, stichtag = new Date()): boolean | null {
  if (!geburtsdatum) return null
  const g = new Date(geburtsdatum)
  if (Number.isNaN(g.getTime())) return null
  const achtzehn = new Date(g.getFullYear() + 18, g.getMonth(), g.getDate())
  return achtzehn <= stichtag
}

/** Ticket am Stichtag gültig? Fehlende Grenzen gelten als offen. */
export function istGueltig(k: Kandidat, stichtag = Date.now()): boolean {
  const ab = k.gueltigAb ? Date.parse(k.gueltigAb) : null
  const bis = k.gueltigBis ? Date.parse(k.gueltigBis) : null
  if (ab != null && !Number.isNaN(ab) && stichtag < ab) return false
  if (bis != null && !Number.isNaN(bis) && stichtag > bis) return false
  return true
}

/**
 * Wert eines Feldes für einen Kandidaten. Ja/Nein-Felder liefern 'ja'/'nein',
 * damit ein einziger Vergleichsweg für alle Feldarten genügt.
 */
function wertVon(feld: Feldname, k: Kandidat, kontoEmails: Set<string> | null): string {
  switch (feld) {
    case 'produktnummer':
      return k.produktnummer
    case 'produktname':
      return k.produktname
    case 'email':
      return k.email
    case 'kundennummer':
      return k.kundennummer
    case 'gueltigJetzt':
      return istGueltig(k) ? 'ja' : 'nein'
    case 'telefonVorhanden':
      return k.telefon ? 'ja' : 'nein'
    case 'volljaehrig':
      // Ohne Geburtsdatum lautet die Antwort NICHT „ja". Wer nicht sicher
      // volljährig ist, wird nicht angerufen — das ist die teuerste Sorte
      // Fehler, die dieses System machen könnte.
      return istVolljaehrig(k.geburtsdatum) === true ? 'ja' : 'nein'
    case 'kontoVorhanden':
      if (!kontoEmails) return 'nein'
      return k.email && kontoEmails.has(k.email.toLowerCase()) ? 'ja' : 'nein'
  }
}

function vergleiche(ist: string, operator: string, soll: string): boolean {
  const a = (ist ?? '').trim().toLowerCase()
  const b = (soll ?? '').trim().toLowerCase()
  switch (operator) {
    case 'ist':
      return a === b
    case 'ist_nicht':
      return a !== b
    case 'ist_eines_von':
      return b
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .includes(a)
    case 'enthaelt':
      return b.length > 0 && a.includes(b)
    case 'ist_gesetzt':
      return a.length > 0
    case 'ist_leer':
      return a.length === 0
    default:
      return false
  }
}

/** Braucht mindestens eine Regel den Abgleich mit Keycloak? */
export function brauchtKontoAbgleich(regeln: Regel[]): boolean {
  return regeln.some((r) => r.feld === 'kontoVorhanden')
}

/**
 * Trifft der Kandidat die Regeln? Ohne Regeln: nein — eine Kampagne ohne
 * Auswahl soll nicht versehentlich den gesamten Bestand anrufen.
 */
export function trifftZu(
  regeln: Regel[],
  k: Kandidat,
  kontoEmails: Set<string> | null,
  verknuepfung: 'und' | 'oder' = 'und',
): boolean {
  const gueltige = regeln.filter((r) => r.feld && r.operator && r.feld in FELDER)
  if (gueltige.length === 0) return false

  const ergebnisse = gueltige.map((r) =>
    vergleiche(wertVon(r.feld as Feldname, k, kontoEmails), r.operator as string, r.wert ?? ''),
  )
  return verknuepfung === 'oder' ? ergebnisse.some(Boolean) : ergebnisse.every(Boolean)
}

// --- Normalisierung ----------------------------------------------------------

/**
 * Telefonnummer auf +49… bringen. Gibt '' zurück, wenn nichts Brauchbares
 * übrig bleibt — solche Zeilen zählen als übersprungen statt als Fall mit
 * unbrauchbarer Nummer.
 */
export function normalisiereTelefon(roh: string): string {
  if (!roh) return ''
  let s = roh.replace(/\(0\)/g, '').replace(/[\s/\-.()]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  else if (s.startsWith('0')) s = '+49' + s.slice(1)
  else if (/^49/.test(s) && !s.startsWith('+')) s = '+' + s
  if (!/^\+[1-9]\d{6,15}$/.test(s)) return ''
  return s
}

export function normalisiereEmail(roh: string): string {
  return (roh ?? '').trim().toLowerCase()
}

/**
 * Schlüssel für die Dublettenprüfung. E-Mail zuerst, weil sie im Patris-Bestand
 * die verlässlichste Kennung ist; sonst Telefon, sonst Kundennummer.
 */
export function schluesselVon(felder: {
  email?: string
  telefon?: string
  kundennummer?: string
}): string {
  const mail = normalisiereEmail(felder.email ?? '')
  if (mail) return `mail:${mail}`
  const tel = felder.telefon ?? ''
  if (tel) return `tel:${tel}`
  const kd = (felder.kundennummer ?? '').trim()
  if (kd) return `kunde:${kd}`
  return ''
}
