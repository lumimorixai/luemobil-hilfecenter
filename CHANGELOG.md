# Änderungsprotokoll

Neueste Änderungen oben. Je Eintrag: was neu ist und **was beim Update von Hand
zu tun ist**. Allgemeiner Update-Ablauf: `LIVE-GEHEN.md`, „Später: Updates
einspielen".

## 2026-10-06 — Kundencheck ohne Menü für Servicemitarbeitende

Wer ausschließlich die Rolle `kundencheck` hat, sieht ab jetzt **nur den
Kundencheck** — keine Seitenleiste, keine Bereiche, die ohnehin gesperrt sind.

- **Fokussierte Ansicht:** Statt der Seitenleiste steht oben eine schmale
  Zeile mit LüMobil-Zeichen, Bereichsname, angemeldeter Person, Hell/Dunkel
  und „Abmelden". Der Inhalt nimmt die volle Breite ein.
- **Entschieden wird an der Rolle, nicht am Pfad.** Wer nur einen Bereich
  darf, wird von allen anderen Seiten ohnehin dorthin umgeleitet. Konten mit
  `cockpit` oder `support` behalten die vollständige Navigation unverändert.
- **Gilt ebenso für den Arbeitsplatz:** Ein Konto mit nur `callcenter` sieht
  „Fälle abarbeiten" ohne Menü. Dieselbe Begründung, derselbe Code — eine
  Seitenleiste mit einem einzigen Punkt ist kein Wegweiser.
- Die Rollenprüfung selbst ist unverändert: Jede Seite und jeder Endpunkt
  prüft weiterhin serverseitig. Die Ansicht macht die Trennung nur sichtbar,
  sie stellt sie nicht her.
- Das LüMobil-Zeichen liegt jetzt in `src/components/cockpit/LuemobilZeichen.tsx`,
  weil es an zwei Stellen gebraucht wird.

**Beim Update** — keine Migration, keine neuen Variablen.

## 2026-09-29 — Zurückgegebene Fälle kommen nicht sofort zurück

„Zurückgeben, ohne Ergebnis" setzte den Fall wieder auf offen — und weil er in
der Reihenfolge weit vorn steht, lag er nach dem nächsten Klick sofort wieder
vor derselben Person. Damit war der Knopf nutzlos.

- **Der Fall wird jetzt für die zurückgebende Person zurückgestellt**, und
  zwar für die Dauer der Haltefrist der Kampagne (Vorgabe 15 Minuten).
- **Für alle anderen bleibt er sofort verfügbar.** Die Liste verliert nichts;
  nur wer den Fall abgegeben hat, bekommt ihn nicht gleich wieder.
- **Die Leermeldung sagt, woran es liegt:** „Es ist kein Fall für Sie offen.
  2 Fälle, die Sie zurückgegeben haben, stehen Ihnen vorübergehend nicht
  wieder zur Verfügung — andere können sie sofort bearbeiten." Bisher hieß es
  pauschal, es sei nichts offen, was in dieser Lage schlicht falsch war.
- Wird später ein Ergebnis erfasst, ist die Zurückstellung aufgehoben.

**Beim Update**
- Die Migration heißt jetzt `20260929_062040_kampagnen` und ersetzt die nie
  ausgelieferte `20260929_054852_kampagnen`. Neu sind zwei Spalten an
  `kampagnen_faelle`: `zurueckgestellt_von` und `zurueckgestellt_bis`.

## 2026-09-29 — Kampagne starten, pausieren, beenden

Eine Kampagne ließ sich nur über ein Auswahlfeld tief im Bearbeitungsformular
aktivieren. Wer eine fertige Liste vor sich hatte, suchte vergeblich nach einem
Start — zu Recht.

- **Knöpfe direkt an der Kampagne:** „Kampagne starten" (bzw. „Fortsetzen"),
  „Pausieren", „Beenden". Das Auswahlfeld im Formular bleibt, ist aber nicht
  mehr der einzige Weg.
- **Es steht dabei, was zum Starten fehlt.** Bisher lehnte der Server das
  Aktivieren ab — aber erst nach dem Klick. Jetzt ist der Knopf gesperrt und
  darunter steht im Klartext, was nachzutragen ist: Rechtsgrundlage,
  mindestens ein mögliches Ergebnis, eine eingeschaltete Auswahlregel.
- **Zwei weitere Hinweise an der Kampagne:** wenn sie läuft, aber noch keine
  Fälle hat (Liste erzeugen), und wenn alle Fälle abgearbeitet sind (kann
  beendet werden).
- **Im Editor** weist ein Hinweis auf fehlende Ergebnisse hin, solange keines
  angelegt ist — mit dem Verweis auf die Vorlagen.

**Beim Update** — keine Migration, keine neuen Variablen.

## 2026-09-29 — Konto-Abgleich ist eine Einstellung, keine Annahme

Dass ein Fall entfällt, sobald die Person ein Konto in der App hat, war fest
eingebaut — übernommen aus der D-Ticket-Aktion. Für eine Befragung oder eine
Störungsinformation wäre das falsch. Die Kampagne entscheidet das jetzt selbst.

**Neue Einstellung „Konto beim Zuteilen prüfen"** mit drei Möglichkeiten:

