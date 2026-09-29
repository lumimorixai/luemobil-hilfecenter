# Kundencheck & Migrations-Cockpit

Interne Support-Werkzeuge des LüMobil Hilfecenters. Diese Anleitung beschreibt,
was die beiden Bereiche tun, woher ihre Daten kommen, wie Zugriff und
Konfiguration funktionieren und was im Betrieb zu tun ist.

- **Kundencheck** (`/kundencheck`, zusätzlich im Cockpit eingebettet): prüft zu
  einer E-Mail-Adresse, ob der Kunde ein Ticket hat, ob ein Konto besteht und was
  ihm zu sagen ist — als Ampel mit Hinweistext.
- **Migrations-Cockpit** (`/cockpit`): Monitoring der Keycloak-Migration
  (Kennzahlen, Verfügbarkeit, Fehler, Reports), Geschäftszahlen aus dem
  Reporting, die eingebetteten Dashboards und der Upload der Patris-Ticketdaten.
  Der Kundencheck ist einer seiner Bereiche.

Server-Einrichtung (Cron, `.env`): `LIVE-GEHEN.md`, Abschnitt 9 · Keycloak:
`docs/KEYCLOAK-EINRICHTUNG.md` · Anleitung für Mitarbeitende:
`docs/SERVICECENTER.md` · Datenschutz: `docs/DATENSCHUTZ.md`.

---

## 0. Aufbau der Oberfläche

Das Cockpit ist seit dem 25.09.2026 in Bereiche gegliedert, jeder mit eigener
Adresse. Dadurch lädt jede Seite nur ihre eigenen Daten — vorher holte jeder
Aufruf sämtliche Kennzahlen.

| Gruppe | Bereich | Adresse |
|---|---|---|
| Lage | Überblick | `/cockpit` |
| | D-Ticket Migration | `/cockpit/ankommen` |
| | Tickets und Umsatz | `/cockpit/umsatz` |
| Betrieb | Anmeldungen | `/cockpit/anmeldungen` |
| | Verfügbarkeit | `/cockpit/verfuegbarkeit` |
| | Support | `/cockpit/support` |
| Auswertungen | Dashboards (Metabase) | `/cockpit/dashboards` |
| Werkzeuge | Kundencheck | `/cockpit/kundencheck` |
| | Kampagnen | `/cockpit/kampagnen` |
| | Fälle abarbeiten | `/cockpit/kampagnen/arbeiten` |
| | Daten und Jobs | `/cockpit/daten` |

`/kennzahlen` und `/kundencheck` leiten auf die entsprechenden Bereiche weiter.
Wer nur die Kundencheck-Berechtigung hat, sieht ausschließlich die Gruppe
„Werkzeuge".

**Gestaltung.** Eigene Sprache, freigegeben am 25.09.2026: Glasflächen mit
Tiefenunschärfe, große Radien, weiche Schatten, Diagramme ohne Achsen und
Gitter. Hell ist voreingestellt, Dunkel ein Umschalter unten in der
Seitenleiste; die Wahl bleibt im Browser der jeweiligen Person. Beide Fassungen
teilen sich denselben Satz Variablen in `src/app/(cockpit)/cockpit.css`. Das ist
eine bewusste Abweichung vom SWL-Design-System, die nur fürs interne Cockpit
gilt — alle öffentlichen Seiten bleiben unverändert.

---

## 1. Zugriff und Rollen

Beide Bereiche liegen hinter dem **Keycloak-Login** (Mitarbeiter-Realm). Welche
Bereiche jemand sieht, steuern **Realm-Rollen**:

| Rolle (Standardname) | Env-Variable | Kundencheck | Migrations-Cockpit | Fälle abarbeiten |
|---|---|---|---|---|
| `kundencheck` | `COCKPIT_ROLE_KUNDENCHECK` | ✓ | – | – |
| `cockpit` | `COCKPIT_ROLE_MIGRATION` | – | ✓ (inkl. Patris-Upload, Reports) | ✓ |
| `callcenter` | `COCKPIT_ROLE_CALLCENTER` | – | – | ✓ |
| `support` | `COCKPIT_SUPPORT_ROLE` | ✓ | ✓ | ✓ |

