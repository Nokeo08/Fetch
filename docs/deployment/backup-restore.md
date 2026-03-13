# Backup and Restore

Fetch stores all data in a single SQLite database file. There are two approaches to backup and restore.

## Method 1: In-App Export/Import

### Export

1. Open Fetch and go to Settings
2. Choose Export
3. Select which data to include:
   - Lists (with sections and items)
   - Templates (with items)
   - Item history
4. Download the JSON file

### Import

1. Open Fetch on the new or restored instance
2. Go to Settings and choose Import
3. Select the JSON file (max 10 MB)
4. Preview the import to check for conflicts
5. Choose import mode:
   - **Merge**: Adds imported data alongside existing data. Skips duplicates by name.
   - **Replace**: Deletes existing data in selected categories before importing.
6. Select which categories to import
7. Confirm the import

### Limitations

- Export/import is JSON-based, not a raw database copy
- Metadata like sort orders, session data, and rate limits are not included
- Item IDs may change on import

## Method 2: SQLite File Copy

For a complete backup, copy the SQLite database file directly.

### Backup

```bash
# Docker with named volume
docker compose exec fetch cp /data/fetch.db /data/fetch.db.backup
docker cp fetch:/data/fetch.db.backup ./fetch-backup-$(date +%Y%m%d).db

# Docker with bind mount
cp /path/on/host/fetch.db ./fetch-backup-$(date +%Y%m%d).db

# Direct installation
cp ./data/fetch.db ./fetch-backup-$(date +%Y%m%d).db
```

It is safest to stop the server before copying to avoid a mid-write copy:

```bash
docker compose stop fetch
cp /path/to/fetch.db ./backup.db
docker compose start fetch
```

Alternatively, use SQLite's `.backup` command for a safe online backup:

```bash
sqlite3 /path/to/fetch.db ".backup '/path/to/backup.db'"
```

### Restore

```bash
# Stop the server
docker compose stop fetch

# Replace the database
docker cp ./backup.db fetch:/data/fetch.db

# Start the server (migrations run automatically on startup)
docker compose start fetch
```

## Automated Backups

### Cron Job

Create a daily backup with a cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM, keep last 7 days
0 2 * * * docker compose -f /path/to/fetch/compose.yaml exec -T fetch cp /data/fetch.db /data/fetch-$(date +\%Y\%m\%d).db && find /path/to/backups -name "fetch-*.db" -mtime +7 -delete
```

### Script

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
CONTAINER="fetch"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
docker cp "$CONTAINER:/data/fetch.db" "$BACKUP_DIR/fetch-$DATE.db"

# Keep last 7 days
find "$BACKUP_DIR" -name "fetch-*.db" -mtime +7 -delete

echo "Backup created: $BACKUP_DIR/fetch-$DATE.db"
```

## Migration Between Servers

1. **Export** data from the source instance (Settings > Export), or copy the SQLite file
2. **Set up** Fetch on the new server
3. **Import** the data (Settings > Import) or copy the database file to the new server's data directory
4. **Verify** the data is intact by browsing lists and items
