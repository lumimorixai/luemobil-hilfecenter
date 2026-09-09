# LüMobil Hilfecenter live schalten (eigener Server / VPS)

Diese Anleitung bringt die Seite auf einem eigenen Linux-Server (VPS) ins Netz —
mit Datenbank, automatischem Inhaltsimport und HTTPS. Du brauchst dafür keinen
Entwickler-Alltag, aber etwas Zeit und den Mut, ein paar Befehle im Terminal
einzugeben.

Geplant sind rund **45–60 Minuten**.

---

## Was ist ein VPS — und warum?

Ein **VPS** (Virtual Private Server) ist ein gemieteter Rechner im Rechenzentrum,
auf dem deine Seite rund um die Uhr läuft. Du bekommst eine **IP-Adresse** und
SSH-Zugang. Anders als bei einem fertigen Baukasten hast du volle Kontrolle —
ideal, weil die Daten so auf einem Server deiner Wahl (z. B. in Deutschland,
DSGVO-freundlich) bleiben.

Die App läuft dort in **Docker-Containern**: einer für die Anwendung (Next.js +
Payload), einer für die **PostgreSQL-Datenbank**. Davor sitzt **Caddy** als
Vermittler, der automatisch ein gültiges HTTPS-Zertifikat besorgt.

---

## 0. Was du brauchst

- Einen VPS mit **Ubuntu 24.04** (Empfehlung: 2 vCPU, 4 GB RAM — reicht locker;
  Anbieter z. B. Hetzner Cloud, IONOS, netcup. Hetzner-Standort Nürnberg/
  Falkenstein liegt in Deutschland).
- Deine **Domain** (hast du) und Zugang zu deren **DNS-Einstellungen**.
- Das Projekt als Ordner (hast du: `luemobil-hilfecenter`).
- Ein Terminal auf deinem Mac.

Beim Bestellen des VPS hinterlegst du am besten deinen **SSH-Public-Key** — dann
kommst du ohne Passwort auf den Server. Der Anbieter zeigt dir danach die
**IP-Adresse** des Servers (z. B. `203.0.113.10`).

---

## 1. Domain auf den Server zeigen (DNS)

Noch bevor der Server fertig ist, kannst du das eintragen — DNS braucht etwas Zeit.

Bei deinem Domain-Anbieter einen **A-Record** anlegen:

| Typ | Name (Host)        | Wert (Ziel)        |
|-----|--------------------|--------------------|
| A   | `hilfe` (Subdomain)| `203.0.113.10` (deine Server-IP) |

Damit zeigt `hilfe.deine-domain.de` auf den Server. (Willst du die Hauptdomain
nutzen, ist der Name `@`.) Prüfen kannst du es später mit `ping hilfe.deine-domain.de`.

---

## 2. Auf den Server verbinden

Im Terminal (die IP durch deine ersetzen):

```bash
ssh root@203.0.113.10
```

Beim ersten Mal einmal mit `yes` bestätigen.

---

## 3. Grundausstattung installieren (Docker + Caddy)

Alles als eine Blockfolge auf dem Server einfügen:

```bash
# System aktualisieren
apt update && apt upgrade -y

# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# Caddy (Reverse Proxy mit automatischem HTTPS)
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Firewall: nur SSH und Web zulassen
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

---

## 4. Projekt auf den Server bringen

Am einfachsten über Git. Falls dein Projekt in einem Git-Repo liegt (z. B. auf
GitHub), auf dem Server:

```bash
cd /opt
git clone DEINE-REPO-URL luemobil
cd luemobil
```

**Ohne Git** kannst du den Ordner auch direkt von deinem Mac hochladen (auf dem
**Mac**, nicht auf dem Server ausführen, `node_modules` vorher ausschließen):

```bash
rsync -av --exclude node_modules --exclude .next --exclude '*.db' \
  ~/Documents/LüMobil_WebApp/luemobil-hilfecenter/ root@203.0.113.10:/opt/luemobil/
