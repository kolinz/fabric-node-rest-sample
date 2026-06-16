#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Hyperledger Fabric test-network stop script
# ------------------------------------------------------------
# - Uses Docker Compose v2: docker compose
# - Provides docker-compose compatibility only inside this script
# - Pins Fabric image tags
# - Fixes Compose project name so cleanup targets are stable
# ------------------------------------------------------------

if ! command -v docker-compose >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker-compose() {
      docker compose "$@"
    }
    export -f docker-compose
  else
    echo "ERROR: docker compose が利用できません。"
    echo "Docker Desktop の WSL Integration を確認してください。"
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEST_NETWORK_DIR="${PROJECT_DIR}/../fabric-samples/test-network"

if [ ! -d "${TEST_NETWORK_DIR}" ]; then
  echo "ERROR: fabric-samples/test-network が見つかりません。"
  echo "このプロジェクトを fabric-samples と同じ階層に配置してください。"
  exit 1
fi

export IMAGE_TAG="${IMAGE_TAG:-2.5.15}"
export CA_IMAGE_TAG="${CA_IMAGE_TAG:-1.5.17}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-docker}"

cd "${TEST_NETWORK_DIR}"

echo "Stopping Fabric test-network..."
echo "Fabric image tag    : ${IMAGE_TAG}"
echo "Fabric CA image tag : ${CA_IMAGE_TAG}"
echo "Compose project name: ${COMPOSE_PROJECT_NAME}"
echo

# 初回や不完全停止後は no such volume が出ることがあるが、
# これは削除対象が既に存在しないという意味で、通常は無視できる。
./network.sh down

echo
echo "Fabric test-network stopped."
