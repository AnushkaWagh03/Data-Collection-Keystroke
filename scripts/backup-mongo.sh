#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
ARCHIVE_PATH="${BACKUP_DIR}/mongo-${TIMESTAMP}.archive.gz"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example and fill secrets first."
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T mongo \
  sh -c 'mongodump \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --archive \
  --gzip' > "${ARCHIVE_PATH}"

echo "Backup written to ${ARCHIVE_PATH}"
