#pragma once
#include "Arduino.h"
// OneWire (Paul Stoffregen) — interface usada pelo simulador
class OneWire {
 public:
  OneWire();
  OneWire(uint8_t pin);
  void begin(uint8_t pin);
  uint8_t reset(void);
  void select(const uint8_t rom[8]);
  void skip(void);
  void write(uint8_t v, uint8_t power = 0);
  void write_bytes(const uint8_t *buf, uint16_t count, bool power = 0);
  uint8_t read(void);
  void read_bytes(uint8_t *buf, uint16_t count);
  void depower(void);
  void reset_search();
  bool search(uint8_t *newAddr, bool search_mode = true);
  static uint8_t crc8(const uint8_t *addr, uint8_t len);
};
