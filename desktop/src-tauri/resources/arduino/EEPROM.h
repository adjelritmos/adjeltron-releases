// EEPROM.h — só para VERIFICAR o sketch (o simulador implementa em sim/libs/EEPROM.js).
// AVR: 1 KB (Uno/Nano) ou 4 KB (Mega). ESP32/Pico: emulada na flash (begin/commit).
#pragma once
#include "Arduino.h"

struct EERef {
  int index;
  operator uint8_t() const;
  EERef &operator=(uint8_t v);
  EERef &operator=(const EERef &r);
  EERef &operator+=(uint8_t v);
  EERef &operator-=(uint8_t v);
  EERef &operator++();
  EERef &operator--();
  uint8_t operator++(int);
  uint8_t operator--(int);
  EERef &update(uint8_t v);
};

class EEPROMClass {
 public:
  uint8_t read(int idx);
  void write(int idx, uint8_t val);
  void update(int idx, uint8_t val);
  EERef operator[](int idx);
  uint16_t length();
  template <typename T> T &get(int idx, T &t) { return t; }
  template <typename T> const T &put(int idx, const T &t) { return t; }
#if defined(ESP32) || defined(ARDUINO_ARCH_RP2040)
  bool begin(size_t size);
  bool commit();
  void end();
#endif
};
extern EEPROMClass EEPROM;