| Einstellung | Wirkung |
|---|---|
| **Nicht prüfen** (Vorgabe) | Keine Abfrage bei Keycloak, schnellste Zuteilung |
| **Fall entfällt, wenn ein Konto besteht** | Für Aktionen, deren Anlass mit dem Konto erledigt ist — etwa Hilfe beim Einrichten |
| **Fall zeigen, aber auf das Konto hinweisen** | Für Aktionen unabhängig vom Konto — etwa eine Befragung |

- Bei „hinweisen" erscheint am Fall deutlich, dass bereits ein Konto besteht;
  der Fall wird trotzdem bearbeitet.
- Die Vorgabe ist **Nicht prüfen** — keine Annahme über den Zweck der Aktion.
  Bestehende Kampagnen müssen die Einstellung also bewusst setzen.
- **Die Sperrliste bleibt davon unberührt und wird immer geprüft.** Ein
  Widerspruch nach Art. 21 DSGVO ist keine Konfigurationsfrage.

**Beim Update**
- Die Migration heißt jetzt `20260929_054852_kampagnen` und ersetzt die nie
  ausgelieferte `20260928_200047_kampagnen`.

## 2026-09-29 — Kampagnen: Stand nachzählen statt fortschreiben

Beim ersten echten Lauf meldete der Arbeitsplatz „kein Fall offen", während die
Übersicht sechs offene Fälle zeigte. Beides war falsch beziehungsweise
unvollständig: Alle sechs Personen hatten inzwischen ein Konto in der App,
waren beim Zuteilen korrekt entfallen — nur sagte das niemand.

- **Der Arbeitsplatz nennt den Grund.** Statt „kein Fall offen" steht dort
  jetzt, wie viele Fälle übersprungen wurden und warum: „6 Fälle wurden
  übersprungen und abgeschlossen: 6 Personen haben inzwischen ein Konto in der
  App." Die Meldung erscheint auch, wenn danach ein Fall kommt.
- **Die Übersicht zählt nach, statt den Zählern zu glauben.** Fälle entfallen
  auch ohne erfasstes Ergebnis; die fortgeschriebenen Zähler hinkten dann
  hinterher. Der Stand wird jetzt beim Anzeigen ermittelt — in einer einzigen
  Abfrage über alle Kampagnen, nicht einer je Kampagne und Status.
- **Neue Spalte „Entfallen"** in der Kennzahlenzeile, darunter die
  Aufschlüsselung: wie viele wegen eines Kontos, eines Widerspruchs, fehlender
  Kontaktmöglichkeit oder erreichter Höchstzahl. Der Fortschrittsbalken zählt
  entfallene Fälle als abgearbeitet — sie sind es.
- **Hinweis an der Kampagne**, wenn keine eingeschaltete Regel das Konto
  prüft: Solche Personen kommen in die Liste und entfallen erst beim Zuteilen.
  Mit der Regel „Konto in der App vorhanden ist nein" stehen sie gar nicht
  erst darin.
- Entfällt beim Zuteilen etwas, werden die gespeicherten Zähler der Kampagne
  jetzt ebenfalls nachgezogen.

**Beim Update** — keine Migration, keine neuen Variablen.

## 2026-09-28 — Kampagnen: Arbeitsplatz zum Abarbeiten

Unter **`/cockpit/kampagnen/arbeiten`** werden Fälle bearbeitet. Erreichbar
über den Menüpunkt „Fälle abarbeiten" und über den Knopf an jeder aktiven
Kampagne mit offenen Fällen.

- **Zugeteilt statt ausgesucht.** Ein Klick auf „Nächster Fall" holt den
  nächsten — es gibt keine Liste zum Durchstöbern. Das verhindert
  Rosinenpicken und macht die Zuteilung nachvollziehbar.
- **Zwei Personen bekommen nie denselben Fall.** Gesperrt und gelesen wird in
  einer einzigen Datenbankanweisung; unter PostgreSQL mit
  `FOR UPDATE SKIP LOCKED`. Geprüft mit zwei gleichzeitigen Zuteilungen.
- **Haltefrist.** Ein zugeteilter Fall gehört der Person für die an der
  Kampagne eingestellte Zeit (Vorgabe 15 Minuten). Danach wird er wieder
  ausgegeben — ein geschlossener Browser blockiert also niemanden dauerhaft.
  Beim Verlassen der Seite wird er zusätzlich sofort freigegeben.
- **Niemand wird kontaktiert, der schon ein Konto hat.** Beim Zuteilen wird
  einzeln gegen Keycloak geprüft; wer inzwischen eines hat, entfällt still und
  wird übersprungen. Dasselbe gilt für Einträge auf der Sperrliste.
- **Widerspruch wirkt dauerhaft.** Das Ergebnis mit der Wirkung „Sperren"
  trägt E-Mail und Telefonnummer in die kampagnenübergreifende Sperrliste ein
  (Art. 21 DSGVO) — die nächste Kampagne kennt den Widerspruch.
- **Höchstzahl Versuche** wird eingehalten: Nach dem letzten erfolglosen
  Versuch entfällt der Fall, statt endlos wiederzukehren.
- Was ein Ergebnis bewirkt, steht an der Kampagne, nicht im Code. Jeder
  Kontaktversuch wird mit Zeitpunkt, Person, Ergebnis und Notiz protokolliert.

