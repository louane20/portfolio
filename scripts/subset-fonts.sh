#!/usr/bin/env bash
# Rebuilds the self-hosted fonts in src/fonts/ (run only when changing fonts or glyph coverage).
#  - STIX Two Text: used as published by Fontsource (already a small Latin subset).
#  - Iosevka: Fontsource's "latin" file is ~1 MB per weight, so it is subset here to the
#    glyphs the site uses (Latin-1, punctuation, arrows, box drawing, shapes): ~17 KB.
# Requires: npm, python3 with fonttools and brotli (pip install fonttools brotli).
set -euo pipefail

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/fonts"

(cd "$WORK" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund \
  @fontsource/iosevka@5 @fontsource-variable/stix-two-text@5)

UNICODES="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+0178,U+02C6,U+02DC,U+2010-2027,U+2030-203A,U+2044,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+2260,U+2264-2265,U+221E,U+2248,U+2318,U+2325,U+2387-2388,U+23CE,U+23F5-23F8,U+2500-257F,U+2580-259F,U+25A0-25FF,U+2690-2691,U+26A0,U+2713-2718,U+2726,U+27E8-27E9,U+2E3A-2E3B"
for weight in 400 700; do
  pyftsubset "$WORK/node_modules/@fontsource/iosevka/files/iosevka-latin-$weight-normal.woff2" \
    --unicodes="$UNICODES" --layout-features=kern --flavor=woff2 --no-hinting --desubroutinize \
    --output-file="$OUT/iosevka-$weight.woff2"
done
cp "$WORK/node_modules/@fontsource-variable/stix-two-text/files/stix-two-text-latin-wght-normal.woff2" "$OUT/stix-two-text-roman.woff2"
cp "$WORK/node_modules/@fontsource-variable/stix-two-text/files/stix-two-text-latin-wght-italic.woff2" "$OUT/stix-two-text-italic.woff2"
cp "$WORK/node_modules/@fontsource/iosevka/LICENSE" "$OUT/LICENSE-Iosevka.txt"
cp "$WORK/node_modules/@fontsource-variable/stix-two-text/LICENSE" "$OUT/LICENSE-STIX-Two.txt"
ls -l "$OUT"
