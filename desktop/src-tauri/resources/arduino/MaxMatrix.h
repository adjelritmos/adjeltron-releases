#pragma once
// MaxMatrix — matriz(es) 8×8 com MAX7219 em cadeia, por software (DIN, LOAD/CS, CLK). Compatível
// com a MaxMatrix usada pelo Zowi/Otto e pelo Otto Quad (MiniKame): setColumn, setDot, writeSprite,
// shiftLeft/shiftRight e writeFull (boca de 30 bits).
#include <Arduino.h>
#define max7219_reg_noop 0x00
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
#define max7219_reg_displayTest 0x0f

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
  void _pulse(byte reg, byte value, int module) {
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
  }
  byte _data;
  byte _load;
  byte _clock;
  byte _num;
  byte _buffer[80];
};
