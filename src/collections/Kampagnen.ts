import type { CollectionConfig } from 'payload'
import { istAdmin, nurAdmin } from '../lib/payloadRoles'

/**
 * Eine Kampagne ist der Rahmen einer Kontaktaktion: Zielgruppe, Zweck,
 * Rechtsgrundlage, Laufzeit und der Katalog möglicher Gesprächsergebnisse.
 *
 * Bewusst allgemein gehalten: Der erste Anwendungsfall sind Anrufe bei
 * Abo-Berechtigten ohne App-Konto, aber weder Zielgruppe noch Kanal noch
 * Ergebnisse stehen im Code. Ein neues Szenario ist ein neuer Datensatz,
 * kein neues Feature.
 *
 * Angelegt und gepflegt wird über das Cockpit (Rolle kampagnen-leitung); im
 * Admin nur lesbar. Enthält selbst keine personenbezogenen Daten — die
 * stehen in kampagnen-faelle.
 */
export const Kampagnen: CollectionConfig = {
  slug: 'kampagnen',
  labels: { singular: 'Kampagne', plural: 'Kampagnen' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'kanal', 'faelleOffen', 'faelleGesamt'],
    group: 'Aktionen',
    description:
      'Kontaktaktionen: Zielgruppenregeln, Gesprächsleitfaden, Ergebniskatalog. Fälle werden im Cockpit erzeugt.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    {
      name: 'kennung',
      label: 'Kennung',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Technischer Name für Adressen und Jobs, z. B. dticket-2026-10.' },
    },
    {
      name: 'beschreibung',
      label: 'Zweck',
      type: 'textarea',
      admin: { description: 'Worum es geht — erscheint in der Auswertung, nicht im Gespräch.' },
    },
    {
      name: 'gespraechsleitfaden',
      label: 'Gesprächsleitfaden',
      type: 'textarea',
      admin: {
        description:
          'Wird dem Agent bei jedem Fall angezeigt. Gehört hierher: Anrede, Anlass, Hinweis nach Art. 13/14 DSGVO.',
      },
    },
    {
      name: 'kanal',
      label: 'Kanal',
      type: 'select',
      required: true,
      defaultValue: 'telefon',
      options: [
        { label: 'Telefon', value: 'telefon' },
        { label: 'E-Mail', value: 'email' },
      ],
      admin: { description: 'Bestimmt, welches Kontaktfeld ein Fall zwingend braucht.' },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'entwurf',
      index: true,
      options: [
        { label: 'Entwurf', value: 'entwurf' },
        { label: 'Aktiv', value: 'aktiv' },
        { label: 'Pausiert', value: 'pausiert' },
        { label: 'Beendet', value: 'beendet' },
      ],
      admin: { description: 'Nur aktive Kampagnen geben Fälle aus.' },
    },
    {
      name: 'rechtsgrundlage',
      label: 'Rechtsgrundlage',
      type: 'text',
      admin: {
        description:
          'Pflicht vor dem Aktivieren. Bei Telefonaktionen gegenüber Verbrauchern ist § 7 UWG zu beachten, nicht nur die DSGVO.',
      },
    },
    {
      name: 'herkunft',
      label: 'Herkunft der Liste',
      type: 'textarea',
      admin: {
        description:
          'Pflicht bei hochgeladenen Listen: woher sie stammt und auf welcher Grundlage kontaktiert werden darf.',
      },
    },
    {
      name: 'loeschenNachTagen',
      label: 'Fälle löschen nach (Tagen)',
      type: 'number',
      required: true,
      defaultValue: 90,
      min: 1,
      admin: { description: 'Gerechnet ab Ende der Kampagne. Der Nachtjob räumt danach auf.' },
    },
    {
      name: 'maxVersuche',
      label: 'Höchstzahl Versuche je Person',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 1,
    },
    {
      name: 'sperreMinuten',
      label: 'Haltefrist eines Falls (Minuten)',
      type: 'number',
      required: true,
      defaultValue: 15,
      min: 1,
      admin: {
        description:
          'So lange gehört ein zugeteilter Fall einer Person. Danach wird er wieder ausgegeben — verhindert, dass ein geschlossener Browser Fälle blockiert.',
      },
    },
    {
      name: 'regelVerknuepfung',
      label: 'Regeln verknüpfen mit',
      type: 'select',
      defaultValue: 'und',
      options: [
        { label: 'UND — alle Regeln müssen zutreffen', value: 'und' },
        { label: 'ODER — eine Regel genügt', value: 'oder' },
      ],
    },
    {
      name: 'regeln',
      label: 'Auswahlregeln',
      type: 'array',
      admin: {
        description:
          'Bestimmen, wer in die Liste kommt. Leer lassen, wenn die Liste hochgeladen wird.',
      },
      fields: [
        {
          name: 'feld',
          label: 'Feld',
          type: 'select',
          required: true,
          options: [
            { label: 'Produktnummer (Segment)', value: 'produktnummer' },
            { label: 'Produkt', value: 'produktname' },
            { label: 'E-Mail', value: 'email' },
            { label: 'Kundennummer', value: 'kundennummer' },
            { label: 'Ticket heute gültig', value: 'gueltigJetzt' },
            { label: 'Telefonnummer vorhanden', value: 'telefonVorhanden' },
            { label: 'Volljährig', value: 'volljaehrig' },
            { label: 'Konto in der App vorhanden', value: 'kontoVorhanden' },
          ],
        },
        {
          name: 'operator',
          label: 'Vergleich',
          type: 'select',
          required: true,
          defaultValue: 'ist',
          options: [
            { label: 'ist', value: 'ist' },
            { label: 'ist nicht', value: 'ist_nicht' },
            { label: 'ist eines von (Komma)', value: 'ist_eines_von' },
            { label: 'enthält', value: 'enthaelt' },
            { label: 'ist gesetzt', value: 'ist_gesetzt' },
            { label: 'ist leer', value: 'ist_leer' },
          ],
        },
        {
          name: 'wert',
          label: 'Wert',
          type: 'text',
          admin: { description: 'Bei Ja/Nein-Feldern: ja oder nein.' },
        },
      ],
    },
    {
      name: 'ergebnisse',
      label: 'Mögliche Ergebnisse',
      type: 'array',
      admin: {
        description:
          'Die Knöpfe, die der Agent nach dem Gespräch sieht. Reihenfolge = Reihenfolge in der Oberfläche.',
      },
      fields: [
        { name: 'code', label: 'Code', type: 'text', required: true },
        { name: 'label', label: 'Beschriftung', type: 'text', required: true },
        {
          name: 'wirkung',
          label: 'Wirkung',
          type: 'select',
          required: true,
          defaultValue: 'abschluss',
          options: [
            { label: 'Abschluss — Fall ist erledigt', value: 'abschluss' },
            { label: 'Wiedervorlage — zu einem Datum erneut', value: 'wiedervorlage' },
            { label: 'Erneut versuchen — später noch einmal', value: 'erneut' },
            { label: 'Entfällt — nicht weiter verfolgen', value: 'entfaellt' },
            { label: 'Sperren — Widerspruch, nie wieder kontaktieren', value: 'sperren' },
          ],
        },
        {
          name: 'standardWiedervorlageTage',
          label: 'Wiedervorlage in (Tagen)',
          type: 'number',
          min: 0,
        },
        { name: 'notizPflicht', label: 'Notiz erforderlich', type: 'checkbox' },
      ],
    },
    // --- Vom System gepflegt ---
    {
      name: 'quelle',
      label: 'Herkunft der Fälle',
      type: 'select',
      options: [
        { label: 'Regeln', value: 'regel' },
        { label: 'Hochgeladen', value: 'csv' },
        { label: 'Beides', value: 'beides' },
      ],
      admin: { readOnly: true },
    },
    { name: 'erzeugtAm', label: 'Fälle erzeugt am', type: 'date', admin: { readOnly: true } },
    { name: 'erzeugtVon', label: 'Erzeugt von', type: 'text', admin: { readOnly: true } },
    { name: 'faelleGesamt', label: 'Fälle gesamt', type: 'number', admin: { readOnly: true } },
    { name: 'faelleOffen', label: 'Davon offen', type: 'number', admin: { readOnly: true } },
    { name: 'faelleErledigt', label: 'Davon erledigt', type: 'number', admin: { readOnly: true } },
  ],
}

