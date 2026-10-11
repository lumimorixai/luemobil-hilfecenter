/**
 * Handbuch auf den Stand der App-Version 2 bringen.
 *
 * Anders als `seed.ts` ist das hier ein **Update**: Es läuft gegen eine
 * gefüllte Datenbank, legt fehlende Kapitel an und schreibt vorhandene auf
 * einen festgelegten Zielzustand. Die bisherigen Texte stehen dabei wörtlich
 * in diesem Zielzustand — ergänzt um das, was in Version 2 dazugekommen ist.
 *
 * Warum vollständiger Zielzustand statt „Absätze anhängen": Ein anhängendes
 * Skript ist nicht wiederholbar — beim zweiten Lauf stünde alles doppelt da.
 * So lässt es sich beliebig oft ausführen, auch nach einer Korrektur.
 *
 * ZWEI Stellen werden bewusst ENTFERNT, weil sie inzwischen falsch sind
 * (beides vom Auftraggeber freigegeben):
 *  - Kapitel „Verbindungen finden": der Hinweis, der Ticketkauf sei „in
 *    Vorbereitung" — er ist seit Version 2 fertig.
 *  - Kapitel „Abos & Buchungen": der Hinweis auf den „Ausbau".
 *
 * Quelle der Beschreibungen sind fünf Bildschirmaufnahmen der App vom
 * 11.10.2026. Alles hier Beschriebene ist dort zu sehen; nichts ist ergänzt
 * oder vermutet.
 *
 * Aufruf: pnpm handbuch:v2        (Bilder werden mitgeladen)
 *         pnpm handbuch:v2 --ohne-bilder
 */
import path from 'path'
import fs from 'fs'
import { payloadClient } from '../lib/content'

/** Ein Kapitel in seinem Zielzustand. */
type Kapitel = {
  slug: string
  order: number
  num: string
  title: string
  layout?: 'single' | 'row'
  reverse?: boolean
  paras: string[]
  bullets?: string[]
  note?: string | null
  /** Dateinamen im Bildordner, ohne Endung. */
  bilder?: string[]
}

/**
 * Wo die Screenshots liegen. Standardmäßig im Projekt unter
 * `handbuch-bilder/`; mit HANDBUCH_BILDER überschreibbar.
 */
const BILDORDNER = process.env.HANDBUCH_BILDER || path.resolve(process.cwd(), 'handbuch-bilder')