```

---

## 5. Konfiguration (.env) anlegen

Auf dem Server im Projektordner:

```bash
cd /opt/luemobil
cp .env.example .env
nano .env
```

Diese Werte setzen (Platzhalter ersetzen):

```
POSTGRES_PASSWORD=<langes-zufalls-passwort>
PAYLOAD_SECRET=<32-zeichen-zufall>
NEXT_PUBLIC_SERVER_URL=https://hilfe.deine-domain.de
ADMIN_EMAIL=jan.hedtfeld@lumimorix.de
ADMIN_PASSWORD=<dein-admin-passwort>
```

Zwei sichere Zufallswerte erzeugst du auf dem Server so:

```bash
openssl rand -hex 32   # für PAYLOAD_SECRET
openssl rand -hex 24   # für POSTGRES_PASSWORD
```

Speichern in nano: `Strg+O`, `Enter`, dann `Strg+X`.

> Wichtig: `DATABASE_URI` steht in der `.env.example` noch auf SQLite. Für den
> Server-Betrieb wird es von `docker-compose.yml` automatisch auf die
> PostgreSQL-Datenbank gesetzt — du musst dort nichts ändern.

---

## 6. Starten

```bash
docker compose up -d --build
```

Beim ersten Start passiert automatisch dreierlei: das Anwendungs-Image wird
gebaut, die Datenbank hochgefahren und — weil `SEED_ON_INIT` aktiv ist — die
**Inhalte samt Screenshots automatisch importiert** (5 Artikel, 7 FAQ-Gruppen,
10 Handbuch-Kapitel, 15 Fehler, 5 Fragen-Gruppen). Das kann ein paar Minuten
dauern.

Fortschritt/Logs ansehen:

```bash
docker compose logs -f app
```

Wenn dort „Seed abgeschlossen … (Zähl-Check ok)" steht, ist der Import fertig.
Mit `Strg+C` verlässt du die Log-Ansicht (die Container laufen weiter).

---

## 7. HTTPS über Caddy einrichten

Die mitgelieferte Vorlage kopieren und die Domain eintragen:

```bash
cp /opt/luemobil/Caddyfile.example /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile
```

In der Datei `hilfe.example.de` durch **deine** Domain ersetzen, speichern,
dann Caddy neu laden:

```bash
systemctl reload caddy
```

Caddy besorgt jetzt automatisch ein Let's-Encrypt-Zertifikat (Voraussetzung:
der A-Record aus Schritt 1 ist aktiv). Nach ein paar Sekunden ist die Seite
unter **https://hilfe.deine-domain.de** erreichbar — das Admin-Panel unter
**/admin**.

---

## 8. Fertig — einloggen und prüfen

- Öffentliche Seite: `https://hilfe.deine-domain.de`
- Redaktion: `https://hilfe.deine-domain.de/admin` (Login mit `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` aus deiner `.env`)

Tipp: Ändere das Admin-Passwort nach dem ersten Login im Profil, falls du es in
der `.env` einfach gehalten hast.

---

## 9. Migrations-Cockpit aktivieren (interner Bereich)

Das **Migrations-Cockpit** (`/cockpit`) ist ein interner Monitoring-Bereich für
den Support: Kundencheck, Login-/Fehler-Kennzahlen, neue Nutzer, Verfügbarkeit
sowie automatische Störungs-Benachrichtigungen und grafische Reports (Mail +
PDF). Die öffentliche Hilfe-Center-Seite bleibt frei zugänglich — nur `/cockpit`
und `/kundencheck` liegen hinter dem **Keycloak-Login** mit der Rolle `support`.

> Ohne die folgenden Werte startet die Seite trotzdem normal; nur der interne
> Cockpit-Bereich bleibt inaktiv. Du kannst diesen Abschnitt also auch später
> nachziehen.

### 9a. Zwei Zufalls-Secrets erzeugen

Auf dem Server (Werte **nicht** notieren müssen — sie kommen direkt in die `.env`):

```bash
openssl rand -hex 32   # für SESSION_SECRET
openssl rand -hex 32   # für CRON_SECRET
```

### 9b. `.env` ergänzen

In `/opt/luemobil/.env` diese Zeilen hinzufügen und die `<Platzhalter>` durch
deine Werte ersetzen (Passwörter/Secrets **nur** hier auf dem Server, nie ins
Git). `DOMAIN` = deine echte Adresse, z. B. `https://hilfe.deine-domain.de`.

```
# Cockpit gegen echtes Keycloak statt Demo-Daten
COCKPIT_MOCK=false
COCKPIT_ENV=live

# Öffentliche Seite bleibt frei; /cockpit ist immer Keycloak-geschützt
SITE_KEYCLOAK_AUTH=false

# Basis-URLs (beide auf die echte Domain)
NEXT_PUBLIC_SERVER_URL=<DOMAIN>
APP_BASE_URL=<DOMAIN>

# Keycloak: Host + Realms
KEYCLOAK_URL=<https://auth.deine-domain.de>
KEYCLOAK_REALM=mpluebeck          # Kunden-Realm (Datenquelle)
KEYCLOAK_AUTH_REALM=swl-intern    # Mitarbeiter-Realm (Login)
COCKPIT_SUPPORT_ROLE=support

# Login-Client (im Mitarbeiter-Realm)
OIDC_CLIENT_ID=<login-client>
OIDC_CLIENT_SECRET=<geheim>

# Service-Account-Client (im Kunden-Realm) für Users/Events
COCKPIT_CLIENT_ID=<service-client>
COCKPIT_CLIENT_SECRET=<geheim>

# Synthetischer Testkunde für die Login-Ampel (optional)
SYNTH_LOGIN_USER=<test-kunde>
SYNTH_LOGIN_PASSWORD=<geheim>

# Migrationsfortschritt: Gesamtkundenzahl als Nenner
COCKPIT_KUNDEN_GESAMT=<zahl>

# Störungs-Benachrichtigung UND Reports gehen an diese Adresse
ALERT_EMAIL=<team@deine-domain.de>
ALERT_FAIL_THRESHOLD=2

# Sitzungs- und Cron-Secrets aus Schritt 9a
SESSION_SECRET=<openssl-wert-1>
CRON_SECRET=<openssl-wert-2>
```