/**
 * Fälle einer Kampagne — je Person eine Zeile.
 *
 * Die Personendaten sind eine MOMENTAUFNAHME, keine Beziehung auf
 * patris-entitlements: Der Patris-Upload löscht dort bei jedem Lauf den
 * gesamten Bestand, eine Beziehung zeigte danach ins Leere.
 *
 * Enthält Namen, Telefonnummern und Geburtsdaten — deshalb im Admin nur für
 * Administratoren lesbar und in der Navigation verborgen. Geschrieben wird
 * ausschließlich über die Cockpit-Routen.
 */
export const KampagnenFaelle: CollectionConfig = {
  slug: 'kampagnen-faelle',
  labels: { singular: 'Kampagnen-Fall', plural: 'Kampagnen-Fälle' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'nachname', 'status', 'versuche', 'wiedervorlageAm'],
    group: 'Aktionen',
    hidden: ({ user }) => !istAdmin(user as { role?: 'admin' | 'redaktion' | null }),
    description:
      'Arbeitsliste einer Kampagne. Enthält personenbezogene Daten; Befüllung nur über das Cockpit.',
  },
  access: {
    read: nurAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'kampagne',
      label: 'Kampagne',
      type: 'relationship',
      relationTo: 'kampagnen',
      required: true,
      index: true,
    },
    {
      name: 'schluessel',
      label: 'Schlüssel',
      type: 'text',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'Normalisierter Wert für die Dublettenprüfung innerhalb der Kampagne, z. B. mail:anna@example.de.',
      },
    },
    { name: 'email', label: 'E-Mail', type: 'text', index: true },
    { name: 'telefon', label: 'Telefon', type: 'text', admin: { description: 'Normalisiert (+49…).' } },
    { name: 'telefonRoh', label: 'Telefon wie geliefert', type: 'text' },
    { name: 'vorname', label: 'Vorname', type: 'text' },
    { name: 'nachname', label: 'Nachname', type: 'text' },
    { name: 'kundennummer', label: 'Kundennummer', type: 'text', index: true },
    { name: 'entitlementId', label: 'Berechtigung', type: 'text' },
    { name: 'produktnummer', label: 'Produktnummer', type: 'text' },
    { name: 'geburtsdatum', label: 'Geburtsdatum', type: 'date' },
    {
      name: 'merkmale',
      label: 'Weitere Merkmale',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Zusätzliche Spalten einer hochgeladenen Liste — damit fremde Listen ohne Schemaänderung nutzbar sind.',
      },
    },
    {
      name: 'quelle',
      label: 'Herkunft',
      type: 'select',
      options: [
        { label: 'Regeln', value: 'regel' },
        { label: 'Hochgeladen', value: 'csv' },
      ],
      admin: { readOnly: true },
    },
    // --- Bearbeitungsstand ---
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'offen',
      index: true,
      options: [
        { label: 'Offen', value: 'offen' },
        { label: 'In Arbeit', value: 'in_arbeit' },
        { label: 'Erledigt', value: 'erledigt' },
        { label: 'Entfällt', value: 'entfaellt' },
      ],
    },
    { name: 'ergebnis', label: 'Letztes Ergebnis', type: 'text', index: true },
    {
      name: 'entfallenGrund',
      label: 'Grund des Wegfalls',
      type: 'select',
      options: [
        { label: 'Konto inzwischen vorhanden', value: 'konto_vorhanden' },
        { label: 'Keine Kontaktmöglichkeit', value: 'kein_kontakt' },
        { label: 'Widerspruch', value: 'widerspruch' },
        { label: 'Höchstzahl Versuche erreicht', value: 'max_versuche' },
        { label: 'Dublette', value: 'dublette' },
      ],
    },
    { name: 'versuche', label: 'Versuche', type: 'number', required: true, defaultValue: 0, index: true },
    { name: 'letzterVersuchAm', label: 'Letzter Versuch', type: 'date', index: true },
    { name: 'wiedervorlageAm', label: 'Wiedervorlage am', type: 'date', index: true },
    {
      name: 'wiedervorlageFuer',
      label: 'Wiedervorlage für',
      type: 'text',
      admin: { description: 'Keycloak-Kennung, wenn jemand den Fall selbst weiterführen will.' },
    },
    { name: 'gesperrtVon', label: 'In Arbeit bei', type: 'text' },
    { name: 'gesperrtBis', label: 'Haltefrist bis', type: 'date', index: true },
    { name: 'kontoVorhanden', label: 'Konto vorhanden', type: 'checkbox' },
    { name: 'kontoGeprueftAm', label: 'Konto geprüft am', type: 'date', index: true },
    { name: 'abschlussAm', label: 'Abgeschlossen am', type: 'date' },
  ],
}

