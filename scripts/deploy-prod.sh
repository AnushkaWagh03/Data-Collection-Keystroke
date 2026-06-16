#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy .env.production.example and fill secrets first."
  exit 1
fi

cd "${ROOT_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build --pull
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "Deployment complete."