export const KAPITEL: Kapitel[] = [
  {
    slug: 'm-erste-schritte',
    order: 0,
    num: '1 · Erste Schritte',
    title: 'Onboarding',
    paras: [
      'Beim ersten Start begrüßt Sie LüMobil mit einer kurzen Einführung in drei Schritten: „Moin." stellt die App als Ihre Mobilitätswelt vor, es folgen Hinweise zu Tickets und Partnerdiensten sowie zum Abschluss die Zustimmung zu Nutzungsbedingungen, Datenschutz- und Cookie-Richtlinien bei Kontoerstellung.',
      'Direkt im Anschluss fragt LüMobil Ihre Datenschutz-Einstellungen ab. Die Fehlerberichterstattung ist voreingestellt — sie erfasst automatisch Daten über Fehler in der App. Die Statistik ist ausgeschaltet und bleibt es, solange Sie sie nicht selbst aktivieren. Beides lässt sich später jederzeit unter „Einstellungen → Datenerhebung" ändern.',
      'Die App kann anschließend auch ohne Konto genutzt werden — für bestimmte Funktionen wie das Hinterlegen des Deutschlandtickets, den Ticketkauf oder die Fahrzeugmitnahme auf der Fähre ist eine Anmeldung nötig (siehe „Konto & Deutschlandticket").',
    ],
  },
  {
    slug: 'm-start-menue',
    order: 1,
    num: '2 · Navigation',
    title: 'Startbildschirm, Karte & Hauptmenü',
    layout: 'row',
    paras: [
      'Der Startbildschirm zeigt eine Karte mit Haltestellen in Ihrer Nähe, das Suchfeld „Verbindung finden" sowie ein Kachel-Grid mit Direktzugriff auf alle Kernfunktionen: Alle Tickets, Abfahrten, Fähre, On-Demand-Shuttle, Abos, Deutschlandticket, Netzplan, Kontakt und Störungsmeldungen.',
      'Über das Menü-Symbol oben links öffnen Sie das Hauptmenü. Solange Sie nicht angemeldet sind, enthält es die Einträge „Anmelden", „Hilfe", „Einstellungen", „Barrierefreiheit" und „Über uns". Nach der Anmeldung ergänzen die Punkte „Profil" und „Aboverwaltung" das Menü.',
      'Die Karte zeigt die Linien der Stadtwerke Lübeck Mobil farblich unterschieden. Über den Knopf „Filter" und den Zähler links daneben (zum Beispiel „29/29") öffnen Sie die Linienübersicht und bestimmen, was zu sehen sein soll.',
    ],
    bullets: [
      'Linienauswahl: Über den Schalter „Auswahl" blenden Sie alle Linien gemeinsam ein oder aus; einzelne Linien tippen Sie gezielt an. Der Zähler auf der Karte zeigt, wie viele der 29 Linien gerade sichtbar sind.',
      'Kartenebenen: „Fahrzeuge anzeigen" blendet die Busse in Echtzeit auf der Karte ein.',
      'Aktualisierung: Wie oft die Fahrzeugpositionen neu geladen werden, legen Sie mit 15, 30, 45 oder 60 Sekunden selbst fest. Ein längerer Takt schont den Akku.',
      'Ein Tipp auf ein Fahrzeug zeigt Liniennummer, nächste Haltestelle, Fahrtrichtung und die aktuelle Auslastung.',
    ],
    bilder: ['b_startbildschirm', 'b_linienuebersicht', 'b_karte_fahrzeuge'],
  },
  {
    slug: 'm-verbindung',
    order: 2,
    num: '3 · Kernfunktion',
    title: 'Verbindungen finden',
    layout: 'row',
    paras: [
      'Tippen Sie auf das Suchfeld „Verbindung finden". Das Feld „Start" ist standardmäßig mit Ihrem aktuellen Standort oder einer gespeicherten Adresse vorausgefüllt, im Feld „Ziel" schlägt LüMobil während der Eingabe passende Adressen, Haltestellen sowie Ihre gespeicherten Orte vor.',
      'Eine Route lässt sich auch direkt auf der Karte beginnen: Tippen Sie lange auf einen Punkt, erscheint das Fenster „Neue Route" mit den Schaltflächen „Von hier" und „Nach hier".',
    ],
    bullets: [
      'Über „Demnächst" legen Sie fest, ob Sie ab sofort, ab einer bestimmten Uhrzeit oder bis zu einer Ankunftszeit reisen möchten.',
      '„Suchen" zeigt passende Verbindungen an; über „Früher"/„Später" blättern Sie durch weitere Vorschläge.',
      'Die Auslastungsprognose schätzt ein, wie voll die vorgeschlagenen Fahrten voraussichtlich sind — hilfreich, wenn Sie einen Sitzplatz oder Platz für Kinderwagen und Fahrrad brauchen.',
      'Ein Tipp auf eine Verbindung öffnet die Route inklusive Fußwegabschnitten auf der Karte, Gesamtdauer, Umstiege und Liniennummern.',
      'Die Detailansicht nennt zu jedem Abschnitt die Gehzeit und Entfernung, die Abfahrts- und Ankunftszeit, die Linie sowie die Zahl der Haltestellen bis zum Umstieg.',
    ],
    note: null,
    bilder: ['b_verbindungsliste', 'b_verbindung_detail'],
  },
  {
    slug: 'm-abfahrten',
    order: 3,
    num: '4 · Kernfunktion',
    title: 'Abfahrten in Echtzeit',
    paras: [
      'Über die Kachel „Abfahrten" zeigt der Tab „In der Nähe" automatisch Haltestellen in Ihrer Umgebung inklusive Fußwegzeit. Alternativ finden Sie eine Haltestelle über das Suchfeld oder greifen im Tab „Favoriten und Verlauf" auf gespeicherte bzw. zuvor besuchte Haltestellen zu.',
      'Die Abfahrtstafel einer Haltestelle listet alle anstehenden Abfahrten mit Linie, Fahrtziel und Uhrzeit. Der Echtzeit-Status zeigt an, ob eine Fahrt planmäßig (grau), pünktlich (grün) oder verspätet (rot, mit Minutenangabe) ist.',
      'Zu jeder Abfahrt steht zusätzlich die erwartete Auslastung, zum Beispiel „Gering". Ist für eine Fahrt kein Wert verfügbar, erscheint ein Strich.',
      'Über die Schaltflächen „Jetzt", „10 Min." und „20 Min." verschieben Sie den Zeitpunkt, ab dem die Abfahrten angezeigt werden. Die Kopfzeile nennt die Gesamtzahl der Abfahrten sowie die Fußwegzeit zur Haltestelle; Sie erreichen eine Haltestelle außerdem durch Antippen auf der Karte.',
    ],
    bilder: ['b_abfahrten_auslastung'],
  },
  {
    slug: 'm-favoriten',
    order: 4,
    num: '5 · Komfortfunktion',
    title: 'Adressen & Haltestellen als Favoriten',
    paras: [
      'Unter „Zuhause" und „Arbeit" hinterlegen Sie Ihre wichtigsten Adressen, damit LüMobil sie bei der Verbindungssuche automatisch als Start- oder Zielvorschlag anbietet. Zusätzlich lassen sich beliebige Haltestellen über den Stern in der Abfahrtenübersicht als Favorit markieren.',
      'Beim Anlegen genügt der Anfang der Adresse: LüMobil schlägt während der Eingabe Straßen, Hausnummern, Haltestellen und Kreuzungen vor — Sie wählen den passenden Eintrag aus der Liste.',
      'Die Favoritenübersicht zeigt alle gespeicherten Orte auf einen Blick — über das Stift-Symbol bearbeiten Sie „Zuhause" und „Arbeit", über den Papierkorb entfernen Sie einzelne Haltestellen-Favoriten.',
    ],
  },
  {
    slug: 'm-konto',
    order: 5,
    num: '6 · Konto',
    title: 'Anmeldung, Konto & Deutschlandticket',
    paras: [
      'Für einige Funktionen — etwa die Hinterlegung Ihres Deutschlandtickets, den Ticketkauf oder die Verwaltung Ihres Profils — benötigen Sie ein persönliches Kundenkonto. Tippen Sie dazu im Menü auf „Anmelden" und geben Sie E-Mail-Adresse und Passwort ein, oder registrieren Sie sich neu.',
      'Unter „Profil" verwalten Sie Mobiltelefonnummer, Geburtsdatum, Profiltyp (z. B. Erwachsener, Kind, Ermäßigung Seniorenpass/Behinderung/Begleitperson) sowie Ihre Marketingeinstellungen.',
      'Dazu kommen in Version 2 Ihre Anschrift (Postleitzahl, Ort, Straße und Hausnummer), der Bereich „Zahlungsmethoden" mit „+ Neue Zahlungsmethode hinzufügen" sowie „Meine Fahrzeuge". Dort stehen Ihre gespeicherten Fahrzeuge mit Name und Kennzeichen für die Fährfahrt bereit. Änderungen übernehmen Sie mit „Profil speichern".',
      'Ist Ihrem Konto ein Deutschlandticket zugeordnet, zeigt die Kachel „Deutschlandticket" es jederzeit als digitalen Fahrschein mit QR-Code, Gültigkeitszeitraum und dem Hinweis „Nicht übertragbar." an. Halten Sie bei einer Kontrolle zusätzlich einen amtlichen Lichtbildausweis bereit.',
    ],
    bilder: ['b_profil'],
  },
  {
    slug: 'm-tickets',
    order: 6,
    num: '7 · Kernfunktion',
    title: 'Tickets kaufen und bezahlen',
    layout: 'row',
    paras: [
      'Seit Version 2 kaufen Sie Fahrkarten direkt in LüMobil. Über die Kachel „Alle Tickets" wählen Sie zunächst die Region — voreingestellt ist Lübeck, über „Region ändern" wechseln Sie sie. Darunter stehen „Zeitkarten" und „Einzelkarten" zur Auswahl; unter „Favoriten" erscheinen die Tickets, die Sie beim Kauf mit dem Stern „Ticket als Favorit" markiert haben.',
      'Jedes Ticket zeigt vor dem Kauf Passagier, Gültigkeitsbereich und Preis. Passagier und Gültigkeit lassen sich über das Stift-Symbol ändern.',
    ],
    bullets: [
      'Zeitkarten: Tageskarte 2. Klasse (11,70 €) für beliebig viele Fahrten auf der gewählten Strecke an einem Tag, Kleingruppenkarte 2. Klasse (21,70 €) — lohnt sich oft schon ab zwei gemeinsam reisenden Personen — und die Fahrradtageskarte (6,00 €).',
      'Einzelkarten: Einzelkarte 2. Klasse (4,40 €) für eine einfache Fahrt in eine Richtung mit Umstieg, Einzelkarte Kind 2. Klasse (2,60 €) und Fahrradeinzelkarte Bus (4,40 €).',
      'Preisstufe und Tarifzonen: Unter „Preisstufe" wählen Sie zwischen den Verbindungen innerhalb der Stadt Lübeck (Price Level 2) und über die Region Lübeck (Price Level 3); der Reiter „Tarifzonen" zeigt die einzelnen Zonen, etwa „6099 Lübeck". Der gewählte Bereich bestimmt den Preis.',
      'Personalisierung: Vor dem Kauf tragen Sie Vorname, Name und Geburtstag ein. Das Ticket ist damit personengebunden — nur die Person, deren Name darauf steht, darf es verwenden.',
      'Bezahlen: Als Zahlungsmethoden stehen Karte (Mastercard, Visa, Amex), Apple Pay und Wero (direkt vom Bankkonto) zur Verfügung. Die Zahlung wird über den Dienstleister PAYONE abgewickelt, die Übertragung ist SSL-verschlüsselt. Eine neue Zahlungsmethode hinterlegen Sie über „Zahlungsmethode hinzufügen"; mit „Verbindlich buchen" schließen Sie den Kauf ab.',
    ],
    note: 'Die Fahrkarte ist vor dem Betreten des Fahrzeugs zu kaufen. Bitte beachten Sie: Das Ticket ist sofort nach dem Kauf gültig. Sind Sie unsicher, welche Zonen-Kombination Sie benötigen, hilft der Weg über die Verbindungsauskunft — dort lässt sich das passende Ticket direkt zur gesuchten Verbindung kaufen.',
    bilder: ['b_zeitkarten', 'b_einzelkarten', 'b_tarifzonen', 'b_applepay'],
  },
  {
    slug: 'm-abos',
    order: 7,
    num: '8 · Konto',
    title: 'Abos & Buchungen',
    paras: [
      'Im angemeldeten Zustand erreichen Sie über „Aboverwaltung" im Hauptmenü den Bereich „Abos & Buchungen". Dort starten Sie über „Abo hinzufügen" die Einrichtung eines neuen Abonnements und sehen unter „Aktive Buchungen" Ihre laufenden Buchungen — sind keine vorhanden, erscheint der Hinweis „Aktuell hast du keine aktiven Buchungen". Über „Vergangene Buchungen anzeigen" öffnen Sie Ihren Buchungsverlauf.',
    ],
    note: null,
  },
  {
    slug: 'm-support',
    order: 8,
    num: '9 · Hilfe',
    title: 'Hilfe, FAQ & Support kontaktieren',
    paras: [
      'Im Menü unter „Hilfe" finden Sie die „Häufig gestellten Fragen" sowie den Zugang zum Support-Formular. Alternativ gelangen Sie über die Startbildschirm-Kachel „Kontakt" direkt zum Formular.',
      'Wählen Sie zunächst ein passendes Thema (z. B. „Technisches Problem mit der App", „Zahlungsproblem", „Tickets nicht erhalten", „Verlorene Gegenstände", „Lob", „Beschwerde" oder „Sonstiges"), füllen Sie Name und E-Mail als Pflichtfelder aus, beschreiben Sie Ihr Anliegen und hängen Sie bei Bedarf Screenshots an (PNG, JPG oder JPEG, max. 2 MB pro Bild). Nach dem Absenden erhalten Sie automatisch eine Bestätigungs-E-Mail.',
      'Aktuelle Einschränkungen im Betrieb finden Sie außerdem über die Kachel „Störungsmeldungen" auf dem Startbildschirm.',
    ],
  },
  {
    slug: 'm-faehre',
    order: 9,
    num: '10 · Kernfunktion',
    title: 'Fährtickets kaufen',
    layout: 'row',
    paras: [
      'Die Überfahrt mit der Priwallfähre buchen Sie seit Version 2 direkt in der App — über die Kachel „Fähre" auf dem Startbildschirm. Zuerst wählen Sie die Richtung, etwa „Priwallfähre → Travemünde" oder „Lübeck-Travemünde → Priwallfähre".',
      'Danach stellen Sie unter „Weitere Tickets" zusammen, wer mitfährt. Jeder Tarif hat eine eigene Zeile mit Minus- und Plus-Schaltfläche; sobald Sie eine Anzahl wählen, zeigt die Zeile neben dem Einzelpreis auch den Gesamtbetrag. Ganz unten läuft der Gesamtpreis für die Buchung mit.',
    ],
    bullets: [
      'Einzelfahrten: „Einzel Erw" (2,10 €), „Einzel Kind" (1,20 €) und „Einzel Fahrrad" (1,20 €) gelten für eine Überfahrt.',
      'Mehrfahrtenkarten: Woka- und Moka-Karten bündeln mehrere Fahrten zu einem günstigeren Preis je Fahrt — jeweils als Erwachsenen-, Schüler- und Azubi-Tarif, für Schülerinnen und Schüler der Priwallschulen sowie für die Fahrradmitnahme.',
      'Fahrzeug mitnehmen: Der Schalter „Reise mit Fahrzeug?" öffnet die Fahrzeugtypen. Der Preis richtet sich nach dem Gewicht — Leicht- und Kleinfahrzeuge 2,50 €, bis 3,5 t 5,10 €, bis 7,5 t 9,70 €, bis 16 t 13,10 €, bis 38 t 20,60 €; für Busse und für Woka/Moka-Fahrzeugkarten gelten eigene Stufen.',
      'Fahrzeug hinterlegen: Zum Fahrzeug tragen Sie einen Namen (etwa „Familienwagen" oder „Firmenwagen") und das Kennzeichen ein, auf Wunsch auch ein Foto. Mit „Fahrzeug für zukünftige Fahrten speichern" steht es beim nächsten Mal unter „Meine Fahrzeuge" bereit und muss nicht erneut eingegeben werden.',
      'Abschließen: Solange keine Auswahl getroffen ist, bleibt die Schaltfläche „Fahrt beginnen" grau. Sobald mindestens ein Ticket gewählt ist, wird sie orange und schließt die Buchung ab. Bezahlt wird mit den im Profil hinterlegten Zahlungsmethoden.',
    ],
    note: 'Fahrzeug- und Personentarife sind getrennt: Jede Person im Fahrzeug benötigt zusätzlich ein eigenes Ticket. Die genannten Preise sind der Stand von Oktober 2026 — maßgeblich sind die Beträge, die Ihnen die App beim Kauf anzeigt.',
    bilder: ['b_faehre_tarife', 'b_faehre_fahrzeugtypen', 'b_meine_fahrzeuge'],
  },
  {
    slug: 'm-netzplan',
    order: 10,
    num: '11 · Weitere Angebote',
    title: 'Netzplan & On-Demand-Shuttle',
    paras: [
      'Über die Kachel „Netzplan" öffnet sich der interaktive Linien- und Netzplan mit allen Bus- und Bahnlinien der Region Lübeck sowie aktuellen Störungshinweisen. Er öffnet sich als eigenständige Webansicht und kann gelegentlich in englischer Oberflächensprache erscheinen.',
      'Für spontane Fahrten außerhalb der klassischen Linienwege bietet die Kachel „On-Demand-Shuttle" Zugang zum Partnerdienst „lümo" (Via Transportation, Inc.) — einer eigenständigen App, die bei erster Nutzung separat installiert wird.',
    ],
    bilder: ['b_fahrzeugmitnahme'],
  },
  {
    slug: 'm-einstellungen',
    order: 11,
    num: '12 · Verwaltung',
    title: 'Einstellungen, Barrierefreiheit & Rechtliches',
    paras: [
      'Unter „Einstellungen → Sprache" legen Sie fest, ob LüMobil die Systemsprache übernimmt oder fest auf Deutsch bzw. Englisch eingestellt ist. Unter „Einstellungen → Datenerhebung" steuern Sie einzeln, ob Fehlerberichterstattung, Statistik und Marketing-Daten erfasst werden dürfen — dieselben Schalter, die Ihnen beim ersten Start begegnet sind.',
      '„Barrierefreiheit" bündelt Informationen und Einstellungen für Menschen mit Beeinträchtigungen. Unter „Über uns" finden Sie AGB, Nutzungsbedingungen, Datenschutz, Impressum sowie Links zu den Social-Media-Kanälen der Stadtwerke Lübeck.',
    ],
    note: 'Herausgeberin von LüMobil ist die Stadtwerke Lübeck Gruppe GmbH, Geniner Straße 80, 23560 Lübeck. Die Entwicklung wird durch das Bundesministerium für Verkehr gefördert.',
  },
]

