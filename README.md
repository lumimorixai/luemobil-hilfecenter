# LüMobil Hilfecenter

Hilfecenter der LüMobil-App (Stadtwerke Lübeck) — Next.js 15 + Payload CMS 3.
Inhalte (Hilfeartikel, FAQ, App-Handbuch, Offene Fragen, Bekannte Fehler) werden im
eingebauten Admin-Panel unter `/admin` gepflegt, nicht mehr in einer JS-Datei.

Dazu kommen interne Bereiche hinter dem Keycloak-Login: der **Kundencheck**
(`/kundencheck`), das **Migrations-Cockpit** (`/cockpit`) — siehe
`KUNDENCHECK-COCKPIT.md` — und die **Kennzahlen** (`/kennzahlen`, eingebettete
LüMobil-Dashboards aus Metabase) — siehe `docs/KENNZAHLEN.md`.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| `README.md` | Überblick, lokale Entwicklung, Befehle (diese Datei) |
| `LIVE-GEHEN.md` | Server-Deployment Schritt für Schritt, Cockpit-Einrichtung, Updates |
| `KUNDENCHECK-COCKPIT.md` | Kundencheck & Cockpit: Rollen, Ampel-Logik, Patris-CSV, Ticket-API, Betrieb |
| `docs/KENNZAHLEN.md` | LüMobil-Dashboards (Metabase) auf `/kennzahlen`: Ablauf, Rechte, Konfiguration |
| `docs/SERVICECENTER.md` | Kurzanleitung Kundencheck für das Servicecenter (Ampel lesen, Eskalation) |
| `docs/ARCHITEKTUR.md` | Systemübersicht mit Diagrammen, Datenflüsse, Umgebungen |
| `docs/KEYCLOAK-EINRICHTUNG.md` | Keycloak-Clients, Rollen, Events Schritt für Schritt |
| `docs/BACKUP-RESTORE.md` | Datensicherung (`scripts/backup.sh`) und Wiederherstellung |
| `docs/DATENSCHUTZ.md` | Verarbeitete personenbezogene Daten, TOMs, offene Punkte |
| `docs/TESTEN.md` | Testumgebung, Testpersonen, Release-Checkliste |
| `CHANGELOG.md` | Änderungen je Update und manuelle Update-Schritte |
| `PAYLOAD-CMS-ANLEITUNG.md` | CMS für Redakteur:innen (Teil A) und Weiterentwicklung/Migrationen (Teil B) |
| `JIRA-EXPORT.md` | Bekannte Fehler als CSV nach Jira exportieren |
| `keycloak-theme/README.md` | SWL-Login-Theme für Keycloak |
| `CLAUDE.md` | Projektgedächtnis für Claude Code (Architektur, Konventionen, Roadmap) |
| `.env.example` | Alle Konfigurationswerte mit Erklärung |

## Voraussetzungen auf dem Mac (einmalig)

Terminal öffnen und der Reihe nach prüfen/installieren:

```bash
# 1. Homebrew (falls nicht vorhanden — Test: brew --version)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Node.js 22 (Test: node --version → v22.x)
brew install node@22

# 3. pnpm aktivieren (Test: pnpm --version)
corepack enable pnpm

# 4. Claude Code (Test: claude --version)
npm install -g @anthropic-ai/claude-code

# 5. Optional für Produktions-Tests: Docker Desktop
brew install --cask docker
```

## Projekt starten (Entwicklung)

```bash
cd luemobil-hilfecenter
pnpm install          # Abhängigkeiten installieren (einmalig / nach Updates)
cp .env.example .env  # dann in .env PAYLOAD_SECRET und ADMIN_PASSWORD setzen!
pnpm seed             # Inhalte + Bilder importieren (einmalig; nutzt SQLite, kein Docker nötig)
pnpm dev              # → http://localhost:3000  ·  Admin: http://localhost:3000/admin
```

