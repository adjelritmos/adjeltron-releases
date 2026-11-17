// Cabeçalhos partilhados pelas bibliotecas do Otto DIY (bípede, Otto9/Humanoide, Quad/MiniKame),
// escritos de raiz para o adjeltron com a mesma API das originais (que são GPL):
//   Oscillator.h  US.h  Otto_sounds.h  Otto_gestures.h  Otto_mouths.h  Otto_matrix.h
//   MaxMatrix.h  BatReader.h  TimerFreeTone.h  (+ os nomes da Otto9: Sound9.h, Mouth9.h,
//   Gestures9.h, Matrix9.h, BatReader9.h, que incluem os anteriores)
// As bocas, animações e frequências são desenhadas/calculadas aqui; o tipo de letra do writeText
// é o 5×7 clássico (glcdfont da Adafruit-GFX, licença BSD).
import { FONT5X7 } from '../libs/glcdfont.js'

// ---------- bocas (6 colunas × 5 linhas → 30 bits; bit 29 = canto de cima à esquerda) ----------
const bitsOf = (rows) => {
  let v = 0
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && (v += 2 ** (29 - (y * 6 + x)))))
  return v >>> 0
}
const pad4 = (rows) => rows.map((r) => `.${r}.`)
const MOUTHS = [
  ['zero', pad4(['.##.', '#..#', '#..#', '#..#', '.##.'])],
  ['one', pad4(['..#.', '.##.', '..#.', '..#.', '.###'])],
  ['two', pad4(['.##.', '#..#', '..#.', '.#..', '####'])],
  ['three', pad4(['###.', '...#', '.##.', '...#', '###.'])],
  ['four', pad4(['#..#', '#..#', '####', '...#', '...#'])],
  ['five', pad4(['####', '#...', '###.', '...#', '###.'])],
  ['six', pad4(['.##.', '#...', '###.', '#..#', '.##.'])],
  ['seven', pad4(['####', '...#', '..#.', '.#..', '.#..'])],
  ['eight', pad4(['.##.', '#..#', '.##.', '#..#', '.##.'])],
  ['nine', pad4(['.##.', '#..#', '.###', '...#', '.##.'])],
  ['smile', ['......', '#....#', '.#..#.', '..##..', '......']],
  ['happyOpen', ['......', '######', '#....#', '.#..#.', '..##..']],
  ['happyClosed', ['......', '######', '.#..#.', '..##..', '......']],
  ['heart', ['.#..#.', '######', '######', '.####.', '..##..']],
  ['bigSurprise', ['..##..', '.#..#.', '#....#', '.#..#.', '..##..']],
  ['smallSurprise', ['......', '..##..', '.#..#.', '..##..', '......']],
  ['tongueOut', ['######', '..#..#', '..#..#', '...##.', '......']],
  ['vamp1', ['######', '#.##.#', '.#..#.', '..##..', '......']],
  ['vamp2', ['######', '##..##', '.#..#.', '......', '......']],
  ['lineMouth', ['......', '......', '######', '......', '......']],
  ['confused', ['......', '.#...#', '#.#.#.', '...#..', '......']],
  ['diagonal', ['#.....', '.##...', '...##.', '.....#', '......']],
  ['sad', ['......', '..##..', '.#..#.', '#....#', '......']],
  ['sadOpen', ['..##..', '.#..#.', '#....#', '######', '......']],
  ['sadClosed', ['......', '..##..', '.#..#.', '######', '......']],
  ['okMouth', ['......', '.....#', '....#.', '#.#...', '.#....']],
  ['xMouth', ['#....#', '.#..#.', '..##..', '.#..#.', '#....#']],
  ['interrogation', ['.###..', '#...#.', '...#..', '..#...', '..#...']],
  ['thunder', ['...#..', '..#...', '.####.', '...#..', '..#...']],
  ['culito', ['......', '#....#', '#.##.#', '.#..#.', '......']],
  ['angry', ['......', '.####.', '#....#', '#....#', '......']],
]
// animações: até 10 imagens cada (littleUuh, dreamMouth, adivinawi, wave)
const shift = (rows, dx) => rows.map((r) => (dx > 0 ? '.'.repeat(dx) + r.slice(0, 6 - dx) : r.slice(-dx) + '.'.repeat(-dx)))
const SMALL_O = ['......', '..##..', '.#..#.', '..##..', '......']
const waveFrame = (f) => {
  const rows = Array.from({ length: 5 }, () => [...'......'])
  for (let x = 0; x < 6; x++) rows[Math.round(2 + 1.6 * Math.sin(((x + f) * 2 * Math.PI) / 6))][x] = '#'
  return rows.map((r) => r.join(''))
}
const ANIMS = [
  ['littleUuh', [0, 1, 2, 1, 0, -1, -2, -1].map((dx) => shift(SMALL_O, dx))],
  ['dreamMouth', [MOUTHS[19][1], SMALL_O, MOUTHS[14][1], SMALL_O]],
  [
    'adivinawi',
    [
      ['......', '......', '..##..', '......', '......'],
      ['......', '..##..', '.#..#.', '......', '......'],
      ['......', '.####.', '#....#', '......', '......'],
      ['......', '#....#', '.####.', '......', '......'],
      ['......', '.#..#.', '..##..', '......', '......'],
      ['......', '......', '..##..', '......', '......'],
    ],
  ],
  ['wave', Array.from({ length: 10 }, (_, f) => waveFrame(f))],
]
const hex = (v) => `0x${v.toString(16).padStart(8, '0').toUpperCase()}UL`

