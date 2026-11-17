#pragma once
#include "Arduino.h"
#include "SPI.h"
#include "Adafruit_GFX.h"

#define ILI9341_TFTWIDTH 240
#define ILI9341_TFTHEIGHT 320
#define ILI9341_BLACK 0x0000
#define ILI9341_NAVY 0x000F
#define ILI9341_DARKGREEN 0x03E0
#define ILI9341_DARKCYAN 0x03EF
#define ILI9341_MAROON 0x7800
#define ILI9341_PURPLE 0x780F
#define ILI9341_OLIVE 0x7BE0
#define ILI9341_LIGHTGREY 0xC618
#define ILI9341_DARKGREY 0x7BEF
#define ILI9341_BLUE 0x001F
#define ILI9341_GREEN 0x07E0
#define ILI9341_CYAN 0x07FF
#define ILI9341_RED 0xF800
#define ILI9341_MAGENTA 0xF81F
#define ILI9341_YELLOW 0xFFE0
#define ILI9341_WHITE 0xFFFF
#define ILI9341_ORANGE 0xFD20
#define ILI9341_GREENYELLOW 0xAFE5
#define ILI9341_PINK 0xFC18

class Adafruit_ILI9341 : public Adafruit_GFX {
 public:
  Adafruit_ILI9341(int8_t cs, int8_t dc, int8_t rst = -1);
  Adafruit_ILI9341(int8_t cs, int8_t dc, int8_t mosi, int8_t sclk, int8_t rst = -1, int8_t miso = -1);
  void begin(uint32_t freq = 0);
  void setRotation(uint8_t r);
  void invertDisplay(bool i);
  void scrollTo(uint16_t y);
  void setScrollMargins(uint16_t top, uint16_t bottom);
  uint16_t color565(uint8_t r, uint8_t g, uint8_t b);
  uint16_t readPixel(int16_t x, int16_t y);
  uint8_t readcommand8(uint8_t reg, uint8_t index = 0);
  void drawRGBBitmap(int16_t x, int16_t y, const uint16_t bitmap[], int16_t w, int16_t h);
};
