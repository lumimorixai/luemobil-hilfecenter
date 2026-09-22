# LüMobil Hilfecenter

Hilfecenter der LüMobil-App (Stadtwerke Lübeck) mit CMS-Backend.
Tech: Next.js 15 + Payload CMS 3 + SQLite (Dev) / PostgreSQL (Prod), TypeScript strict, pnpm.
Hosting: eigener VPS via Docker Compose + Caddy.

## Befehle
- `pnpm dev` – Dev-Server auf http://localhost:3000 (Admin: /admin)
- `pnpm build` – Production-Build (muss vor jedem Commit grün sein)
- `pnpm typecheck` – TypeScript-Prüfung
- `pnpm seed` – Legacy-Inhalte importieren (idempotent, bricht bei vorhandenen Daten ab)
- `pnpm generate:types` – nach JEDER Collection-Änderung ausführen (aktualisiert src/payload-types.ts)
- `pnpm generate:importmap` – nach Hinzufügen von Admin-UI-Komponenten
- `pnpm job:cockpit` – Tageswerte für die Cockpit-Zeitreihe aktualisieren (minütlich per Cron; in Dev nur bei gestopptem Dev-Server wegen SQLite-Lock)
- `pnpm job:health` – Systemstatus-Check + Störungs-Alerting (minütlich per Cron)
- `pnpm job:report <hour|day|week|month>` – grafischen Cockpit-Report (HTML-Mail + PDF) an ALERT_EMAIL senden (per Cron oder Button im Cockpit)

## Architektur
- `src/collections/` – Payload-Collections: Articles, FaqGroups, ManualChapters, KnownBugs, OpenQuestions, BugReports, QuestionSubmissions, RoadmapGroups (/ausblick), Media, Users; Cockpit: CockpitDaily, HealthChecks, PatrisEntitlements
- `src/globals/` – Payload-Globals: KundencheckHinweise (Ampel-Texte, im CMS pflegbar), PatrisImport (Stand des letzten CSV-Uploads)
- `src/app/(frontend)/fehler/actions.ts` – Server Action für öffentliche Fehlermeldungen (Validierung, Honeypot, Bild-Limits); die Collection bug-reports ist für die REST-API gesperrt
- `src/app/(frontend)/fragen/actions.ts` – Server Action für öffentliche Fragen-Einreichungen; Collection question-submissions ist REST-gesperrt. Übernahme (Status „uebernommen“) hängt die Frage an eine Offene-Fragen-Gruppe an
- `src/payload.config.ts` – zentrale Payload-Konfiguration; DB-Adapter wird per DATABASE_URI gewählt (file: → SQLite, postgres → Postgres)
- `src/app/(frontend)/` – öffentliche Seiten: / (Hilfe-Center), /artikel/[slug], /handbuch, /fragen, /fehler, /stoerungen, /testen, /ausblick, /suche; intern: /kundencheck
- `src/app/(cockpit)/cockpit` + `src/app/api/cockpit/*` – Migrations-Cockpit und interne APIs (Kundencheck, Patris-Upload, Stats, Health, Reports, Cron) → Details in `KUNDENCHECK-COCKPIT.md`
- `src/lib/auth/` – Keycloak-OIDC-Login, HMAC-Session-Cookie, Rollen-Guards (`guard.ts`: Rolle kundencheck | cockpit | support = beides)
- `src/lib/cockpit/` – Cockpit-/Kundencheck-Logik: `diagnose.ts` (Ampel), `hints.ts` (Situationen + Standardtexte), `patris.ts` (CSV-Import), `ticketApi.ts` (LüMobil Ticket-API, nur serverseitig); Keycloak-Admin-API in `src/lib/keycloak.ts`
- `src/app/(payload)/` – Payload-Admin & API (generierter Boilerplate — Struktur nicht ändern)
- `src/components/` – React-Komponenten (HelpCenter mit Suche ist Client-Komponente)
- `src/seed/seed.ts` – Erstimport aus legacy/luemobil-data.js mit Zähl-Check (5 Artikel/7 FAQ/10 Kapitel/15 Fehler/5 Fragen-Gruppen)
- `legacy/` – Original-Dateien, NUR LESEN, nie ändern
- `docs/` – Betriebs- und Fachdoku (Architektur, Keycloak, Backup, Datenschutz, Servicecenter, Testen); `scripts/backup.sh` – Prod-Backup
- Bei jeder nutzerrelevanten Änderung `CHANGELOG.md` ergänzen (inkl. manueller Update-Schritte)

## Konventionen
- SWL-Design-System ist verbindlich → Skill `.claude/skills/swl-design-system` lesen
- Datenmodell-Details → Skill `.claude/skills/content-model` lesen
- Deutsch, formelles „Sie" in allen UI-Texten; Typografie: Inter (self-hosted via @fontsource-variable/inter, KEIN Google-Fonts-Request — DSGVO)
- Styling über CSS-Klassen in src/app/(frontend)/globals.css mit den SWL-Token-Variablen; keine neuen Farben außerhalb der Tokens
- Frontend liest Daten über die Payload Local API (src/lib/content.ts), nicht über HTTP
- Neue Postgres-Migrationen: `pnpm payload migrate:create` gegen eine Wegwerf-Postgres (Docker) erzeugen und die Datei auf die tatsächlich neuen Tabellen/Spalten prüfen; in `down` erst Constraints/Spalten, dann Tabellen droppen
- Secrets (Tokens, Passwörter) nie in Code, Repo oder Logs — Ticket-API-Token als Datei (`LUEMOBIL_API_TOKEN_FILE`)

## Verifikation (immer vor „fertig")
1. `pnpm typecheck` grün
2. `pnpm build` grün
3. Bei Frontend-Änderungen: Seite im Browser/Screenshot prüfen

## Tabu
- `legacy/` – unantastbare Referenz
- `.env` – Secrets, nie committen
- `src/payload-types.ts` – generiert, nie von Hand editieren
- `src/app/(payload)/` – Payload-Boilerplate, Struktur nicht umbauen
- `secrets/` – Token-Dateien (Produktion), nie committen
- `~/Documents/LüMobil_SQL/ticket-api` – fremdes Projekt (Ticket-API), nur lesen

## Roadmap (nächste Ausbaustufen)
- Entwurf/Veröffentlicht-Workflow (versions/drafts) für Articles & ManualChapters
- Serverseitige Volltextsuche (Postgres tsvector) statt Client-Filter
- Playwright-E2E-Tests (Suche, Tab-Navigation, Artikel öffnen, Fehler melden)
- Rate-Limiting für das Fehlermelde-Formular (z. B. per Middleware)
- „War das hilfreich?"-Feedback als eigene Collection
- Rollen: Redakteur vs. Admin in src/collections/Users.ts (Payload-Admin; die Keycloak-Rollen für Kundencheck/Cockpit sind bereits getrennt)
- Patris-Daten automatisch statt per manuellem CSV-Upload befüllen
- Ticket-API in Produktion anbinden, sobald die Prod-URL steht

Erledigt: E-Mail-Benachrichtigung an Redakteur:innen bei neuen Meldungen (`src/lib/notify.ts`).