// notas: note_C0 … note_B8 (afinação de 440 Hz), com os nomes da Otto
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const NOTES = []
for (let o = 0; o <= 8; o++) NOTE_NAMES.forEach((n, i) => NOTES.push([`note_${n}${o}`, (440 * 2 ** ((o * 12 + i - 57) / 12)).toFixed(2)]))

export const OSCILLATOR_H = `#pragma once
// Oscillator — servo que segue posição = A · sin(fase + fase0) + O (graus em torno dos 90°),
// amostrada a cada 30 ms com período T. API compatível com a do Otto DIY.
#include <Arduino.h>
#ifdef ARDUINO_ARCH_ESP32
#include <ESP32Servo.h>
#else
#include <Servo.h>
#endif

class Oscillator {
 public:
  Oscillator(int trim = 0) {
    _trim = trim;
    _A = 0;
    _O = 0;
    _phase0 = 0;
    _phase = 0;
    _T = 2000;
    _period = 30;
    _inc = 2.0 * 3.14159265 * 30.0 / 2000.0;
    _rev = false;
    _stop = true;
    _pos = 90;
    _last = 0;
    _limit = 0;
    _pin = -1;
  }
  void attach(int pin, bool rev = false) {
    if (pin < 0) return;
    if (_servo.attached()) _servo.detach();
    _servo.attach(pin);
    _pin = pin;
    _rev = rev;
    _last = millis();
    _stop = false;
  }
  void detach() {
    if (_servo.attached()) _servo.detach();
  }
  void SetA(int A) { _A = A; }
  void SetO(int O) { _O = O; }
  void SetPh(double Ph) { _phase0 = Ph; }
  void SetT(unsigned int T) {
    _T = T;
    _inc = 2.0 * 3.14159265 * _period / (double)_T;
  }
  void SetTrim(int trim) { _trim = trim; }
  int getTrim() { return _trim; }
  void SetPosition(int position) { _write(position); }
  void Stop() { _stop = true; }
  void Play() { _stop = false; }
  void Reset() { _phase = 0; }
  void SetLimiter(int diffLimit) { _limit = diffLimit; }
  void DisableLimiter() { _limit = 0; }
  int getPosition() { return _pos; }
  void refresh() {
    if (millis() - _last >= (unsigned long)_period) {
      _last = millis();
      if (!_stop) {
        int pos = (int)round(_A * sin(_phase + _phase0) + _O);
        if (_rev) pos = -pos;
        _write(pos + 90);
      }
      _phase = _phase + _inc;
    }
  }

 private:
  void _write(int position) {
    if (_pin < 0) return;
    int p = position + _trim;
    if (_limit > 0) {
      int maxStep = (_limit * _period) / 1000;
      if (maxStep < 1) maxStep = 1;
      if (p > _pos + maxStep) p = _pos + maxStep;
      if (p < _pos - maxStep) p = _pos - maxStep;
    }
    if (p < 0) p = 0;
    if (p > 180) p = 180;
    _pos = p;
    _servo.write(p);
  }
  Servo _servo;
  int _A;
  int _O;
  double _phase0;
  double _phase;
  unsigned int _T;
  int _period;
  double _inc;
  bool _rev;
  bool _stop;
  int _pos;
  unsigned long _last;
  int _trim;
  int _limit;
  int _pin;
};
`

