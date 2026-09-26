# Reporting-Anbindung (Geschäftszahlen im Cockpit)

Das Migrations-Cockpit zeigt zwei Blöcke, deren Zahlen nicht aus Keycloak
stammen, sondern aus der Reporting-Datenbank `lue_reporting` des Projekts
`luemobil_reporting`:

- **Ankommen im neuen System** — Aktivierungsquote, mit Konto, berechtigt ohne
  Konto, Berechtigte gesamt, neue Konten der letzten 7 Tage, Aktivierung je
  Segment, schwächste Postleitzahlen.
- **Tickets und Umsatz** — Verkäufe, Bruttoumsatz, Anteil erfolgreich
  ausgelieferter Tickets, abgebrochene Bestellungen, Verlauf über 30 Tage.

Ist die Verbindung nicht eingerichtet, zeigen beide Blöcke einen Hinweis. Alles
andere im Cockpit funktioniert unabhängig davon.

> **Wichtig:** Diese Zahlen sind Auswertung, nicht Wahrheit. Die
> Ticketberechtigung im Kundencheck kommt weiterhin aus dem hochgeladenen
> Patris-Export — das Reporting stammt aus einem Vorsystem, das Fehler enthalten
> kann.

---

## 1. Was gelesen wird — und was ausdrücklich nicht

Das Hilfecenter liest **nur vier aggregierte Views ohne Personenbezug**:

| View | Inhalt | Personenbezug |
|---|---|---|
| `rpt.aktivierung_segment` | Berechtigte/Aktivierte/Quote je Bestandssegment | nein |
| `rpt.aktivierung_plz` | dasselbe je Postleitzahl | nein (Anzeige erst ab 20 Berechtigten je Gebiet) |
| `rpt.tagesreihe` | je Tag: neue Konten, Bestellungen, Verkäufe, Abbrüche, Umsatz | nein |
| `rpt.trichter` | fünf Stufen vom Abo-Bestand bis zum störungsfreien Abo | nein |

**Gesperrt bleiben** `rpt.abo_berechtigung`, `rpt.kunde_360`, `rpt.bestellung`
und `rpt.bestellposition`: Sie enthalten E-Mail-Adressen, Namen, Geburtsdaten,
Postleitzahlen und Gerätemerkmale. Für das Cockpit werden sie nicht gebraucht —
und was nicht gebraucht wird, bekommt der Lese-Account auch nicht.

Die Postleitzahlen-Auswertung blendet Gebiete mit weniger als 20 Berechtigten
aus, damit sich aus einer kleinen Zelle keine einzelne Person ableiten lässt.

---

## 2. Lese-Account anlegen (auf dem Server)

Das folgende SQL legt eine Rolle an, die **nur lesen** darf und **nur diese vier
Views** sieht. Ausführen als Datenbank-Superuser auf dem Postgres-Container des
Reporting-Stacks:

```bash
docker compose exec -T postgres psql -U postgres -d lue_reporting <<'SQL'
-- 1. Rolle anlegen. Passwort vorher ersetzen (siehe Schritt 3).
CREATE ROLE hilfecenter_ro LOGIN PASSWORD 'HIER-EIN-LANGES-ZUFALLSPASSWORT';

-- 2. Nur lesen dürfen, nie schreiben.
ALTER ROLE hilfecenter_ro SET default_transaction_read_only = on;
ALTER ROLE hilfecenter_ro SET statement_timeout = '8s';

-- 3. Zugang zur Datenbank und zum Schema, aber nicht zu dessen Inhalt.
GRANT CONNECT ON DATABASE lue_reporting TO hilfecenter_ro;
GRANT USAGE ON SCHEMA rpt TO hilfecenter_ro;

-- 4. Leserecht ausschließlich auf die vier Views ohne Personenbezug.
GRANT SELECT ON rpt.aktivierung_segment TO hilfecenter_ro;
GRANT SELECT ON rpt.aktivierung_plz      TO hilfecenter_ro;
GRANT SELECT ON rpt.tagesreihe           TO hilfecenter_ro;
GRANT SELECT ON rpt.trichter             TO hilfecenter_ro;

-- 5. Sicherheitshalber: keine Rechte auf alles Übrige, auch nicht auf Neues.
REVOKE ALL ON ALL TABLES IN SCHEMA rpt FROM hilfecenter_ro;
GRANT SELECT ON rpt.aktivierung_segment, rpt.aktivierung_plz,
                rpt.tagesreihe, rpt.trichter TO hilfecenter_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA rpt REVOKE ALL ON TABLES FROM hilfecenter_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM hilfecenter_ro;
SQL
```

