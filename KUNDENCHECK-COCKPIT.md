# Kundencheck & Migrations-Cockpit

Interne Support-Werkzeuge des LüMobil Hilfecenters. Diese Anleitung beschreibt,
was die beiden Bereiche tun, woher ihre Daten kommen, wie Zugriff und
Konfiguration funktionieren und was im Betrieb zu tun ist.

- **Kundencheck** (`/kundencheck`, zusätzlich im Cockpit eingebettet): prüft zu
  einer E-Mail-Adresse, ob der Kunde ein Ticket hat, ob ein Konto besteht und was
  ihm zu sagen ist — als Ampel mit Hinweistext.
- **Migrations-Cockpit** (`/cockpit`): Monitoring der Keycloak-Migration
  (Kennzahlen, Verfügbarkeit, Fehler, Reports) und Upload der Patris-Ticketdaten.

Server-Einrichtung (Cron, `.env`): `LIVE-GEHEN.md`, Abschnitt 9 · Keycloak:
`docs/KEYCLOAK-EINRICHTUNG.md` · Anleitung für Mitarbeitende:
`docs/SERVICECENTER.md` · Datenschutz: `docs/DATENSCHUTZ.md`.

---

## 1. Zugriff und Rollen

Beide Bereiche liegen hinter dem **Keycloak-Login** (Mitarbeiter-Realm). Welche
Bereiche jemand sieht, steuern **Realm-Rollen**:

| Rolle (Standardname) | Env-Variable | Kundencheck | Migrations-Cockpit |
|---|---|---|---|
| `kundencheck` | `COCKPIT_ROLE_KUNDENCHECK` | ✓ | – |
| `cockpit` | `COCKPIT_ROLE_MIGRATION` | – | ✓ (inkl. Patris-Upload, Reports) |
| `support` | `COCKPIT_SUPPORT_ROLE` | ✓ | ✓ |

- `support` schaltet aus Kompatibilitätsgründen weiterhin **beides** frei.
- Reiter, Seiten **und** alle Endpunkte unter `/api/cockpit/*` prüfen die Rolle
  serverseitig (ohne Recht: Weiterleitung bzw. HTTP 403). Ausgeblendete Reiter
  sind nur Komfort, nicht die Sicherheitsgrenze.
- Wer nur `kundencheck` hat, wird von `/cockpit` zum Kundencheck umgeleitet — und
  umgekehrt.
- Rollen stecken im Session-Cookie: Nach einer Rollenänderung in Keycloak muss
  sich die Person **neu anmelden**.
- Code: `src/lib/auth/guard.ts` (`canKundencheck`, `canCockpit`,
  `requireKundencheck`, `requireCockpit`).

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
- Fehlt eine der Spalten, wird die Datei komplett abgelehnt.
- Speicher: Tabelle `patris_entitlements` (Postgres in Produktion), Stand des
  Uploads im Global `patris-import`. Im Admin nur lesbar.
- Code: `src/lib/cockpit/patris.ts`, `src/app/api/cockpit/patris/route.ts`.
- Beispieldatei mit Testdaten: `docs/beispiele/patris-beispiel.csv`.

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

**Datenschutz:** Der Kundencheck protokolliert die gesuchten E-Mail-Adressen
nicht. Die Ticket-API protokolliert jede Abfrage auf ihrer Seite (inkl.
`X-Bearbeiter`). Die Patris-Daten enthalten Name, E-Mail und Kundennummer und
liegen in der Hilfecenter-Datenbank, bis sie beim nächsten Upload ersetzt werden.

---

## 6. Interne Endpunkte

| Endpunkt | Methode | Recht | Zweck |
|---|---|---|---|
| `/api/cockpit/check?email=` | GET | Kundencheck | Kundencheck (Rate-Limit 30/min je Person) |
| `/api/cockpit/patris` | POST (multipart `file`) | Cockpit | Patris-CSV-Upload |
| `/api/cockpit/stats` | GET | Cockpit | Kennzahlen |
| `/api/cockpit/events` | GET | Cockpit | Fehler-Events |
| `/api/cockpit/health` | GET | Cockpit | Live-Status (Ampel im Cockpit-Kopf) |
| `/api/cockpit/report` | POST | Cockpit | Report sofort versenden |
| `/api/cockpit/cron?job=…` | POST | Header `x-cron-secret` | Health/Aggregat/Report per Host-Cron |
| `/api/auth/login`, `/callback`, `/logout` | GET | – | Keycloak-OIDC-Login |
