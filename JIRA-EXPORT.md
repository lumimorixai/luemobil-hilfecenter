# Bekannte Fehler nach Jira bringen

Es gibt zwei Wege. Empfohlen ist die **automatische Schnittstelle** (Jira Cloud
REST-API). Der **CSV-Export** bleibt als Ausweichlösung erhalten, falls die
Schnittstelle (noch) nicht konfiguriert ist.

---

## A) Automatisch über die Jira-Schnittstelle (empfohlen)

### So funktioniert es

Sobald ein bekannter Fehler den Status **„Gemeldet“** erhält, legt das
Hilfecenter **automatisch genau ein Jira-Ticket** an und speichert dessen
Ticket-ID (z. B. `LUEM-42`) direkt am Datensatz im Feld **„Jira-Ticket“**
(Seitenleiste, schreibgeschützt) samt Direktlink.

Das gilt für beide Wege, auf denen ein Fehler zu „Gemeldet“ kommt:

- eine öffentliche Fehlermeldung wird **übernommen** (dabei entsteht ein
  bekannter Fehler mit Status „Gemeldet“), oder
- der Status wird im Admin **von Hand** auf „Gemeldet“ gesetzt.

**Nur ein Ticket:** Das Feld „Jira-Ticket“ ist der Marker. Ist es gefüllt, wird
kein weiteres Ticket erzeugt — egal wie oft der Datensatz danach gespeichert
wird. Erst wenn das Feld leer ist (und der Status „Gemeldet“), entsteht ein
neues Ticket.

Schlägt der Aufruf an Jira fehl (z. B. Netzwerk), wird der Fehler dennoch
gespeichert; die Ursache steht im Server-Log. Nach Behebung reicht ein erneutes
Speichern mit Status „Gemeldet“.

### Einrichtung (Zugangsdaten kommen in die `.env`)

In der `.env` auf dem Server folgende Werte setzen (siehe `.env.example`):

```
JIRA_BASE_URL=https://DEIN-TEAM.atlassian.net
JIRA_EMAIL=konto@stadtwerke-luebeck.de     # Konto zum API-Token
JIRA_API_TOKEN=…                            # Atlassian-API-Token (Jira Cloud)
JIRA_PROJECT_KEY=LUEM                        # Ziel-Projekt
JIRA_ISSUE_TYPE=Bug                          # Vorgangstyp (Standard: Bug)
JIRA_SET_PRIORITY=false                      # true → Schweregrad als Priorität
```

Solange nicht alle **vier Pflichtwerte** (`JIRA_BASE_URL`, `JIRA_EMAIL`,
`JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`) gesetzt sind, bleibt die Anbindung inaktiv
— es werden keine Tickets erzeugt. Ob sie aktiv ist, zeigt der Hinweis in der
Admin-Navigation.

Ein API-Token erzeugt man unter **id.atlassian.com → Sicherheit →
API-Token erstellen**. Der Token wird nur in der `.env` hinterlegt, nie im Code.

### Was im Ticket landet

- **Zusammenfassung:** `[LUEMOB-003] Kurzbeschreibung`
- **Beschreibung:** Fehler-ID, Schweregrad, Fundort, Beschreibung, Schritte zur
  Reproduktion, Erwartetes und Tatsächliches Verhalten, plus Rücklink ins Admin.
- **Beschriftungen:** `luemobil`, `hilfecenter`
- **Priorität** (nur wenn `JIRA_SET_PRIORITY=true`): hoch → High, mittel →
  Medium, niedrig → Low.

### Hinweis zu Pflichtfeldern und Priorität

Hat das Jira-Projekt eigene **Pflichtfelder** (z. B. „Komponente“) beim Anlegen,
lehnt Jira das Ticket ab (die Meldung steht im Server-Log). In dem Fall die
Pflichtfelder im Projekt optional stellen oder das Feld im Code ergänzen.
`JIRA_SET_PRIORITY` nur auf `true` setzen, wenn das Projekt das Feld „Priorität“
tatsächlich anbietet — sonst schlägt das Anlegen fehl.

Screenshots werden über die Schnittstelle **nicht** automatisch angehängt; dafür
den Direktlink im Ticket nutzen oder die Bilder manuell anhängen. (Der CSV-Weg
unten kann Bilder als Anhang mitgeben.)

---

## B) CSV-Export (Ausweichlösung)

Zwei Wege:

- **Aus dem Admin-Panel:** In der linken Navigation auf **„Ausweichlösung: Fehler
  als CSV exportieren“** klicken.
- **Direkt über die Adresse:**
  - Alle sichtbaren Fehler: `https://DEINE-DOMAIN/api/jira-export`
  - Nur ein Fehler: `…/api/jira-export?bugId=LUEMOB-003`
  - Nur ein Status: `…/api/jira-export?status=offen` (bzw. `gemeldet`, `behoben`)

Es wird die Datei `luemobil-fehler-jira.csv` heruntergeladen. Ausgeblendete
Fehler sind nicht enthalten.

**In Jira Cloud importieren** (Projekt-Admin oder System-Admin nötig):

1. Zahnrad oben rechts → **System** → unter „Import und Export“ → **Externes System importieren**.
   (Alternativ auf Projektebene: Projekteinstellungen → **Vorgänge importieren**.)
2. **CSV** wählen, die Datei `luemobil-fehler-jira.csv` hochladen, **Weiter**.
3. Ziel-Projekt auswählen; Zeichensatz **UTF-8** lassen (die Datei bringt die
   Kennung mit, damit Umlaute korrekt ankommen).
4. **Feldzuordnung (Mapping):** `Summary` → Zusammenfassung, `Issue Type` →
   Vorgangstyp, `Priority` → Priorität, `Labels` → Beschriftungen,
   `Description` → Beschreibung, `Attachment` → **Anhang** (beide
   Attachment-Spalten auf „Anhang“ mappen).
5. Import starten. Jira legt je Zeile einen **Bug** an und lädt die Screenshots
   von den angegebenen URLs als Anhang herunter.

Damit Jira die Bilder ziehen kann, müssen die **Bild-URLs für Jira erreichbar**
sein (nach dem Deployment unter der öffentlichen Domain gegeben). Beim lokalen
Testen kommt Jira Cloud nicht an die Bilder.
