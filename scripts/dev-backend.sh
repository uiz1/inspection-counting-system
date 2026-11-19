#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.venv/bin/activate"
elif [[ -f /tmp/ics-venv/bin/activate ]]; then
  # shellcheck disable=SC1091
  source /tmp/ics-venv/bin/activate
fi

export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 18765 --reload