/**
 * Ein Kontaktversuch — jede Wahl, jede Mail eine Zeile.
 *
 * Bewusst eigene Collection statt Array am Fall: Ein Array wird beim Speichern
 * vollständig neu geschrieben, zwei gleichzeitige Schreibvorgänge verlören
 * einen Eintrag. Außerdem lässt sich so die Gesprächsnotiz — die heikelste
 * Angabe des ganzen Systems — getrennt löschen und getrennt auswerten.
 */
export const KampagnenKontakte: CollectionConfig = {
  slug: 'kampagnen-kontakte',
  labels: { singular: 'Kontaktversuch', plural: 'Kontaktversuche' },
  admin: {
    useAsTitle: 'zeitpunkt',
    defaultColumns: ['zeitpunkt', 'bearbeiterName', 'ergebnisCode', 'kanal'],
    group: 'Aktionen',
    hidden: ({ user }) => !istAdmin(user as { role?: 'admin' | 'redaktion' | null }),
    description: 'Protokoll der Kontaktversuche. Enthält Gesprächsnotizen.',
  },
  access: {
    read: nurAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'fall',
      label: 'Fall',
      type: 'relationship',
      relationTo: 'kampagnen-faelle',
      required: true,
      index: true,
    },
    {
      name: 'kampagne',
      label: 'Kampagne',
      type: 'relationship',
      relationTo: 'kampagnen',
      index: true,
      admin: { description: 'Doppelt geführt, damit Auswertung und Löschung ohne Umweg laufen.' },
    },
    { name: 'zeitpunkt', label: 'Zeitpunkt', type: 'date', required: true, index: true },
    { name: 'bearbeiter', label: 'Bearbeiter (Kennung)', type: 'text', required: true, index: true },
    { name: 'bearbeiterName', label: 'Bearbeiter', type: 'text' },
    {
      name: 'kanal',
      label: 'Kanal',
      type: 'select',
      options: [
        { label: 'Telefon', value: 'telefon' },
        { label: 'E-Mail', value: 'email' },
        { label: 'Vermerk', value: 'notiz' },
      ],
    },
    { name: 'ergebnisCode', label: 'Ergebnis', type: 'text', required: true, index: true },
    {
      name: 'notiz',
      label: 'Notiz',
      type: 'textarea',
      maxLength: 1000,
      admin: {
        description:
          'Nur sachbezogene Vermerke zum Anliegen. Keine Angaben zu Gesundheit, Herkunft oder Ähnlichem, keine Werturteile.',
      },
    },
    { name: 'dauerSekunden', label: 'Dauer (Sekunden)', type: 'number' },
    { name: 'naechsteWiedervorlage', label: 'Vereinbarte Wiedervorlage', type: 'date' },
  ],
}

