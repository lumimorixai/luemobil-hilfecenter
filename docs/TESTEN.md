# Testen

Es gibt noch **keine automatisierten Tests** (Playwright-E2E steht auf der
Roadmap in `CLAUDE.md`). Bis dahin gelten die automatischen Prüfungen unten und
die manuelle Checkliste vor jedem Release.

## Automatische Prüfungen (vor jedem Commit)

```bash
pnpm typecheck     # TypeScript
pnpm build         # Production-Build
```

Beide müssen grün sein. `pnpm build` überschreibt `.next` — einen laufenden
`pnpm dev` vorher stoppen und danach `.next` löschen, sonst liefert der
Dev-Server Fehler.

Bei Änderungen am Datenmodell zusätzlich die Migration gegen eine
Wegwerf-Postgres testen (`PAYLOAD-CMS-ANLEITUNG.md`, B3).

## Lokale Testumgebung

| Was | Wie |
|---|---|
| Cockpit/Kundencheck ohne Keycloak | `COCKPIT_MOCK=true` in `.env`, Anmeldung über `/api/auth/dev-login` |
| Rollen testen | `/api/auth/dev-login?as=kundencheck`, `?as=cockpit`, ohne Parameter = beides |
| Patris-Daten | `docs/beispiele/patris-beispiel.csv` im Cockpit hochladen |
| App-Käufe (Ticket-API) | Im Mock-Modus ohne `LUEMOBIL_API_*`: Demo-Käufe für `anna.albers@example.de`. Gegen das Dev-System: `LUEMOBIL_API_*` setzen, Testadresse `katja.katze@swl-innovation.de` (4 Käufe) |

**Testpersonen im Mock-Modus** (mit hochgeladener Beispiel-CSV):

| E-Mail | Erwartete Ampel |
|---|---|
| `anna.albers@example.de` | Grün — Ticket gültig (Konto + Patris + Demo-Kauf) |
| `bernd.behn@example.de` | Gelb — Konto fehlt noch |
| `dora.dietz@example.de` | Gelb — Ticket noch nicht gültig |
| `erik.ernst@example.de` | Rot — abgelaufen |
| `carla.claas@example.de` | Rot — kein Ticket (Ereignisse: `user_not_found`) |

Hinweis: Die Demo-Käufe haben feste Daten. Liegt der Demo-Kauf von Anna länger
als 35 Tage zurück, zeigt ihre Ampel Gelb („in der App nicht ausgeliefert").

## Checkliste vor einem Release

Auf einer lokalen oder Test-Instanz durchgehen; Ergebnis im Release-Eintrag
(`CHANGELOG.md`) festhalten.

**Öffentliche Seite**
- [ ] Startseite lädt, Suche findet einen Artikel, Artikel öffnet sich
- [ ] Reiter Handbuch, Offene Fragen, Bekannte Fehler, Störungen, Testen, Ausblick laden
- [ ] Fehler melden (`/fehler`): Formular absenden, Meldung erscheint im Admin
- [ ] Frage einreichen (`/fragen`): Formular absenden, erscheint im Admin
- [ ] Darstellung auf dem Handy (schmales Fenster)

**Admin (`/admin`)**
- [ ] Anmelden, Artikel ändern → Änderung sofort auf der Website
- [ ] Kundencheck-Hinweis ändern → Text erscheint im Kundencheck

**Interne Bereiche**
- [ ] Rolle `kundencheck`: nur Reiter Kundencheck; `/cockpit` leitet um; Cockpit-APIs 403
- [ ] Rolle `cockpit`: nur Reiter Cockpit, ohne eingebetteten Kundencheck; `/kundencheck` leitet um
- [ ] Rolle `support`: beides
- [ ] Ohne Anmeldung: `/kundencheck` und `/cockpit` führen zum Login; `/api/cockpit/check` → 403
- [ ] Kundencheck: alle Ampelfarben aus der Tabelle oben
- [ ] Patris-Upload: Beispiel-CSV → „4 Tickets übernommen · 1 Zeile ohne entitlement_id übersprungen"; Datei ohne Pflichtspalte → verständliche Fehlermeldung, alter Stand bleibt
- [ ] Ticket-API: Käufe erscheinen; mit falschem Token → Hinweis „Zugang abgelehnt" (Alarm-Mail nur bei gesetztem `ALERT_EMAIL`)
- [ ] Cockpit: Kennzahlen, Live-Ampel, Report-Button

**Nach dem Deployment (Produktion)**
- [ ] `docker compose logs app`: Migrationen gelaufen, keine Fehler
- [ ] Cron-Endpunkt: `curl -X POST -H "x-cron-secret: …" <DOMAIN>/api/cockpit/cron?job=health` → `{"ok":true…}`
- [ ] Anmeldung über Keycloak, Kundencheck mit einer echten Adresse
- [ ] Backup-Skript läuft (`docs/BACKUP-RESTORE.md`)
