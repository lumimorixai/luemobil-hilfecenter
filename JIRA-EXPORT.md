# Bekannte Fehler nach Jira exportieren

Das Hilfecenter kann die bekannten Fehler als **Jira-CSV** ausgeben — inklusive
Screenshots als Anhänge. So bringst du sie in wenigen Schritten in Jira.

## 1. CSV herunterladen

Zwei Wege:

- **Aus dem Admin-Panel:** In der linken Navigation auf **„⬇ Fehler → Jira (CSV)“** klicken.
- **Direkt über die Adresse:**
  - Alle sichtbaren Fehler: `https://DEINE-DOMAIN/api/jira-export`
  - Nur ein Fehler: `…/api/jira-export?bugId=LUEMOB-003`
  - Nur ein Status: `…/api/jira-export?status=offen` (bzw. `gemeldet`, `behoben`)

Es wird die Datei `luemobil-fehler-jira.csv` heruntergeladen. Ausgeblendete
Fehler sind nicht enthalten.

## 2. In Jira importieren

**Jira Cloud** (Projekt-Admin oder System-Admin nötig):

1. Zahnrad oben rechts → **System** → unter „Import und Export“ → **Externes System importieren**.
   (Alternativ auf Projektebene: Projekteinstellungen → **Vorgänge importieren**.)
2. **CSV** wählen, die Datei `luemobil-fehler-jira.csv` hochladen, **Weiter**.
3. Ziel-Projekt auswählen. Wichtig: als Zeichensatz **UTF-8** lassen (die Datei bringt
   dafür bereits eine Kennung mit, damit Umlaute korrekt ankommen).
4. **Feldzuordnung (Mapping):**
   - `Summary` → Zusammenfassung
   - `Issue Type` → Vorgangstyp (enthält „Bug“)
   - `Priority` → Priorität (High / Medium / Low)
   - `Labels` → Beschriftungen (enthält `LuMobil` und den Status)
   - `Description` → Beschreibung
   - `Attachment` → **Anhang** (beide Attachment-Spalten auf „Anhang“ mappen)
5. Import starten. Jira legt für jede Zeile einen **Bug** an und lädt die
   Screenshots von den angegebenen URLs automatisch als Anhang herunter.

## Wichtig zu den Screenshots

Damit Jira die Bilder ziehen kann, müssen die **Bild-URLs für Jira erreichbar**
sein. Das ist nach dem Deployment unter der öffentlichen Domain der Fall
(`https://DEINE-DOMAIN/api/media/file/…`).

Beim lokalen Testen (`http://localhost:3000`) kommt Jira Cloud **nicht** an die
Bilder — dann entweder erst nach dem Livegang exportieren, oder die Screenshots
aus dem Admin herunterladen und im Jira-Vorgang manuell anhängen.

## Was in jedem Vorgang landet

- **Titel:** `[LUEMOB-003] Kurzbeschreibung`
- **Priorität:** aus dem Schweregrad (hoch → High, mittel → Medium, niedrig → Low)
- **Beschreibung** (Jira-Wiki-Format): Fehler-ID, Status, Schweregrad, Fundort,
  Beschreibung, Schritte zur Reproduktion, Erwartetes und Tatsächliches Verhalten
- **Beschriftungen:** `LuMobil` und der Status (`gemeldet` / `offen` / `behoben`)
- **Anhänge:** die hinterlegten Screenshots

## Tipp

Wenn dein Jira-Projekt eigene Pflichtfelder hat (z. B. „Komponente“), kannst du
die CSV vor dem Import in Excel/Numbers öffnen und eine weitere Spalte ergänzen —
das Mapping in Schritt 4 bietet sie dann automatisch mit an.