- `support` schaltet aus Kompatibilitätsgründen weiterhin **alles** frei.
- `callcenter` ist die engste Rolle: Fälle bearbeiten ja, Kampagnen anlegen
  oder Listen erzeugen nein. Sie sieht Namen und Telefonnummern der
  zugeteilten Person — aber keine Liste zum Durchstöbern und keine
  Patris-Daten im CMS.
- Reiter, Seiten **und** alle Endpunkte unter `/api/cockpit/*` prüfen die Rolle
  serverseitig (ohne Recht: Weiterleitung bzw. HTTP 403). Ausgeblendete Reiter
  sind nur Komfort, nicht die Sicherheitsgrenze.
- Wer nur `kundencheck` hat, wird von `/cockpit` zum Kundencheck umgeleitet — und
  umgekehrt.
- Rollen stecken im Session-Cookie: Nach einer Rollenänderung in Keycloak muss
  sich die Person **neu anmelden**.
- Wer nur `callcenter` hat, landet direkt auf `/cockpit/kampagnen/arbeiten`.
- Code: `src/lib/auth/guard.ts` (`canKundencheck`, `canCockpit`,
  `canCallcenter`, `requireKundencheck`, `requireCockpit`,
  `requireCallcenter`).

**Lokal testen ohne Keycloak** (nur `COCKPIT_MOCK=true`):
`/api/auth/dev-login?as=kundencheck`, `?as=cockpit` oder ohne Parameter (beides).

---

## 2. Kundencheck

### 2.1 Was angezeigt wird

1. **Ampel mit Hinweis** — Überschrift und Handlungstext für das Servicecenter.
2. **Ticket laut Patris** — Produkt, Produktnummer, Gültigkeit von–bis, Status,
   Name, Kundennummer, Entitlement-ID; weitere Tickets kompakt (mit Kundennummer).
   Darunter der Datenstand des letzten Patris-Uploads.
3. **Käufe in der LüMobil-App** — Bestellungen aus der Ticket-API (gruppiert nach
   Bestellnummer): Datum, Produkt/Tarif, Menge, Preis, Status, Bestellnummer.
4. **Keycloak-Konto** — vorhanden/nicht vorhanden, Kundennummer, Anlagedatum.
5. **Letzte Ereignisse** — bis zu 10 Logins/Login-Fehler der letzten 14 Tage.
   Bei vorhandenem Konto filtert Keycloak direkt nach der User-ID; ohne Konto wird
   über den eingegebenen Benutzernamen gesucht (z. B. `user_not_found`).

### 2.2 Ampel-Logik

Entscheidungsreihenfolge (Code: `pickSituation` in `src/lib/cockpit/diagnose.ts`):

| Situation (CMS-Schlüssel) | Ampel | Bedingung |
|---|---|---|
| `aktivMitKonto` | Grün | Patris-Ticket heute gültig, Konto vorhanden, App-Kauf in den letzten 35 Tagen **oder** Kaufdaten nicht abrufbar |
| `aktivOhneKauf` | Gelb | Patris-Ticket gültig, Konto vorhanden, aber **kein** erfolgreicher App-Kauf in 35 Tagen |
| `aktivOhneKonto` | Gelb | Patris-Ticket gültig, kein Keycloak-Konto |
| `zukuenftig` | Gelb | Patris-Ticket beginnt erst später |
| `appKauf` | Grün | Kein gültiges Patris-Ticket, aber erfolgreicher App-Kauf in 35 Tagen |
| `abgelaufen` | Rot | Nur abgelaufene Patris-Tickets |
| `keinTicket` | Rot | Kein Patris-Eintrag zur E-Mail/Kundennummer |
| `keineDaten` | Grau | Noch keine Patris-CSV hochgeladen |

- Mehrere Patris-Tickets: gültige vor zukünftigen vor abgelaufenen.
- Patris-Tickets werden über die **E-Mail** und zusätzlich über die
  **Kundennummer aus Keycloak** gefunden.
- „Erfolgreicher App-Kauf" = Position mit `erfolgreich: true`, **egal welches
  Produkt**; Zeitfenster `KAUF_FENSTER_TAGE = 35` in `diagnose.ts`.
  *Diese beiden Annahmen sind fachlich noch zu bestätigen.*

