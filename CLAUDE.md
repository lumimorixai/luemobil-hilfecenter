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

## Architektur
- `src/collections/` – Payload-Collections: Articles, FaqGroups, ManualChapters, KnownBugs, OpenQuestions, BugReports, Media, Users
- `src/app/(frontend)/fehler/actions.ts` – Server Action für öffentliche Fehlermeldungen (Validierung, Honeypot, Bild-Limits); die Collection bug-reports ist für die REST-API gesperrt
- `src/payload.config.ts` – zentrale Payload-Konfiguration; DB-Adapter wird per DATABASE_URI gewählt (file: → SQLite, postgres → Postgres)
- `src/app/(frontend)/` – öffentliche Seiten: / (Hilfe-Center), /artikel/[slug], /handbuch, /fragen, /fehler
- `src/app/(payload)/` – Payload-Admin & API (generierter Boilerplate — Struktur nicht ändern)
- `src/components/` – React-Komponenten (HelpCenter mit Suche ist Client-Komponente)
- `src/seed/seed.ts` – Erstimport aus legacy/luemobil-data.js mit Zähl-Check (5 Artikel/7 FAQ/10 Kapitel/15 Fehler/5 Fragen-Gruppen)
- `legacy/` – Original-Dateien, NUR LESEN, nie ändern

## Konventionen
- SWL-Design-System ist verbindlich → Skill `.claude/skills/swl-design-system` lesen
- Datenmodell-Details → Skill `.claude/skills/content-model` lesen
- Deutsch, formelles „Sie" in allen UI-Texten; Typografie: Inter (self-hosted via @fontsource-variable/inter, KEIN Google-Fonts-Request — DSGVO)
- Styling über CSS-Klassen in src/app/(frontend)/globals.css mit den SWL-Token-Variablen; keine neuen Farben außerhalb der Tokens
- Frontend liest Daten über die Payload Local API (src/lib/content.ts), nicht über HTTP

## Verifikation (immer vor „fertig")
1. `pnpm typecheck` grün
2. `pnpm build` grün
3. Bei Frontend-Änderungen: Seite im Browser/Screenshot prüfen

## Tabu
- `legacy/` – unantastbare Referenz
- `.env` – Secrets, nie committen
- `src/payload-types.ts` – generiert, nie von Hand editieren
- `src/app/(payload)/` – Payload-Boilerplate, Struktur nicht umbauen

## Roadmap (nächste Ausbaustufen)
- Entwurf/Veröffentlicht-Workflow (versions/drafts) für Articles & ManualChapters
- Serverseitige Volltextsuche (Postgres tsvector) statt Client-Filter
- Playwright-E2E-Tests (Suche, Tab-Navigation, Artikel öffnen, Fehler melden)
- Rate-Limiting für das Fehlermelde-Formular (z. B. per Middleware)
- E-Mail-Benachrichtigung an das Team bei neuer Fehlermeldung (Payload email-Adapter)
- „War das hilfreich?"-Feedback als eigene Collection
- Rollen: Redakteur vs. Admin in src/collections/Users.ts
