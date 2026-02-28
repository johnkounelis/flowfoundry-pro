#!/usr/bin/env bash
set -euo pipefail
if ! command -v gitleaks >/dev/null; then
  echo "Install gitleaks for local runs: https://github.com/gitleaks/gitleaks"
  exit 0
fi
gitleaks detect --verbose --redact