**Neue Rolle**
- `callcenter` (überschreibbar mit `COCKPIT_ROLE_CALLCENTER`): darf Fälle
  abarbeiten, aber keine Kampagne anlegen, keine Liste erzeugen und die
  Patris-Daten im CMS nicht lesen. `cockpit` und `support` schließen sie ein.
- **In Keycloak anzulegen**, bevor Servicecenter-Konten damit arbeiten. Ohne
  die Rolle sieht ein Konto den Arbeitsplatz nicht.

**Beim Update**
- Keine Migration, keine neuen Pflicht-Variablen.
- Eine Kampagne gibt Fälle erst aus, wenn ihr Status **Aktiv** ist.

## 2026-09-28 — Kampagnen vollständig im Cockpit pflegen

Nachtrag zur Listenerzeugung: Kampagnen entstehen und ändern sich jetzt auf
`/cockpit/kampagnen`. Der Payload-Admin ist nur noch Nachschau — wer Aktionen
führt, braucht keinen CMS-Zugang.

- **Regeln zusammenklicken statt eintippen.** Feld, Vergleich und Wert je Zeile,
  hinzufügen und entfernen, UND/ODER umschalten. Jede Regel hat einen eigenen
  **Schalter**: Sie lässt sich abschalten, ohne sie zu verlieren — so wird eine
  Zielgruppe schrittweise eingegrenzt und zwischendurch durchgerechnet.
- **Nicht mehr auf einen Fall zugeschnitten:**
  - *Merkmale fremder Listen.* Eine Regel kann sich auf `merkmal:<spalte>`
    beziehen, also auf eine beliebige Spalte einer hochgeladenen Liste. Ohne
    das wäre jede fremde Liste eine Schemaänderung gewesen.
  - *Vier Kanäle* statt zwei: Telefon, E-Mail, Brief, anderer Weg. Brief und
    „anderer Weg" verlangen keinen festen Kontaktweg am Fall.
  - *Ergebniskatalog frei zusammenstellbar*, mit drei Vorlagen zum Übernehmen
    (Gespräch geführt, Nicht erreicht, Widerspruch) statt fester Vorgaben.
  - Die Texte sprechen von Kontaktaufnahme, nicht mehr von Anrufen.
- **Prüfungen an einer Stelle.** Aktivieren geht nur mit Rechtsgrundlage und
  mindestens einem Ergebnis; geprüft wird gegen den Stand *nach* der Änderung,
  nicht gegen die Eingabe allein. Löschen nur, solange die Kampagne keine Fälle
  hat — sonst rissen Gesprächsprotokolle mit, die aufbewahrt werden müssen.

**Beim Update**
- Die Migration heißt jetzt `20260928_200047_kampagnen` und ersetzt die nie
  ausgelieferte `20260928_172208_kampagnen`. Wer die alte Fassung bereits
  eingespielt hat — was nur bei einem Stand aus dem lokalen Zweig möglich ist —
  muss sie vorher zurückrollen.
- Regelfelder sind in der Datenbank jetzt Text statt Auswahllisten. Sonst
  erforderte jedes neue Merkmal einer fremden Liste eine Migration.

## 2026-09-28 — Kampagnen: Auswahlregeln und Listenerzeugung

Dritte Etappe der Kontaktaktionen. Aus dem Patris-Bestand entsteht jetzt die
Arbeitsliste einer Kampagne — noch ohne Arbeitsplatz, der folgt in Etappe 4.

- **Neue Seite `/cockpit/kampagnen`** (Rolle cockpit oder support): zeigt je
  Kampagne Status, Kanal, Regeln und den Bearbeitungsstand.
- **Trockenlauf vor jeder Erzeugung.** Der Knopf „Liste durchrechnen" rechnet
  mit demselben Code, der später schreibt, und nennt jede Zahl — auch die
  aussortierten: ohne Kontaktweg, mehrfach in der Auswahl, auf der Sperrliste,
  schon in der Kampagne. Erst danach lässt sich die Liste anlegen, und auch
  dann erst nach einer Rückfrage.
- **Regeln ohne Programmierung.** Acht Felder (Produktnummer, Produkt, E-Mail,
  Kundennummer, Ticket heute gültig, Telefon vorhanden, Volljährig, Konto
  vorhanden) mit sechs Vergleichen, UND- oder ODER-verknüpft. Ein neues
  Szenario ist ein neuer Datensatz im Admin, kein neuer Code.
- **Ohne Rechtsgrundlage keine Liste.** Fehlt die Angabe an der Kampagne oder
  fehlen die Regeln, bleibt das Anlegen gesperrt.
- **Volljährigkeit im Zweifel gegen den Anruf:** Wer kein Geburtsdatum hat,
  gilt nicht als volljährig und fällt aus der Auswahl.
- **Sperrliste greift schon bei der Erzeugung.** Wer einmal widersprochen hat,
  kommt in keine neue Liste — über E-Mail-Schlüssel und Telefonschlüssel.
- **Wiederholbar:** Ein zweiter Lauf legt nur an, was noch fehlt; bestehende
  Fälle behalten ihren Bearbeitungsstand.
- Der Abgleich gegen Keycloak läuft in einem Durchgang (`alleKontoEmails`,
  zehn Minuten gecacht) statt mit einer Abfrage je Person — bei mehreren
  tausend Kandidaten der Unterschied zwischen 25 Sekunden und Stunden.

