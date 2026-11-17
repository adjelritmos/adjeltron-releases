#pragma once
// TimerFreeTone(pin, frequência, duração em ms[, volume 1–10]) — toca uma nota e espera que acabe.
#include <Arduino.h>

static void TimerFreeTone(uint8_t pin, unsigned long frequency, unsigned int duration, uint8_t volume = 10) {
  if (frequency == 0 || volume == 0) {
    delay(duration);
    return;
  }
  tone(pin, frequency, duration);
  delay(duration);
  noTone(pin);
}
