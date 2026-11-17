#pragma once
// Otto — robô bípede Otto DIY (API da OttoDIYLib v13).
// 4 servos: pernas YL/YR (rodam na vertical) e pés RL/RR (inclinam); buzzer; matriz de LEDs
// opcional (initMATRIX). Também aceita o init da Otto9 (com microfone e ultrassom):
//   init(YL, YR, RL, RR, load_calibration, Buzzer)
//   init(YL, YR, RL, RR, load_calibration, NoiseSensor, Buzzer, Trig, Echo)
#include <Arduino.h>
#include <EEPROM.h>
#include "Oscillator.h"
#include "US.h"
#include "Otto_sounds.h"
#include "Otto_gestures.h"
#include "Otto_mouths.h"
#include "Otto_matrix.h"

#ifndef FORWARD
#define FORWARD 1
#define BACKWARD -1
#define LEFT 1
#define RIGHT -1
#define SMALL 5
#define MEDIUM 15
#define BIG 30
#endif
class Otto {
 public:
  Otto() {
    _n = 4;
    _buzzer = -1;
    _noise = -1;
    _batPin = -1;
    _resting = false;
    for (int i = 0; i < 4; i++) {
      _pins[i] = -1;
      _trim[i] = 0;
      _pos[i] = 90;
    }
  }

  void init(int YL, int YR, int RL, int RR, bool load_calibration = true, int p6 = -1, int p7 = -1, int p8 = -1, int p9 = -1) {
    _n = 4;
    _pins[0] = YL;
    _pins[1] = YR;
    _pins[2] = RL;
    _pins[3] = RR;
    if (p7 == -1) {
      _buzzer = p6;
    } else {
      _noise = p6;
      _buzzer = p7;
      if (p8 >= 0 && p9 >= 0) _us.init(p8, p9);
    }
    if (_buzzer >= 0) pinMode(_buzzer, OUTPUT);
    if (_noise >= 0) pinMode(_noise, INPUT);
    if (load_calibration) loadCalibration();
    attachServos();
    for (int i = 0; i < _n; i++) _servo[i].SetTrim(_trim[i]);
    _resting = false;
  }

  // ---------- servos ----------
  void attachServos() {
    for (int i = 0; i < _n; i++) _servo[i].attach(_pins[i]);
  }
  void detachServos() {
    for (int i = 0; i < _n; i++) _servo[i].detach();
  }
  void setTrims(int YL, int YR, int RL, int RR) {
    _trim[0] = YL;
    _trim[1] = YR;
    _trim[2] = RL;
    _trim[3] = RR;
    for (int i = 0; i < _n; i++) _servo[i].SetTrim(_trim[i]);
  }
  // afinações na EEPROM (endereços 0…3, um byte com sinal por servo)
  void saveTrimsOnEEPROM() {
    for (int i = 0; i < _n; i++) EEPROM.write(i, (byte)(_trim[i] & 0xFF));
  }
  void loadCalibration() {
    for (int i = 0; i < _n; i++) {
      int v = EEPROM.read(i);
      if (v == 255) v = 0;
      if (v > 127) v = v - 256;
      if (v >= -90 && v <= 90) _trim[i] = v;
    }
  }
  void enableServoLimit(int speed = 240) {
    for (int i = 0; i < _n; i++) _servo[i].SetLimiter(speed);
  }
  void disableServoLimit() {
    for (int i = 0; i < _n; i++) _servo[i].DisableLimiter();
  }

