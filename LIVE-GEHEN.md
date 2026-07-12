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
