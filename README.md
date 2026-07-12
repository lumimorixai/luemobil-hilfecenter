# LüMobil Hilfecenter

Hilfecenter der LüMobil-App (Stadtwerke Lübeck) — Next.js 15 + Payload CMS 3.
Inhalte (Hilfeartikel, FAQ, App-Handbuch, Offene Fragen, Bekannte Fehler) werden im
eingebauten Admin-Panel unter `/admin` gepflegt, nicht mehr in einer JS-Datei.

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
| `pnpm generate:types` | Nach jeder Collection-Änderung |

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

## Struktur

```
src/collections/   Payload-Collections (Datenmodell)
src/app/(frontend) Öffentliche Seiten (/, /artikel/…, /handbuch, /fragen, /fehler)
src/app/(payload)  Admin-Panel & API (Boilerplate)
src/seed/          Erstimport aus legacy/
legacy/            Original-Hilfecenter (Referenz, nur lesen)
```