  // move os servos em linha reta até target[] (um valor por servo), em time ms
  void _moveServos(int time, int target[]) {
    attachServos();
    if (getRestState()) setRestState(false);
    if (time > 10) {
      int steps = time / 10;
      int start[4];
      for (int i = 0; i < _n; i++) start[i] = _pos[i];
      for (int k = 1; k <= steps; k++) {
        for (int i = 0; i < _n; i++) _servo[i].SetPosition(start[i] + (target[i] - start[i]) * k / steps);
        delay(10);
      }
    }
    for (int i = 0; i < _n; i++) {
      _servo[i].SetPosition(target[i]);
      _pos[i] = target[i];
    }
  }
  void moveServos(int time, int target[]) { _moveServos(time, target); }
  void _moveSingle(int position, int servo_number) {
    if (servo_number < 0 || servo_number >= _n) return;
    if (position > 180 || position < 0) position = 90;
    attachServos();
    if (getRestState()) setRestState(false);
    _servo[servo_number].SetPosition(position);
    _pos[servo_number] = position;
  }
  void moveSingle(int position, int servo_number) { _moveSingle(position, servo_number); }

  // um ciclo (ou fração de ciclo) dos osciladores
  void oscillateServos(int A[], int O[], int T, double phase_diff[], float cycle = 1) {
    for (int i = 0; i < _n; i++) {
      _servo[i].SetO(O[i]);
      _servo[i].SetA(A[i]);
      _servo[i].SetT(T);
      _servo[i].SetPh(phase_diff[i]);
      _servo[i].Reset();
    }
    unsigned long ref = millis();
    unsigned long end = ref + (unsigned long)(T * cycle);
    while (millis() < end) {
      for (int i = 0; i < _n; i++) _servo[i].refresh();
      delay(5);
    }
    for (int i = 0; i < _n; i++) _pos[i] = _servo[i].getPosition();
  }
  void _execute(int A[], int O[], int T, double phase_diff[], float steps = 1.0) {
    attachServos();
    if (getRestState()) setRestState(false);
    // arranque suave: os osciladores começam em A·sin(fase) + O, que pode estar a 20–30° da posição
    // atual. Em vez de saltar para lá de uma vez (um solavanco que desequilibra o robô), os servos
    // vão até essa primeira posição em linha reta, num oitavo do período (100 a 250 ms).
    int first[4];
    bool far = false;
    for (int i = 0; i < _n; i++) {
      first[i] = 90 + O[i] + (int)round(A[i] * sin(phase_diff[i]));
      if (abs(first[i] - _pos[i]) > 3) far = true;
    }
    if (far) {
      int t0 = T / 8;
      if (t0 < 100) t0 = 100;
      if (t0 > 250) t0 = 250;
      _moveServos(t0, first);
    }
    int cycles = (int)steps;
    for (int i = 0; i < cycles; i++) oscillateServos(A, O, T, phase_diff, 1);
    float rest = steps - cycles;
    if (rest > 0.01) oscillateServos(A, O, T, phase_diff, rest);
  }
  void execute(int A[], int O[], int T, double phase_diff[], float steps = 1.0) { _execute(A, O, T, phase_diff, steps); }

  // ---------- posição de descanso ----------
  void home() {
    if (!_resting) {
      int target[4] = {90, 90, 90, 90};
      _moveServos(500, target);
      _resting = true;
    }
  }
  bool getRestState() { return _resting; }
  void setRestState(bool state) { _resting = state; }

