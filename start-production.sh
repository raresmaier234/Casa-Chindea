#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Casa Chindea — Production start script
# Starts PocketBase as a background process, then Node.js backend
# Both run on the SAME Render server.
# ═══════════════════════════════════════════════════════════════

set -e

echo "🏡 Casa Chindea — Starting production services..."
echo "📅 $(date)"

# ── Start PocketBase ─────────────────────────────────────────
PB_DATA_DIR="/app/pb_data"
PB_BIN="/app/pocketbase_bin/pocketbase"
PB_MIGRATIONS_SRC="/app/pb_migrations_src"

# Ensure data directory exists
mkdir -p "$PB_DATA_DIR/pb_migrations"

# ── Diagnostic: check persistent disk ────────────────────────
echo "📊 Checking persistent disk at $PB_DATA_DIR..."
if [ -f "$PB_DATA_DIR/data.db" ]; then
    DB_SIZE=$(du -h "$PB_DATA_DIR/data.db" | cut -f1)
    echo "✅ Database exists: data.db ($DB_SIZE)"
else
    echo "⚠️  WARNING: No data.db found! This is a FRESH database."
    echo "   If this is NOT the first deploy, the persistent disk may not be mounted!"
fi
echo "📂 Disk contents: $(ls -la "$PB_DATA_DIR/" 2>/dev/null | head -20)"
echo "💾 Disk usage: $(df -h "$PB_DATA_DIR" 2>/dev/null | tail -1)"

# Sync migrations from Docker image to persistent disk
# This ensures new deploys always apply the latest migrations
if [ -d "$PB_MIGRATIONS_SRC" ]; then
    echo "📦 Syncing migrations to persistent disk..."
    cp -r "$PB_MIGRATIONS_SRC/"* "$PB_DATA_DIR/pb_migrations/" 2>/dev/null || true
    echo "✅ Migrations synced ($(ls "$PB_DATA_DIR/pb_migrations/" | wc -l | tr -d ' ') files)"
fi

echo "🗄️  Starting PocketBase (internal: http://127.0.0.1:8090)..."
$PB_BIN serve \
    --dir="$PB_DATA_DIR" \
    --http="127.0.0.1:8090" \
    --migrationsDir="$PB_DATA_DIR/pb_migrations" \
    &

PB_PID=$!
echo "✅ PocketBase started (PID: $PB_PID)"

# Wait for PocketBase to be ready
echo "⏳ Waiting for PocketBase to be ready..."
for i in $(seq 1 30); do
    if wget -q --spider "http://127.0.0.1:8090/api/health" 2>/dev/null; then
        echo "✅ PocketBase is ready!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "❌ PocketBase failed to start in 30 seconds"
        exit 1
    fi
    sleep 1
done

# ── Ensure superuser exists ──────────────────────────────────
# Create or update the PocketBase superuser so the backend can authenticate.
# Uses PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD (or POCKETBASE_ADMIN_*) env vars.
SU_EMAIL="${PB_ADMIN_EMAIL:-$POCKETBASE_ADMIN_EMAIL}"
SU_PASS="${PB_ADMIN_PASSWORD:-$POCKETBASE_ADMIN_PASSWORD}"

if [ -n "$SU_EMAIL" ] && [ -n "$SU_PASS" ]; then
    echo "🔑 Ensuring superuser exists: $SU_EMAIL"
    $PB_BIN superuser upsert "$SU_EMAIL" "$SU_PASS" \
        --dir="$PB_DATA_DIR" 2>&1 || \
    echo "⚠️  superuser upsert returned non-zero (may already exist — continuing)"
    echo "✅ Superuser ready"
else
    echo "⚠️  No PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD set — skipping superuser setup"
fi

# ── Start Node.js Backend ───────────────────────────────────
echo "🚀 Starting Node.js backend..."

# PocketBase is local — no network latency!
export POCKET_BASE_URL="http://127.0.0.1:8090"
export NODE_ENV="production"

# Monitor PocketBase — if it crashes, exit so Render restarts the container
(
    wait $PB_PID 2>/dev/null
    echo "❌ PocketBase exited unexpectedly! Shutting down..."
    kill $$ 2>/dev/null
) &

cd /app/backend
exec node index.js

