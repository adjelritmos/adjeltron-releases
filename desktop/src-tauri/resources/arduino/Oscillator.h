#pragma once
// Oscillator — servo que segue posição = A · sin(fase + fase0) + O (graus em torno dos 90°),
// amostrada a cada 30 ms com período T. API compatível com a do Otto DIY.
#include <Arduino.h>
#ifdef ARDUINO_ARCH_ESP32
#include <ESP32Servo.h>
#else
#include <Servo.h>
#endif

class Oscillator {
 public:
  Oscillator(int trim = 0) {
    _trim = trim;
    _A = 0;
    _O = 0;
    _phase0 = 0;
    _phase = 0;
    _T = 2000;
    _period = 30;
    _inc = 2.0 * 3.14159265 * 30.0 / 2000.0;
    _rev = false;
    _stop = true;
    _pos = 90;
    _last = 0;
    _limit = 0;
    _pin = -1;
  }
  void attach(int pin, bool rev = false) {
    if (pin < 0) return;
    if (_servo.attached()) _servo.detach();
    _servo.attach(pin);
    _pin = pin;
    _rev = rev;
    _last = millis();
    _stop = false;
  }
  void detach() {
    if (_servo.attached()) _servo.detach();
  }
  void SetA(int A) { _A = A; }
  void SetO(int O) { _O = O; }
  void SetPh(double Ph) { _phase0 = Ph; }
  void SetT(unsigned int T) {
    _T = T;
    _inc = 2.0 * 3.14159265 * _period / (double)_T;
  }
  void SetTrim(int trim) { _trim = trim; }
  int getTrim() { return _trim; }
  void SetPosition(int position) { _write(position); }
  void Stop() { _stop = true; }
  void Play() { _stop = false; }
  void Reset() { _phase = 0; }
  void SetLimiter(int diffLimit) { _limit = diffLimit; }
  void DisableLimiter() { _limit = 0; }
  int getPosition() { return _pos; }
  void refresh() {
    if (millis() - _last >= (unsigned long)_period) {
      _last = millis();
      if (!_stop) {
        int pos = (int)round(_A * sin(_phase + _phase0) + _O);
        if (_rev) pos = -pos;
        _write(pos + 90);
      }
      _phase = _phase + _inc;
    }
  }

 private:
  void _write(int position) {
    if (_pin < 0) return;
    int p = position + _trim;
    if (_limit > 0) {
      int maxStep = (_limit * _period) / 1000;
      if (maxStep < 1) maxStep = 1;
      if (p > _pos + maxStep) p = _pos + maxStep;
      if (p < _pos - maxStep) p = _pos - maxStep;
    }
    if (p < 0) p = 0;
    if (p > 180) p = 180;
    _pos = p;
    _servo.write(p);
  }
  Servo _servo;
  int _A;
  int _O;
  double _phase0;
  double _phase;
  unsigned int _T;
  int _period;
  double _inc;
  bool _rev;
  bool _stop;
  int _pos;
  unsigned long _last;
  int _trim;
  int _limit;
  int _pin;
};