export const US_H = `#pragma once
// US — sensor ultrassónico HC-SR04 (Trig/Echo). API compatível com a do Otto: US(trig, echo) ou
// init(trig, echo); read() devolve a distância em cm (999 sem eco).
#include <Arduino.h>

class US {
 public:
  US(int trigger = -1, int echo = -1) {
    _trig = -1;
    _echo = -1;
    if (trigger >= 0 && echo >= 0) init(trigger, echo);
  }
  void init(int trigger, int echo) {
    _trig = trigger;
    _echo = echo;
    pinMode(_trig, OUTPUT);
    pinMode(_echo, INPUT);
  }
  float read() {
    if (_trig < 0 || _echo < 0) return 999;
    digitalWrite(_trig, LOW);
    delayMicroseconds(2);
    digitalWrite(_trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(_trig, LOW);
    long us = pulseIn(_echo, HIGH, 30000);
    if (us == 0) return 999;
    return us / 58.0;
  }

 private:
  int _trig;
  int _echo;
};
`

export const SOUNDS_H = `#pragma once
// Otto_sounds.h — notas (note_C0 … note_B8, em Hz, afinação de 440 Hz) e os nomes dos sons do sing()
${NOTES.map(([n, f]) => `#define ${n} ${f}`).join('\n')}

#define S_connection 0
#define S_disconnection 1
#define S_buttonPushed 2
#define S_mode1 3
#define S_mode2 4
#define S_mode3 5
#define S_surprise 6
#define S_OhOoh 7
#define S_OhOoh2 8
#define S_cuddly 9
#define S_sleeping 10
#define S_happy 11
#define S_superHappy 12
#define S_happy_short 13
#define S_sad 14
#define S_confused 15
#define S_fart1 16
#define S_fart2 17
#define S_fart3 18
`

export const GESTURES_H = `#pragma once
// Otto_gestures.h — gestos do playGesture() e animações da boca (putAnimationMouth)
#define OttoHappy 0
#define OttoSuperHappy 1
#define OttoSad 2
#define OttoSleeping 3
#define OttoFart 4
#define OttoConfused 5
#define OttoLove 6
#define OttoAngry 7
#define OttoFretful 8
#define OttoMagic 9
#define OttoWave 10
#define OttoVictory 11
#define OttoFail 12

${ANIMS.map(([n], i) => `#define ${n} ${i}`).join('\n')}
`

export const MOUTHS_H = `#pragma once
// Otto_mouths.h — bocas para a matriz de LEDs (putMouth): 6 colunas × 5 linhas em 30 bits
// (bit 29 = canto de cima à esquerda). putMouth(nome) usa a tabela; putMouth(valor, false) usa
// diretamente os 30 bits.
#include <Arduino.h>
${MOUTHS.map(([n], i) => `#define ${n} ${i}`).join('\n')}
#define OTTO_MOUTHS ${MOUTHS.length}

static const unsigned long OttoMouthTable[${MOUTHS.length}] PROGMEM = {
${MOUTHS.map(([n, r]) => `  ${hex(bitsOf(r))}, // ${n}`).join('\n')}
};

#define OTTO_ANIMS ${ANIMS.length}
#define OTTO_ANIM_FRAMES 10
static const unsigned long OttoAnimTable[${ANIMS.length}][10] PROGMEM = {
${ANIMS.map(([n, frames]) => `  {${Array.from({ length: 10 }, (_, k) => hex(frames[k] ? bitsOf(frames[k]) : 0)).join(', ')}}, // ${n}`).join('\n')}
};
static const byte OttoAnimLength[${ANIMS.length}] = {${ANIMS.map(([, f]) => f.length).join(', ')}};

