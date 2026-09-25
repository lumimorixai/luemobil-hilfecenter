# Payload CMS — Anleitung für das LüMobil Hilfecenter

Diese Anleitung beschreibt, wie das Content-Management-System **Payload** in
diesem Projekt konkret genutzt wird. Sie ist zweigeteilt: **Teil A für
Redakteur:innen** (Inhalte pflegen im Admin-Panel) und **Teil B für die
Weiterentwicklung** (Datenmodell ändern, Migrationen, Deployment).

---

## Kurzüberblick

- Das Admin-Panel erreichst du unter **`/admin`** (lokal: `http://localhost:3000/admin`,
  live: `https://DEINE-DOMAIN/admin`).
- Alle Inhalte der Website liegen in einer Datenbank und werden hier gepflegt —
  **nicht mehr in Dateien**.
- **Änderungen sind sofort live.** Es gibt keinen separaten „Veröffentlichen"-Schritt;
  sobald du speicherst, erscheint der Inhalt auf der Website (Seite neu laden).
- Anmeldung mit E-Mail und Passwort (aus der `.env` / vom Administrator angelegt).

---

# Teil A — Für Redakteur:innen

## A1. Anmelden und Aufbau

Nach dem Login siehst du links die Navigation, gegliedert in vier Gruppen:

- **Inhalte** — die öffentlichen Inhalte der Website: Hilfeartikel, FAQ-Gruppen,
  Handbuch-Kapitel, Bekannte Fehler, Offene Fragen, Ausblick V2.
- **Meldungen** — was Nutzer:innen über die Formulare einreichen: Fehlermeldungen
  und eingereichte Fragen.
- **Cockpit** — Daten der internen Support-Werkzeuge: **Kundencheck-Hinweise**
  (bearbeitbar, siehe A11) sowie nur lesbar Patris-Tickets, Patris-Import,
  Cockpit-Tageswerte und Health-Checks.
- **System** — Medien (Bilder) und Benutzer.

Ganz oben in der Navigation findest du außerdem den Button **„⬇ Fehler → Jira (CSV)"**
für den Export (siehe A8).

