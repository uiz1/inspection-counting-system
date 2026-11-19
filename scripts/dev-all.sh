#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/dev-backend.sh" &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null || true' EXIT

sleep 1
"$ROOT/scripts/dev-frontend.sh"