Anmeldung im Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` aus deiner `.env`.

## Nützliche Befehle

| Befehl | Zweck |
|---|---|
| `pnpm dev` | Entwicklungsserver |
| `pnpm build` | Production-Build (Verifikation) |
| `pnpm typecheck` | TypeScript-Prüfung |
| `pnpm seed` | Erstimport der Legacy-Inhalte (idempotent) |
| `pnpm generate:types` | Nach jeder Collection-/Global-Änderung |
| `pnpm generate:importmap` | Nach neuen Admin-UI-Komponenten |
| `pnpm payload migrate:create <name>` | Neue Postgres-Migration (siehe `PAYLOAD-CMS-ANLEITUNG.md`, B3) |
| `pnpm job:cockpit` | Cockpit-Tageswerte aktualisieren (lokal nur bei gestopptem Dev-Server) |
| `pnpm job:health` | Systemstatus prüfen + Störungs-Alerting |
| `pnpm job:report <hour\|day\|week\|month>` | Cockpit-Report per Mail versenden |

**Interne Bereiche lokal testen:** Mit `COCKPIT_MOCK=true` in der `.env` laufen
Cockpit und Kundencheck gegen Demo-Daten; Anmeldung ohne Keycloak über
`/api/auth/dev-login` (optional `?as=kundencheck` oder `?as=cockpit`).
Für die App-Käufe im Kundencheck die `LUEMOBIL_API_*`-Werte setzen (siehe
`KUNDENCHECK-COCKPIT.md`, Abschnitt 4).

## Mit Claude Code weiterarbeiten

```bash
cd luemobil-hilfecenter
claude
```

Das Projekt ist vorbereitet: `CLAUDE.md` (Projektgedächtnis), `.claude/settings.json`
(Permissions + Typecheck-Hook) und zwei Projekt-Skills (`swl-design-system`,
`content-model`) werden automatisch geladen. Empfohlene Plugins/MCPs:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install typescript-lsp@claude-plugins-official
claude mcp add playwright
claude mcp add context7
```

Große Umbauten immer im Plan Mode (Shift+Tab) starten. Roadmap: siehe CLAUDE.md.

## Deployment auf dem VPS (Kurzfassung)

1. Server vorbereiten (Ubuntu 24.04): Docker + Caddy installieren.
2. Repo auf den Server klonen, `.env` anlegen mit:
   `POSTGRES_PASSWORD`, `PAYLOAD_SECRET` (`openssl rand -hex 32`),
   `NEXT_PUBLIC_SERVER_URL=https://deine-domain`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. `docker compose up -d --build`
4. Erstimport im Container: `docker compose exec app node_modules/tsx/dist/cli.mjs src/seed/seed.ts`
5. `Caddyfile.example` nach `/etc/caddy/Caddyfile` (Domain anpassen) → automatisches HTTPS.
6. Backup einrichten: `docker compose exec postgres pg_dump -U luemobil luemobil > backup.sql` per Cron,
   dazu das `media`-Volume sichern.
7. Interne Bereiche (Keycloak, Rollen, Cron, Ticket-API-Token unter `secrets/`):
   `LIVE-GEHEN.md`, Abschnitt 9.

Updates: `git pull && docker compose up -d --build` — Datenbank-Migrationen laufen
beim Start automatisch (Details in `LIVE-GEHEN.md`, „Später: Updates einspielen").

## Struktur

```
src/collections/     Payload-Collections (Datenmodell)
src/globals/         Payload-Globals (Kundencheck-Hinweise, Patris-Import-Status)
src/app/(frontend)   Öffentliche Seiten (/, /artikel/…, /handbuch, /fragen, /fehler,
                     /stoerungen, /testen, /ausblick, /suche) + /kundencheck (intern)
src/app/(cockpit)    Migrations-Cockpit (/cockpit, intern)
src/app/api/         Interne APIs: auth (Keycloak-Login), cockpit, jira-export,
                     stoerungen-proxy
src/app/(payload)    Admin-Panel & API (Boilerplate)
src/lib/auth/        Login, Session, Rollen-Guards
src/lib/cockpit/     Kundencheck-/Cockpit-Logik (Ampel, Patris, Ticket-API, Stats)
src/jobs/            CLI-Jobs (Aggregat, Health-Alert, Report)
src/migrations/      Postgres-Migrationen (laufen in Produktion beim Start)
src/seed/            Erstimport aus legacy/
keycloak-theme/      SWL-Login-Theme für Keycloak
legacy/              Original-Hilfecenter (Referenz, nur lesen)
```
