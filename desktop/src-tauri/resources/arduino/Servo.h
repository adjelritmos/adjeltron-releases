#pragma once
#include "Arduino.h"
class Servo {
 public:
  Servo();
  uint8_t attach(int pin);
  uint8_t attach(int pin, int min, int max);
  void detach();
  void write(int value);
  void writeMicroseconds(int value);
  int read();
  int readMicroseconds();
  bool attached();
#if defined(ESP32)
  void setPeriodHertz(int hz); // ESP32Servo: 50 Hz por omissão
#endif
};