Jede Gruppe (z. B. „Hilfeartikel") zeigt eine Liste. Über **„Create New"** legst
du einen neuen Eintrag an, per Klick auf eine Zeile bearbeitest du einen
bestehenden. Rechts oben speicherst du mit **„Save"**.

## A2. Hilfeartikel

Die Kacheln und Artikel im Hilfe-Center.

- **Slug (URL-Kennung):** die eindeutige Adresse des Artikels (z. B. `verbindung`
  → `/artikel/verbindung`). Muss eindeutig sein, am besten kleingeschrieben ohne
  Leerzeichen. Bei bestehenden Artikeln besser **nicht** ändern (alte Links brechen sonst).
- **Kategorie:** Auswahl aus festen Themen (Verbindungssuche, Konto &
  Personalisierung, Fahrplanauskunft, Tickets, Hilfe & Kontakt).
- **Titel / Kurzbeschreibung / Meta-Zeile / Kurzantwort:** Texte für Kachel und
  Artikelkopf.
- **Schritte** *oder* **Schritt-Gruppen:** Für eine einfache Anleitung nutzt du
  „Schritte". Braucht die Anleitung Zwischenüberschriften, nutzt du stattdessen
  „Schritt-Gruppen" (jede Gruppe hat eine Überschrift und eigene Schritte).
- **Tipps:** optionale Hinweisbox.
- **Verwandte Artikel:** Verknüpfung zu anderen Hilfeartikeln (erscheinen unten
  als Verweise).

## A3. FAQ-Gruppen

Häufige Fragen, gruppiert (z. B. „Allgemein", „Ticketkauf & Deutschlandticket").

- **Gruppenname** und **Sortierung** (kleinere Zahl = weiter oben).
- **Fragen:** Liste aus Frage (`q`) und Antwort (`a`). Über das Plus fügst du
  weitere hinzu, per Ziehen sortierst du sie um.

## A4. Handbuch-Kapitel

Das App-Handbuch, Kapitel für Kapitel.

- **Slug** und **Sortierung** bestimmen Identität und Reihenfolge.
- **Kapitel-Nummer** (z. B. „1 · Erste Schritte") und **Titel**.
- **Bild-Layout** (Einzelbild / Bildreihe) und **Bild links statt rechts**
  steuern die Darstellung.
- **Screenshots:** Bilder aus der Medien-Sammlung auswählen (siehe A9).
- **Absätze / Aufzählungspunkte / Hinweis-Box:** die Textinhalte.

## A5. Bekannte Fehler

Öffentlich dokumentierte, bekannte Probleme.

- **Fehler-ID** (Format `LUEMOB-001`, eindeutig) und **Titel**.
- **Schweregrad:** hoch / mittel / niedrig — bestimmt Farbe und Sortierung.
- **Status:**
  - **Gemeldet** — neu, z. B. aus einer Nutzermeldung übernommen.
  - **Offen** — bestätigt, in Bearbeitung.
  - **Behoben** — erledigt. Behobene Fehler rutschen auf der Website automatisch
    nach unten unter die Überschrift „Behobene Fehler".
  - Den Status kannst du jederzeit zurückstellen (**wieder öffnen**).
- **Ausgeblendet (nicht öffentlich):** Häkchen setzen, um einen Fehler öffentlich
  komplett zu verbergen, **ohne ihn zu löschen**. Jederzeit umkehrbar. Für
  Nicht-Angemeldete ist er dann auch über die Schnittstelle nicht sichtbar.
- **Fundort, Beschreibung, Schritte zur Reproduktion, Erwartet/Tatsächlich,
  Screenshots** dokumentieren den Fehler.

Sortierung auf der Website: erst offene/gemeldete (nach Priorität), dann behobene.

## A6. Offene Fragen

Organisatorische/fachliche Fragen mit Klärungsstand, gruppiert.

- **Gruppenname** und **Sortierung**.
- **Fragen:** je Eintrag `qid` (z. B. `OF-05`), **Status** (offen/beantwortet),
  Frage, Antwort, Anmerkung.

## A7. Meldungen bearbeiten (die zwei wichtigen Workflows)

Nutzer:innen können ohne Anmeldung **Fehler melden** (Tab „Bekannte Fehler") und
**Fragen stellen** (Tab „Offene Fragen"). Diese Einreichungen landen unter
**Meldungen** und werden dort geprüft.

### Fehlermeldung → Bekannter Fehler

1. **Meldungen → Fehlermeldungen** öffnen, Eintrag prüfen (Titel, Schweregrad,
   Beschreibung ggf. glätten).
2. In der Seitenleiste **Bearbeitungsstatus** auf **„Übernommen (Bekannter Fehler)"**
   stellen und **speichern**.
3. Das System legt daraufhin **automatisch** einen Eintrag unter „Bekannte Fehler"
   an (mit nächster freier `LUEMOB`-Nummer, Screenshots inklusive, Status
   „gemeldet"). In der Seitenleiste erscheint die Verknüpfung zum neuen Eintrag.
   Erneutes Speichern erzeugt **kein** Duplikat.

### Eingereichte Frage → Offene Frage (online sichtbar)

1. **Meldungen → Eingereichte Fragen** öffnen.
2. Im Feld **Antwort** die Antwort ergänzen und in der Seitenleiste optional eine
   **Zielgruppe** wählen (ohne Auswahl landet sie in „Von Nutzenden eingereicht").
3. **Bearbeitungsstatus** auf **„Übernommen (online sichtbar)"** stellen und speichern.
4. Die Frage wird als Eintrag an die gewählte Offene-Fragen-Gruppe angehängt und
   ist sofort öffentlich sichtbar (Status „beantwortet", wenn eine Antwort
   hinterlegt ist, sonst „offen").

> Unterschied merken: Fehler werden zu **eigenständigen** Einträgen, Fragen werden
> **innerhalb einer Gruppe** angehängt. Nachbearbeiten dann direkt am jeweiligen Ort.

## A8. Fehler nach Jira exportieren

Über **„⬇ Fehler → Jira (CSV)"** in der Navigation lädst du eine CSV-Datei, die
sich in Jira als Vorgänge importieren lässt — inkl. Screenshots. Die genaue
Schritt-für-Schritt-Anleitung steht in **`JIRA-EXPORT.md`**.

## A9. Bilder (Medien)

- Unter **System → Medien** lädst du Bilder hoch und vergibst einen
  **Alternativtext** (wichtig für Barrierefreiheit).
- In Handbuch-Kapiteln und Fehlern wählst du hochgeladene Bilder über das
  Bild-/Upload-Feld aus.

## A10. Gut zu wissen

- **Sofort live:** Speichern genügt, kein Freigabeschritt.
- **Reihenfolge** steuerst du bei FAQ, Handbuch und Offenen Fragen über das Feld
  **Sortierung** in der Seitenleiste.
- **Nichts löschen müssen:** Fehler lassen sich ausblenden statt löschen; Meldungen
  auf „Abgelehnt" setzen statt löschen.
- **Suchen:** Die Website hat pro Bereich eine Suche und oben eine übergreifende
  Suche über alle Inhalte.

## A11. Kundencheck-Hinweise pflegen

Der interne **Kundencheck** zeigt dem Servicecenter per Ampel, ob ein Kunde ein
Ticket hat — und darunter einen Hinweis, was dem Kunden zu sagen ist. Diese
Hinweise pflegst du unter **Cockpit → Kundencheck-Hinweise**:

- Pro Situation (z. B. „Grün – Ticket gültig, Konto vorhanden") gibt es einen
  **Titel** und einen **Hinweistext**. Unter jeder Situation steht, wann sie eintritt.
- Leere Felder fallen automatisch auf den Standardtext zurück.
- Platzhalter werden beim Anzeigen ersetzt: `{produkt}`, `{von}`, `{bis}`,
  `{vorname}`, `{nachname}`, `{kundennummer}` (aus Patris) sowie `{kaufdatum}`,
  `{kaufprodukt}`, `{bestellnummer}` (letzter Kauf in der App).
- Sprache: formelles „Sie", sachlich, als Handlungsanweisung für das Servicecenter.

Die **Patris-Tickets** und der **Patris-Import** sind hier nur zur Kontrolle
lesbar — befüllt werden sie ausschließlich über den CSV-Upload im
Migrations-Cockpit. Details: `KUNDENCHECK-COCKPIT.md`.

---

# Teil B — Für die Weiterentwicklung

Dieser Teil richtet sich an alle, die das **Datenmodell** ändern (Felder,
Collections) oder das Projekt betreiben.

## B1. Wo was liegt

```
src/collections/      Die Collections = das Datenmodell
  Articles.ts, FaqGroups.ts, ManualChapters.ts, KnownBugs.ts,
  OpenQuestions.ts, RoadmapGroups.ts, BugReports.ts, QuestionSubmissions.ts,
  Media.ts, Users.ts
  Cockpit: CockpitDaily.ts, HealthChecks.ts, PatrisEntitlements.ts
src/globals/          Globals (Einzeldokumente): KundencheckHinweise.ts, PatrisImport.ts
src/payload.config.ts Zentrale Payload-Konfiguration (DB-Adapter, Admin-Branding,
                      Collections-/Globals-Liste, onInit-Seed, Migrationen)
src/payload-types.ts  AUTOMATISCH generiert — nie von Hand ändern
src/migrations/       Datenbank-Migrationen (Postgres, Produktion)
src/seed/             Erstimport der Inhalte (seedDatabase.ts + seed.ts)
src/app/(payload)/    Admin-Panel & API (generierter Boilerplate)
src/app/(frontend)/   Die öffentliche Website
```

## B2. Datenbank: lokal vs. Produktion

- **Lokal (Entwicklung):** SQLite (`DATABASE_URI=file:./luemobil.db`). Payload legt
  das Schema automatisch an („push"). Bequem, keine Installation nötig.
- **Produktion (Server):** PostgreSQL. Hier legt Payload das Schema **nicht**
  automatisch an — es laufen **Migrationen** beim Container-Start (`prodMigrations`
  in `payload.config.ts`).

Der Adapter wird in `payload.config.ts` anhand von `DATABASE_URI` **bedingt**
geladen — im Container wird nur der Postgres-Adapter geladen (wichtig, sonst würde
die SQLite-Bibliothek `libsql` fehlen).

## B3. Eine Collection oder ein Feld ändern — der richtige Ablauf

Wichtig ist die **Reihenfolge**, sonst schlägt der Produktions-Build fehl:

1. **Feld/Collection anpassen** in `src/collections/…`.
2. **Typen neu generieren:**
   ```bash
   pnpm generate:types
   ```
   Aktualisiert `src/payload-types.ts`. Nach jeder Modelländerung nötig.
3. **Lokal prüfen:**
   ```bash
   pnpm typecheck
   pnpm dev          # Änderung im Admin/Frontend testen
   ```
4. **Migration erzeugen** (für Postgres/Produktion) — benötigt eine laufende
   Postgres-Datenbank. Am einfachsten eine Wegwerf-Datenbank per Docker:
   ```bash
   docker run -d --rm --name lm-mig-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=lm \
     -p 55432:5432 postgres:16-alpine
   export DATABASE_URI=postgres://postgres:pw@localhost:55432/lm
   pnpm payload migrate                   # bestehende Migrationen einspielen
   pnpm payload migrate:create <name>     # neue Migration erzeugen
   pnpm payload migrate                   # neue Migration testen
   docker stop lm-mig-pg
   ```
   Legt unter `src/migrations/` eine `.ts`- und eine `.json`-Datei (Schema-Snapshot)
   an und trägt sie in `index.ts` ein. Alles **mitcommitten** — die Migration läuft
   beim nächsten Deploy automatisch.

   **Erzeugte Datei immer lesen.** Payload vergleicht mit dem letzten
   JSON-Snapshot, nicht mit der Datenbank. Gibt es von Hand geschriebene
   Migrationen ohne Snapshot, tauchen deren Tabellen erneut auf und müssen aus der
   neuen Datei entfernt werden (seit `20260922_101232_patris` ist der Snapshot
   wieder vollständig). Im `down`-Teil zuerst Constraints/Indizes/Spalten, danach
   die Tabellen löschen — umgekehrt scheitert das Zurückrollen.
5. **Admin-Komponenten** (nur falls du welche hinzugefügt hast, z. B. Logo/Icon):
   ```bash
   pnpm generate:importmap
   ```
6. **Committen & pushen**, dann auf dem Server `git pull` + `docker compose up -d --build`.

> Faustregel: `payload-types.ts` **und** die neue Migration gehören **zusammen mit**
> der Collection-Änderung in denselben Commit.

## B4. Nützliche Befehle

| Befehl | Zweck |
|---|---|
| `pnpm dev` | Entwicklungsserver (Admin unter `/admin`) |
| `pnpm build` | Produktions-Build (Verifikation) |
| `pnpm typecheck` | TypeScript-Prüfung |
| `pnpm generate:types` | `payload-types.ts` neu erzeugen (nach Modelländerung) |
| `pnpm generate:importmap` | Nach Änderung an Admin-Komponenten |
| `pnpm payload migrate:create <name>` | Neue Postgres-Migration erzeugen |
| `pnpm payload migrate` | Migrationen manuell ausführen |
| `pnpm seed` | Legacy-Inhalte importieren (idempotent) |

## B5. Erstimport (Seed) und automatischer Start-Import

- `src/seed/seedDatabase.ts` enthält die Importlogik (liest `legacy/luemobil-data.js`
  und `legacy/media/`), `src/seed/seed.ts` ist der CLI-Aufruf (`pnpm seed`).
- In Produktion importiert die App **beim ersten Start automatisch**, gesteuert
  über die Umgebungsvariable `SEED_ON_INIT=true` (in `docker-compose.yml` gesetzt).
  Der Import ist idempotent — eine bereits gefüllte Datenbank wird übersprungen.
- Abnahmekriterium des Seeds: **5 Artikel / 7 FAQ-Gruppen / 10 Handbuch-Kapitel /
  15 Fehler / 5 Fragen-Gruppen / 25 Medien**.

## B6. Zugriff & Sicherheit (Access Control)

In den Collections steuert `access`, wer was darf:

- **Öffentlich lesbar** sind die Inhalts-Collections (Artikel, FAQ, Handbuch,
  Fehler, Offene Fragen, Medien). Bei „Bekannte Fehler" werden **ausgeblendete**
  Einträge für Nicht-Angemeldete herausgefiltert.
- **Nur für angemeldete Redakteur:innen** sind Fehlermeldungen und eingereichte
  Fragen les- und bearbeitbar. Das **Anlegen** über die öffentlichen Formulare
  läuft über abgesicherte Server Actions (mit Honeypot und Limits), nicht über die
  offene Schnittstelle.
- **Cockpit-Collections** (Tageswerte, Health-Checks, Patris-Tickets, Patris-Import)
  sind nur für angemeldete Redakteur:innen lesbar und im Admin nicht änderbar; sie
  werden ausschließlich vom Server (Jobs, CSV-Upload) geschrieben. Die
  Kundencheck-Hinweise sind für Angemeldete bearbeitbar.
- Der **Kundencheck** und das **Migrations-Cockpit** selbst nutzen nicht die
  Payload-Benutzer, sondern den Keycloak-Login mit eigenen Rollen
  (`KUNDENCHECK-COCKPIT.md`).

## B7. Benutzer & Rollen

- Unter **System → Benutzer** legst du weitere Konten an (E-Mail + Passwort).
- Jedes Konto hat eine **Rolle** (`src/lib/payloadRoles.ts`):
  - **Administrator** — alles, auch die Kundendaten aus dem Patris-Import
    (Namen, Kundennummern, Telefonnummern)
  - **Redaktion** — Inhalte und Meldungen; Patris-Tickets und Patris-Import sind
    weder im Admin sichtbar noch über die REST-API lesbar (HTTP 403)
- Neue Konten sind standardmäßig **Redaktion**. Die Rolle kann nur ein
  Administrator setzen.
- Konten **ohne** gesetzte Rolle gelten als Administrator (Bestandskonten aus der
  Zeit vor den Rollen). Nach der Vergabe der Rollen kann dieser Sonderfall im
  Code entfallen.
- Die Payload-Rollen haben nichts mit den Keycloak-Rollen für Kundencheck und
  Cockpit zu tun (`KUNDENCHECK-COCKPIT.md`) — das sind getrennte Anmeldungen.

## B8. Betrieb: Backups

Datenbank sichern (auf dem Server):
```bash
docker compose exec postgres pg_dump -U luemobil luemobil > backup-$(date +%F).sql
```
Die Bilder liegen im Docker-Volume `media`. Automatische Sicherung und
Wiederherstellung: `docs/BACKUP-RESTORE.md`; Deployment: `LIVE-GEHEN.md`.

## B9. Verwandte Dokumente

- `LIVE-GEHEN.md` — Server-Deployment Schritt für Schritt
- `KUNDENCHECK-COCKPIT.md` — Kundencheck & Migrations-Cockpit (Rollen, Ampel,
  Patris-CSV, Ticket-API)
- `JIRA-EXPORT.md` — Fehler nach Jira exportieren
- `docs/` — Architektur, Keycloak, Backup, Datenschutz, Servicecenter, Testen
- `CHANGELOG.md` — Änderungen und Update-Schritte je Version
- `CLAUDE.md` — Projektgedächtnis & Roadmap
- `.claude/skills/content-model` und `.claude/skills/swl-design-system` — Modell
  und Design-Regeln (auch für die Arbeit mit Claude Code)
