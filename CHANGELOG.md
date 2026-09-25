# Änderungsprotokoll

Neueste Änderungen oben. Je Eintrag: was neu ist und **was beim Update von Hand
zu tun ist**. Allgemeiner Update-Ablauf: `LIVE-GEHEN.md`, „Später: Updates
einspielen".

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