/** Bild in die Media-Collection laden — oder das vorhandene wiederverwenden. */
async function bildId(
  payload: Awaited<ReturnType<typeof payloadClient>>,
  name: string,
): Promise<number | string | null> {
  const dateiname = `${name}.jpg`
  const vorhanden = await payload.find({
    collection: 'media',
    where: { filename: { equals: dateiname } },
    limit: 1,
    overrideAccess: true,
  })
  if (vorhanden.docs.length > 0) return vorhanden.docs[0].id

  const pfad = path.join(BILDORDNER, dateiname)
  if (!fs.existsSync(pfad)) {
    console.warn(`  ! Bild fehlt, wird übersprungen: ${pfad}`)
    return null
  }
  const doc = await payload.create({
    collection: 'media',
    data: { alt: ALT[name] ?? name },
    filePath: pfad,
    overrideAccess: true,
  })
  return doc.id
}

/** Alternativtexte — Pflicht für Screenreader, deshalb hier gepflegt. */
const ALT: Record<string, string> = {
  b_startbildschirm: 'Startbildschirm der App mit Karte und den Kacheln für alle Funktionen',
  b_linienuebersicht: 'Linienübersicht mit Auswahl der Linien, Kartenebenen und Aktualisierungstakt',
  b_karte_fahrzeuge: 'Karte mit farbigen Linien und den Fahrzeugen in Echtzeit',
  b_verbindungsliste: 'Liste gefundener Verbindungen mit Uhrzeiten, Dauer und Auslastungsprognose',
  b_verbindung_detail: 'Detailansicht einer Verbindung mit Fußwegen, Umstieg und Ankunftszeit',
  b_abfahrten_auslastung: 'Abfahrtstafel einer Haltestelle mit Pünktlichkeit und Auslastung',
  b_profil: 'Profilseite mit Anschrift, Zahlungsmethoden und gespeicherten Fahrzeugen',
  b_zeitkarten: 'Übersicht der Zeitkarten mit Preisen',
  b_einzelkarten: 'Übersicht der Einzelkarten mit Preisen und der Detailansicht eines Tickets',
  b_tarifzonen: 'Auswahl von Preisstufe und Tarifzonen',
  b_applepay: 'Hinzufügen von Apple Pay als Zahlungsmethode',
  b_fahrzeugmitnahme: 'Auswahl des Fahrzeugtyps für die Fährfahrt mit Preisen nach Gewicht',
  b_faehre_tarife: 'Tarifauswahl für die Fähre mit Einzel-, Woka- und Moka-Karten und Mengenwahl',
  b_faehre_fahrzeugtypen: 'Fahrzeugtypen für die Fährfahrt mit Preisen nach Gewichtsklasse',
  b_meine_fahrzeuge: 'Gespeichertes Fahrzeug mit Name und Kennzeichen vor dem Fahrtbeginn',
}