Ein langes Zufallspasswort erzeugen:

```bash
openssl rand -base64 30 | tr -d '\n/+=' | cut -c1-32
```

**Wichtig:** Die Views werden beim nächtlichen Neuaufbau teilweise mit
`DROP ... CASCADE` neu angelegt — dabei gehen die Rechte verloren. Deshalb muss
Schritt 4 nach jedem Neuaufbau erneut laufen. Am einfachsten hängt man ihn an
das Aufbau-Skript des Reporting-Stacks an.

Probe, dass die Sperre wirkt (muss einen Fehler geben):

```bash
docker compose exec -T postgres \
  psql -U hilfecenter_ro -d lue_reporting -c 'SELECT count(*) FROM rpt.kunde_360;'
# erwartet: FEHLER: keine Berechtigung für View kunde_360
```

---

## 3. Zugangsdaten im Hilfecenter hinterlegen

Beide Container liegen im selben Docker-Netz, der Verkehr verlässt den Host also
nicht. In der `.env` des Hilfecenters:

```env
REPORTING_DATABASE_URI=postgres://hilfecenter_ro:DAS-PASSWORT@postgres:5432/lue_reporting
```

Besser, weil die Zugangsdaten dann nicht in der Prozessumgebung stehen und sich
ohne Deployment austauschen lassen — als Datei:

```env
REPORTING_DATABASE_URI_FILE=/run/secrets/reporting-db-uri
```

Die Datei enthält nur die Verbindungszeichenfolge, ohne Zeilenumbruch am Ende:

```bash
printf 'postgres://hilfecenter_ro:DAS-PASSWORT@postgres:5432/lue_reporting' \
  > secrets/reporting-db-uri
chmod 600 secrets/reporting-db-uri
```

Danach `docker compose up -d app`. Die Ampel im Cockpit-Kopf zeigt „Reporting"
grün, sobald die Verbindung steht.

---

## 4. Verhalten im Betrieb

- Die Werte werden **10 Minuten zwischengespeichert**. Die Reporting-Datenbank
  wird ohnehin nur nachts neu aufgebaut.
- Jede Abfrage hat ein Zeitlimit von 8 Sekunden und läuft in einer
  schreibgeschützten Transaktion.
- Fällt das Reporting aus, zeigt das Cockpit in den beiden Blöcken einen
  Hinweis; alle anderen Zahlen bleiben unberührt. Zusätzlich springt die Ampel
  „Reporting" auf Rot und es geht eine Störungsmail raus.
- Die Zahl „neue Konten, 7 Tage" bezieht sich auf die letzten sieben Tage **mit
  Daten**, nicht auf die letzten sieben Kalendertage: Die Tagesreihe endet beim
  letzten Kauftag.

---

## 5. Datenschutz

Es werden keine personenbezogenen Daten übertragen. Das Cockpit liest nur
Summen und Quoten; der Lese-Account hat auf die Views mit Personendaten keine
Rechte. Die Abfragen werden nicht protokolliert, und die Verbindungszeichenfolge
erscheint weder im Log noch im Browser.

Siehe auch `docs/DATENSCHUTZ.md` und `docs/ABO-BERECHTIGUNGEN.md`.
