#!/usr/bin/env bash
set -euo pipefail
if ! command -v trivy >/dev/null; then
  echo "Install trivy for local runs: https://aquasecurity.github.io/trivy/"
  exit 0
fi
trivy fs --exit-code 0 .
