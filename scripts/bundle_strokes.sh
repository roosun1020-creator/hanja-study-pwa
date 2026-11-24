#!/usr/bin/env bash
# Run once in GitHub Codespaces after updating the PWA. Downloads only tools
# into a temporary directory and copies the needed 150 character data files.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v npm >/dev/null 2>&1; then echo 'npm이 필요합니다. Codespaces 터미널에서 실행하세요.' >&2; exit 1; fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf '한자 획순 자료를 다운로드합니다…\n'
npm install --prefix "$TMP" --no-save --ignore-scripts --no-audit --no-fund 'hanzi-writer@3.5.0' 'hanzi-writer-data@2.0.1'
python3 ./scripts/prepare_stroke_assets.py "$TMP/node_modules"
node --check app.js
node --check writing.js
printf '\n획순 자료 준비 완료!\n'
