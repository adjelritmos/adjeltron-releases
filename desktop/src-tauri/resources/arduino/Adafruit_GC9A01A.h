#pragma once
#include "Arduino.h"
#include "SPI.h"
#include "Adafruit_GFX.h"

// Ecrã redondo 1,28" 240×240 (GC9A01) — cabeçalho para a verificação de compilação
#define GC9A01A_TFTWIDTH 240
#define GC9A01A_TFTHEIGHT 240
#define GC9A01A_BLACK 0x0000
#define GC9A01A_WHITE 0xFFFF
#define GC9A01A_RED 0xF800
#define GC9A01A_GREEN 0x07E0
#define GC9A01A_BLUE 0x001F
#define GC9A01A_CYAN 0x07FF
#define GC9A01A_MAGENTA 0xF81F
#define GC9A01A_YELLOW 0xFFE0
#define GC9A01A_ORANGE 0xFC00

class Adafruit_GC9A01A : public Adafruit_GFX {
 public:
  Adafruit_GC9A01A(int8_t cs, int8_t dc, int8_t mosi, int8_t sclk, int8_t rst = -1, int8_t miso = -1);
  Adafruit_GC9A01A(int8_t cs, int8_t dc, int8_t rst = -1);
  Adafruit_GC9A01A(SPIClass *spiClass, int8_t cs, int8_t dc, int8_t rst = -1);
  void begin(uint32_t freq = 0);
  void setRotation(uint8_t r);
  void invertDisplay(bool i);
  void drawPixel(int16_t x, int16_t y, uint16_t color);
  void setAddrWindow(uint16_t x, uint16_t y, uint16_t w, uint16_t h);
  void startWrite(void);
  void endWrite(void);
  void writePixel(int16_t x, int16_t y, uint16_t color);
  void writeColor(uint16_t color, uint32_t len);
  void sendCommand(uint8_t commandByte, uint8_t *dataBytes = NULL, uint8_t numDataBytes = 0);
};
