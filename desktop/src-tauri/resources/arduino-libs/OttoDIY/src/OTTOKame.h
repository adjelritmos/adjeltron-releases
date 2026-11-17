#pragma once
// OTTOKame.h — MiniKame / Otto Quad com 8 servos nos pinos fixos do Otto Quad
// (ancas FR 2, FL 8, BR 4, BL 6; pernas FR 3, FL 9, BR 5, BL 7), ultrassom (Trig 12, Echo 11),
// matriz de LEDs MAX7219 em A1 (DIN), A2 (CS), A3 (CLK) e buzzer:
//   MiniKame robot;  robot.init(13);  robot.walk(1, 4, 550);  robot.putMouth(smile);
// Mesmos passos do Quad, mais sensores, bateria (A7), sons e gestos do Otto.
#include <Arduino.h>
#include <EEPROM.h>
#ifdef ARDUINO_ARCH_ESP32
#include <ESP32Servo.h>
#else
#include <Servo.h>
#endif
#include "Octosnake.h"
#include "US.h"
#include "MaxMatrix.h"
#include "BatReader.h"
#include "Otto_sounds.h"
#include "Otto_gestures.h"
#include "Otto_mouths.h"
#define FRONT_RIGHT_HIP 0
#define FRONT_LEFT_HIP 1
#define FRONT_RIGHT_LEG 2
#define FRONT_LEFT_LEG 3
#define BACK_RIGHT_HIP 4
#define BACK_LEFT_HIP 5
#define BACK_RIGHT_LEG 6
#define BACK_LEFT_LEG 7
#ifndef PIN_Trigger
#define PIN_Trigger 12
#define PIN_Echo 11
#endif
#ifndef PIN_NoiseSensor
#define PIN_NoiseSensor A6
#endif

class MiniKame {
 public:
  MiniKame() {
    _clear();
    pinBuzzer = -1;
    pinNoiseSensor = PIN_NoiseSensor;
  }
  void init(int Buzzer = 13) {
    pinBuzzer = Buzzer;
    if (pinBuzzer >= 0) pinMode(pinBuzzer, OUTPUT);
    board_pins[FRONT_RIGHT_HIP] = 2;
    board_pins[FRONT_LEFT_HIP] = 8;
    board_pins[BACK_RIGHT_HIP] = 4;
    board_pins[BACK_LEFT_HIP] = 6;
    board_pins[FRONT_RIGHT_LEG] = 3;
    board_pins[FRONT_LEFT_LEG] = 9;
    board_pins[BACK_RIGHT_LEG] = 5;
    board_pins[BACK_LEFT_LEG] = 7;
    loadTrim();
    attachServo();
    home();
    us.init(PIN_Trigger, PIN_Echo);
    ledmatrix.begin(A1, A2, A3, 1);
  }

  // ---------- sensores e bateria ----------
  float getDistance() { return us.read(); }
  int getNoise() { return analogRead(pinNoiseSensor); }
  double getBatteryLevel() { return battery.readBatPercent(); }
  double getBatteryVoltage() { return battery.readBatVoltage(); }

  // ---------- boca ----------
  void putMouth(unsigned long mouth, bool predefined = true) { ledmatrix.writeFull(predefined ? OttoMouthShape((int)mouth) : mouth); }
  void putAnimationMouth(unsigned long anim, int index) { ledmatrix.writeFull(OttoAnimShape((int)anim, index)); }
  void clearMouth() { ledmatrix.clearMatrix(); }