**Beim Update**
- Keine Migration, keine neuen Umgebungsvariablen.
- Eine Kampagne wird im Admin unter **Aktionen → Kampagnen** angelegt
  (Name, Kennung, Kanal, Rechtsgrundlage, Gesprächsleitfaden, Regeln,
  Ergebniskatalog), die Liste dann im Cockpit erzeugt.
- **Noch offen vor der ersten echten Liste:** der Wortlaut der Rechtsgrundlage
  und der Eintrag V12 in `docs/DATENSCHUTZ.md`.

## 2026-09-28 — Telefonnummer und Geburtsdatum im Patris-Import

Vorbereitung der Anruflisten: Beide Spalten werden wieder übernommen. Sie waren
im September kurz implementiert und dann zurückgebaut worden — die Dokumentation
behauptete seitdem fälschlich, die Nummern würden gespeichert.

- Neue Spalten in `patris-entitlements`: `phone` (Aliase telefon, telephone,
  mobile, mobil, handy) und `birthday` — letzteres für die Regel, Minderjährige
  von Anrufen auszunehmen. 2.790 der 6.517 Nichtaktivierten sind minderjährig.
- **Beide sind optional**: Fehlen sie im Export, bleiben die Felder leer und der
  Upload läuft normal weiter. Ältere Exporte funktionieren unverändert.
- **Im Kundencheck bleiben sie unsichtbar.** Der Anzeigetyp `PatrisTicket` ist
  jetzt `Omit<PatrisRow, 'phone' | 'birthday'>` — das verhindert schon der
  Compiler, nicht erst die Sorgfalt beim Programmieren.

**Beim Update**
- Migration `20260928_120000_patris_telefon` läuft automatisch. Sie nutzt
  `ADD COLUMN IF NOT EXISTS`, weil unklar ist, ob die Spalte `phone` in
  Produktion schon existiert: Ein Schema-Snapshot vom September führt sie,
  ein passendes ALTER TABLE gab es aber nie.
- Die Nummern sind erst nach dem nächsten Patris-Upload da.

## 2026-09-26 — Kundencheck im Material des Cockpits, LüMobil-Zeichen in der Leiste

- **Kundencheck neu aufgebaut:** Suchzeile als Pille mit großem Eingabefeld, das
  Ergebnis als eigene Karte mit farbiger Kante und dem Handlungstext aus dem CMS.
  Die Ereignisse stehen in einer eigenen Karte darunter.
- **Anordnung nach Gewicht:** Zuerst und am breitesten die **Käufe in der App** —
  was die Person tatsächlich hat, ist die häufigste Frage im Servicecenter.
  Daneben die **Berechtigung laut Patris**, schmal rechts das **Konto in
  Keycloak**, das nur beantwortet, ob jemand überhaupt hineinkommt.
- Die Käufe sind jetzt eine gruppierte Liste statt einer Tabelle: eine Kopfzeile
  je Bestellung, darunter die Positionen. Die Tabelle hatte leere Zellen für
  Datum und Bestellnummer und brauchte mehr Breite, als die Karte hergibt. Neu
  darüber eine Summenzeile (Bestellungen, Tickets, nicht ausgelieferte).
- Neu: **Ladezustand** (drei angedeutete Zeilen statt eines springenden Layouts)
  und ein eigener Text, wenn zu einer Adresse gar kein Ticket im Export steht —
  vorher fehlte dieser Fall.
- Alle Farben kommen aus den Theme-Variablen; der Kundencheck sieht in der
  hellen wie in der dunklen Fassung richtig aus.
- **Das LüMobil-Zeichen** steht jetzt in der Seitenleiste — dasselbe Signet wie
  im Kopf des Hilfe-Centers, statt des orangefarbenen Platzhalters, in 42 px.

## 2026-09-26 — Kontenhistorie reicht jetzt bis zum ersten Konto zurück

Aufgefallen beim Blick auf „Neu angelegte Konten": Die Reihe begann erst am
12.09. Ausgerechnet der Migrationsstart am 10.09. mit **1.051 neuen Konten**
fehlte, ebenso der 11.09. mit 415.

Ursache: Die Tageswerte entstanden bisher nur über `backfill [tage]`, und der
Standard sind 14 Tage. Was davor lag, wurde nie geschrieben.

- **Neuer Befehl `pnpm job:cockpit konten`** schreibt die komplette
  Kontenhistorie — jeden Tag ab dem ersten angelegten Konto, lückenlos. Er
  braucht keine Keycloak-Events und reicht deshalb beliebig weit zurück:
  Das Anlagedatum steht dauerhaft am Konto, Events verfallen.
  Hier: 96 Tage ab dem 23.06. in neun Sekunden.
- **Eingebaute Probe:** Der Lauf summiert die Anlagen vorwärts und vergleicht
  das Ergebnis mit dem Keycloak-Zähler. Weicht es ab, endet der Job mit Fehler,
  statt stillschweigend falsche Zahlen zu hinterlassen.
- Anmeldezahlen fasst dieser Lauf bewusst nicht an — sie lassen sich nach Ablauf
  der Event-Frist nicht rekonstruieren.
- Die Diagramme beginnen jetzt beim ersten aufgezeichneten Tag statt mit
  Monaten voller Nullen, die aussahen wie „keine Anmeldungen".

