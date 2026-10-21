# Kennzahlen — LüMobil-Dashboards (Metabase)

Die Dashboards liegen seit dem 25.09.2026 im Cockpit unter
**`/cockpit/dashboards`** (Bereich „Auswertungen"). Die alte Adresse
`/kennzahlen` leitet dorthin weiter; ein angefragtes Dashboard (`?d=…`) wird
mitgenommen.

Der Bereich zeigt die LüMobil-Dashboards aus Metabase im
Hilfecenter. Metabase selbst bleibt nicht öffentlich; niemand braucht ein
eigenes Metabase-Konto. Vorgaben des LüMobil-Betriebs:
`EINBINDUNG_DASHBOARDS_HILFECENTER.md` (im LüMobil-Projekt, `metabase-setup/`).

## Ablauf

1. Die Seite prüft die **Anmeldung** (Keycloak, wie Kundencheck/Cockpit).
2. Sie prüft, ob die **Rolle** das gewählte Dashboard sehen darf. Wenn nicht:
   Hinweis „Kein Zugriff", **es wird kein Token erzeugt**.
3. Erst dann signiert der **Server** ein Token (JWT, HS256) für genau dieses
   Dashboard, gültig **10 Minuten**, und liefert die iframe-URL aus.
4. Der **Browser** lädt das Dashboard direkt von `METABASE_URL`. Der
   Hilfecenter-Server braucht keine Verbindung zu Metabase.
5. Das iframe wird **nicht im Takt** neu geladen — das würde bei jedem Mal
   sichtbar flackern. Ein offenes Dashboard lädt von sich aus keine Daten nach,
   ein abgelaufenes Token stört es also nicht. Aufgefrischt wird nur, wenn man
   zur Seite **zurückkehrt** (Tab- oder Fensterwechsel) und die Anzeige älter als
   9 Minuten ist: über `GET /api/cockpit/kennzahlen?dashboard=<schlüssel>` mit
   derselben Prüfung (ohne Berechtigung 403). Wurde man zwischenzeitlich
   abgemeldet, zeigt die Seite einen Hinweis.

Metabase akzeptiert abgelaufene Tokens noch **60 Sekunden** (Toleranz für
Uhrabweichungen, getestet). Eine kopierte URL ist damit nach höchstens
11 Minuten wertlos. Serveruhr per NTP synchron halten.

Code: `src/lib/metabase.ts` (Konfiguration, Rechte, Signatur — ohne
JWT-Bibliothek, `node:crypto`), `src/app/(frontend)/kennzahlen/page.tsx`,
`src/components/cockpit/DashboardFrame.tsx`, `src/app/api/cockpit/kennzahlen/route.ts`.

## Dashboards und Rechte

Stand 21.10.2026: **sieben** Boards. Zuvor waren es vier; drei sind neu
hinzugekommen und zwei wurden umgebaut.

| Schlüssel | Demo-ID | Board | Kacheln | Standard-Zugriff |
|---|---:|---|---:|---|
| `ueberblick` | 6 | 1 — Überblick | 14 | `cockpit`, `support` |
| `abo` | 7 | 2 — Abo-Bestand | 13 | `cockpit`, `support` |
| `payone` | 8 | 3 — Einzeltickets und PayOne — **enthält einzelne Bestellungen** | 24 | nur `support` |
| `betrieb` | 9 | 4 — Betrieb und Störungen — **enthält einzelne Bestellungen** | 13 | nur `support` |
| `monatsbilanz` | 10 | 5 — Monatsbilanz Abo | 15 | `cockpit`, `support` |
| `verlaengerung` | 11 | 6 — Abo-Verlängerung | 12 | `cockpit`, `support` |
| `nutzung` | 12 | 7 — App-Nutzung | 15 | `cockpit`, `support` |

- **`payone` ist seit dem 21.10.2026 auf `support` beschränkt.** Das Board
  zeigt nach dem Umbau die Tabelle „Erstattungen im Einzelnen" mit
  Bestellnummer und Betrag. Damit gilt dieselbe Regel wie für `betrieb` —
  keine neue Entscheidung, sondern die bestehende Regel auf einen geänderten
  Inhalt angewendet. Wer das Board im Controlling braucht, bekommt es über
  `METABASE_DASHBOARD_ROLES=payone:support|controlling`.
- `abo` und `monatsbilanz` enthalten PLZ-Tabellen mit kleinen Fallzahlen, aber
  keine einzelnen Bestellungen — Zugriff wie bisher.
- Der Reiter **„Kennzahlen"** erscheint nur, wenn mindestens ein Dashboard
  sichtbar ist. Die Rolle `kundencheck` allein sieht keine Dashboards.
- Abweichende Rechte über `METABASE_DASHBOARD_ROLES`, z. B.
  `betrieb:support|controlling,abo:cockpit` (Schlüssel:Rolle1|Rolle2). Ein Eintrag
  ersetzt die Standardregel für dieses Dashboard.
- Die IDs gelten für die Demo; in Produktion können sie anders lauten →
  nur `METABASE_DASHBOARDS` anpassen, kein Code. Die Produktiv-IDs nennt im
  Reporting `docker compose run --rm reports` am Ende („Board-IDs: 1=6, 2=7, …").
- Unbekannte Schlüssel werden mit dem Schlüssel als Titel angezeigt; Titel,
  Boardnummer, Beschreibung und iframe-Höhe der bekannten Boards stehen in
  `src/lib/metabase.ts`.

### Höhe der Einbettung

Ein iframe passt seine Höhe nicht selbst an, und das Resizer-Skript von
Metabase würde fremdes JavaScript in die eigene Seite holen. Die Höhe wird
deshalb gerechnet: `sizingFuerRaster(zeilen)` in `src/lib/metabase.ts` aus der
Zahl der Rasterzeilen eines Boards — 48,5 px je Zeile, Steigung 1/30 je Zeile.
Beides ist an der Demo gemessen und stimmt für zwei unveränderte Boards auf ein
Promille.

Die Zeilenzahl eines Boards steht im Reporting-Projekt in
`metabase-setup/14_dashboards.py`: das größte `row + size_y` über alle Kacheln.
Ein umgebautes Board braucht hier also nur eine neue Zahl, kein Nachmessen am
Bildschirm.

## Konfiguration

| Variable | Beispiel | Hinweis |
|---|---|---|
| `METABASE_URL` | Dev `http://localhost:3030` · Prod `https://reporting.luemobil.de` | vom LüMobil-Betrieb |
| `METABASE_EMBED_SECRET_FILE` | `/run/secrets/app/metabase_embed_secret` | **empfohlen**, bei jedem Aufruf neu gelesen |
| `METABASE_EMBED_SECRET` | 64 Hex-Zeichen | Alternative; Wechsel braucht Neustart |
| `METABASE_DASHBOARDS` | `ueberblick:6,abo:7,payone:8,betrieb:9,monatsbilanz:10,verlaengerung:11,nutzung:12` | Schlüssel:ID, Reihenfolge = Reiter |
| `METABASE_DASHBOARD_ROLES` | leer | siehe oben |

Ohne `METABASE_URL`, Schlüssel oder Dashboards ist die Seite ausgeblendet
(„noch nicht eingerichtet").

**Lokal:** Schlüssel in `~/.config/luemobil-hilfecenter/metabase_embed_secret`.
Die Demo-Metabase läuft auf dem Mac des LüMobil-Teams
(`metabase-setup/start.sh`, Prüfen: `curl http://localhost:3030/api/health` →
`{"status":"ok"}`). Lokal darf jede Seite einbetten. Gegenprobe: Board 1
„Überblick", Kachel „Umsatz brutto" = 451.706,97 € (Demodaten vom
21.10.2026; vorher 81.926 €).

**Produktion:**

```bash
cd /opt/luemobil
printf '%s' '<SCHLÜSSEL>' > secrets/metabase_embed_secret
sudo chown $(docker compose exec app id -u) secrets/metabase_embed_secret
chmod 400 secrets/metabase_embed_secret
# .env: METABASE_URL=… und METABASE_DASHBOARDS=… (Prod-IDs), dann:
docker compose up -d
```

Dem LüMobil-Betrieb **alle** Adressen des Hilfecenters (Dev, Test, Produktion)
melden — nur diese dürfen einbetten (`frame-ancestors`).

**Schlüsselwechsel:** Datei ersetzen — wirkt sofort. Alle alten Tokens werden
ungültig; offene Seiten erholen sich, sobald man zur Seite zurückkehrt oder sie
neu lädt.

## Sicherheit

- Token wird nur serverseitig erzeugt; Schlüssel nie im Repository, im
  JavaScript oder in Logs (Build und Repo per `grep` geprüft, 22.09.2026).
- iframe-URLs werden nicht geloggt. Das iframe setzt `referrerpolicy="no-referrer"`.
- Das Hilfecenter hat keine eigene Content-Security-Policy; falls eine
  hinzukommt: `frame-src <METABASE_URL>` ergänzen.
- Kein Resizer-Skript von Metabase im eigenen Seitenkontext (siehe „Darstellung").

## Darstellung

- **Breite:** Auf dieser Seite wird die Inhaltsspalte selbst breiter (höchstens
  1600 px plus 24 px Rand, CSS-Regel `main.lm-main:has(> .lm-dash-page)`); sonst
  kürzt Metabase Zahlen und Titel (z. B. „€452k" statt „€451.707"). Wichtig: Der
  Inhalt darf **nicht** per negativem Rand oder `transform` aus der Spalte
  herausragen — dann rastert Chrome das iframe beim Scrollen neu, was sichtbar
  flackert. Browser ohne `:has()` zeigen die normale Breite.
- **Scrollbalken:** Auf dieser Seite ist sein Platz fest reserviert
  (`scrollbar-gutter: stable`), und die Höhe wird erst ab 32 px Breitenänderung
  neu gesetzt. Sonst entsteht eine Rückkopplung: Höhe ändert sich → Scrollbalken
  erscheint oder verschwindet → Breite ändert sich um ~15 px → neue Höhe → …
  Das äußert sich als Flackern und hörte beim Hineinzoomen auf.
- **Diagnose:** `?breit=0` an die Adresse hängen zeigt das Dashboard in der
  normalen 960-px-Spalte — praktisch, um Darstellungsprobleme einzugrenzen.
- **Höhe:** Metabase skaliert die Kacheln mit der Breite. Die Höhe des iframes
  wird deshalb aus seiner tatsächlichen Breite berechnet:
  `base + (Breite − 1200) × slope + 80`. Die Werte je Dashboard stehen in
  `src/lib/metabase.ts` (`sizing`, gemessen am 22.09.2026 an der Demo).
- **Nach Änderungen an einem Dashboard** (Kacheln hinzugefügt/entfernt) oder
  mit anderen Prod-Dashboards die Werte neu messen: Dashboard in Chrome bei
  1200 und 1600 px Fensterbreite öffnen, Unterkante des Kachelrasters
  (`.react-grid-layout`) ablesen → `base` = Wert bei 1200,
  `slope` = (Wert 1600 − Wert 1200) / 400. Stimmen die Werte nicht, scrollt das
  Dashboard innerhalb des iframes bzw. zeigt unten Leerraum — Daten gehen nicht verloren.
- Sehr lange Kacheltitel kürzt Metabase auch bei voller Breite („Konto zu …");
  das lässt sich nur im Dashboard selbst (LüMobil-Team) ändern.
- Auf dem Handy stapelt Metabase die Kacheln; das Dashboard scrollt dann im iframe.

## Einschränkungen

Nur ansehen (kein Drilldown, kein Export), Hinweis „Powered by Metabase"
unter jedem Dashboard, alle Berechtigten sehen dasselbe, Datenstand der
letzten Nacht.

## Fehlerbilder

| Im iframe erscheint | Ursache |
|---|---|
| „Der Einbettungs-Secret-Key wurde nicht gesetzt." | Einbettung in Metabase aus → LüMobil-Betrieb |
| „Message seems corrupt or manipulated" | falscher Schlüssel in der Datei |
| „Token is expired (…)" | Seite sehr lange offen ohne Nachladen, oder Serveruhr falsch |
| „Einbettung ist für dieses Objekt nicht aktiviert." | falsche Dashboard-ID in `METABASE_DASHBOARDS` oder nicht freigegeben |
| Leere Fläche, Konsole „refused to frame" | Hilfecenter-Adresse bei Metabase nicht freigegeben |
| Leere Fläche lokal | Demo-Metabase läuft nicht |

---

## Ampel „Dashboards"

Die Erreichbarkeitsprüfung im Cockpit ruft `/api/health` von Metabase — aber
**nicht** über die öffentliche Adresse. Der Reverse Proxy gibt dort absichtlich
nur die Einbettungspfade frei (`/embed/*`, `/api/embed/*`, `/app/*`) und
antwortet auf alles andere mit 404. Die Ampel stand deshalb auf Rot, obwohl
Metabase lief.

Geprüft wird daher im Docker-Netz. Vorgabe im Compose:

```env
METABASE_HEALTH_URL=http://metabase:3000
```

Dafür müssen beide Stacks dasselbe Netz nutzen — das ist beim Reporting-Stack
ohnehin der Fall (`networks: [hilfecenter]`, `external: true`). In der
Entwicklung bleibt die Variable leer; dann gilt `METABASE_URL`.