  // ---------- movimentos ----------
  void jump(float steps = 1, int T = 2000) {
    int up[4] = {90, 90, 150, 30};
    _moveServos(T, up);
    int down[4] = {90, 90, 90, 90};
    _moveServos(T, down);
  }
  void walk(float steps = 4, int T = 1000, int dir = FORWARD) {
    int A[4] = {30, 30, 20, 20};
    int O[4] = {0, 0, 4, -4};
    double ph[4] = {0, 0, _rad(dir * -90), _rad(dir * -90)};
    _execute(A, O, T, ph, steps);
  }
  void turn(float steps = 4, int T = 2000, int dir = LEFT) {
    int A[4] = {30, 30, 20, 20};
    int O[4] = {0, 0, 4, -4};
    double ph[4] = {0, 0, _rad(-90), _rad(-90)};
    if (dir == LEFT) {
      A[0] = 30;
      A[1] = 10;
    } else {
      A[0] = 10;
      A[1] = 30;
    }
    _execute(A, O, T, ph, steps);
  }
  void bend(int steps = 1, int T = 1400, int dir = LEFT) {
    int pos1[4] = {90, 90, 62, 35};
    int pos2[4] = {90, 90, 62, 105};
    if (dir == RIGHT) {
      pos1[2] = 180 - 35;
      pos1[3] = 180 - 62;
      pos2[2] = 180 - 105;
      pos2[3] = 180 - 62;
    }
    int rest[4] = {90, 90, 90, 90};
    if (T < 600) T = 600;
    for (int i = 0; i < steps; i++) {
      _moveServos(T / 2, pos1);
      _moveServos(T / 2, pos2);
      delay(T * 0.8);
      _moveServos(500, rest);
    }
  }
  void shakeLeg(int steps = 1, int T = 2000, int dir = RIGHT) {
    int leg1[4] = {90, 90, 58, 35};
    int leg2[4] = {90, 90, 58, 120};
    int leg3[4] = {90, 90, 58, 60};
    if (dir == LEFT) {
      leg1[2] = 180 - 35;
      leg1[3] = 180 - 58;
      leg2[2] = 180 - 120;
      leg2[3] = 180 - 58;
      leg3[2] = 180 - 60;
      leg3[3] = 180 - 58;
    }
    int rest[4] = {90, 90, 90, 90};
    int moves = 2;
    int T2 = 1000;
    T = T - T2;
    if (T < 200 * moves) T = 200 * moves;
    for (int j = 0; j < steps; j++) {
      _moveServos(T2 / 2, leg1);
      _moveServos(T2 / 2, leg2);
      for (int i = 0; i < moves; i++) {
        _moveServos(T / (2 * moves), leg3);
        _moveServos(T / (2 * moves), leg2);
      }
      _moveServos(500, rest);
    }
    delay(T);
  }
  void updown(float steps = 1, int T = 1000, int h = 20) {
    int A[4] = {0, 0, h, h};
    int O[4] = {0, 0, h, -h};
    double ph[4] = {0, 0, _rad(-90), _rad(90)};
    _execute(A, O, T, ph, steps);
  }
  void swing(float steps = 1, int T = 1000, int h = 20) {
    int A[4] = {0, 0, h, h};
    int O[4] = {0, 0, h / 2, -h / 2};
    double ph[4] = {0, 0, 0, 0};
    _execute(A, O, T, ph, steps);
  }
  void tiptoeSwing(float steps = 1, int T = 900, int h = 20) {
    int A[4] = {0, 0, h, h};
    int O[4] = {0, 0, h, -h};
    double ph[4] = {0, 0, 0, 0};
    _execute(A, O, T, ph, steps);
  }
  void jitter(float steps = 1, int T = 500, int h = 20) {
    if (h > 25) h = 25;
    int A[4] = {h, h, 0, 0};
    int O[4] = {0, 0, 0, 0};
    double ph[4] = {_rad(-90), _rad(90), 0, 0};
    _execute(A, O, T, ph, steps);
  }
  void ascendingTurn(float steps = 1, int T = 900, int h = 20) {
    if (h > 13) h = 13;
    int A[4] = {h, h, h, h};
    int O[4] = {0, 0, h + 4, -h + 4};
    double ph[4] = {_rad(-90), _rad(90), _rad(-90), _rad(90)};
    _execute(A, O, T, ph, steps);
  }
  void moonwalker(float steps = 1, int T = 900, int h = 20, int dir = LEFT) {
    int A[4] = {0, 0, h, h};
    int O[4] = {0, 0, h / 2 + 2, -h / 2 - 2};
    int phi = -dir * 90;
    double ph[4] = {0, 0, _rad(phi), _rad(-60 * dir + phi)};
    _execute(A, O, T, ph, steps);
  }
  void crusaito(float steps = 1, int T = 900, int h = 20, int dir = FORWARD) {
    int A[4] = {25, 25, h, h};
    int O[4] = {0, 0, h / 2 + 4, -h / 2 - 4};
    double ph[4] = {_rad(90), _rad(90), 0, _rad(-60 * dir)};
    _execute(A, O, T, ph, steps);
  }
  void flapping(float steps = 1, int T = 1000, int h = 20, int dir = FORWARD) {
    int A[4] = {12, 12, h, h};
    int O[4] = {0, 0, h - 10, -h + 10};
    double ph[4] = {0, _rad(180), _rad(-90 * dir), _rad(90 * dir)};
    _execute(A, O, T, ph, steps);
  }

