#pragma once
// US — sensor ultrassónico HC-SR04 (Trig/Echo). API compatível com a do Otto: US(trig, echo) ou
// init(trig, echo); read() devolve a distância em cm (999 sem eco).
#include <Arduino.h>

class US {
 public:
  US(int trigger = -1, int echo = -1) {
    _trig = -1;
    _echo = -1;
    if (trigger >= 0 && echo >= 0) init(trigger, echo);
  }
  void init(int trigger, int echo) {
    _trig = trigger;
    _echo = echo;
    pinMode(_trig, OUTPUT);
    pinMode(_echo, INPUT);
  }
  float read() {
    if (_trig < 0 || _echo < 0) return 999;
    digitalWrite(_trig, LOW);
    delayMicroseconds(2);
    digitalWrite(_trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(_trig, LOW);
    long us = pulseIn(_echo, HIGH, 30000);
    if (us == 0) return 999;
    return us / 58.0;
  }

 private:
  int _trig;
  int _echo;
};