### 2.3 Hinweistexte pflegen (CMS)

Admin → **Cockpit → Kundencheck-Hinweise**: je Situation ein **Titel** und ein
**Hinweistext**. Leere Felder fallen auf die Standardtexte zurück
(`src/lib/cockpit/hints.ts`). Platzhalter:

| Platzhalter | Quelle |
|---|---|
| `{produkt}`, `{von}`, `{bis}`, `{vorname}`, `{nachname}`, `{kundennummer}` | relevantestes Patris-Ticket |
| `{kaufdatum}`, `{kaufprodukt}`, `{bestellnummer}` | letzter erfolgreicher App-Kauf |

Eine **neue Situation** braucht Code (`hints.ts`, `diagnose.ts`) und — weil das
Global dann neue Spalten bekommt — eine Migration (siehe `PAYLOAD-CMS-ANLEITUNG.md`, B3).

---

## 3. Datenquellen

### 3.1 Keycloak

Service-Account-Client im Kunden-Realm (`view-users`, `view-events`). Liefert
Konto, Kundennummer (Attribut `kundennummer` bzw. `customerNumber`) und Events.
Events sind nur so lange verfügbar, wie Keycloak sie aufbewahrt
(Realm → Events → Expiration).

### 3.1a Eigene Datenbank (Tageswerte und Verfügbarkeit)

Die Cockpit-Startseite liest ihre Zahlen aus der eigenen Datenbank, nicht live
aus Keycloak:

- `cockpit-daily` — je Tag: Logins, Fehlversuche, neue Konten, Registrierungen
  und der **Kontenbestand am Ende des Tages**. Geschrieben vom Minuten-Job
  `pnpm job:cockpit`.
- `health-checks` — je Minute der Zustand aller überwachten Dienste; Grundlage
  für Verfügbarkeitsstreifen, „letzter Check" und die Störungsmails.

Damit bleibt die Historie erhalten, auch wenn Keycloak seine Events nach Ablauf
der Aufbewahrungsfrist löscht. Vergangene Tage nachtragen:

```bash
pnpm job:cockpit backfill 14   # 14 Tage neu berechnen, Bestand rückwärts ableiten
```

Der Kontenbestand wird dabei vom heutigen Keycloak-Zähler rückwärts fortgeschrieben
(Bestand eines Tages = heutiger Bestand abzüglich der seither neu angelegten Konten).

**Wie weit die Historie reicht.** Zwei Größen mit sehr verschiedener
Reichweite: Die **Anmeldezahlen** hängen an den Keycloak-Events und enden mit
deren Aufbewahrungsfrist — was einmal verfallen ist, lässt sich nicht
rekonstruieren. Die **Kontenzahlen** hängen am Anlagedatum, das dauerhaft am
Konto steht; `pnpm job:cockpit konten` baut sie deshalb jederzeit vollständig
auf, vom ersten angelegten Konto bis heute. Tage ohne Event-Daten stehen mit
null Anmeldungen in der Reihe, tragen aber korrekte Kontenzahlen.

**Was „neue Konten" bedeutet:** alle an dem Tag angelegten Konten, erkannt am
Anlagedatum in Keycloak (`createdTimestamp`). Davon getrennt ausgewiesen werden
die aus dem Altsystem übernommenen (`migratedUsers`) und die
Selbstregistrierungs-Ereignisse (`registrations`). Maßgeblich ist das
Anlagedatum, nicht das REGISTER-Ereignis: Nur es erklärt den Kontenbestand
vollständig — die Summe aller Anlagen entspricht exakt dem Keycloak-Zähler.

Bewusste Einschränkung: Neue Konten gibt es nur noch in Tagesauflösung. Die frühere
Minutenauflösung der letzten Stunde war nur möglich, indem bei **jedem** Seitenaufruf
die gesamte Keycloak-Nutzerliste durchblättert wurde.

### 3.1b Reporting-Datenbank (Geschäftszahlen)

Die Blöcke „D-Ticket Migration" und „Tickets und Umsatz" lesen die
Reporting-Datenbank `lue_reporting` — mit einem eigenen Account, der nur lesen
darf und nur die vier aggregierten Views ohne Personenbezug sieht. Einrichtung
und die Gründe dafür: `docs/REPORTING.md`.

