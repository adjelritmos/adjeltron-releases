#!/usr/bin/env bash
# Compara o emulador AVR em Rust (src-tauri/src/sim/avr) com o avr8js, instrução a instrução:
# compila os sketches de teste (src-tauri/tests/avr: PWM/tone, ADC/EEPROM, SPI/I2C, interrupções
# e watchdog, Servo/timers) para Uno e Mega com o arduino-cli e corre os dois traços.
# Uso (na pasta frontend): bash scripts/avr-compare.sh [hex extra…]
set -u
cd "$(dirname "$0")/.."
CLI="${ARDUINO_CLI:-$(command -v arduino-cli || echo "/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli")}"
LIBS="${ARDUINO_LIBS:-$HOME/Library/Arduino15/libraries}"
OUT="${TMPDIR:-/tmp}/adjeltron-avr-compare"
mkdir -p "$OUT"
(cd src-tauri && cargo build --release --example avr_periph_trace -q) || exit 1
EX=src-tauri/target/release/examples/avr_periph_trace
ok=0; bad=0
cmp_one() { # hex placa passos
  bun scripts/avr-periph-trace.mjs "$1" "$2" "$3" 997 > "$OUT/j.txt" 2>/dev/null
  "$EX" "$1" "$2" "$3" 997 > "$OUT/r.txt" 2>/dev/null
  if cmp -s "$OUT/j.txt" "$OUT/r.txt"; then ok=$((ok+1)); echo "igual      $2 $(basename "$1")"
  else bad=$((bad+1)); echo "DIFERENTE  $2 $1"; diff "$OUT/j.txt" "$OUT/r.txt" | sed -n 2p; fi
}
for b in uno mega; do
  fq=$([ $b = uno ] && echo arduino:avr:uno || echo arduino:avr:mega)
  for d in src-tauri/tests/avr/*/; do
    t=$(basename "$d")
    [ $b = mega ] && [ $t = t_wdr ] && continue # o Mega não tem watchdog no emulador (nem no JS)
    "$CLI" compile -b $fq --libraries "$LIBS" --output-dir "$OUT/$b/$t" "$d" > /dev/null 2>&1 || { echo "não compilou: $b $t"; continue; }
    cmp_one "$OUT/$b/$t/$t.ino.hex" $b 4000000
  done
done
for h in "$@"; do cmp_one "$h" uno 2000000; done
echo "iguais: $ok  diferentes: $bad"
[ $bad -eq 0 ]
