#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------
# Hyperledger Fabric 2.5 LTS fixed startup script
# ------------------------------------------------------------
# - Uses Docker Compose v2: docker compose
# - Provides docker-compose compatibility only inside this script
# - Pins Fabric images to 2.5 LTS
# - Pins Fabric CA image
# - Fixes Compose project name so volume/container names are stable
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
  echo
  echo "期待する配置:"
  echo "  workspace/"
  echo "    fabric-samples/"
  echo "    fabric-rental-node24-rest/"
  exit 1
fi

# Fabric 2.5 LTS 固定
export IMAGE_TAG="${IMAGE_TAG:-2.5.15}"
export CA_IMAGE_TAG="${CA_IMAGE_TAG:-1.5.17}"

# Compose v2 で project name が compose 等になると、
# Fabric test-network の cleanup 想定名とずれることがある。
# そのため test-network の慣例に合わせて docker に固定する。
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-docker}"

cd "${TEST_NETWORK_DIR}"

echo "Using Hyperledger Fabric image tag   : ${IMAGE_TAG}"
echo "Using Hyperledger Fabric CA image tag: ${CA_IMAGE_TAG}"
echo "Using Compose project name           : ${COMPOSE_PROJECT_NAME}"
echo

# 初回は以下のような no such volume が出ることがある。
#   docker_orderer.example.com
#   docker_peer0.org1.example.com
#   docker_peer0.org2.example.com
# これは down 時の cleanup 対象がまだ存在しないだけなので、致命的ではない。
./network.sh down

./network.sh up createChannel -ca

./network.sh deployCC \
  -ccn rental \
  -ccp "${PROJECT_DIR}/chaincode/rental-js" \
  -ccl javascript

echo
echo "Fabric test-network is ready."
echo "Channel name        : mychannel"
echo "Chaincode name      : rental"
echo "Fabric image tag    : ${IMAGE_TAG}"
echo "Fabric CA image tag : ${CA_IMAGE_TAG}"
echo "Compose project name: ${COMPOSE_PROJECT_NAME}"