**Beim Update**
- Einmalig ausführen, damit die Historie vollständig ist. In Produktion über
  den Cron-Endpunkt, weil das Image keine CLI-Jobs ausführen kann:
  ```bash
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "<DOMAIN>/api/cockpit/cron?job=konten"
  ```
  Die Antwort enthält `"ok": true`, wenn die Summe der Anlagen zum
  Keycloak-Zähler passt.

## 2026-09-25 — Korrektur: laufender Tag zeigte veraltete Kontenzahlen

Aufgefallen beim Nachzählen: Das Cockpit zeigte 92 neue Konten, Keycloak hatte
111 — 19 fehlten. Die Vergangenheit stimmte auf den Datensatz genau, nur der
laufende Tag hinkte.

Ursache war nicht die Berechnung, sondern die Anzeige: Sie nahm den
gespeicherten Tageswert und prüfte nie, ob er noch frisch ist. Solange der
Minuten-Job läuft, fällt das nicht auf; setzt er aus, veralten die Zahlen
stillschweigend.

- **Kontenbestand und neue Konten kommen jetzt direkt vom Keycloak-Zähler**
  (`/users/count`, eine einzige billige Abfrage). Der gespeicherte Wert ist nur
  noch Rückfall, wenn Keycloak nicht antwortet.
- **Anmeldungen und Fehlversuche des laufenden Tages** werden live nachgeholt,
  sobald der Tagesdatensatz älter als drei Minuten ist. Vorher geschah das nur,
  wenn er ganz leer war.
- **Das System meldet jetzt selbst, wenn ein Job steht:** Der Überblick zeigt
  eine Warnung, sobald die Tageswerte älter als fünf Minuten sind, und unter
  „Daten und Jobs" steht neben jedem Lauf, wie lange er zurückliegt. Das war die
  eigentliche Lücke — der Fehler fiel nur auf, weil jemand von Hand nachrechnete.

**Beim Update**
- Keine Migration. Nach dem Einspielen einmal prüfen, ob die Kachel „Neue Konten
  heute" zum Keycloak-Zähler passt.

## 2026-09-25 — Cockpit: neue Oberfläche, Bereiche statt Endlos-Seite

- **Ein Produkt statt zwei:** Die Seite `/kennzahlen` ist im Cockpit aufgegangen
  (Bereich „Auswertungen"). `/kennzahlen` und `/kundencheck` leiten weiter.
- **Zehn Bereiche in vier Gruppen** mit fester Seitenleiste; jeder Bereich ist
  eine eigene Route und lädt nur seine eigenen Daten. Vorher holte jeder Aufruf
  der einen langen Seite sämtliche Kennzahlen.
- **Neue Gestaltung** nach dem freigegebenen Entwurf: Glasflächen mit
  Tiefenunschärfe, große Radien, weiche Schatten, Diagramme ohne Achsen und
  Gitter. **Hell ist voreingestellt, Dunkel ein Umschalter** unten in der
  Seitenleiste; die Wahl bleibt im Browser der jeweiligen Person.
- Bewusste Abweichung vom SWL-Design-System, ausschließlich fürs interne
  Cockpit. Alle öffentlichen Seiten bleiben unverändert streng im System;
  Marke und Schrift gelten auch im Cockpit weiter.
- Rücksicht: Bei `prefers-reduced-transparency` entfällt die Unschärfe, bei
  `prefers-reduced-motion` die Puls-Animation der Live-Anzeige.

**Beim Update**
- Keine Migration, keine neue Umgebungsvariable.
- Lesezeichen funktionieren weiter; wo möglich sollten Anleitungen auf die
  neuen Adressen zeigen (Tabelle in `KUNDENCHECK-COCKPIT.md`, Abschnitt 0).

## 2026-09-25 — Korrektur: „Neue Nutzer" und Kontenbestand waren falsch

Beim Prüfen der Zahlen fiel auf, dass die Kachel „Neue Nutzer" nur einen
Bruchteil zeigte. Gezählt wurden ausschließlich **migrierte** Konten
(`federationLink`), angezeigt aber als „neue Nutzer". Gegenprobe in Keycloak:

| Tag | tatsächlich angelegt | davon migriert | angezeigt wurde |
|---|---|---|---|
| 23.09. | 136 | 10 | 10 |
| 24.09. | 114 | 10 | 10 |
| 25.09. | 92 | 10 | 10 |

Der daraus abgeleitete Kontenbestand war entsprechend falsch — er unterschätzte
den Zuwachs um mehr als das Zehnfache.

- **`newUsers` zählt jetzt alle an dem Tag angelegten Konten** (Anlagedatum in
  Keycloak). Die migrierten stehen separat in `migratedUsers`, die
  Selbstregistrierungs-Ereignisse weiterhin in `registrations`.
- **Der Kontenbestand wird aus den Anlagedaten hergeleitet** statt aus einer
  Rückwärtsrechnung mit der zu kleinen Zahl. Probe: Die Summe aller Anlagen
  entspricht exakt dem Keycloak-Zähler (4.807 = 4.807), und jeder Vortag ergibt
  sich aus dem Folgetag abzüglich dessen Anlagen.
- **Der Backfill ist dabei schneller geworden:** ein Durchgang durch die
  Nutzerliste für alle Tage statt einem je Tag (14 Tage: 32 s statt 67 s).
- Beschriftungen geschärft: „Neue Konten" statt „Neue Nutzer", mit dem Zusatz
  „migriert und selbst registriert".

**Beim Update — wichtig**
- Migration `20260925_193000_cockpit_migrated` läuft automatisch.
- **Die bestehenden Tageswerte in Produktion sind betroffen** und müssen einmal
  neu berechnet werden, sonst bleiben die falschen Zahlen stehen:
  ```bash
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "<DOMAIN>/api/cockpit/cron?job=konten"
  ```

## 2026-09-25 — Cockpit: Geschäftszahlen, längere Historie, vollständige Event-Zahlen

- **Neue Blöcke im Cockpit:** „Ankommen im neuen System" (Aktivierungsquote, mit
  Konto, berechtigt ohne Konto, Berechtigte gesamt, neue Konten 7 Tage,
  Aktivierung je Segment, schwächste Postleitzahlen) und „Tickets und Umsatz"
  (Verkäufe, Bruttoumsatz, Auslieferungsquote, Abbrüche, 30-Tage-Verlauf).
  Quelle ist die Reporting-Datenbank über einen **nur lesenden Account mit
  Zugriff auf vier aggregierte Views ohne Personenbezug** → `docs/REPORTING.md`.
