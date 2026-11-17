#pragma once
#include "Arduino.h"
#include "SPI.h"
#include "Adafruit_GFX.h"

#define ST77XX_BLACK 0x0000
#define ST77XX_WHITE 0xFFFF
#define ST77XX_RED 0xF800
#define ST77XX_GREEN 0x07E0
#define ST77XX_BLUE 0x001F
#define ST77XX_CYAN 0x07FF
#define ST77XX_MAGENTA 0xF81F
#define ST77XX_YELLOW 0xFFE0
#define ST77XX_ORANGE 0xFC00
#define ST7735_BLACK ST77XX_BLACK
#define ST7735_WHITE ST77XX_WHITE
#define ST7735_RED ST77XX_RED
#define ST7735_GREEN ST77XX_GREEN
#define ST7735_BLUE ST77XX_BLUE
#define ST7735_CYAN ST77XX_CYAN
#define ST7735_MAGENTA ST77XX_MAGENTA
#define ST7735_YELLOW ST77XX_YELLOW
#define ST7735_ORANGE ST77XX_ORANGE
#define ST7789_BLACK ST77XX_BLACK
#define ST7789_WHITE ST77XX_WHITE
#define ST7789_RED ST77XX_RED
#define ST7789_GREEN ST77XX_GREEN
#define ST7789_BLUE ST77XX_BLUE
#define ST7789_CYAN ST77XX_CYAN
#define ST7789_MAGENTA ST77XX_MAGENTA
#define ST7789_YELLOW ST77XX_YELLOW
#define ST7789_ORANGE ST77XX_ORANGE

class Adafruit_ST77xx : public Adafruit_GFX {
 public:
  Adafruit_ST77xx(uint16_t w, uint16_t h, int8_t cs, int8_t dc, int8_t rst = -1);
  void setRotation(uint8_t r);
  void invertDisplay(bool i);
  void enableDisplay(boolean enable);
  void enableSleep(boolean enable);
  void setSPISpeed(uint32_t freq);
  uint16_t color565(uint8_t r, uint8_t g, uint8_t b);
  uint16_t Color565(uint8_t r, uint8_t g, uint8_t b);  // API antiga (camada de compatibilidade)
  void startWrite(void);
  void endWrite(void);
  void setAddrWindow(uint16_t x, uint16_t y, uint16_t w, uint16_t h);
  void pushColor(uint16_t color);
  void writePixel(int16_t x, int16_t y, uint16_t color);
  void writeColor(uint16_t color, uint32_t len);
  void drawRGBBitmap(int16_t x, int16_t y, const uint16_t bitmap[], int16_t w, int16_t h);
  void getTextBounds(const char *string, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
  void getTextBounds(const String &str, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
};
