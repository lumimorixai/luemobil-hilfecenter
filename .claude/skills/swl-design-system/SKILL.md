---
name: swl-design-system
description: Verbindliches SWL-Innovation-Design-System für das LüMobil Hilfecenter. Lesen bei JEDER Änderung an UI, Styling, Farben, Typografie oder neuen Frontend-Komponenten.
---

# SWL Innovation Design System (verbindlich)

Quelle: `legacy/_ds` im Original-Projekt · Version 2.2 · Freigabe: Jan Hedtfeld.
Grundprinzip: **„Klarheit vor Dekoration."** Präzise, regelgetrieben, zurückhaltend.

## Farben — NUR diese Tokens, keine Tints/Shades, keine Fremdfarben

| Token | Wert | Verwendung |
|---|---|---|
| `--swl-white` | #FFFFFF | Seitenhintergrund, Text auf Schwarz |
| `--swl-black` | #000000 | Text, Hero-/Header-Hintergrund |
| `--swl-orange` | #FF8200 | **Primärer Akzent** (Links, aktive Zustände, Marker) |
| `--swl-orange-dark` | #C96800 | Nur Hover-Zustand von Links |
| `--swl-gray-bg` | #E4E4E4 | Helle Akzentflächen, Text auf Schwarz (sekundär) |
| `--swl-surface-muted` | #F8F8F8 | Kurzinfo-Boxen, Hover-Flächen |
| `--swl-hairline` | #CFCFCF | Rahmen, Trennlinien |
| `--swl-label-gray` | #7A7474 | Meta-Labels, Captions |
| `--swl-pink` | #F73E5E | Schweregrad „hoch" |
| `--swl-status-green` | #00AA32 | Status „beantwortet"/„Im Plan" |
| `--swl-yellow` | #FFCC00 | Status „Abweichung" (sparsam) |

Ampel-Farben (grün/gelb/pink) sind NUR für Status — nie Dekoration, nie Hover, nie Diagrammserien.

## Typografie
- Schrift: **Inter** für alles (self-hosted via `@fontsource-variable/inter` — kein Google-Fonts-CDN, DSGVO).
- Gewichte: 400 Fließtext · 600 Buttons/Betonungen · 700–800 Überschriften · 900 Hero („Wie können wir helfen?").
- UPPERCASE + `letter-spacing: 0.08em` NUR für Meta-Labels und Marken-Zeilen (z. B. „Stadtwerke Lübeck · LüMobil").

## Form & Abstand
- Eckenradius: **2px** überall (`--radius`). Keine runden Ecken, keine Schatten, keine Verläufe (Ausnahme: SWL-Signatur-Gradient in Legacy-Slides — im Web nicht verwenden).
- Rahmen: 1px `--swl-hairline`; Hover: Rahmen wird `--swl-orange`.
- Inhaltsbreite: max. 960px (`--maxw`), Seitenränder 24px.
- Hinweis-/Tippboxen: 1px Rahmen + 3px orangene Oberkante bzw. linke Kante.

## Sprache
- Deutsch (Hochdeutsch), formelles **„Sie"**, korporativ-sachlicher Ton.
- Deutsche Formate: `320.000 €`, Daten `TT.MM.JJJJ`, Anführungszeichen „…".
- Kein Marketing-Fluff, keine Ausrufezeichen (Ausnahme: Warnlabel „Achtung!").
- Keine Emojis.

## Umsetzung in diesem Projekt
- Alle Tokens liegen in `src/app/(frontend)/globals.css` unter `:root`.
- Neue UI-Elemente: vorhandene `.lm-*`-Klassen wiederverwenden oder im gleichen Stil ergänzen.
- Vergleichsreferenz für das Original-Layout: `legacy/` (nur lesen).