- **Event-Zahlen waren zu niedrig:** Keycloak liefert je Abfrage höchstens 5.000
  Ereignisse; an verkehrsreichen Tagen fehlten die ältesten. Die Abfrage blättert
  jetzt. In der Entwicklungsumgebung stiegen die Logins eines Tages dadurch von
  2.702 auf 3.125 — ältere Tageswerte waren also zu niedrig und sollten einmal
  neu berechnet werden.
- **Support-Ereignisse und Logins je Client** stehen jetzt in der Tagesreihe
  statt bei jedem Seitenaufruf live aus den Events. Die Bezugsgröße ist dadurch
  der Kalendertag („heute", „7 Tage") statt rollender Stunden.
- **Historie:** Tageswerte werden nie gelöscht (rund 40 KB im Jahr); die
  Diagramme lassen sich auf 7/30/90/365 Tage umschalten. Die Minuten-Checks
  werden zu einem Tageswert je Dienst verdichtet und nach
  `HEALTH_RETENTION_DAYS` (Standard 35) aufgeräumt — die Verfügbarkeit bleibt
  damit jahrelang sichtbar, ohne dass die Datenbank wächst.
- **Siebte Ampel:** Auch die Reporting-Datenbank wird überwacht.

**Beim Update**
- Migrationen `20260925_170000_cockpit_support` und
  `20260925_183000_cockpit_availability` laufen automatisch.
- Lese-Account für das Reporting anlegen und `REPORTING_DATABASE_URI` setzen —
  Schritt für Schritt in `docs/REPORTING.md`. Ohne diesen Schritt zeigen die
  beiden neuen Blöcke einen Hinweis; alles andere funktioniert.
- Einmalig die Tageswerte neu berechnen (Produktion über den Cron-Endpunkt —
  das Image kann keine CLI-Jobs ausführen):
  ```bash
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "<DOMAIN>/api/cockpit/cron?job=konten"
  ```
- Optional: `HEALTH_RETENTION_DAYS` in `.env` setzen (Standard 35 Tage).

## 2026-09-25 — Cockpit: Zahlen aus der eigenen Datenbank, Monitoring erweitert

- **Kontenbestand und neue Konten** kommen jetzt aus `cockpit-daily` statt bei
  jedem Seitenaufruf aus Keycloak. Vorher wurde dafür die gesamte Nutzerliste
  durchblättert — zweimal je Aufruf. Der Minuten-Job schreibt den Bestand über
  den günstigen Zähler `/users/count` fort.
- **Monitoring erweitert:** Die Ampel und die Verfügbarkeitsstreifen umfassen
  zusätzlich Ticket-API, Dashboards (Metabase) und das Alter des
  Patris-Uploads. Alle drei lösen auch Störungsmails aus.
- **Datum überall:** Letzter Check, letzte Störung, Segment-Beschriftungen und
  der Stand der Live-Ampel zeigen jetzt Datum und Uhrzeit, nicht nur die Uhrzeit.
- Entfällt: die Minutenauflösung „letzte Stunde" bei neuen Konten. Sie war nur
  über das Durchblättern aller Keycloak-Konten möglich; Tagesauflösung bleibt.
- Der hochgeladene Patris-Export bleibt unverändert die Quelle der Wahrheit für
  die Ticketberechtigung im Kundencheck.

**Beim Update**
- Migration `20260925_150000_cockpit_total_users` läuft automatisch (neue Spalte
  `total_users`, ohne Vorgabewert).
- Einmalig die Historie nachtragen:
  ```bash
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "<DOMAIN>/api/cockpit/cron?job=konten"
  ```
  Dauert rund zehn Sekunden. Ohne diesen Schritt bleibt die Bestandskurve der
  vergangenen Tage leer; die laufenden Tage füllt der Minuten-Job selbst.
- Optional: `PATRIS_MAX_AGE_DAYS` in `.env` setzen (Standard 7 Tage), ab wann
  ein veralteter Patris-Upload als Störung gemeldet wird.