  // ---------- sensores ----------
  float getDistance() { return _us.read(); }
  int getNoise() {
    if (_noise < 0) return 0;
    return analogRead(_noise);
  }
  void initBatLevel(int batteryPIN) { _batPin = batteryPIN; }
  double getBatteryVoltage() {
    if (_batPin < 0) return 0;
    return analogRead(_batPin) * 5.0 / 1024.0;
  }
  double getBatteryLevel() {
    double p = (getBatteryVoltage() - 3.25) * 100.0 / (4.2 - 3.25);
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return p;
  }

  // ---------- matriz de LEDs (boca) ----------
  void initMATRIX(int DIN, int CS, int CLK, int rotate) { _matrix.init(DIN, CS, CLK, 1, rotate); }
  void matrixIntensity(int intensity) { _matrix.setIntensity(intensity); }
  void setLed(byte X, byte Y, byte value) { _matrix.setDot(X, Y, value); }
  void writeText(const char *s, byte scrollspeed) { _matrix.writeText(s, scrollspeed); }
  void putMouth(unsigned long mouth, bool predefined = true) { _matrix.writeFull(predefined ? OttoMouthShape((int)mouth) : mouth); }
  void putAnimationMouth(unsigned long anim, int index) { _matrix.writeFull(OttoAnimShape((int)anim, index)); }
  void clearMouth() { _matrix.clearMatrix(); }

  // ---------- sons ----------
  void _tone(float noteFrequency, long noteDuration, int silentDuration) {
    if (_buzzer < 0) {
      delay(noteDuration + silentDuration);
      return;
    }
    if (silentDuration == 0) silentDuration = 1;
    tone(_buzzer, (int)noteFrequency, noteDuration);
    delay(noteDuration);
    noTone(_buzzer);
    delay(silentDuration);
  }
  void bendTones(float initFrequency, float finalFrequency, float prop, long noteDuration, int silentDuration) {
    if (prop < 1.01) prop = 1.01;
    if (initFrequency < finalFrequency) {
      for (float f = initFrequency; f < finalFrequency; f = f * prop) _tone(f, noteDuration, silentDuration);
    } else {
      for (float f = initFrequency; f > finalFrequency; f = f / prop) _tone(f, noteDuration, silentDuration);
    }
  }
  void sing(int songName) {
    switch (songName) {
      case S_connection:
        _tone(note_E5, 50, 30);
        _tone(note_E6, 55, 25);
        _tone(note_A6, 60, 10);
        break;
      case S_disconnection:
        _tone(note_E5, 50, 30);
        _tone(note_A6, 55, 25);
        _tone(note_E5, 50, 60);
        break;
      case S_buttonPushed:
        bendTones(note_E6, note_G6, 1.03, 20, 2);
        delay(30);
        bendTones(note_E6, note_D7, 1.04, 10, 2);
        break;
      case S_mode1:
        bendTones(note_E6, note_A6, 1.02, 30, 10);
        break;
      case S_mode2:
        bendTones(note_G6, note_D7, 1.03, 30, 10);
        break;
      case S_mode3:
        _tone(note_E6, 50, 100);
        _tone(note_G6, 50, 80);
        _tone(note_D7, 300, 0);
        break;
      case S_surprise:
        bendTones(800, 2150, 1.02, 10, 1);
        bendTones(2149, 800, 1.03, 7, 1);
        break;
      case S_OhOoh:
        bendTones(880, 2000, 1.04, 8, 3);
        delay(200);
        for (int i = 880; i < 2000; i = i * 1.04) _tone(note_B5, 5, 10);
        break;
      case S_OhOoh2:
        bendTones(1880, 3000, 1.03, 8, 3);
        delay(200);
        for (int i = 1880; i < 3000; i = i * 1.03) _tone(note_C6, 10, 10);
        break;
      case S_cuddly:
        bendTones(700, 900, 1.03, 16, 4);
        bendTones(899, 650, 1.01, 18, 7);
        break;
      case S_sleeping:
        bendTones(100, 500, 1.04, 10, 10);
        delay(500);
        bendTones(400, 100, 1.04, 10, 1);
        break;
      case S_happy:
        bendTones(1500, 2500, 1.05, 20, 8);
        bendTones(2499, 1500, 1.05, 25, 8);
        break;
      case S_superHappy:
        bendTones(2000, 6000, 1.05, 8, 3);
        delay(50);
        bendTones(5999, 2000, 1.05, 13, 2);
        break;
      case S_happy_short:
        bendTones(1500, 2000, 1.05, 15, 8);
        delay(100);
        bendTones(1900, 2500, 1.05, 10, 8);
        break;
      case S_sad:
        bendTones(880, 669, 1.02, 20, 200);
        break;
      case S_confused:
        bendTones(1000, 1700, 1.03, 8, 2);
        bendTones(1699, 500, 1.04, 8, 3);
        bendTones(1000, 1700, 1.05, 9, 10);
        break;
      case S_fart1:
        bendTones(1600, 3000, 1.02, 2, 15);
        break;
      case S_fart2:
        bendTones(2000, 6000, 1.02, 2, 20);
        break;
      case S_fart3:
        bendTones(1600, 4000, 1.02, 2, 20);
        bendTones(4000, 3000, 1.02, 2, 20);
        break;
    }
  }

