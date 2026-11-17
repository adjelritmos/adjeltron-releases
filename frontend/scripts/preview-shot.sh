#!/usr/bin/env bash
# Capturas de componentes 3D com o Chrome headless (precisa do Vite em http://localhost:5173):
#   bash scripts/preview-shot.sh <pasta-de-saída> arduino:iso arduino:top nano:iso …
set -u
OUT="$1"; shift
mkdir -p "$OUT"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
# folha de uma família: SHEET=sensores COLS=6 bash scripts/preview-shot.sh <pasta>
if [ -n "${SHEET:-}${TYPES:-}" ]; then
  n=$(echo "${TYPES:-}" | tr ',' '\n' | grep -c .)
  COLS="${COLS:-6}"; ROWS="${ROWS:-$(( (n + COLS - 1) / COLS ))}"; [ "$ROWS" -lt 1 ] && ROWS=6
  name="${SHEET:-tipos}"
  "$CHROME" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
    --window-size=$((COLS * 300)),$((ROWS * 341)) --virtual-time-budget=40000 --screenshot="$OUT/$name-${VIEW:-iso}.png" \
    "http://localhost:5173/preview.html?sheet=${SHEET:-}&types=${TYPES:-}&cols=$COLS&view=${VIEW:-iso}&cfg=${CFG:-}" > /dev/null 2>&1
  echo "$OUT/$name-${VIEW:-iso}.png"
  exit 0
fi
for spec in "$@"; do
  t="${spec%%:*}"; v="${spec#*:}"; [ "$v" = "$spec" ] && v=iso
  "$CHROME" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
    --window-size=1000,700 --virtual-time-budget=15000 --screenshot="$OUT/$t-$v.png" \
    "http://localhost:5173/preview.html?type=$t&view=$v&cfg=${CFG:-}&example=${EXAMPLE:-}" > /dev/null 2>&1
  echo "$OUT/$t-$v.png"
done