static unsigned long OttoMouthShape(int number) {
  if (number < 0 || number >= OTTO_MOUTHS) return 0;
  return pgm_read_dword(&OttoMouthTable[number]);
}
static unsigned long OttoAnimShape(int anim, int index) {
  if (anim < 0 || anim >= OTTO_ANIMS) return 0;
  return pgm_read_dword(&OttoAnimTable[anim][index % OttoAnimLength[anim]]);
}
`

// MAX7219 por software (DIN, CLK, LOAD/CS), com cadeia de "num" módulos — usado pela Otto_Matrix e
// pela MaxMatrix. Cada coluna do buffer é um registo de dígito (1–8) do MAX7219.
const MAX7219_CORE = `  void _pulse(byte reg, byte value, int module) {
    digitalWrite(_load, LOW);
    for (int m = _num - 1; m >= 0; m--) {
      if (module < 0 || m == module) {
        shiftOut(_data, _clock, MSBFIRST, reg);
        shiftOut(_data, _clock, MSBFIRST, value);
      } else {
        shiftOut(_data, _clock, MSBFIRST, 0);
        shiftOut(_data, _clock, MSBFIRST, 0);
      }
    }
    digitalWrite(_load, HIGH);
  }
  void _begin() {
    if (_num < 1) _num = 1;
    if (_num > 8) _num = 8;
    pinMode(_data, OUTPUT);
    pinMode(_clock, OUTPUT);
    pinMode(_load, OUTPUT);
    digitalWrite(_clock, LOW);
    digitalWrite(_load, HIGH);
    setCommand(max7219_reg_scanLimit, 0x07);
    setCommand(max7219_reg_decodeMode, 0x00);
    setCommand(max7219_reg_shutdown, 0x01);
    setCommand(max7219_reg_displayTest, 0x00);
    clearMatrix();
    setIntensity(0x0f);
  }`

const MAX_REGS = `#define max7219_reg_noop 0x00
#define max7219_reg_digit0 0x01
#define max7219_reg_digit1 0x02
#define max7219_reg_digit2 0x03
#define max7219_reg_digit3 0x04
#define max7219_reg_digit4 0x05
#define max7219_reg_digit5 0x06
#define max7219_reg_digit6 0x07
#define max7219_reg_digit7 0x08
#define max7219_reg_decodeMode 0x09
#define max7219_reg_intensity 0x0a
#define max7219_reg_scanLimit 0x0b
#define max7219_reg_shutdown 0x0c
#define max7219_reg_displayTest 0x0f`

const FONT_H = `// tipo de letra 5×7 (ASCII 32–126; 5 colunas por carácter, bit 0 = linha de cima)
static const byte OttoFont5x7[${FONT5X7.length}] PROGMEM = {
${Array.from({ length: FONT5X7.length / 5 }, (_, i) => `  ${FONT5X7.slice(i * 5, i * 5 + 5).map((b) => `0x${b.toString(16).padStart(2, '0')}`).join(', ')},`).join('\n')}
};
static byte OttoFontColumn(char c, int k) {
  if (c < 32 || c > 126) return 0x7f;
  return pgm_read_byte(&OttoFont5x7[(c - 32) * 5 + k]);
}`

export const MATRIX_H = `#pragma once
// Otto_matrix.h — matriz de LEDs 8×8 com MAX7219 (a boca do Otto): ligação por software em
// DIN, CS (LOAD) e CLK. writeFull() desenha uma boca de 30 bits; rotação 1–4 (0°, 90°, 180°, 270°).
#include <Arduino.h>
#include "Otto_gestures.h"
${MAX_REGS}
${FONT_H}

class Otto_Matrix {
 public:
  Otto_Matrix() {
    _data = 255;
    _load = 255;
    _clock = 255;
    _num = 1;
    _rotation = 1;
    for (int i = 0; i < 8; i++) _buffer[i] = 0;
  }
  void init(byte data, byte load, byte clock, byte num, int rotation) {
    _data = data;
    _load = load;
    _clock = clock;
    _num = num;
    _rotation = rotation;
    _begin();
  }
  bool ready() { return _data != 255; }
  void clearMatrix() {
    for (int i = 0; i < 8; i++) _buffer[i] = 0;
    _flush();
  }
  void setCommand(byte command, byte value) {
    if (!ready()) return;
    _pulse(command, value, -1);
  }
  void setIntensity(byte intensity) { setCommand(max7219_reg_intensity, intensity & 0x0f); }
  // linha "col" (0–7) da imagem (bits 7…0 = da esquerda para a direita)
  void setColumn(byte col, byte value) {
    if (col > 7) return;
    _buffer[col] = value;
    _flush();
  }
  void setColumnAll(byte col, byte value) { setColumn(col, value); }
  void setDot(byte col, byte row, byte value) {
    if (col > 7 || row > 7) return;
    if (value) _buffer[row] |= (0x80 >> col);
    else _buffer[row] &= ~(0x80 >> col);
    _flush();
  }
  // boca de 6 × 5 (30 bits) ao centro da matriz
  void writeFull(unsigned long value) {
    for (int i = 0; i < 8; i++) _buffer[i] = 0;
    for (int r = 0; r < 5; r++)
      for (int c = 0; c < 6; c++)
        if ((value >> (29 - (r * 6 + c))) & 1UL) _buffer[r + 2] |= (0x80 >> (c + 1));
    _flush();
  }
  // texto a passar da direita para a esquerda (só a parte visível de 8 colunas)
  void sendChar(const byte data, byte pos, byte number, byte scrollspeed) {
    int x = 8 - (int)scrollspeed;
    if (number == 0) return;
    for (int i = 0; i < 8; i++) _buffer[i] = 0;
    for (int k = 0; k < 5; k++) {
      int col = pos * 6 + k + x;
      if (col < 0 || col > 7) continue;
      byte bits = OttoFontColumn((char)data, k);
      for (int r = 0; r < 7; r++)
        if (bits & (1 << r)) _buffer[r] |= (0x80 >> col);
    }
    _flush();
  }
  void writeText(const char *s, byte scrollspeed) {
    int n = strlen(s);
    int width = n * 6;
    for (int off = -8; off <= width; off++) {
      for (int i = 0; i < 8; i++) _buffer[i] = 0;
      for (int col = 0; col < 8; col++) {
        int gx = off + col;
        if (gx < 0 || gx >= width) continue;
        int ci = gx / 6;
        int k = gx % 6;
        if (k == 5) continue;
        byte bits = OttoFontColumn(s[ci], k);
        for (int r = 0; r < 7; r++)
          if (bits & (1 << r)) _buffer[r] |= (0x80 >> col);
      }
      _flush();
      delay(scrollspeed);
    }
    clearMatrix();
  }

 private:
  ${MAX7219_CORE.trim()}
  // aplica a rotação e envia as 8 linhas
  void _flush() {
    if (!ready()) return;
    for (int r = 0; r < 8; r++) {
      byte out = 0;
      for (int c = 0; c < 8; c++) {
        int sr = r;
        int sc = c;
        if (_rotation == 2) {
          sr = 7 - c;
          sc = r;
        } else if (_rotation == 3) {
          sr = 7 - r;
          sc = 7 - c;
        } else if (_rotation == 4) {
          sr = c;
          sc = 7 - r;
        }
        if (_buffer[sr] & (0x80 >> sc)) out |= (0x80 >> c);
      }
      _pulse(r + 1, out, -1);
    }
  }
  byte _data;
  byte _load;
  byte _clock;
  byte _num;
  int _rotation;
  byte _buffer[8];
};
`