Voraussetzung für E-Mail/Report-Versand ist ein konfigurierter SMTP-Zugang
(`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — siehe Abschnitt E-Mail in `.env.example`).

Danach neu bauen; die Datenbank-Migrationen (u. a. die Verfügbarkeits-Historie)
laufen **automatisch** beim Start:

```bash
docker compose up -d --build
docker compose logs -f app
```

### 9c. Keycloak einrichten (einmalig, nur Konfiguration)

Im Keycloak-Admin:

- **Login-Client** (Realm `swl-intern`): gültige **Redirect-URI**
  `<DOMAIN>/api/auth/callback` und Post-Logout-URL `<DOMAIN>/` eintragen.
- **Service-Account-Client** (Realm `mpluebeck`): unter *Service account roles*
  die `realm-management`-Rollen **`view-users`** und **`view-events`** zuweisen.
- **Rolle `support`** den berechtigten Mitarbeitenden geben (nur sie sehen das
  Cockpit).
- **Events aktivieren** (Realm-Settings → Events): Login-, Register-, Passwort-
  und Verify-Events einschalten, damit die Kennzahlen Daten haben.
- **Login-Theme** (optional, SWL-Optik): den Ordner `keycloak-theme/swl` bzw.
  das gebaute JAR in den Keycloak-`providers`-/`themes`-Ordner legen und im
  Realm `swl-intern` unter *Realm settings → Themes → Login theme* `swl` wählen.
  Andere Realms bleiben unberührt.

### 9d. Automatische Jobs per Cron (Host)

Im Produktions-Image laufen die Jobs **nicht** als Kommandozeilen-Skript,
sondern als abgesicherter HTTP-Endpunkt, den der Server-Cron per `curl`
anstößt. `crontab -e` öffnen und einfügen (`DOMAIN` und Secret ersetzen):

```cron
SEC=<CRON_SECRET>
* * * * *  curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=health"    >/dev/null
* * * * *  curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=aggregate" >/dev/null
0 * * * *  curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=report&period=hour"  >/dev/null
30 6 * * * curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=report&period=day"   >/dev/null
30 6 * * 1 curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=report&period=week"  >/dev/null
30 6 1 * * curl -fsS -X POST -H "x-cron-secret: $SEC" "<DOMAIN>/api/cockpit/cron?job=report&period=month" >/dev/null
```

- `job=health` — prüft Keycloak/Login/Datenbank, füllt die Verfügbarkeits-
  Historie und mailt Störungen/Entwarnungen an `ALERT_EMAIL`.
- `job=aggregate` — hält die 14-Tage-Zeitreihe aktuell.
- `job=report&period=…` — verschickt den grafischen Report (Mail + PDF).

Die Reports lassen sich außerdem jederzeit **manuell** über die Buttons im
Cockpit auslösen.

### 9e. Prüfen

- Öffentliche Seite lädt normal unter `<DOMAIN>`.
- „Intern anmelden" (Kopf-/Fußzeile) führt zum Keycloak-Login; nach Anmeldung
  mit `support`-Rolle erscheint `/cockpit`.
- Cron-Endpunkt testen:
  ```bash
  curl -i -X POST -H "x-cron-secret: <CRON_SECRET>" "<DOMAIN>/api/cockpit/cron?job=health"
  ```
  Erwartet: `{"ok":true,...}`. `401` = falsches Secret, `503` = `CRON_SECRET`
  fehlt in der `.env`.
- Report-Button im Cockpit auslösen → Mail mit PDF-Anhang trifft bei
  `ALERT_EMAIL` ein.

---

## Später: Updates einspielen

Wenn du Änderungen am Projekt gemacht hast (neuer Code), auf dem Server:

```bash
cd /opt/luemobil
git pull            # oder erneut per rsync hochladen
docker compose up -d --build
```

Die Inhalte in der Datenbank bleiben dabei erhalten (der Auto-Import überspringt
eine bereits gefüllte Datenbank).

---

## Datensicherung (empfohlen)

Datenbank sichern:

```bash
docker compose exec postgres pg_dump -U luemobil luemobil > backup-$(date +%F).sql
```

Die hochgeladenen Bilder liegen im Docker-Volume `media`. Für ein automatisches
tägliches Backup kann man beides in einen Cronjob packen — sag Bescheid, dann
richte ich dir das Skript ein.

---

## Wenn etwas klemmt

- **Seite nicht erreichbar / kein HTTPS:** Zeigt der A-Record wirklich auf die
  Server-IP? `ping hilfe.deine-domain.de` muss die IP zeigen. Caddy-Logs:
  `journalctl -u caddy -n 50`.
- **App startet nicht:** `docker compose logs app` ansehen. Häufig ein Tippfehler
  in der `.env`.
- **Screenshots im Jira-Export fehlen:** Erst nach dem Livegang funktioniert der
  Bildabruf (siehe `JIRA-EXPORT.md`) — dann sind die Bild-URLs öffentlich.

Bei Fragen zu einem konkreten Schritt: melde dich, ich gehe ihn mit dir durch.
```