/**
 * Wer nicht kontaktiert werden möchte — kampagnenübergreifend und dauerhaft.
 *
 * Ohne diese Liste wäre ein Widerspruch bei der nächsten Kampagne wieder
 * vergessen. Sie wird bei jeder Listenerzeugung und bei jeder Fallzuteilung
 * geprüft (Art. 21 DSGVO).
 */
export const KampagnenSperrliste: CollectionConfig = {
  slug: 'kampagnen-sperrliste',
  labels: { singular: 'Sperreintrag', plural: 'Sperrliste' },
  admin: {
    useAsTitle: 'schluessel',
    defaultColumns: ['schluessel', 'grund', 'gueltigAb', 'angelegtVon'],
    group: 'Aktionen',
    hidden: ({ user }) => !istAdmin(user as { role?: 'admin' | 'redaktion' | null }),
    description:
      'Personen, die nicht mehr kontaktiert werden möchten. Gilt für alle Kampagnen und wird nicht automatisch gelöscht.',
  },
  access: {
    read: nurAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'schluessel',
      label: 'Schlüssel',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'mail:… oder tel:… — derselbe Aufbau wie am Fall.' },
    },
    {
      name: 'art',
      label: 'Art',
      type: 'select',
      options: [
        { label: 'E-Mail', value: 'email' },
        { label: 'Telefon', value: 'telefon' },
      ],
    },
    {
      name: 'grund',
      label: 'Grund',
      type: 'select',
      required: true,
      defaultValue: 'widerspruch',
      options: [
        { label: 'Widerspruch', value: 'widerspruch' },
        { label: 'Falsche Nummer', value: 'falsche_nummer' },
        { label: 'Verstorben', value: 'verstorben' },
        { label: 'Sonstiges', value: 'sonstiges' },
      ],
    },
    { name: 'gueltigAb', label: 'Gültig ab', type: 'date', required: true },
    { name: 'angelegtVon', label: 'Angelegt von', type: 'text' },
    { name: 'notiz', label: 'Notiz', type: 'text', maxLength: 200 },
  ],
}
