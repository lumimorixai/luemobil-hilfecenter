#!/usr/bin/env bash
# Datensicherung LüMobil Hilfecenter (Produktion, Docker Compose).
# Sichert die PostgreSQL-Datenbank und das Medien-Volume nach $BACKUP_DIR und
# löscht Sicherungen, die älter als $KEEP_DAYS Tage sind.
#
# Aufruf im Projektordner (z. B. /opt/luemobil):
#   scripts/backup.sh
# Per Cron täglich um 3:15 Uhr (crontab -e):
#   15 3 * * * cd /opt/luemobil && scripts/backup.sh >> /var/log/luemobil-backup.log 2>&1
#
# Wiederherstellen: siehe docs/BACKUP-RESTORE.md
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/luemobil}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%F_%H%M)"

cd "$(dirname "$0")/.."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Name des Medien-Volumes: <Compose-Projekt>_media. Das Projekt steht als Label
# am laufenden Postgres-Container (Standard = Ordnername).
PG_CONTAINER="$(docker compose ps -q postgres)"
if [ -z "$PG_CONTAINER" ]; then
  echo "Postgres-Container läuft nicht (docker compose ps)." >&2
  exit 1
fi
PROJECT="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$PG_CONTAINER")"
MEDIA_VOLUME="${MEDIA_VOLUME:-${PROJECT}_media}"

echo "[$(date '+%F %T')] Backup startet ($STAMP)"

# 1. Datenbank (mit DROP-Anweisungen, damit sich der Dump sauber einspielen lässt)
docker compose exec -T postgres \
  pg_dump -U luemobil -d luemobil --clean --if-exists --no-owner \
  | gzip > "$BACKUP_DIR/db_$STAMP.sql.gz"

# 2. Medien-Volume (hochgeladene Bilder)
docker run --rm \
  -v "$MEDIA_VOLUME":/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/media_$STAMP.tar.gz" -C /data .

chmod 600 "$BACKUP_DIR"/*_"$STAMP".*

# 3. Alte Sicherungen entfernen
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db_*.sql.gz' -o -name 'media_*.tar.gz' \) \
  -mtime +"$KEEP_DAYS" -delete

echo "[$(date '+%F %T')] Backup fertig: $(du -h "$BACKUP_DIR/db_$STAMP.sql.gz" | cut -f1) DB, $(du -h "$BACKUP_DIR/media_$STAMP.tar.gz" | cut -f1) Medien"