export const MAXMATRIX_H = `#pragma once
// MaxMatrix — matriz(es) 8×8 com MAX7219 em cadeia, por software (DIN, LOAD/CS, CLK). Compatível
// com a MaxMatrix usada pelo Zowi/Otto e pelo Otto Quad (MiniKame): setColumn, setDot, writeSprite,
// shiftLeft/shiftRight e writeFull (boca de 30 bits).
#include <Arduino.h>
${MAX_REGS}

class MaxMatrix {
 public:
  MaxMatrix() { _setup(255, 255, 255, 1); }
  MaxMatrix(byte data, byte load, byte clock, byte num) { _setup(data, load, clock, num); }
  void begin(byte data, byte load, byte clock, byte num) {
    _setup(data, load, clock, num);
    init();
  }
  void init() {
    if (_data == 255) return;
    _begin();
  }
  void clearMatrix() {
    for (int i = 0; i < 80; i++) _buffer[i] = 0;
    for (int i = 0; i < 8; i++) _pulse(i + 1, 0, -1);
  }
  void setCommand(byte command, byte value) {
    if (_data == 255) return;
    _pulse(command, value, -1);
  }
  void setIntensity(byte intensity) { setCommand(max7219_reg_intensity, intensity & 0x0f); }
  // coluna "col" (0 … 8·num − 1): registo de dígito col % 8 do módulo col / 8
  void setColumn(byte col, byte value) {
    if (col >= _num * 8) return;
    _buffer[col] = value;
    if (_data != 255) _pulse(col % 8 + 1, value, col / 8);
  }
  void setColumnAll(byte col, byte value) {
    for (int m = 0; m < _num; m++) _buffer[m * 8 + col % 8] = value;
    if (_data != 255) _pulse(col % 8 + 1, value, -1);
  }
  void setDot(byte col, byte row, byte value) {
    if (col >= _num * 8 || row > 7) return;
    if (value) _buffer[col] |= (0x80 >> row);
    else _buffer[col] &= ~(0x80 >> row);
    setColumn(col, _buffer[col]);
  }
  // sprite: { largura, altura, coluna0, coluna1, … }
  void writeSprite(int x, int y, const byte *sprite) {
    int w = sprite[0];
    int h = sprite[1];
    for (int i = 0; i < w; i++) {
      int c = x + i;
      if (c < 0 || c >= _num * 8) continue;
      for (int j = 0; j < h; j++) setDot(c, y + j, (sprite[i + 2] >> j) & 1);
    }
  }
  void shiftLeft(bool rotate = false, bool fill_zero = true) {
    byte first = _buffer[0];
    for (int i = 0; i < _num * 8 - 1; i++) _buffer[i] = _buffer[i + 1];
    _buffer[_num * 8 - 1] = rotate ? first : (fill_zero ? 0 : _buffer[_num * 8 - 1]);
    _reload();
  }
  void shiftRight(bool rotate = false, bool fill_zero = true) {
    int last = _num * 8 - 1;
    byte end = _buffer[last];
    for (int i = last; i > 0; i--) _buffer[i] = _buffer[i - 1];
    _buffer[0] = rotate ? end : (fill_zero ? 0 : _buffer[0]);
    _reload();
  }
  // boca de 6 × 5 (30 bits): as 6 colunas da boca vão para as colunas 1–6, as 5 linhas para 2–6
  void writeFull(unsigned long value) {
    for (int c = 0; c < 8; c++) _buffer[c] = 0;
    for (int r = 0; r < 5; r++)
      for (int c = 0; c < 6; c++)
        if ((value >> (29 - (r * 6 + c))) & 1UL) _buffer[c + 1] |= (0x80 >> (r + 2));
    _reload();
  }

 private:
  void _setup(byte data, byte load, byte clock, byte num) {
    _data = data;
    _load = load;
    _clock = clock;
    _num = num;
    for (int i = 0; i < 80; i++) _buffer[i] = 0;
  }
  void _reload() {
    if (_data == 255) return;
    for (int i = 0; i < 8; i++) {
      digitalWrite(_load, LOW);
      for (int m = _num - 1; m >= 0; m--) {
        shiftOut(_data, _clock, MSBFIRST, i + 1);
        shiftOut(_data, _clock, MSBFIRST, _buffer[m * 8 + i]);
      }
      digitalWrite(_load, HIGH);
    }
  }
  ${MAX7219_CORE.trim()}
  byte _data;
  byte _load;
  byte _clock;
  byte _num;
  byte _buffer[80];
};
`