## 2026-09-23 — Kennzahlen: Flackern durch Scrollbalken-Rückkopplung behoben

- Platz für den Scrollbalken wird auf `/kennzahlen` fest reserviert und die
  iframe-Höhe erst ab 32 px Breitenänderung neu gesetzt. Vorher schaukelten sich
  Höhe und Scrollbalken gegenseitig auf.

## 2026-09-25 — Kundendaten im CMS abgesichert

- **Payload-Rollen:** Konten sind jetzt „Administrator" oder „Redaktion".
  Kundendaten aus dem Patris-Import (inkl. Telefonnummern) lesen nur noch
  Administratoren — vorher kam jedes angemeldete CMS-Konto über die REST-API an
  den gesamten Bestand.
- **Kundencheck per POST:** Die gesuchte E-Mail steht nicht mehr in der URL und
  landet damit nicht in Server-, Proxy- oder Browser-Verlauf.
- **Dev-Login** ist in Produktions-Builds zusätzlich hart gesperrt, unabhängig
  von `COCKPIT_MOCK`.

**Beim Update**
- Migration `20260925_092649_users_rolle` läuft automatisch; **bestehende Konten
  bleiben Administrator**, neue Konten sind standardmäßig Redaktion.
- Danach im Admin unter System → Benutzer die Rollen vergeben: Redaktionskonten
  auf „Redaktion" setzen.

## 2026-09-23 — Kennzahlen: Flackern durch Scrollbalken-Rückkopplung behoben

- Platz für den Scrollbalken wird auf `/kennzahlen` fest reserviert und die
  iframe-Höhe erst ab 32 px Breitenänderung neu gesetzt. Vorher schaukelten sich
  Höhe und Scrollbalken gegenseitig auf.

## 2026-09-25 — Kundendaten im CMS abgesichert

- **Payload-Rollen:** Konten sind jetzt „Administrator" oder „Redaktion".
  Kundendaten aus dem Patris-Import (inkl. Telefonnummern) lesen nur noch
  Administratoren — vorher kam jedes angemeldete CMS-Konto über die REST-API an
  den gesamten Bestand.
- **Kundencheck per POST:** Die gesuchte E-Mail steht nicht mehr in der URL und
  landet damit nicht in Server-, Proxy- oder Browser-Verlauf.
- **Dev-Login** ist in Produktions-Builds zusätzlich hart gesperrt, unabhängig
  von `COCKPIT_MOCK`.

**Beim Update**
- Migration `20260925_092649_users_rolle` läuft automatisch; **bestehende Konten
  bleiben Administrator**, neue Konten sind standardmäßig Redaktion.
- Danach im Admin unter System → Benutzer die Rollen vergeben: Redaktionskonten
  auf „Redaktion" setzen.

## 2026-09-25 — Telefonnummer im Patris-Import

- Der CSV-Import übernimmt zusätzlich die Spalte `phone` (auch `telefon`,
  `telephone`, `mobile`, `mobil`, `handy`), wenn sie vorhanden ist. Die Spalte ist
  optional: Ältere Exporte ohne sie funktionieren unverändert weiter.
- Angezeigt wird die Nummer noch nicht; sie ist die Grundlage für die geplante
  Anrufaktion des Callcenters.

**Beim Update**
- Migration `20260925_073842_patris_phone` läuft automatisch (eine neue Spalte).
- Danach die Patris-CSV neu hochladen, damit die Nummern in der Datenbank landen.

## 2026-09-23 — Tokens und Schlüssel unempfindlich gegen Umbrüche

- Aus Ticket-API-Token und Metabase-Schlüssel werden jetzt alle Leerzeichen und
  Zeilenumbrüche entfernt, nicht nur am Rand. Ein beim Einfügen ins Terminal
  umbrochenes Token führte sonst zu einem unverständlichen HTTP 401.

## 2026-09-23 — Kennzahlen: Flackern endgültig behoben

- Die Breite entsteht jetzt dadurch, dass die Inhaltsspalte der Seite selbst
  breiter wird (`:has()`), statt dass ein Block per negativem Rand aus ihr
  herausragt. Nur so bleibt das iframe beim Scrollen ruhig.
- Neu: `?breit=0` zeigt das Dashboard in normaler Spaltenbreite (Diagnose).

## 2026-09-23 — Ticket-API auch über das Docker-Netz

- Der Ticket-API-Client spricht jetzt auch `http://…`, damit in Produktion der
  Container `postgrest` im selben Docker-Netz direkt erreichbar ist
  (`LUEMOBIL_API_URL=http://postgrest:3000`, kein TLS/CA nötig). Bei `https`
  wird das Zertifikat weiterhin immer geprüft.

## 2026-09-22 — Kennzahlen (LüMobil-Dashboards)

**Neu**
- Interne Seite `/kennzahlen` mit den vier LüMobil-Dashboards aus Metabase
  (statische Einbettung, serverseitig signierte Tokens, 10 Minuten gültig,
  Auffrischen beim Zurückkehren auf die Seite statt im Takt — so flackert
  nichts). Dashboard „Betrieb & Störungen" (einzelne Bestellungen)
  standardmäßig nur für die Rolle `support`.

**Beim Update**
- Schlüssel als Datei `secrets/metabase_embed_secret` ablegen,
  `METABASE_URL` und `METABASE_DASHBOARDS` (Prod-IDs!) in die `.env`,
  `docker compose up -d` (`docs/KENNZAHLEN.md`).