  // ---------- gestos (movimento + som + boca) ----------
  void playGesture(int gesture) {
    int rest[4] = {90, 90, 90, 90};
    switch (gesture) {
      case OttoHappy:
        putMouth(happyOpen);
        _tone(note_E5, 50, 30);
        sing(S_happy_short);
        swing(1, 800, 20);
        sing(S_happy_short);
        home();
        putMouth(smile);
        break;
      case OttoSuperHappy:
        putMouth(happyOpen);
        sing(S_happy);
        tiptoeSwing(1, 500, 20);
        sing(S_superHappy);
        tiptoeSwing(1, 500, 20);
        home();
        putMouth(happyClosed);
        break;
      case OttoSad: {
        putMouth(sad);
        int pose[4] = {110, 70, 20, 160};
        _moveServos(700, pose);
        bendTones(880, 830, 1.02, 20, 200);
        putMouth(sadClosed);
        bendTones(830, 790, 1.02, 20, 200);
        putMouth(sadOpen);
        bendTones(790, 740, 1.02, 20, 200);
        bendTones(740, 700, 1.02, 20, 200);
        bendTones(700, 669, 1.02, 20, 200);
        putMouth(sad);
        delay(500);
        home();
        delay(300);
        putMouth(smile);
        break;
      }
      case OttoSleeping: {
        int pose[4] = {100, 80, 60, 120};
        _moveServos(700, pose);
        for (int i = 0; i < 4; i++) {
          putAnimationMouth(dreamMouth, 0);
          bendTones(100, 200, 1.04, 10, 10);
          putAnimationMouth(dreamMouth, 1);
          bendTones(200, 300, 1.04, 10, 10);
          putAnimationMouth(dreamMouth, 2);
          bendTones(300, 500, 1.04, 10, 10);
          delay(500);
          putAnimationMouth(dreamMouth, 1);
          bendTones(400, 250, 1.04, 10, 1);
          putAnimationMouth(dreamMouth, 0);
          bendTones(250, 100, 1.04, 10, 1);
          delay(500);
        }
        putMouth(lineMouth);
        sing(S_cuddly);
        home();
        putMouth(happyOpen);
        break;
      }
      case OttoFart: {
        int p1[4] = {90, 90, 145, 122};
        int p2[4] = {90, 90, 80, 122};
        int p3[4] = {90, 90, 145, 80};
        _moveServos(500, p1);
        delay(300);
        putMouth(lineMouth);
        sing(S_fart1);
        putMouth(tongueOut);
        delay(250);
        _moveServos(500, p2);
        delay(300);
        putMouth(lineMouth);
        sing(S_fart2);
        putMouth(tongueOut);
        delay(250);
        _moveServos(500, p3);
        delay(300);
        putMouth(lineMouth);
        sing(S_fart3);
        putMouth(tongueOut);
        delay(300);
        home();
        delay(500);
        putMouth(happyOpen);
        break;
      }
      case OttoConfused: {
        int pose[4] = {110, 70, 90, 90};
        _moveServos(300, pose);
        putMouth(confused);
        sing(S_confused);
        delay(500);
        home();
        putMouth(happyOpen);
        break;
      }
      case OttoLove:
        putMouth(heart);
        sing(S_cuddly);
        crusaito(2, 1500, 15, 1);
        home();
        sing(S_happy_short);
        putMouth(happyOpen);
        break;
      case OttoAngry: {
        int pose[4] = {90, 90, 70, 110};
        _moveServos(300, pose);
        putMouth(angry);
        _tone(note_A5, 100, 30);
        bendTones(note_A5, note_D6, 1.02, 7, 4);
        bendTones(note_D6, note_E6, 1.02, 10, 1);
        bendTones(note_E6, note_A6, 1.02, 10, 1);
        _tone(note_A5, 100, 30);
        home();
        shakeLeg(1, 2000, LEFT);
        shakeLeg(1, 2000, RIGHT);
        putMouth(happyOpen);
        break;
      }
      case OttoFretful: {
        int pose[4] = {90, 90, 90, 110};
        _moveServos(300, pose);
        putMouth(diagonal);
        bendTones(note_A5, note_D6, 1.02, 7, 4);
        jitter(2, 300, 20);
        home();
        putMouth(happyOpen);
        break;
      }
      case OttoMagic:
        for (int i = 0; i < 4; i++) {
          putAnimationMouth(adivinawi, i);
          bendTones(400, 4000, 1.05, 5, 5);
          bendTones(4000, 400, 1.05, 5, 5);
        }
        updown(1, 800, 25);
        home();
        putMouth(happyOpen);
        sing(S_happy);
        break;
      case OttoWave:
        for (int i = 0; i < 2; i++) {
          putAnimationMouth(wave, i * 3);
          bendTones(note_C6, note_G6, 1.03, 10, 5);
          updown(1, 700, 15);
        }
        home();
        putMouth(happyOpen);
        break;
      case OttoVictory: {
        putMouth(smallSurprise);
        int up[4] = {90, 90, 170, 10};
        _moveServos(500, up);
        putMouth(bigSurprise);
        sing(S_superHappy);
        tiptoeSwing(2, 600, 20);
        home();
        putMouth(happyOpen);
        break;
      }
      case OttoFail: {
        int b1[4] = {90, 90, 70, 35};
        int b2[4] = {90, 90, 55, 35};
        int b3[4] = {90, 90, 42, 35};
        putMouth(sadOpen);
        _moveServos(300, b1);
        _tone(900, 200, 1);
        putMouth(sadClosed);
        _moveServos(300, b2);
        _tone(600, 200, 1);
        putMouth(confused);
        _moveServos(300, b3);
        _tone(300, 300, 1);
        putMouth(xMouth);
        delay(1000);
        detachServos();
        sing(S_sad);
        attachServos();
        _moveServos(500, rest);
        putMouth(happyOpen);
        break;
      }
    }
  }

 private:
  double _rad(double g) { return g * 3.14159265 / 180.0; }
  Oscillator _servo[4];
  US _us;
  Otto_Matrix _matrix;
  int _pins[4];
  int _trim[4];
  int _pos[4];
  int _n;
  int _buzzer;
  int _noise;
  int _batPin;
  bool _resting;
};
