#pragma once
#include "Arduino.h"
// Encoder.h (Paul Stoffregen / PJRC) — contagem de encoders em quadratura (resolução 4x).
class Encoder {
 public:
  Encoder(uint8_t pin1, uint8_t pin2);
  int32_t read();
  int32_t readAndReset();
  void write(int32_t p);
};
