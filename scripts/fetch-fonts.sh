#!/usr/bin/env bash
# Re-downloads the self-hosted fonts in src/fonts/ from Fontsource (run only to update them).
# Red Hat Display, Text and Mono are open source (SIL Open Font License 1.1). The "latin"
# files already cover English and French, so no subsetting is needed.
set -euo pipefail

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/fonts"

(cd "$WORK" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund --ignore-scripts \
  @fontsource-variable/red-hat-display@5 @fontsource-variable/red-hat-text@5 @fontsource-variable/red-hat-mono@5)

FILES="$WORK/node_modules/@fontsource-variable"
cp "$FILES/red-hat-display/files/red-hat-display-latin-wght-normal.woff2" "$OUT/red-hat-display.woff2"
cp "$FILES/red-hat-text/files/red-hat-text-latin-wght-normal.woff2" "$OUT/red-hat-text.woff2"
cp "$FILES/red-hat-text/files/red-hat-text-latin-wght-italic.woff2" "$OUT/red-hat-text-italic.woff2"
cp "$FILES/red-hat-mono/files/red-hat-mono-latin-wght-normal.woff2" "$OUT/red-hat-mono.woff2"
cp "$FILES/red-hat-display/LICENSE" "$OUT/LICENSE-RedHat.txt"
ls -l "$OUT"
