---
name: content-model
description: Datenmodell des LüMobil Hilfecenters (Payload-Collections und Legacy-Mapping). Lesen bei Änderungen an Collections, Seed, Frontend-Datenzugriff oder neuen Inhaltstypen.
---

# Content-Modell LüMobil Hilfecenter

Fünf Inhalts-Collections + Media + Users. Nach JEDER Feldänderung: `pnpm generate:types` ausführen.

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