- Adresse des Hilfecenters dem LüMobil-Betrieb für die Einbettungsfreigabe melden.
- Ohne diese Werte bleibt die Seite ausgeblendet.

## 2026-09-22 — Impressum und Datenschutz

- Footer der öffentlichen Seiten verlinkt Impressum und Datenschutzerklärung der
  Stadtwerke Lübeck (swhl.de). Kein manueller Update-Schritt.

## 2026-09-22 — Kundencheck-Ampel, Patris, Ticket-API, Rollentrennung

**Neu**
- Kundencheck mit Ampel und Hinweistext für das Servicecenter; Hinweistexte im
  CMS pflegbar (Cockpit → Kundencheck-Hinweise).
- Patris-Ticketdaten per CSV-Upload im Migrations-Cockpit (ersetzt jeweils den
  gesamten Bestand).
- App-Käufe aus der LüMobil Ticket-API im Kundencheck (serverseitig,
  Token-Datei, Alarm-Mail bei abgelehntem Token).
- Rollentrennung: `kundencheck` (nur Kundencheck), `cockpit` (nur Cockpit),
  `support` (beides, wie bisher).
- Kundencheck sucht Login-Ereignisse bei vorhandenem Konto direkt über die
  Keycloak-User-ID (vollständige 14 Tage).
- Dokumentation: `KUNDENCHECK-COCKPIT.md`, `docs/` (Architektur, Keycloak,
  Datenschutz, Backup, Servicecenter, Testen), Backup-Skript `scripts/backup.sh`.

**Beim Update**
- Migration `20260922_101232_patris` läuft automatisch (3 neue Tabellen).
- `mkdir -p secrets` im Projektordner vor `docker compose up`.
- Nach dem Update Patris-CSV im Cockpit hochladen.
- Optional: Rollen `kundencheck`/`cockpit` in Keycloak anlegen
  (`docs/KEYCLOAK-EINRICHTUNG.md`); ohne sie ändert sich für `support` nichts.
- Ticket-API erst anbinden, wenn die Prod-URL feststeht (`LIVE-GEHEN.md` 9g).
- Optional: tägliches Backup einrichten (`docs/BACKUP-RESTORE.md`).

## 2026-09-09/10 — Cockpit-Ausbau, Alerting, Reports

**Neu**
- Cockpit: Neue-Nutzer-Graph, Live-Ampel, Sparklines, mobile Ansicht,
  Logins/Fehler je Tag oder Stunde, eindeutige Nutzer je Client, letzte Job-Läufe.
- Störungs-Benachrichtigung per E-Mail und Verfügbarkeits-Historie
  (Collection `health-checks`).
- Grafische Reports (HTML-Mail + PDF), manuell per Button oder per Cron.
- HTTP-Cron-Endpunkt `/api/cockpit/cron` für das Produktions-Image.
- Öffentliche Hauptseite frei, interne Bereiche einzeln abgesichert.
- Aboonline aus dem Monitoring entfernt; Logins der Monitoring-Clients zählen
  nicht als Nutzeraktivität.

**Beim Update**
- Migration `20260909_153000_health_checks` läuft automatisch.
- `.env`: `ALERT_EMAIL`, `CRON_SECRET`, SMTP-Werte; Host-Cron eintragen
  (`LIVE-GEHEN.md` 9d).

## 2026-09-04/06 — Zugriffsschutz, Keycloak-Login, Migrations-Cockpit

**Neu**
- Passwortschutz (Basic Auth) für die gesamte Seite (Testphase).
- Keycloak-OIDC-Login mit getrennten Realms (Mitarbeitende/Kunden), Rolle `support`.
- Migrations-Cockpit mit Kundencheck, Kennzahlen und Zeitreihe
  (Collection `cockpit-daily`).
- SWL-Login-Theme für Keycloak (`keycloak-theme/`).

**Beim Update**
- Migrationen `20260904_180000_cockpit_daily`, `20260906_150000_cockpit_registrations`.
- Keycloak-Clients und `.env`-Werte einrichten (`LIVE-GEHEN.md` 9,
  `docs/KEYCLOAK-EINRICHTUNG.md`).

## 2026-07-13 bis 07-16 — Jira, Benachrichtigungen, Design

**Neu**
- Jira-Anbindung (Export und automatische Tickets für gemeldete Fehler).
- E-Mail-Benachrichtigung an Redakteur:innen bei neuen Meldungen.
- Suchmaschinen-Schutz (`noindex`) in der Testphase.
- Ausblick V2 im CMS pflegbar; Design-Überarbeitung.

**Beim Update**
- Migrationen `20260713_085651_notify_field`, `20260714_132826_jira_fields`.
- `.env`: `JIRA_*`, `SMTP_*` (siehe `.env.example`, `JIRA-EXPORT.md`).

## 2026-07-12 — Version 1.0

- Next.js 15 + Payload CMS 3 statt statischer Legacy-Seite; Inhalte im CMS.
- Collections für Artikel, FAQ, Handbuch, Bekannte Fehler, Offene Fragen,
  Meldungen; Erstimport aus `legacy/`.
- Fehlermelde-Formular, Störungsseite, Docker-Deployment mit Postgres und
  automatischen Migrationen.
