# Datensicherung und Wiederherstellung

Gilt für die Produktion (VPS, Docker Compose). Alle Befehle im Projektordner
auf dem Server ausführen (z. B. `/opt/luemobil`).

## Was gesichert werden muss

| Was | Wo | Wie gesichert |
|---|---|---|
| Datenbank (Inhalte, Meldungen, Benutzer, Cockpit-Daten, Patris-Tickets, Hinweistexte) | Docker-Volume `<projekt>_pgdata` | `pg_dump` → `scripts/backup.sh` |
| Hochgeladene Bilder | Docker-Volume `<projekt>_media` | tar-Archiv → `scripts/backup.sh` |
| Konfiguration mit Secrets | `.env` | **separat**, verschlüsselt/Passwort-Tresor |
| Ticket-API-Token | `secrets/luemobil_api_token` | **separat**, Passwort-Tresor (lässt sich notfalls neu ausstellen) |
| Caddy-Konfiguration | `/etc/caddy/Caddyfile` | einmalig kopieren (Vorlage: `Caddyfile.example`) |
| Code | GitHub | nicht nötig |

`<projekt>` ist der Compose-Projektname, standardmäßig der Ordnername (bei
`/opt/luemobil` also `luemobil_pgdata`, `luemobil_media`). Prüfen mit
`docker volume ls`.

## Automatische Sicherung einrichten

Das Skript `scripts/backup.sh` sichert Datenbank und Medien nach
`/var/backups/luemobil` und löscht Sicherungen, die älter als 14 Tage sind.

```bash
cd /opt/luemobil
scripts/backup.sh                       # einmal von Hand testen
ls -l /var/backups/luemobil             # db_<datum>.sql.gz und media_<datum>.tar.gz
```

Täglich per Cron (`crontab -e`):

```cron
15 3 * * * cd /opt/luemobil && scripts/backup.sh >> /var/log/luemobil-backup.log 2>&1
```

Anpassbar über Umgebungsvariablen: `BACKUP_DIR` (Zielordner), `KEEP_DAYS`
(Aufbewahrung), `MEDIA_VOLUME` (falls der Volume-Name abweicht).

> **Sicherungen müssen den Server verlassen.** Eine Sicherung auf demselben
> VPS hilft nicht, wenn der Server ausfällt. Den Ordner regelmäßig auf ein
> anderes System kopieren, z. B. per `rsync` auf einen Backup-Speicher des
> Hosters. **[offen: Ziel für die externe Sicherung festlegen]**

Die Dumps enthalten personenbezogene Daten (siehe `docs/DATENSCHUTZ.md`). Der
Ordner ist nur für root lesbar (`chmod 700`); extern nur verschlüsselt ablegen.

## Wiederherstellen

### Datenbank

```bash
cd /opt/luemobil
docker compose stop app                                   # App anhalten
docker compose exec postgres dropdb -U luemobil --force luemobil
docker compose exec postgres createdb -U luemobil luemobil
gunzip -c /var/backups/luemobil/db_<DATUM>.sql.gz \
  | docker compose exec -T postgres psql -U luemobil -d luemobil -v ON_ERROR_STOP=1 -q
docker compose start app
docker compose logs -f app                                # Start + Migrationen prüfen
```

Stammt die Sicherung von einem älteren Code-Stand, spielt die App beim Start
fehlende Migrationen automatisch nach.

### Medien

```bash
docker run --rm -v luemobil_media:/data -v /var/backups/luemobil:/backup:ro alpine \
  sh -c 'rm -rf /data/* && tar xzf /backup/media_<DATUM>.tar.gz -C /data'
```

### Kompletter Neuaufbau (neuer Server)

1. Server nach `LIVE-GEHEN.md` Schritt 1–4 vorbereiten, Repo klonen.
2. `.env` und `secrets/` aus dem Tresor wiederherstellen.
3. `SEED_ON_INIT=false` in die `.env` setzen (sonst importiert der Erststart die
   Legacy-Inhalte in die leere Datenbank).
4. Nur die Datenbank starten: `docker compose up -d postgres`
5. Datenbank und Medien wie oben einspielen (die App ist noch nicht gestartet).
6. `docker compose up -d --build`, Caddy einrichten (`LIVE-GEHEN.md` Schritt 7),
   Cron-Jobs wieder eintragen (`LIVE-GEHEN.md` 9d und oben).
7. Server-IP ggf. beim Ticket-API-Betreiber und in Keycloak-Redirect-URIs anpassen.

## Wiederherstellung testen

Mindestens einmal pro Quartal und nach größeren Updates prüfen, ob sich eine
Sicherung einspielen lässt — ohne die Produktion anzufassen:

```bash
docker run -d --rm --name restore-test -e POSTGRES_USER=luemobil \
  -e POSTGRES_DB=luemobil -e POSTGRES_PASSWORD=test postgres:17-alpine
sleep 10
gunzip -c /var/backups/luemobil/db_<DATUM>.sql.gz \
  | docker exec -i restore-test psql -U luemobil -d luemobil -v ON_ERROR_STOP=1 -q
docker exec restore-test psql -U luemobil -d luemobil -c \
  "select (select count(*) from articles) artikel, (select count(*) from patris_entitlements) patris"
docker stop restore-test
```

Erwartet: Befehle ohne Fehler, plausible Zahlen. Ergebnis mit Datum notieren.

Der hier beschriebene Ablauf (Dump, Neuanlage, Einspielen, Medien-Archiv) wurde
am 22.09.2026 gegen `postgres:17-alpine` getestet.
