#!/usr/bin/env bash
# Makes the fonts of the PDF résumé (scripts/cv/fonts/): static, Latin-only instances of the Red Hat
# variable fonts the site uses. Chromium embeds a variable font in a PDF as Type 3 glyph outlines,
# which is heavier and which some résumé parsers (ATS) and printers handle badly; static fonts are
# embedded as ordinary TrueType. The fonts are committed, so this only runs when they change.
# Needs Python's fonttools and brotli: pip install fonttools brotli
set -euo pipefail

cd "$(dirname "$0")/.."
src=src/fonts
out=scripts/cv/fonts
mkdir -p "$out"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Basic Latin, Latin-1, Latin Extended-A/B, general punctuation, currency, arrows.
unicodes="U+0000-024F,U+2000-206F,U+20AC,U+2190-21FF,U+2212"

instance() { # family-file weight output-name
  python3 -m fontTools.varLib.instancer "$src/$1.woff2" "wght=$2" --static -q -o "$tmp/$3.ttf"
  python3 -m fontTools.subset "$tmp/$3.ttf" --unicodes="$unicodes" --layout-features='*' \
    --flavor=woff2 --output-file="$out/$3.woff2"
  echo "made $out/$3.woff2"
}

instance red-hat-text 400 RedHatText-Regular
instance red-hat-text 600 RedHatText-SemiBold
instance red-hat-text 700 RedHatText-Bold
instance red-hat-text-italic 400 RedHatText-Italic
instance red-hat-mono 400 RedHatMono-Regular
instance red-hat-mono 600 RedHatMono-SemiBold
instance red-hat-display 700 RedHatDisplay-Bold
instance red-hat-display 800 RedHatDisplay-ExtraBold
cp "$src/LICENSE-RedHat.txt" "$out/"
