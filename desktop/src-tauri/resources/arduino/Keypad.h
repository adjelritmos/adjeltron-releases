#pragma once
#include "Arduino.h"
// Keypad (Mark Stanley / Alexander Brevig) — interface usada pelo simulador
typedef char KeypadEvent;
typedef enum { IDLE, PRESSED, HOLD, RELEASED } KeyState;
#define NO_KEY '\0'
#define makeKeymap(x) ((char *)x)
class Keypad {
 public:
  Keypad(char *userKeymap, byte *row, byte *col, byte numRows, byte numCols);
  char getKey();
  bool getKeys();
  KeyState getState();
  bool keyStateChanged();
  char waitForKey();
  bool isPressed(char keyChar);
  void setDebounceTime(uint16_t debounce);
  void setHoldTime(uint16_t hold);
  uint8_t numKeys();
  void begin(char *userKeymap);
};