### 3.2 Patris-CSV (Soll: welche Tickets vorgesehen sind)

Upload im **Migrations-Cockpit → Ticketdaten** (Rolle `cockpit`/`support`).

- **Ersetzt den gesamten Bestand** in einer Transaktion. Schlägt der Import fehl,
  bleibt der alte Stand erhalten.
- Übernommen werden **nur** diese Spalten (alle anderen werden verworfen):

  | CSV-Spalte | Feld |
  |---|---|
  | `entitlement_id` (Pflicht je Zeile) | Entitlement-ID |
  | `display_validity_begin` | Gültig ab |
  | `display_validity_end` | Gültig bis |
  | `product_mnumber` (auch `product_number`) | Produktnummer |
  | `product_name` | Produkt |
  | `customer_number` | Kundennummer |
  | `email` (wird kleingeschrieben) | E-Mail |
  | `first_name`, `last_name` | Name |

- Trennzeichen `;`, `,` oder Tab (automatisch erkannt), UTF-8, Anführungszeichen
  nach RFC 4180, max. 50 MB.
- Datumsformate: `2026-01-01`, `2026-01-01 08:00`, ISO mit Zeitzone,
  `01.01.2026`, `01.01.2026 08:00`. Ohne Zeitzone gilt Europe/Berlin; ein reines
  Enddatum gilt bis 23:59:59 des Tages.
- Zeilen ohne `entitlement_id` werden übersprungen, unlesbare Daten bleiben leer
  — beides wird nach dem Upload gezählt angezeigt.
- Fehlt eine der **Pflicht**spalten, wird die Datei komplett abgelehnt. Fehlt die
  optionale Telefonspalte, läuft der Import normal weiter und das Feld bleibt leer.
- Telefonnummer und Geburtsdatum werden gespeichert, im Kundencheck aber **nicht
  angezeigt**: Der Anzeigetyp `PatrisTicket` schließt beide aus, das verhindert
  schon der Compiler. Sie sind die Grundlage der Anruflisten (Kampagnen) und der
  Regel, Minderjährige von Anrufen auszunehmen. Fehlen die Spalten im Export,
  bleiben die Felder leer und der Upload läuft trotzdem.
- Speicher: Tabelle `patris_entitlements` (Postgres in Produktion), Stand des
  Uploads im Global `patris-import`. Im Admin nur lesbar.
- Code: `src/lib/cockpit/patris.ts`, `src/app/api/cockpit/patris/route.ts`.
- Beispieldatei mit Testdaten: `docs/beispiele/patris-beispiel.csv`.
- Was die Berechtigungsdaten sonst enthalten und was die Bestandssegmente
  bedeuten: `docs/ABO-BERECHTIGUNGEN.md`.

> Geplant: Der manuelle Upload ist die Übergangslösung; später soll die
> Befüllung automatisch laufen.

### 3.3 LüMobil Ticket-API (Ist: was in der App gekauft/ausgeliefert wurde)

Fremdsystem (eigenes Projekt, Doku dort: `ANBINDUNG_HILFECENTER.md`). Aufruf
ausschließlich **serverseitig** aus dem Kundencheck:

```
POST {LUEMOBIL_API_URL}/rpc/tickets_fuer_email
Authorization: Bearer <Token>
X-Bearbeiter: <E-Mail der angemeldeten Person>
{"p_email": "<e-mail, kleingeschrieben>"}
```

| Antwort | Verhalten im Kundencheck |
|---|---|
| 200 + Liste | Käufe anzeigen; `[]` = „Keine Bestellungen" (kein Fehler) |
| 400 | Hinweis „E-Mail ungültig" |
| 401 | Hinweis + **Alarm-Mail an `ALERT_EMAIL`** (höchstens stündlich); keine Wiederholung |
| 403 / 404 | Hinweis „falsch konfiguriert" |
| 429 | Hinweis „kurz warten"; keine Wiederholung |
| 5xx / Netzfehler | ein Wiederholungsversuch, dann „derzeit nicht abrufbar" |
| Timeout (10 s) | keine Wiederholung, „derzeit nicht abrufbar" |

