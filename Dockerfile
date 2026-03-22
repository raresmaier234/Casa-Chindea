# ═══════════════════════════════════════════════════════════════
# Casa Chindea — Unified Dockerfile
# Runs PocketBase + Node.js backend on ONE Render server
# ═══════════════════════════════════════════════════════════════

FROM node:20-alpine

# Install tools needed for PocketBase
RUN apk add --no-cache wget unzip ca-certificates bash

WORKDIR /app

# ── Download PocketBase (Linux AMD64) ────────────────────────
ARG PB_VERSION=0.25.9
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip "pocketbase_${PB_VERSION}_linux_amd64.zip" -d /app/pocketbase_bin \
    && rm "pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && chmod +x /app/pocketbase_bin/pocketbase

# ── Copy PocketBase migrations to a SOURCE dir ──────────────
# /app/pb_data will be a Render disk mount (persistent storage)
# so we copy migrations to a separate dir, then sync at startup
COPY api/pb_migrations /app/pb_migrations_src

# ── Install Node.js backend dependencies ─────────────────────
COPY backend/package.json backend/package-lock.json* /app/backend/
RUN cd /app/backend && npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ── Copy backend source ─────────────────────────────────────
COPY backend/ /app/backend/

# ── Environment: Render injects env vars at runtime, no .env needed ──
# Create empty .env so dotenv.config() doesn't warn
RUN touch /app/.env

# ── Copy start script ───────────────────────────────────────
COPY start-production.sh /app/start-production.sh
RUN chmod +x /app/start-production.sh

# ── Create data directory with proper permissions ────────────
RUN mkdir -p /app/pb_data /app/backend/uploads

# PocketBase exposes 8090 internally, Node.js exposes PORT (10000 on Render)
EXPOSE 10000

CMD ["/app/start-production.sh"]

