#pragma once
#include "Arduino.h"
#include "Wire.h"
#include "SPI.h"
#include "Adafruit_GFX.h"

#define SH110X_BLACK 0
#define SH110X_WHITE 1
#define SH110X_INVERSE 2
#define SH110X_DISPLAYOFF 0xAE
#define SH110X_DISPLAYON 0xAF
#define SH110X_NORMALDISPLAY 0xA6
#define SH110X_INVERTDISPLAY 0xA7
#define SH110X_SETCONTRAST 0x81

class Adafruit_SH110X : public Adafruit_GFX {
 public:
  Adafruit_SH110X(uint16_t w, uint16_t h);
  bool begin(uint8_t i2caddr = 0x3C, bool reset = true);
  void display(void);
  void clearDisplay(void);
  void invertDisplay(bool i);
  void setContrast(uint8_t contrast);
  void drawPixel(int16_t x, int16_t y, uint16_t color);
  bool getPixel(int16_t x, int16_t y);
  uint8_t *getBuffer(void);
  void oled_command(uint8_t c);
  void getTextBounds(const char *string, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
  void getTextBounds(const String &str, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
};

class Adafruit_SH1106G : public Adafruit_SH110X {
 public:
  Adafruit_SH1106G(uint16_t w, uint16_t h, TwoWire *twi = &Wire, int8_t rst_pin = -1, uint32_t preclk = 400000, uint32_t postclk = 100000);
  Adafruit_SH1106G(uint16_t w, uint16_t h, int8_t mosi_pin, int8_t sclk_pin, int8_t dc_pin, int8_t rst_pin, int8_t cs_pin);
  Adafruit_SH1106G(uint16_t w, uint16_t h, SPIClass *spi, int8_t dc_pin, int8_t rst_pin, int8_t cs_pin, uint32_t bitrate = 8000000UL);
};
