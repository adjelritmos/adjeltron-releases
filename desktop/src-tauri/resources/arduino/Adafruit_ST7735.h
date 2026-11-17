#pragma once
#include "Adafruit_ST77xx.h"

#define INITR_GREENTAB 0x00
#define INITR_REDTAB 0x01
#define INITR_BLACKTAB 0x02
#define INITR_18GREENTAB INITR_GREENTAB
#define INITR_18REDTAB INITR_REDTAB
#define INITR_18BLACKTAB INITR_BLACKTAB
#define INITR_144GREENTAB 0x11
#define INITR_MINI160x80 0x04
#define INITR_MINI160x80_PLUGIN 0x05
#define INITR_HALLOWING 0x15
#define ST7735_TFTWIDTH_128 128
#define ST7735_TFTWIDTH_80 80
#define ST7735_TFTHEIGHT_128 128
#define ST7735_TFTHEIGHT_160 160

class Adafruit_ST7735 : public Adafruit_ST77xx {
 public:
  Adafruit_ST7735(int8_t cs, int8_t dc, int8_t mosi, int8_t sclk, int8_t rst);
  Adafruit_ST7735(int8_t cs, int8_t dc, int8_t rst);
  Adafruit_ST7735(SPIClass *spiClass, int8_t cs, int8_t dc, int8_t rst);
  void initB(void);
  void initR(uint8_t options = INITR_GREENTAB);
};