export const BATREADER_H = `#pragma once
// BatReader — tensão e carga de uma bateria de lítio (3,25–4,2 V) lida num pino analógico
// (por omissão A7), com referência de 5 V.
#include <Arduino.h>
#ifndef BAT_PIN
#define BAT_PIN A7
#endif
#define BAT_MAX 4.2
#define BAT_MIN 3.25
#define ANA_REF 5

class BatReader {
 public:
  BatReader(int pin = BAT_PIN) { _pin = pin; }
  void init(int pin) { _pin = pin; }
  double readBatVoltage() { return analogRead(_pin) * (double)ANA_REF / 1024.0; }
  double readBatPercent() {
    double p = (readBatVoltage() - BAT_MIN) * 100.0 / (BAT_MAX - BAT_MIN);
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return p;
  }

 private:
  int _pin;
};
`

export const TIMERFREETONE_H = `#pragma once
// TimerFreeTone(pin, frequência, duração em ms[, volume 1–10]) — toca uma nota e espera que acabe.
#include <Arduino.h>

static void TimerFreeTone(uint8_t pin, unsigned long frequency, unsigned int duration, uint8_t volume = 10) {
  if (frequency == 0 || volume == 0) {
    delay(duration);
    return;
  }
  tone(pin, frequency, duration);
  delay(duration);
  noTone(pin);
}
`

export const COMMON_FILES = {
  'Oscillator.h': OSCILLATOR_H,
  'US.h': US_H,
  'Otto_sounds.h': SOUNDS_H,
  'Otto_gestures.h': GESTURES_H,
  'Otto_mouths.h': MOUTHS_H,
  'Otto_matrix.h': MATRIX_H,
  'MaxMatrix.h': MAXMATRIX_H,
  'BatReader.h': BATREADER_H,
  'TimerFreeTone.h': TIMERFREETONE_H,
  // nomes da Otto9 (mesmo conteúdo)
  'Sound9.h': '#pragma once\n#include "Otto_sounds.h"\n',
  'Mouth9.h': '#pragma once\n#include "Otto_mouths.h"\n',
  'Gestures9.h': '#pragma once\n#include "Otto_gestures.h"\n',
  'Matrix9.h': '#pragma once\n#include "Otto_matrix.h"\n',
  'BatReader9.h': '#pragma once\n#include "BatReader.h"\n',
}