Ist die API nicht erreichbar, entscheidet die Ampel allein nach Patris + Konto.

**Betriebsarten:**
- **Produktion:** Die API läuft als Container `postgrest` im selben Docker-Netz
  (Reporting-Stack, siehe dessen `BETRIEBSHANDBUCH.md`, 4.10) →
  `LUEMOBIL_API_URL=http://postgrest:3000`. Kein TLS und keine CA nötig, der
  Verkehr verlässt den Host nicht; die Authentifizierung übernimmt das Token.
- **Dev (Mac):** nginx mit eigener CA → `https://localhost:8443` plus
  `LUEMOBIL_API_CA`.

**Sicherheit** (Vorgaben des API-Betreibers, umgesetzt in `src/lib/cockpit/ticketApi.ts`):
- Token nie im Code/Repo, nie im Browser, nie im Log (auch die E-Mail nicht).
- Bei `https` wird das Zertifikat immer geprüft; im Dev-System gegen die
  mitgelieferte `ca.crt` (`LUEMOBIL_API_CA`). `http` ist nur für netzinterne
  Adressen gedacht (siehe oben).
- **Token-Wechsel ohne Deployment:** Das Token wird bei jedem Aufruf aus der Datei
  `LUEMOBIL_API_TOKEN_FILE` gelesen — Datei ersetzen genügt, kein Neustart.

---

## 4. Konfiguration

| Variable | Zweck |
|---|---|
| `COCKPIT_SUPPORT_ROLE`, `COCKPIT_ROLE_KUNDENCHECK`, `COCKPIT_ROLE_MIGRATION` | Rollennamen (siehe 1.) |
| `LUEMOBIL_API_URL` | Basis-URL der Ticket-API. Leer = Kaufbereich zeigt „nicht eingerichtet" |
| `LUEMOBIL_API_TOKEN_FILE` | Pfad zur Token-Datei (empfohlen) |
| `LUEMOBIL_API_TOKEN` | Alternative: Token direkt (Wechsel braucht Neustart) |
| `LUEMOBIL_API_CA` | Nur Dev: Pfad zur `ca.crt` der Ticket-API |
| `ALERT_EMAIL` | Empfänger der 401-Alarmmail (und der Störungs-/Report-Mails) |

