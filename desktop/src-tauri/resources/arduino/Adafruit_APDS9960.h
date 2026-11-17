#pragma once
#include "Arduino.h"
#include "Wire.h"
#define APDS9960_ADDRESS (0x39)
#define APDS9960_UP 0x01
#define APDS9960_DOWN 0x02
#define APDS9960_LEFT 0x03
#define APDS9960_RIGHT 0x04
typedef enum { APDS9960_AGAIN_1X = 0x00, APDS9960_AGAIN_4X = 0x01, APDS9960_AGAIN_16X = 0x02, APDS9960_AGAIN_64X = 0x03 } apds9960AGain_t;
typedef enum { APDS9960_PGAIN_1X = 0x00, APDS9960_PGAIN_2X = 0x04, APDS9960_PGAIN_4X = 0x08, APDS9960_PGAIN_8X = 0x0C } apds9960PGain_t;
class Adafruit_APDS9960 {
 public:
  Adafruit_APDS9960();
  bool begin(uint16_t iTimeMS = 10, apds9960AGain_t = APDS9960_AGAIN_4X, uint8_t addr = APDS9960_ADDRESS, TwoWire *theWire = &Wire);
  void enable(bool en = true);
  void enableProximity(bool en = true);
  void enableColor(bool en = true);
  void enableGesture(bool en = true);
  void setADCGain(apds9960AGain_t gain);
  void setProxGain(apds9960PGain_t gain);
  void setGestureGain(uint8_t gain);
  uint8_t readProximity();
  void enableProximityInterrupt();
  void disableProximityInterrupt();
  void setProximityInterruptThreshold(uint8_t low, uint8_t high, uint8_t persistence = 4);
  void clearInterrupt();
  bool colorDataReady();
  void getColorData(uint16_t *r, uint16_t *g, uint16_t *b, uint16_t *c);
  uint16_t calculateColorTemperature(uint16_t r, uint16_t g, uint16_t b);
  uint16_t calculateLux(uint16_t r, uint16_t g, uint16_t b);
  bool gestureValid();
  uint8_t readGesture();
};