export async function handbuchAktualisieren(mitBildern = true): Promise<void> {
  const payload = await payloadClient()
  let neu = 0
  let geaendert = 0

  for (const k of KAPITEL) {
    const bilder: (number | string)[] = []
    if (mitBildern) {
      for (const name of k.bilder ?? []) {
        const id = await bildId(payload, name)
        if (id != null) bilder.push(id)
      }
    }

    const daten: Record<string, unknown> = {
      slug: k.slug,
      order: k.order,
      num: k.num,
      title: k.title,
      layout: k.layout ?? 'single',
      reverse: k.reverse ?? false,
      paras: k.paras.map((text) => ({ text })),
      bullets: (k.bullets ?? []).map((text) => ({ text })),
      note: k.note ?? null,
    }
    // Bilder nur setzen, wenn welche vorgesehen sind — sonst blieben
    // vorhandene Screenshots bestehen, statt gelöscht zu werden.
    if (bilder.length > 0) daten.images = bilder

    const da = await payload.find({
      collection: 'manual-chapters',
      where: { slug: { equals: k.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (da.docs.length === 0) {
      await payload.create({ collection: 'manual-chapters', data: daten as never, overrideAccess: true })
      console.log(`  + angelegt:    ${k.num} ${k.title}`)
      neu++
    } else {
      await payload.update({
        collection: 'manual-chapters',
        id: da.docs[0].id,
        data: daten as never,
        overrideAccess: true,
      })
      console.log(`  ~ aktualisiert: ${k.num} ${k.title}${bilder.length ? ` (${bilder.length} Bilder)` : ''}`)
      geaendert++
    }
  }

  console.log(`\nFertig: ${neu} angelegt, ${geaendert} aktualisiert, nichts gelöscht.`)
}

if (process.argv[1]?.includes('handbuch-v2')) {
  const mitBildern = !process.argv.includes('--ohne-bilder')
  handbuchAktualisieren(mitBildern)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fehlgeschlagen:', err)
      process.exit(1)
    })
}