**Lokal (Mac):** Token und `ca.crt` liegen außerhalb des Projekts in
`~/.config/luemobil-hilfecenter/` (nicht im iCloud-synchronisierten Ordner
„Dokumente"). Das Dev-System läuft unter `https://localhost:8443`
(`tickets-api.local` nur mit Eintrag in `/etc/hosts`).

**Produktion (Docker):** Token als Datei `secrets/luemobil_api_token` neben der
`docker-compose.yml`. Der Ordner wird als `/run/secrets/app` eingebunden
(Verzeichnis-Mount, damit ein Austausch der Datei im Container ankommt) und ist
in `.gitignore`. Die Datei muss für den Container-Benutzer lesbar sein:

```bash
printf '%s' '<TOKEN>' > secrets/luemobil_api_token
sudo chown $(docker compose exec app id -u) secrets/luemobil_api_token
chmod 400 secrets/luemobil_api_token
```

---

## 5. Betrieb

| Aufgabe | Vorgehen |
|---|---|
| Neue Patris-Daten | CSV im Cockpit hochladen (ersetzt alles) |
| Token läuft ab / 401-Alarm | Neues Token beim API-Betreiber anfordern, Datei ersetzen — wirkt sofort |
| Token sperren lassen | API-Betreiber (`token.sh sperren <Kennung>`) |
| Neue Server-IP | dem API-Betreiber für die Freigabeliste melden |
| Person bekommt/verliert Zugriff | Rolle in Keycloak ändern, Person meldet sich neu an |
| Hinweistext ändern | Admin → Cockpit → Kundencheck-Hinweise |
| Tageswerte fehlen (Job stand still) | `pnpm job:cockpit backfill 14` |
| Kontenhistorie unvollständig | Entwicklung: `pnpm job:cockpit konten` · Produktion: `POST /api/cockpit/cron?job=konten` |
| Reporting-Zahlen fehlen | Lese-Account und `REPORTING_DATABASE_URI` prüfen (`docs/REPORTING.md`); nach einem Neuaufbau der Views gehen die Rechte verloren |

**Aufbewahrung.** Tageswerte (`cockpit-daily`) bleiben dauerhaft — ein Jahr
kostet rund 40 KB. Die Minuten-Checks (`health-checks`) werden zu einem
Tageswert je Dienst verdichtet und danach aufgeräumt; wie lange die Rohdaten
bleiben, steuert `HEALTH_RETENTION_DAYS` (Standard 35 Tage). Die Verfügbarkeit
ist dadurch jahrelang nachvollziehbar, ohne dass die Datenbank wächst. Das
Verdichten und Aufräumen erledigt der Minuten-Job einmal je Stunde.

**Überwachte Dienste (Ampel im Cockpit-Kopf, Verfügbarkeit und Alert-Mails):**
Keycloak, synthetischer Testlogin, Datenbank, Ticket-API, Dashboards (Metabase)
und das **Alter des Patris-Uploads**. Letzteres ist keine Erreichbarkeit, sondern
Aktualität: Ab `PATRIS_MAX_AGE_DAYS` (Standard 7) springt die Ampel auf Rot, weil
ein veralteter Export im Kundencheck zu falschen Auskünften führt. Nicht
konfigurierte Dienste bleiben grau und lösen keinen Alarm aus.

**Datenschutz:** Der Kundencheck protokolliert die gesuchten E-Mail-Adressen
nicht. Die Ticket-API protokolliert jede Abfrage auf ihrer Seite (inkl.
`X-Bearbeiter`). Die Patris-Daten enthalten Name, E-Mail und Kundennummer und
liegen in der Hilfecenter-Datenbank, bis sie beim nächsten Upload ersetzt werden.

---

## 6. Interne Endpunkte

| Endpunkt | Methode | Recht | Zweck |
|---|---|---|---|
| `/api/cockpit/check` | POST (JSON `{email}`) | Kundencheck | Kundencheck (Rate-Limit 30/min je Person); E-Mail bewusst im Body, nicht in der URL |
| `/api/cockpit/patris` | POST (multipart `file`) | Cockpit | Patris-CSV-Upload |
| `/api/cockpit/kampagnen` | POST/PATCH/DELETE | Cockpit | Kampagne anlegen, ändern, löschen (nur ohne Fälle) |
| `/api/cockpit/kampagnen/erzeugen` | POST (JSON `{kampagne, probe}`) | Cockpit | Arbeitsliste durchrechnen (`probe: true`) oder anlegen |
| `/api/cockpit/kampagnen/arbeiten` | POST (JSON `{was}`) | Callcenter | `naechster` · `ergebnis` · `freigeben` |
| `/api/cockpit/stats` | GET | Cockpit | Kennzahlen |
| `/api/cockpit/events` | GET | Cockpit | Fehler-Events |
| `/api/cockpit/health` | GET | Cockpit | Live-Status (Ampel im Cockpit-Kopf) |
| `/api/cockpit/report` | POST | Cockpit | Report sofort versenden |
| `/api/cockpit/cron?job=…` | POST | Header `x-cron-secret` | Health/Aggregat/Report per Host-Cron |
| `/api/auth/login`, `/callback`, `/logout` | GET | – | Keycloak-OIDC-Login |

---

## 7. Kampagnen (Kontaktaktionen)

Stand 28.09.2026: Datenmodell und Listenerzeugung stehen. Arbeitsplatz,
CSV-Upload, Auswertung und Nachtjob folgen.

### 7.1 Begriffe

| Begriff | Bedeutung |
|---|---|
| **Kampagne** | Der Rahmen: Zweck, Kanal, Rechtsgrundlage, Leitfaden, Auswahlregeln, Ergebniskatalog. Enthält selbst keine personenbezogenen Daten. |
| **Fall** | Eine Person in einer Kampagne. Die Personendaten sind eine **Momentaufnahme** aus Patris, keine Beziehung — der nächste Patris-Upload ersetzt dort den gesamten Bestand. |
| **Kontaktversuch** | Jede Wahl, jede Mail eine eigene Zeile, mit Ergebnis und Notiz. |
| **Sperrliste** | Wer nicht kontaktiert werden möchte — kampagnenübergreifend und dauerhaft (Art. 21 DSGVO). |

### 7.2 Eine Kampagne anlegen

Auf `/cockpit/kampagnen` über **Neue Kampagne**. Der Payload-Admin zeigt
Kampagnen nur an; geschrieben wird ausschließlich über das Cockpit, damit die
Prüfungen an einer Stelle stehen.

Pflicht vor der Listenerzeugung sind **Rechtsgrundlage** und mindestens eine
eingeschaltete **Auswahlregel**; ohne beides bleibt das Anlegen gesperrt.
Aktivieren verlangt zusätzlich mindestens ein mögliches Ergebnis.

Der **Gesprächsleitfaden** wird dem Agent bei jedem Fall angezeigt und gehört
deshalb ausformuliert — samt dem Hinweis nach Art. 14 DSGVO, woher die
Telefonnummer stammt.

Der **Ergebniskatalog** bestimmt die Knöpfe nach dem Gespräch. Jedes Ergebnis
hat eine Wirkung: `abschluss`, `wiedervorlage`, `erneut`, `entfaellt` oder
`sperren` (trägt in die Sperrliste ein).

### 7.3 Auswahlregeln

Jede Regel ist eine Zeile mit **eigenem Schalter**: Ausgeschaltete Regeln
bleiben gespeichert, zählen aber nicht. Das ist der übliche Arbeitsweg — erst
weit fassen, dann nachschärfen, dazwischen durchrechnen.

Acht Bestandsfelder, sechs Vergleiche, UND- oder ODER-verknüpft:

| Feld | Werte |
|---|---|
| Produktnummer, Produkt, E-Mail, Kundennummer | Text |
| Ticket heute gültig | `ja` / `nein` — gegen `validFrom`/`validUntil` |
| Telefonnummer vorhanden | `ja` / `nein` |
| Volljährig | `ja` / `nein` — **ohne Geburtsdatum gilt „nein"** |
| Konto in der App vorhanden | `ja` / `nein` — Abgleich mit Keycloak |

Vergleiche: `ist`, `ist nicht`, `ist eines von` (Komma), `enthält`,
`ist gesetzt`, `ist leer`.

Dazu kommt **jedes Merkmal einer hochgeladenen Liste** als `merkmal:<spalte>`
— etwa `merkmal:plz`. Ohne das wäre jede fremde Liste eine Schemaänderung.
Aus dem Ticketbestand entstehen für solche Regeln keine Fälle; sie greifen erst
beim CSV-Upload.

**Kanal.** Telefon und E-Mail verlangen den jeweiligen Kontaktweg an jedem
Fall; Brief und „anderer Weg" genügen sich mit einer Kennung.

Ausgewertet wird **im Speicher**, nicht in der Datenbank: Der Patris-Bestand
umfasst gut 8.000 Zeilen, und ein Abfrage-Übersetzer müsste bei jedem neuen
Feld mitwachsen. Ein neues Auswahlkriterium ist damit ein Eintrag in `FELDER`
plus ein Zweig in `wertVon` (`src/lib/kampagnen/regeln.ts`).

### 7.4 Liste erzeugen

Auf `/cockpit/kampagnen`, in zwei Schritten:

1. **Liste durchrechnen** — schreibt nichts und zeigt die vollständige Bilanz:
   geprüft, getroffen, und wie viele warum herausfallen (ohne Kontaktweg,
   mehrfach in der Auswahl, auf der Sperrliste, schon in der Kampagne).
2. **Fälle anlegen** — nach einer Rückfrage, die die Zahl noch einmal nennt.

Beide Wege rechnen mit demselben Code; die angezeigte Zahl kann also nicht von
der tatsächlich erzeugten abweichen.

Aussortiert wird in fester Reihenfolge: kein Kontaktweg für den Kanal der
Kampagne → Dublette innerhalb des Laufs (mehrere Berechtigungen derselben
Person ergeben **einen** Anruf) → Sperrliste → schon in der Kampagne.

Der Lauf ist **wiederholbar**: Ein zweiter Durchgang legt nur an, was noch
fehlt. Bestehende Fälle werden nie überschrieben, ihr Bearbeitungsstand bleibt.

**Konto-Abgleich.** Verlangt eine Regel „Konto vorhanden", werden alle
E-Mail-Adressen des Realms in einem Durchgang geholt (rund 50 Anfragen, etwa
25 Sekunden bei 4.900 Konten) und zehn Minuten zwischengespeichert — nicht eine
Abfrage je Person. Beim späteren Zuteilen eines Falls entscheidet dagegen die
Einzelabfrage, weil dort der aktuelle Stand zählt.

### 7.5 Fälle abarbeiten

Auf `/cockpit/kampagnen/arbeiten`, mit der Rolle `callcenter` (oder `cockpit`
bzw. `support`).

**Zugeteilt, nicht ausgesucht.** „Nächster Fall" holt den nächsten offenen —
es gibt keine Liste zum Durchstöbern. Reihenfolge: fällige Wiedervorlagen
zuerst, dann die mit den wenigsten Versuchen.

**Zwei Personen bekommen nie denselben Fall.** Gesperrt und gelesen wird in
einer einzigen Anweisung, unter PostgreSQL mit `FOR UPDATE SKIP LOCKED` —
zwei gleichzeitige Anfragen überspringen einander, statt zu warten.

**Haltefrist.** Ein zugeteilter Fall gehört der Person für die eingestellte
Zeit (Vorgabe 15 Minuten); danach wird er wieder ausgegeben. Wer die Seite
verlässt, gibt ihn sofort frei. So blockiert ein geschlossener Browser die
Liste nicht.

**Vor der Anzeige wird zweimal geprüft** — und der Fall still übersprungen,
wenn eines zutrifft:
1. Steht die Person inzwischen auf der Sperrliste? → entfällt (Widerspruch).
2. Gibt es inzwischen ein Konto in Keycloak? → entfällt (Anlass weggefallen).
   Hier zählt der Einzelabruf, nicht der gecachte Sammelabgleich.

Ist Keycloak nicht erreichbar, wird der Fall trotzdem ausgegeben und der Grund
protokolliert: Ein stiller Ausfall des Arbeitsplatzes wäre schlimmer als ein
Anruf bei jemandem, der vielleicht schon ein Konto hat.

**Was ein Ergebnis bewirkt, steht an der Kampagne**, nicht im Code:

| Wirkung | Folge für den Fall |
|---|---|
| `abschluss` | erledigt |
| `wiedervorlage` | wieder offen, mit Datum (Vorgabe aus dem Ergebnis, im Arbeitsplatz überschreibbar) |
| `erneut` | wieder offen — außer die Höchstzahl Versuche ist erreicht, dann entfällt er |
| `entfaellt` | entfällt, Grund „keine Kontaktmöglichkeit" |
| `sperren` | entfällt **und** trägt E-Mail und Telefonnummer in die Sperrliste ein |

Jeder Versuch wird protokolliert: Zeitpunkt, Person, Ergebnis, Notiz und Dauer.

**Übersprungene Fälle werden benannt.** Entfällt beim Zuteilen etwas, sagt der
Arbeitsplatz, wie viele und warum — sonst verschwänden Fälle lautlos aus der
Liste. Die Kampagnenübersicht zählt den Stand beim Anzeigen nach (eine Abfrage
mit GROUP BY über alle Kampagnen, `src/lib/kampagnen/stand.ts`), weil die
fortgeschriebenen Zähler an der Kampagne hinterherhinken können.

### 7.6 Datenschutz

Fälle und Kontaktversuche enthalten Namen, Telefonnummern, Geburtsdaten und
Gesprächsnotizen. Beide Collections sind im Admin nur für Administratoren
lesbar und in der Navigation verborgen; geschrieben wird ausschließlich über
die Cockpit-Routen.

**Vor der ersten echten Kampagne offen:** der Wortlaut der Rechtsgrundlage und
der Eintrag **V12 „Kampagnen und Anrufaktionen"** in `docs/DATENSCHUTZ.md`. Bei
Telefonaktionen gegenüber Verbrauchern ist neben der DSGVO auch § 7 UWG zu
beachten.
