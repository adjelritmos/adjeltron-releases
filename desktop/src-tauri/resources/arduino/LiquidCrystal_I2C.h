#pragma once
#include "Arduino.h"
#include "Wire.h"
class LiquidCrystal_I2C : public Print {
 public:
  LiquidCrystal_I2C(uint8_t addr, uint8_t cols, uint8_t rows);
  void init();
  void begin();
  void begin(uint8_t cols, uint8_t rows);
  void clear();
  void home();
  void setCursor(uint8_t col, uint8_t row);
  void backlight();
  void noBacklight();
  void setBacklight(uint8_t on);
  void display();
  void noDisplay();
  void cursor();
  void noCursor();
  void blink();
  void noBlink();
  void scrollDisplayLeft();
  void scrollDisplayRight();
  void leftToRight();
  void rightToLeft();
  void autoscroll();
  void noAutoscroll();
  void createChar(uint8_t location, uint8_t charmap[]);
  size_t write(uint8_t c);
};
