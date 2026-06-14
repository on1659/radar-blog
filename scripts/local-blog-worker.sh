#!/bin/sh
# Runs radar-blog locally as a generation worker: production server bound to a
# local port, connected to the prod DB (public URL) and the local claude-shim
# for AI. Started by the launchd service kr.radarlog.worker.app.
set -e
export PATH="/Users/radar/.local/bin:/Users/radar/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.."

ENV_FILE="$HOME/.config/radar-blog/worker.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

exec npx next start -p "${PORT:-3939}"
