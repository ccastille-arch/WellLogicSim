# WellLogic

WellLogic uses PostgreSQL as the source of truth for users, sessions, roles, settings, quotes, and activity.

## Persistent storage

The app now supports a writable data directory for Railway volumes and local backups.

- Production default: `/data`
- Override with: `DATA_DIR=/your/mount/path`
- Railway volume env fallback: `RAILWAY_VOLUME_MOUNT_PATH`

When storage is writable, the server will:

- create `backups/` and `uploads/` under the data directory
- write a JSON backup snapshot on startup
- keep scheduled backups every `BACKUP_INTERVAL_MINUTES` minutes
- retain the newest `BACKUP_RETENTION` backup files

Useful env vars:

- `DATA_DIR=/data`
- `BACKUP_INTERVAL_MINUTES=360`
- `BACKUP_RETENTION=20`

## Railway volume setup

1. In Railway, open the `WellLogicSim` service.
2. Add a Volume.
3. Mount it at `/data`.
4. Redeploy.

After deploy, check:

- `GET /api/health`
- `GET /api/storage/status` with an authenticated admin/settings-capable user

You can also trigger a manual snapshot with:

- `POST /api/storage/backup`

That endpoint requires the `manage:settings` permission.
