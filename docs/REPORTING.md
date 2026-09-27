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
Views** sieht.

**Wo ausführen:** Der Reporting-Stack hat keinen eigenen PostgreSQL — er nutzt
den Container des Hilfecenters mit. Der Befehl läuft deshalb in
`/opt/luemobil`, und der Datenbank-Benutzer heißt `luemobil`, nicht `postgres`.

```bash
cd /opt/luemobil
docker compose exec -T postgres psql -U luemobil -d lue_reporting <<'SQL'
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
cd /opt/luemobil
docker compose exec -T postgres psql -U luemobil -d lue_reporting -c \
  'SET ROLE hilfecenter_ro; SELECT count(*) FROM rpt.kunde_360;'
# erwartet: FEHLER: keine Berechtigung für View kunde_360
```

Über `SET ROLE` statt direktem Login, weil der neue Benutzer über den
Unix-Socket im Container kein Passwort-Login hat.

---

## 3. Zugangsdaten im Hilfecenter hinterlegen

Beide Stacks teilen sich denselben PostgreSQL-Container, der Verkehr verlässt
den Host also nicht — der Hostname `postgres` stimmt unverändert. In der `.env`
des Hilfecenters:

```env
REPORTING_DATABASE_URI=postgres://hilfecenter_ro:DAS-PASSWORT@postgres:5432/lue_reporting
```

Besser, weil die Zugangsdaten dann nicht in der Prozessumgebung stehen und sich
ohne Deployment austauschen lassen — als Datei. Das Compose erwartet sie
standardmäßig unter `/run/secrets/app/reporting_db_uri`; dorthin wird der Ordner
`./secrets` gemountet. Es genügt also, die Datei anzulegen:

```bash
cd /opt/luemobil
printf 'postgres://hilfecenter_ro:DAS-PASSWORT@postgres:5432/lue_reporting' \
  > secrets/reporting_db_uri

# Der Container läuft als Benutzer „nextjs", nicht als root. Ohne diesen
# Schritt kann er die Datei nicht lesen und meldet „nicht hinterlegt".
sudo chown "$(docker compose exec -T app id -u):$(docker compose exec -T app id -g)" \
  secrets/reporting_db_uri
chmod 600 secrets/reporting_db_uri
```

Prüfen, dass der Container sie wirklich lesen kann:

```bash
docker compose exec -T app sh -lc \
  'cat /run/secrets/app/reporting_db_uri | sed "s/:[^:@]*@/:***@/"'
```

Zeigt die Zeichenfolge mit maskiertem Passwort. Kommt „No such file" oder
„Permission denied", stimmen Pfad oder Rechte nicht. Ein Neustart ist nicht
nötig — die Datei wird bei jedem Aufruf frisch gelesen.

Ein Eintrag in der `.env` ist dann nicht nötig — der Pfad steht als Vorgabewert
im Compose. Abweichender Ort: `REPORTING_DATABASE_URI_FILE` in der `.env` setzen.

Danach `docker compose up -d app`. Die Ampel im Cockpit-Kopf zeigt „Reporting"
grün, sobald die Verbindung steht.

---

## 3a. Wenn es nicht geht

Im Cockpit steht nur, *dass* es nicht geht. Den Grund nennt das Log:

```bash
cd /opt/luemobil
docker compose logs --tail=200 app | grep reporting
```

Direkt nachstellen, genau wie das Cockpit es tut:

```bash
docker compose exec -T app node -e "
const fs=require('fs');const {Client}=require('pg');
const c=new Client({connectionString:fs.readFileSync('/run/secrets/app/reporting_db_uri','utf8').trim()});
c.connect()
 .then(()=>c.query('select sum(berechtigte) from rpt.aktivierung_segment'))
 .then(r=>console.log('OK:',JSON.stringify(r.rows)))
 .catch(e=>console.log('FEHLER:',e.code||'-','|',e.message))
 .finally(()=>process.exit(0));
"
```

| Meldung | Ursache |
|---|---|
| `28P01 password authentication failed` | Passwort in der Datei und in der Rolle weichen ab |
| `3D000 database … does not exist` | Datenbankname falsch |
| `ENOTFOUND` / `ECONNREFUSED` | Host `postgres` nicht erreichbar |
| `42501 permission denied for view …` | ein GRANT fehlt (nach nächtlichem View-Aufbau) |
| `EACCES` beim Lesen der Datei | Eigentümer/Rechte — siehe Schritt 3 |

Passwort sicher an beiden Stellen gleich setzen:

```bash
cd /opt/luemobil
NEU=$(openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | cut -c1-32)
docker compose exec -T postgres psql -U luemobil -d lue_reporting \
  -c "ALTER ROLE hilfecenter_ro PASSWORD '$NEU'"
printf 'postgres://hilfecenter_ro:%s@postgres:5432/lue_reporting' "$NEU" \
  > secrets/reporting_db_uri
sudo chown "$(docker compose exec -T app id -u):$(docker compose exec -T app id -g)" \
  secrets/reporting_db_uri
chmod 600 secrets/reporting_db_uri
unset NEU
```

Ein Passwort ohne Sonderzeichen, aus derselben Variablen an beiden Stellen —
so können die Werte nicht auseinanderlaufen.

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
