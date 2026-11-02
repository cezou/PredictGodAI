#!/usr/bin/env bash
# Starts (or restarts) the local decision model used to validate predicts, on the server.
# Usage: ./scripts/setup-judge.sh [MODEL_FILE]   (run on the server, idempotent)
set -euo pipefail

BASE_DIR="${BASE_DIR:-$HOME/predictgodai}"
MODEL_FILE="${1:-gemma-3n-E4B-it-Q4_0.gguf}"
MODEL_REPO="${MODEL_REPO:-unsloth/gemma-3n-E4B-it-GGUF}"
IMAGE="ghcr.io/ggml-org/llama.cpp:server"

mkdir -p "$BASE_DIR/models"
if [ ! -f "$BASE_DIR/models/$MODEL_FILE" ]; then
  echo "==> Downloading $MODEL_REPO/$MODEL_FILE"
  curl -fL -o "$BASE_DIR/models/$MODEL_FILE.part" "https://huggingface.co/$MODEL_REPO/resolve/main/$MODEL_FILE"
  mv "$BASE_DIR/models/$MODEL_FILE.part" "$BASE_DIR/models/$MODEL_FILE"
fi

docker network create predictgod 2>/dev/null || true
docker pull "$IMAGE"
docker rm -f predictgod-judge 2>/dev/null || true

# 3 slots, one per cached system prompt: predict, counter (PredictGodAI) and rage (RageGodAI).
docker run -d --name predictgod-judge \
  --restart unless-stopped \
  --network predictgod \
  -v "$BASE_DIR/models:/models:ro" \
  "$IMAGE" \
  -m "/models/$MODEL_FILE" \
  --host 0.0.0.0 --port 8080 \
  -c 12288 --parallel 3 -t 4

echo "==> predictgod-judge started with $MODEL_FILE"
