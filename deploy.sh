#!/usr/bin/env bash
set -euo pipefail

KEY="/home/cviegas/Documents/Perso/.env/oracle.key"
HOST="ubuntu@158.178.211.196"
REMOTE_DIR="/home/ubuntu/PredictGodAI"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

# Flags
WITH_INSTALL=false
WITH_DEPLOY=false
FOLLOW_LOGS=false

for arg in "$@"; do
  case "$arg" in
    --install|-i) WITH_INSTALL=true ;;
    --deploy|-d)  WITH_DEPLOY=true ;;
    --logs|-l)    FOLLOW_LOGS=true ;;
    --full|-f)    WITH_INSTALL=true; WITH_DEPLOY=true ;;
    --help|-h)
      cat <<EOF
Usage: ./deploy.sh [options]

Options:
  -i, --install   Run \`npm install\` on the server (use after package.json changes)
  -d, --deploy    Run \`npm run deploy\` on the server (use after slash command changes)
  -f, --full      Equivalent to --install --deploy
  -l, --logs      Tail the bot logs after restarting
  -h, --help      Show this help

Default: rsync + restart only (fastest, for code-only changes).
EOF
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

echo "==> Syncing $LOCAL_DIR -> $HOST:$REMOTE_DIR"
rsync -av --delete \
  --exclude node_modules \
  --exclude data \
  --exclude .git \
  -e "ssh -i $KEY" \
  "$LOCAL_DIR/" "$HOST:$REMOTE_DIR/"

REMOTE_CMDS="cd $REMOTE_DIR"
$WITH_INSTALL && REMOTE_CMDS+=" && npm install --omit=dev"
$WITH_DEPLOY  && REMOTE_CMDS+=" && npm run deploy"
REMOTE_CMDS+=" && sudo systemctl restart predictgodai && sudo systemctl status predictgodai --no-pager | head -5"

echo "==> Running on server: $REMOTE_CMDS"
ssh -i "$KEY" "$HOST" "$REMOTE_CMDS"

if $FOLLOW_LOGS; then
  echo "==> Tailing logs (Ctrl+C to stop)"
  ssh -i "$KEY" "$HOST" "journalctl -u predictgodai -f"
fi
