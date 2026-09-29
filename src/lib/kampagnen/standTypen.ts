/**
 * Stand einer Kampagne — Typen und Beschriftungen.
 *
 * Bewusst getrennt von der Abfrage in `stand.ts`: Die Oberfläche braucht diese
 * Werte, und `stand.ts` zieht Payload mit. Ein Import von dort in eine
 * Client-Komponente holte den gesamten Server-Code ins Browser-Bündel.
 */

export type Stand = {
  gesamt: number
  offen: number
  inArbeit: number
  erledigt: number
  entfallen: number
  /** Entfallene je Grund, z. B. { konto_vorhanden: 6 }. */
  gruende: Record<string, number>
}

export const LEERER_STAND: Stand = {
  gesamt: 0,
  offen: 0,
  inArbeit: 0,
  erledigt: 0,
  entfallen: 0,
  gruende: {},
}

/** Klartext für die Gründe, aus denen ein Fall entfällt. */
export const GRUND_TEXT: Record<string, string> = {
  konto_vorhanden: 'hatten inzwischen ein Konto',
  kein_kontakt: 'ohne nutzbaren Kontaktweg',
  widerspruch: 'haben widersprochen',
  max_versuche: 'nach der Höchstzahl Versuche',
  dublette: 'doppelt in der Liste',
}
