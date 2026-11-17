#pragma once
#include "Arduino.h"
// SevSeg (Dean Reading) — interface usada pelo simulador
#define COMMON_CATHODE 0
#define COMMON_ANODE 1
#define N_TRANSISTORS 2
#define P_TRANSISTORS 3
#define NP_COMMON_CATHODE 1
#define NP_COMMON_ANODE 0
class SevSeg {
 public:
  SevSeg();
  void refreshDisplay();
  void begin(uint8_t hardwareConfig, uint8_t numDigitsIn, const uint8_t digitPinsIn[], const uint8_t segmentPinsIn[], bool resOnSegmentsIn = 0, bool updateWithDelaysIn = 0, bool leadingZerosIn = 0, bool disableDecPoint = 0);
  void setBrightness(int16_t brightnessIn);
  void setNumber(int32_t numToShow, int8_t decPlaces = -1, bool hex = 0);
  void setNumberF(float numToShow, int8_t decPlaces = -1, bool hex = 0);
  void setSegments(const uint8_t segs[]);
  void setChars(const char str[]);
  void blank(void);
};
