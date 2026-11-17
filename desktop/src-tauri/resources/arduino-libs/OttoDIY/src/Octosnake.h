#pragma once
// Octosnake — oscilador por tempo para os passos do quadrúpede:
//   saída = offset + amplitude · sin(2π · (t − t0) / período + fase)   (graus; fase em graus)
// API compatível com a do MiniKame / Otto Quad (classe Oscillator, como no original: não inclua
// também o Oscillator.h do Otto bípede no mesmo sketch).
#include <Arduino.h>

#ifndef PI
#define PI 3.14159265
#endif

class Oscillator {
 public:
  Oscillator() {
    _period = 2000;
    _amplitude = 50;
    _phase = 0;
    _offset = 0;
    _output = 0;
    _stop = true;
    _ref_time = millis();
    _delta_time = 0;
  }
  float update() {
    if (!_stop) {
      _delta_time = (millis() - _ref_time) % (unsigned long)_period;
      _output = _amplitude * sin(time_to_radians(_delta_time) + degrees_to_radians(_phase)) + _offset;
    }
    return _output;
  }
  void reset() { _ref_time = millis(); }
  void start() {
    reset();
    _stop = false;
  }
  void start(unsigned long ref_time) {
    _ref_time = ref_time;
    _stop = false;
  }
  void stop() { _stop = true; }
  bool isStop() { return _stop; }
  float time_to_radians(double time) { return time * 2.0 * PI / _period; }
  float degrees_to_radians(float degrees) { return degrees * 2.0 * PI / 360.0; }
  float degrees_to_time(float degrees) { return degrees * _period / 360.0; }
  void setPeriod(int period) { _period = period > 0 ? period : 1; }
  int getPeriod() { return _period; }
  void setAmplitude(int amplitude) { _amplitude = amplitude; }
  void setPhase(int phase) { _phase = phase; }
  void setOffset(int offset) { _offset = offset; }
  void setTime(unsigned long ref) { _ref_time = ref; }
  float getOutput() { return _output; }
  float getPhaseProgress() { return ((float)_delta_time / _period) * 360.0; }
  unsigned long getTime() { return _ref_time; }

 private:
  int _period;
  int _amplitude;
  int _phase;
  int _offset;
  float _output;
  bool _stop;
  unsigned long _ref_time;
  float _delta_time;
};
