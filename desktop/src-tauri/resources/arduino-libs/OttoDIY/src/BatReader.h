#pragma once
// BatReader — tensão e carga de uma bateria de lítio (3,25–4,2 V) lida num pino analógico
// (por omissão A7), com referência de 5 V.
#include <Arduino.h>
#ifndef BAT_PIN
#define BAT_PIN A7
#endif
#define BAT_MAX 4.2
#define BAT_MIN 3.25
#define ANA_REF 5

class BatReader {
 public:
  BatReader(int pin = BAT_PIN) { _pin = pin; }
  void init(int pin) { _pin = pin; }
  double readBatVoltage() { return analogRead(_pin) * (double)ANA_REF / 1024.0; }
  double readBatPercent() {
    double p = (readBatVoltage() - BAT_MIN) * 100.0 / (BAT_MAX - BAT_MIN);
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return p;
  }

 private:
  int _pin;
};
