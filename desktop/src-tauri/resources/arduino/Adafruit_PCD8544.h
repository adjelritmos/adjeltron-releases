#pragma once
#include "Arduino.h"
#include "SPI.h"
#include "Adafruit_GFX.h"

#define BLACK 1
#define WHITE 0
#define LCDWIDTH 84
#define LCDHEIGHT 48
#define PCD8544_DISPLAYNORMAL 0x4
#define PCD8544_DISPLAYINVERTED 0x5

class Adafruit_PCD8544 : public Adafruit_GFX {
 public:
  Adafruit_PCD8544(int8_t sclk_pin, int8_t din_pin, int8_t dc_pin, int8_t cs_pin, int8_t rst_pin);
  Adafruit_PCD8544(int8_t sclk_pin, int8_t din_pin, int8_t dc_pin, int8_t rst_pin);
  Adafruit_PCD8544(int8_t dc_pin, int8_t cs_pin, int8_t rst_pin, SPIClass *theSPI = &SPI);
  bool begin(uint8_t contrast = 40, uint8_t bias = 0x04);
  void command(uint8_t c);
  void data(uint8_t c);
  void setContrast(uint8_t val);
  uint8_t getContrast(void);
  void setBias(uint8_t val);
  uint8_t getBias(void);
  void clearDisplay(void);
  void display(void);
  void invertDisplay(bool i);
  void setReinitInterval(uint8_t val);
  void initDisplay(void);
  void drawPixel(int16_t x, int16_t y, uint16_t color);
  bool getPixel(int16_t x, int16_t y);
  void getTextBounds(const char *string, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
  void getTextBounds(const String &str, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h);
};
