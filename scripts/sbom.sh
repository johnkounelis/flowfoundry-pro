#!/usr/bin/env bash
set -euo pipefail
if ! command -v cyclonedx-npm >/dev/null; then
  echo "Installing cyclonedx-npm..."
  npm -g i @cyclonedx/cyclonedx-npm
fi
cyclonedx-npm --output-file sbom.json --output-format json
echo "SBOM generated at sbom.json"
