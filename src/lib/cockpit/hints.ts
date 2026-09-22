/**
 * Ampel-Situationen des Kundenchecks (Ticket laut Patris × Keycloak-Konto) mit
 * Standardtexten. Die Texte sind im CMS (Global „Kundencheck-Hinweise")
 * überschreibbar; diese Datei ist die einzige Quelle für Schlüssel und Defaults.
 */

import type { Lamp } from './types'

export type HintSituationKey =
  | 'aktivMitKonto'
  | 'aktivOhneKauf'
  | 'aktivOhneKonto'
  | 'zukuenftig'
  | 'abgelaufen'
  | 'keinTicket'
  | 'appKauf'
  | 'keineDaten'

export type HintSituation = {
  key: HintSituationKey
  lamp: Lamp
  /** Bezeichnung im CMS. */
  label: string
  /** Wann die Situation eintritt (Beschreibung im CMS). */
  when: string
  defaultTitle: string
  defaultText: string
}

export const HINT_SITUATIONS: HintSituation[] = [
  {
    key: 'aktivMitKonto',
    lamp: 'ok',
    label: 'Grün – Ticket gültig, Konto vorhanden',
    when:
      'Laut Patris ist heute ein Ticket gültig, es gibt ein Keycloak-Konto und in der App wurde kürzlich ein Ticket ausgeliefert (oder die Kaufdaten sind nicht abrufbar).',
    defaultTitle: 'Ticket gültig',
    defaultText:
      'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen, ein Konto ist vorhanden. ' +
      'Die Anmeldung in der App erfolgt mit der E-Mail-Adresse und dem bisherigen Passwort. ' +
      'Bei Anmeldeproblemen hilft die Passwort-vergessen-Strecke in der App.',
  },
  {
    key: 'aktivOhneKauf',
    lamp: 'warn',
    label: 'Gelb – Ticket gültig, aber in der App nicht ausgeliefert',
    when:
      'Laut Patris ist heute ein Ticket gültig und es gibt ein Konto, in der App wurde in den letzten 35 Tagen aber kein Ticket erfolgreich ausgeliefert.',
    defaultTitle: 'Ticket vorgesehen – in der App nicht ausgeliefert',
    defaultText:
      'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen und ein Konto ist vorhanden, ' +
      'in der App wurde zuletzt aber kein Ticket ausgeliefert. Bitte den Kunden bitten, die App zu öffnen ' +
      'und sich anzumelden. Erscheint das Ticket weiterhin nicht, den Fall an den Second-Level-Support geben.',
  },
  {
    key: 'aktivOhneKonto',
    lamp: 'warn',
    label: 'Gelb – Ticket gültig, aber noch kein Konto',
    when: 'Laut Patris ist heute ein Ticket gültig, in Keycloak gibt es aber noch kein Konto.',
    defaultTitle: 'Ticket gültig – Konto fehlt noch',
    defaultText:
      'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen, es gibt aber noch kein Konto. ' +
      'Bitte den Kunden bitten, sich in der App mit E-Mail-Adresse und Aboonline-Passwort anzumelden – ' +
      'das Konto wird dabei automatisch angelegt.',
  },
  {
    key: 'zukuenftig',
    lamp: 'warn',
    label: 'Gelb – Ticket beginnt erst später',
    when: 'Laut Patris ist ein Ticket vorgesehen, dessen Gültigkeit noch nicht begonnen hat.',
    defaultTitle: 'Ticket noch nicht gültig',
    defaultText:
      'Das Ticket „{produkt}“ ist erst ab dem {von} gültig und wird bis dahin in der App noch nicht angezeigt.',
  },
  {
    key: 'abgelaufen',
    lamp: 'no',
    label: 'Rot – Ticket abgelaufen',
    when: 'Laut Patris gibt es nur Tickets, deren Gültigkeit bereits abgelaufen ist.',
    defaultTitle: 'Ticket abgelaufen',
    defaultText:
      'Das letzte Ticket „{produkt}“ war bis zum {bis} gültig. Aktuell ist für den Kunden kein gültiges Ticket vorgesehen. ' +
      'Bei Rückfragen zum Abo bitte an den Abo-Service verweisen.',
  },
  {
    key: 'keinTicket',
    lamp: 'no',
    label: 'Rot – kein Ticket laut Patris',
    when: 'Zur E-Mail-Adresse bzw. Kundennummer gibt es in den Patris-Daten keinen Eintrag.',
    defaultTitle: 'Kein Ticket vorgesehen',
    defaultText:
      'Laut Patris ist für diese E-Mail-Adresse kein Ticket vorgesehen. Bitte die Schreibweise der E-Mail-Adresse prüfen ' +
      'und bei Bedarf an den Abo-Service verweisen.',
  },
  {
    key: 'appKauf',
    lamp: 'ok',
    label: 'Grün – Ticket in der App gekauft',
    when:
      'Laut Patris ist aktuell kein Ticket vorgesehen (oder es liegen keine Patris-Daten vor), in der App wurde aber in den letzten 35 Tagen ein Ticket erfolgreich ausgeliefert.',
    defaultTitle: 'Ticket in der App gekauft',
    defaultText:
      'Der Kunde hat am {kaufdatum} in der App das Ticket „{kaufprodukt}“ gekauft (Bestellnummer {bestellnummer}), ' +
      'es wurde erfolgreich ausgeliefert. Ein Abo-Ticket laut Patris ist nicht vorgesehen.',
  },
  {
    key: 'keineDaten',
    lamp: 'off',
    label: 'Grau – keine Patris-Daten',
    when: 'Im Migrations-Cockpit wurde noch keine Patris-CSV hochgeladen.',
    defaultTitle: 'Ticketdaten nicht verfügbar',
    defaultText:
      'Es liegen noch keine Patris-Daten vor. Die Ticketprüfung ist erst nach dem Upload im Migrations-Cockpit möglich.',
  },
]

/** Setzt {platzhalter} ein; unbekannte oder leere Werte werden zu „—“. */
export function fillPlaceholders(text: string, values: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? values[key] || '—' : m,
  )
}
