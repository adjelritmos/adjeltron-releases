#pragma once
#include "Arduino.h"
#define LCD_5x10DOTS 0x04
#define LCD_5x8DOTS 0x00
class LiquidCrystal : public Print {
 public:
  LiquidCrystal(uint8_t rs, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3, uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7);
  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3, uint8_t d4, uint8_t d5, uint8_t d6, uint8_t d7);
  LiquidCrystal(uint8_t rs, uint8_t rw, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3);
  LiquidCrystal(uint8_t rs, uint8_t enable, uint8_t d0, uint8_t d1, uint8_t d2, uint8_t d3);
  void begin(uint8_t cols, uint8_t rows, uint8_t charsize = LCD_5x8DOTS);
  void clear();
  void home();
  void noDisplay();
  void display();
  void noBlink();
  void blink();
  void noCursor();
  void cursor();
  void scrollDisplayLeft();
  void scrollDisplayRight();
  void leftToRight();
  void rightToLeft();
  void autoscroll();
  void noAutoscroll();
  void setRowOffsets(int row1, int row2, int row3, int row4);
  void createChar(uint8_t location, uint8_t charmap[]);
  void createChar(uint8_t location, const uint8_t charmap[]);
  void createChar(uint8_t location, const char charmap[]);
  void setCursor(uint8_t col, uint8_t row);
  size_t write(uint8_t c);
  using Print::write;
  void command(uint8_t value);
};
