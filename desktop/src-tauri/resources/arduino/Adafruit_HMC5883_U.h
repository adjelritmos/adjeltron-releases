#pragma once
#include "Arduino.h"
#include "Wire.h"
#include "Adafruit_Sensor.h"
#include "Adafruit_Sensor_t.h"
#define HMC5883_ADDRESS_MAG (0x3C >> 1)
typedef enum {
  HMC5883_MAGGAIN_1_3 = 0x20, HMC5883_MAGGAIN_1_9 = 0x40, HMC5883_MAGGAIN_2_5 = 0x60, HMC5883_MAGGAIN_4_0 = 0x80,
  HMC5883_MAGGAIN_4_7 = 0xA0, HMC5883_MAGGAIN_5_6 = 0xC0, HMC5883_MAGGAIN_8_1 = 0xE0
} hmc5883MagGain;
class Adafruit_HMC5883_Unified {
 public:
  Adafruit_HMC5883_Unified(int32_t sensorID = -1);
  bool begin(void);
  void setMagGain(hmc5883MagGain gain);
  bool getEvent(sensors_event_t *event);
  void getSensor(sensor_t *sensor);
};
