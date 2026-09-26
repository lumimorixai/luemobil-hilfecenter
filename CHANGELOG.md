# Änderungsprotokoll

Neueste Änderungen oben. Je Eintrag: was neu ist und **was beim Update von Hand
zu tun ist**. Allgemeiner Update-Ablauf: `LIVE-GEHEN.md`, „Später: Updates
einspielen".

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
