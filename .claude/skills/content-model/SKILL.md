---
name: content-model
description: Datenmodell des LüMobil Hilfecenters (Payload-Collections und Legacy-Mapping). Lesen bei Änderungen an Collections, Seed, Frontend-Datenzugriff oder neuen Inhaltstypen.
---

# Content-Modell LüMobil Hilfecenter

Sechs Inhalts-Collections, zwei Meldungs-Collections, drei Cockpit-Collections, zwei Globals + Media + Users. Nach JEDER Feldänderung: `pnpm generate:types` ausführen und eine Postgres-Migration erzeugen (siehe PAYLOAD-CMS-ANLEITUNG.md, B3).

## articles (Hilfeartikel) — 5 Stück im Seed
- `slug` (unique, aus Legacy-`id`, z. B. `verbindung`, `favoriten`, `abfahrten`)
- `category` (Select): Verbindungssuche · Konto & Personalisierung · Fahrplanauskunft · Tickets · Hilfe & Kontakt
- `title`, `excerpt` (Kachel), `meta` (Zielgruppe · Lesezeit), `short` (Kurzantwort-Box)
- `steps[]` (einfache Schrittliste) ODER `stepGroups[]` (mit Zwischenüberschrift `heading` + `items[]`) — Artikel nutzen eins von beiden
- `tips[]`, `related` (Relationship auf articles, hasMany)

## faq-groups (FAQ) — 7 Gruppen
- `group` (Name), `order`, `items[]` mit `q`/`a`
- Gruppen: Allgemein · Konto & Anmeldung · Ticketkauf & Deutschlandticket · Verbindungen & Abfahrten · On-Demand-Shuttle · Datenschutz & Einstellungen · Support

## manual-chapters (App-Handbuch) — 10 Kapitel
- `slug`, `order`, `num` („1 · Erste Schritte"), `title`
- `layout` (single|row), `reverse` (Bild links), `images` (Upload→media, hasMany)
- `paras[]`, `bullets[]`, `note` (Hinweis-Box)

## known-bugs (Bekannte Fehler) — 15 Stück
- `bugId` (unique, Format `LUEMOB-001`), `severity` (hoch|mittel|niedrig)
- `title`, `fundort` (Quelle/Nachweis, z. B. Video + Sekunde), `description`
- `steps[]` (Reproduktion), `expected`, `actual`
- `images` (Upload, hasMany), `caption`, `noImageNote`, `reverse`, `builtin`
- Frontend sortiert: hoch → mittel → niedrig, dann bugId

## open-questions (Offene Fragen) — 5 Gruppen
- `group`, `order`, `items[]` mit `qid` (`OF-00`…), `status` (offen|beantwortet), `question`, `answer`, `note`
- Gruppen: Bereits geklärt · A. Störungen & Ausfall-Kommunikation · B. Kundenanfragen-Routing · C. Kundenservice-Leitfaden · D. Erstattung & Stornierung

## bug-reports (Fehlermeldungen von Nutzenden)
- Öffentliches Formular auf /fehler („＋ Fehler melden") → Server Action `src/app/(frontend)/fehler/actions.ts`
- Felder wie known-bugs plus: `status` (neu | in-pruefung | uebernommen | abgelehnt), `reporter`, `internalNote`
- Zugriff: ALLE Operationen nur für angemeldete User; das Formular erstellt über die Local API (Server Action umgeht Access Control bewusst)
- Schutz: Honeypot-Feld `website`, Längenlimits, max. 3 Bilder à 4 MB (JPG/PNG/WebP)
- Admin-Gruppe „Meldungen"; Workflow: prüfen → ggf. manuell als known-bug übernehmen → Status setzen

## question-submissions (eingereichte Fragen)
- Öffentliches Formular auf /fragen → Server Action `src/app/(frontend)/fragen/actions.ts`; REST gesperrt
- `question`, `answer`, `reporter`, `contact`, `internalNote`, `targetGroup` (→ open-questions)
- `status` (neu | in-pruefung | uebernommen | abgelehnt); bei „uebernommen" wird die Frage an eine Offene-Fragen-Gruppe angehängt (`convertedTo`, `publishedQid`)
- Neue Einreichungen lösen `notifyEditors` aus (`src/lib/notify.ts`, nur mit SMTP)

## roadmap (Ausblick V2, Seite /ausblick)
- `order`, `kicker`, `heading`, `intro`, `items[]` mit `title`, `status` (geplant | in Prüfung | in Vorbereitung), `text`

## Cockpit (Admin-Gruppe „Cockpit", nur lesbar, nur serverseitig geschrieben)
- `cockpit-daily` — Tageswerte der Migrations-Zeitreihe (`datum` unique JJJJ-MM-TT, `logins`, `loginErrors`, `newUsers`, `registrations`); Upsert durch `pnpm job:cockpit` / Cron `job=aggregate`
- `health-checks` — minütliche Systemstatus-Checks (`checkedAt`, `status`, `failCounts`, `alertedDown` als JSON); Grundlage für Alerting und Verfügbarkeit
- `patris-entitlements` — Ticketberechtigungen aus dem Patris-CSV: `entitlementId`, `validFrom`, `validUntil`, `productNumber`, `productName`, `customerNumber`, `email` (kleingeschrieben), `firstName`, `lastName`. Wird beim Upload per Drizzle in EINER Transaktion komplett ersetzt (`src/lib/cockpit/patris.ts`), nicht über die Local API

## Globals
- `kundencheck-hinweise` — je Ampel-Situation eine Gruppe `{ titel, text }`; Schlüssel und Standardtexte kommen aus `src/lib/cockpit/hints.ts` (`HINT_SITUATIONS`). Neue Situation ⇒ neue Spalten ⇒ Migration
- `patris-import` — Stand des letzten Uploads: `importedAt`, `fileName`, `importedBy`, `rowCount`, `skippedRows` (nur lesbar)

## Externe Datenquellen (nicht in Payload)
- Keycloak Admin API (`src/lib/keycloak.ts`) — Konten, Events
- LüMobil Ticket-API (`src/lib/cockpit/ticketApi.ts`) — App-Käufe je E-Mail, nur serverseitig
- Details: `KUNDENCHECK-COCKPIT.md`

## media
- Upload-Collection, `staticDir: 'media'`, nur Bilder, Feld `alt`
- URLs: `/api/media/file/<dateiname>`

## Seed & Zähl-Check
- `pnpm seed` importiert `legacy/luemobil-data.js` (Format: `window.LUEMOBIL_DATA = {…}` → JSON ab erster `{`)
- Bilder aus `legacy/media/` werden als Media-Docs hochgeladen
- Abnahmekriterium: **5 / 7 / 10 / 15 / 5** (+ 25 Medien); bei Abweichung Exit-Code 1
- Idempotent: bricht ab, wenn schon Artikel existieren

## Datenzugriff im Frontend
- Immer Payload **Local API** über `src/lib/content.ts` (`payloadClient()`), nie fetch auf die eigene REST-API
- Seiten sind `dynamic = 'force-dynamic'` (Inhalte kommen live aus dem CMS)
- Relationship-/Upload-Felder können `number | Objekt` sein → mit Type-Guard filtern (siehe artikel/[slug]/page.tsx)