  // ---------- sons ----------
  void _tone(float noteFrequency, long noteDuration, int silentDuration) {
    if (pinBuzzer < 0) {
      delay(noteDuration + silentDuration);
      return;
    }
    if (silentDuration == 0) silentDuration = 1;
    tone(pinBuzzer, (int)noteFrequency, noteDuration);
    delay(noteDuration);
    noTone(pinBuzzer);
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
        break;
      case S_OhOoh2:
        bendTones(1880, 3000, 1.03, 8, 3);
        delay(200);
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
  // gestos com o corpo de 4 patas (boca + som + movimento)
  void playGesture(int gesture) {
    switch (gesture) {
      case OttoHappy:
        putMouth(happyOpen);
        sing(S_happy_short);
        upDown(2, 500);
        home();
        putMouth(smile);
        break;
      case OttoSuperHappy:
        putMouth(happyOpen);
        sing(S_superHappy);
        dance(1, 1500);
        home();
        putMouth(happyClosed);
        break;
      case OttoSad:
        putMouth(sad);
        Hide(1, 1500);
        sing(S_sad);
        home();
        putMouth(smile);
        break;
      case OttoSleeping:
        putAnimationMouth(dreamMouth, 0);
        Hide(1, 1000);
        sing(S_sleeping);
        putMouth(lineMouth);
        home();
        break;
      case OttoFart:
        putMouth(tongueOut);
        sing(S_fart1);
        pushUp(1, 2000);
        sing(S_fart3);
        home();
        putMouth(happyOpen);
        break;
      case OttoConfused:
        putMouth(confused);
        sing(S_confused);
        frontBack(1, 1500);
        home();
        putMouth(happyOpen);
        break;
      case OttoLove:
        putMouth(heart);
        sing(S_cuddly);
        waveHAND(2, 700);
        home();
        putMouth(happyOpen);
        break;
      case OttoAngry:
        putMouth(angry);
        bendTones(note_A5, note_D6, 1.02, 7, 4);
        upDown(3, 300);
        home();
        putMouth(happyOpen);
        break;
      case OttoFretful:
        putMouth(diagonal);
        bendTones(note_A5, note_D6, 1.02, 7, 4);
        frontBack(2, 600);
        home();
        putMouth(happyOpen);
        break;
      case OttoMagic:
        putAnimationMouth(adivinawi, 0);
        bendTones(400, 4000, 1.05, 5, 5);
        moonwalkL(2, 1500);
        home();
        putMouth(happyOpen);
        break;
      case OttoWave:
        putAnimationMouth(wave, 0);
        hello();
        putMouth(happyOpen);
        break;
      case OttoVictory:
        putMouth(bigSurprise);
        sing(S_superHappy);
        jump();
        putMouth(happyOpen);
        break;
      case OttoFail:
        putMouth(xMouth);
        sing(S_sad);
        Hide(1, 1500);
        delay(500);
        home();
        putMouth(sadClosed);
        break;
    }
  }

  MaxMatrix ledmatrix;

  // ---------- servos ----------
  void attachServo() {
    for (int i = 0; i < 8; i++)
      if (board_pins[i] >= 0) servo[i].attach(board_pins[i]);
  }
  void detachServo() {
    for (int i = 0; i < 8; i++) servo[i].detach();
  }
  void reverseServo(int id) {
    if (id >= 0 && id < 8) reverse[id] = !reverse[id];
  }
  void setTrim(int index, int value) {
    if (index >= 0 && index < 8) trim[index] = value;
  }
  // um servo (graus, 0–180) com afinação e sentido invertido
  void setServo(int id, float target) {
    if (id < 0 || id > 7) return;
    _pos[id] = target;
    int a = (int)(target + trim[id]);
    if (reverse[id]) a = 180 - a;
    if (a < 0) a = 0;
    if (a > 180) a = 180;
    servo[id].write(a);
  }
  // todos os servos em linha reta até target[], em time ms
  void moveServos(int time, float target[8]) {
    if (getRestState()) setRestState(false);
    if (time > 10) {
      float start[8];
      for (int i = 0; i < 8; i++) start[i] = _pos[i];
      int steps = time / 10;
      for (int k = 1; k <= steps; k++) {
        for (int i = 0; i < 8; i++) setServo(i, start[i] + (target[i] - start[i]) * k / steps);
        delay(10);
      }
    }
    for (int i = 0; i < 8; i++) setServo(i, target[i]);
  }
  bool getRestState() { return isOttoResting; }
  void setRestState(bool state) { isOttoResting = state; }
  // atualiza os servos com os osciladores que estão a correr
  void refresh() {
    for (int i = 0; i < 8; i++)
      if (!oscillator[i].isStop()) setServo(i, oscillator[i].update());
  }

  // ---------- posição de descanso ----------
  void home() {
    int ap = 20;
    float rest[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    for (int i = 0; i < 8; i++) {
      oscillator[i].stop();
      setServo(i, rest[i]);
    }
    isOttoResting = true;
  }

  // ---------- passos ----------
  void walk(int dir = 1, float steps = 4, float T = 550) {
    // ancas a oscilar, pernas a levantar com o dobro da frequência; pares diagonais alternados
    int x = 15;
    int z = 20;
    int ap = 20;
    int hi = -10;
    float period[8] = {T, T, T / 2, T / 2, T, T, T / 2, T / 2};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90 - hi, 90 + hi, 90 - ap, 90 + ap, 90 + hi, 90 - hi};
    int phase[8] = {270, 270, 270, 90, 90, 90, 90, 270};
    if (dir == 0 || dir < 0) {
      phase[0] = 90;
      phase[1] = 90;
      phase[4] = 270;
      phase[5] = 270;
    }
    if (getRestState()) setRestState(false);
    for (int i = 0; i < 8; i++) {
      oscillator[i].setPeriod(period[i]);
      oscillator[i].setAmplitude(amplitude[i]);
      oscillator[i].setPhase(phase[i]);
      oscillator[i].setOffset(offset[i]);
    }
    unsigned long t0 = millis();
    for (int i = 0; i < 8; i++) oscillator[i].start(t0);
    unsigned long end = t0 + (unsigned long)(T * steps);
    unsigned long half = (unsigned long)(T / 2);
    while (millis() < end) {
      // meio ciclo levanta um par diagonal, o outro meio ciclo o outro par (divisão inteira:
      // com variáveis inteiras o tradutor do simulador também a faz inteira)
      unsigned long dt = millis() - t0;
      int side = (dt / half) % 2;
      setServo(0, oscillator[0].update());
      setServo(1, oscillator[1].update());
      setServo(4, oscillator[4].update());
      setServo(5, oscillator[5].update());
      if (!side) {
        setServo(3, oscillator[3].update());
        setServo(6, oscillator[6].update());
      } else {
        setServo(2, oscillator[2].update());
        setServo(7, oscillator[7].update());
      }
      delay(5);
    }
    for (int i = 0; i < 8; i++) oscillator[i].stop();
  }
  void run(int dir = 1, float steps = 4, float T = 550) {
    int x = 15;
    int z = 15;
    int ap = 15;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {0, 0, 90, 90, 180, 180, 90, 90};
    if (dir == 1) {
      phase[0] = 180;
      phase[1] = 180;
      phase[4] = 0;
      phase[5] = 0;
    }
    execute(steps, period, amplitude, offset, phase);
  }
  void turnL(float steps = 1, float T = 550) {
    int x = 15;
    int z = 15;
    int ap = 15;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {0, 180, 90, 90, 180, 0, 90, 90};
    execute(steps, period, amplitude, offset, phase);
  }
  void turnR(float steps = 1, float T = 550) {
    int x = 15;
    int z = 15;
    int ap = 15;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {180, 0, 90, 90, 0, 180, 90, 90};
    execute(steps, period, amplitude, offset, phase);
  }
  // andar de lado / em diagonal: side = true para a direita; turn_factor 0 (frente) … 1 (lado)
  void omniWalk(bool side = true, float T = 1000, float turn_factor = 2) {
    int x = 15;
    int z = 15;
    int ap = 15;
    int hi = 23;
    int fx = (int)(6 * (1 - turn_factor * turn_factor));
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap - fx, 90 - ap + fx, 90 - hi, 90 + hi, 90 - ap - fx, 90 + ap + fx, 90 + hi, 90 - hi};
    int fwd[8] = {0, 0, 90, 90, 180, 180, 90, 90};
    int sideR[8] = {0, 180, 90, 90, 180, 0, 90, 90};
    int sideL[8] = {180, 0, 90, 90, 0, 180, 90, 90};
    int phase[8];
    for (int i = 0; i < 8; i++) phase[i] = (int)(fwd[i] * (1 - turn_factor) + (side ? sideR[i] : sideL[i]) * turn_factor);
    execute(1, period, amplitude, offset, phase);
  }
  void moonwalkL(float steps = 10, float T = 2000) {
    int z = 45;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, z, z, 0, 0, z, z};
    int offset[8] = {90, 90, 90, 90, 90, 90, 90, 90};
    int phase[8] = {0, 0, 0, 120, 0, 0, 180, 290};
    execute(steps, period, amplitude, offset, phase);
  }
  void dance(float steps = 1, float T = 2000) {
    int z = 40;
    int ap = 30;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, z, z, 0, 0, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {0, 0, 0, 270, 0, 0, 90, 180};
    execute(steps, period, amplitude, offset, phase);
  }
  void upDown(float steps = 1, float T = 500) {
    int z = 35;
    int ap = 20;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, z, z, 0, 0, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {0, 0, 90, 270, 180, 180, 270, 90};
    execute(steps, period, amplitude, offset, phase);
  }
  void pushUp(float steps = 1, float T = 5000) {
    int z = 40;
    int x = 65;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, z, z, 0, 0, 0, 0};
    int offset[8] = {90, 90, 90, 90, 90 - x, 90 + x, 90, 90};
    int phase[8] = {0, 0, 0, 180, 0, 0, 0, 180};
    execute(steps, period, amplitude, offset, phase);
  }
  void frontBack(float steps = 1, float T = 2000) {
    int x = 30;
    int z = 25;
    int ap = 20;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {x, x, z, z, x, x, z, z};
    int offset[8] = {90 + ap, 90 - ap, 90, 90, 90 - ap, 90 + ap, 90, 90};
    int phase[8] = {0, 180, 270, 90, 0, 180, 90, 270};
    execute(steps, period, amplitude, offset, phase);
  }
  // acena com a pata da frente direita
  void waveHAND(float steps = 1, float T = 700) {
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, -20, 0, 0, 0, 0, 0};
    int offset[8] = {90, 90, 30, 60, 25, 175, 90, 90};
    int phase[8] = {0, 0, 0, 0, 0, 0, 0, 0};
    execute(steps, period, amplitude, offset, phase);
  }
  // encolhe-se (pernas todas para cima)
  void Hide(float steps = 1, float T = 700) {
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 0, 0, 0, 0, 0, 0, 0};
    int offset[8] = {90, 90, 10, 170, 90, 90, 170, 10};
    int phase[8] = {0, 0, 0, 0, 0, 0, 0, 0};
    execute(steps, period, amplitude, offset, phase);
  }
  void hello() {
    float sit[8] = {105, 75, 25, 155, 110, 70, 100, 80};
    moveServos(150, sit);
    delay(200);
    int T = 350;
    float period[8] = {T, T, T, T, T, T, T, T};
    int amplitude[8] = {0, 50, 0, 50, 0, 0, 0, 0};
    int offset[8] = {105, 40, 80, 100, 110, 70, 155, 90};
    int phase[8] = {0, 0, 0, 90, 0, 0, 0, 0};
    execute(4, period, amplitude, offset, phase);
    float up[8] = {160, 20, 90, 90, 70, 110, 100, 80};
    moveServos(500, up);
    delay(200);
    home();
  }
  void jump() {
    float sit[8] = {105, 75, 30, 150, 110, 70, 150, 30};
    float leap[8] = {110, 70, 170, 10, 30, 150, 10, 170};
    moveServos(10, sit);
    delay(1000);
    moveServos(1, leap);
    delay(100);
    home();
  }
  void scared() {
    float sit[8] = {105, 75, 30, 150, 110, 70, 150, 30};
    float leap[8] = {110, 70, 170, 10, 30, 150, 10, 170};
    moveServos(10, leap);
    delay(2000);
    moveServos(1, sit);
    delay(100);
    home();
  }

  // ---------- afinações na EEPROM (palavra mágica no endereço 0, 8 palavras a partir do 2) ----------
  void storeTrim() {
    for (int i = 0; i < 8; i++) EEPROMWriteWord(i * 2 + 2, trim[i]);
    EEPROMWriteWord(0, 0xabcd);
  }
  void loadTrim() {
    if ((EEPROMReadWord(0) & 0xffff) != 0xabcd) return;
    for (int i = 0; i < 8; i++) {
      int v = EEPROMReadWord(i * 2 + 2);
      if (v >= -90 && v <= 90) trim[i] = v;
    }
  }

  // corre os 8 osciladores durante "steps" ciclos
  void execute(float steps, float period[8], int amplitude[8], int offset[8], int phase[8]) {
    if (getRestState()) setRestState(false);
    float longest = 0;
    for (int i = 0; i < 8; i++) {
      oscillator[i].setPeriod(period[i]);
      oscillator[i].setAmplitude(amplitude[i]);
      oscillator[i].setPhase(phase[i]);
      oscillator[i].setOffset(offset[i]);
      if (period[i] > longest) longest = period[i];
    }
    unsigned long t0 = millis();
    for (int i = 0; i < 8; i++) oscillator[i].start(t0);
    unsigned long end = t0 + (unsigned long)(longest * steps);
    while (millis() < end) {
      refresh();
      delay(5);
    }
    for (int i = 0; i < 8; i++) oscillator[i].stop();
  }

 private:
  US us;
  BatReader battery;
  int pinBuzzer;
  int pinNoiseSensor;
  int EEPROMReadWord(int p_address) {
    int lo = EEPROM.read(p_address);
    int hi = EEPROM.read(p_address + 1);
    int v = (hi << 8) | lo;
    if (v > 32767) v = v - 65536;
    return v;
  }
  void EEPROMWriteWord(int p_address, int p_value) {
    EEPROM.write(p_address, p_value & 0xff);
    EEPROM.write(p_address + 1, (p_value >> 8) & 0xff);
  }
  void _clear() {
    isOttoResting = false;
    for (int i = 0; i < 8; i++) {
      board_pins[i] = -1;
      trim[i] = 0;
      reverse[i] = false;
      _pos[i] = 90;
    }
  }
  Oscillator oscillator[8];
  Servo servo[8];
  int board_pins[8];
  int trim[8];
  bool reverse[8];
  float _pos[8];
  bool isOttoResting;
};
