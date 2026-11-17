#pragma once
#include "Arduino.h"
#include "Wire.h"
#include "Adafruit_Sensor.h"
#include "Adafruit_Sensor_t.h"
#define ADXL345_DEFAULT_ADDRESS (0x53)
#define ADXL345_MG2G_MULTIPLIER (0.004)
typedef enum {
  ADXL345_DATARATE_3200_HZ = 0xF, ADXL345_DATARATE_1600_HZ = 0xE, ADXL345_DATARATE_800_HZ = 0xD, ADXL345_DATARATE_400_HZ = 0xC,
  ADXL345_DATARATE_200_HZ = 0xB, ADXL345_DATARATE_100_HZ = 0xA, ADXL345_DATARATE_50_HZ = 0x9, ADXL345_DATARATE_25_HZ = 0x8,
  ADXL345_DATARATE_12_5_HZ = 0x7, ADXL345_DATARATE_6_25HZ = 0x6, ADXL345_DATARATE_3_13_HZ = 0x5, ADXL345_DATARATE_1_56_HZ = 0x4,
  ADXL345_DATARATE_0_78_HZ = 0x3, ADXL345_DATARATE_0_39_HZ = 0x2, ADXL345_DATARATE_0_20_HZ = 0x1, ADXL345_DATARATE_0_10_HZ = 0x0
} dataRate_t;
typedef enum { ADXL345_RANGE_16_G = 0x3, ADXL345_RANGE_8_G = 0x2, ADXL345_RANGE_4_G = 0x1, ADXL345_RANGE_2_G = 0x0 } range_t;
class Adafruit_ADXL345_Unified {
 public:
  Adafruit_ADXL345_Unified(int32_t sensorID = -1);
  Adafruit_ADXL345_Unified(uint8_t clock, uint8_t miso, uint8_t mosi, uint8_t cs, int32_t sensorID = -1);
  bool begin(uint8_t addr = ADXL345_DEFAULT_ADDRESS);
  void setRange(range_t range);
  range_t getRange(void);
  void setDataRate(dataRate_t dataRate);
  dataRate_t getDataRate(void);
  bool getEvent(sensors_event_t *event);
  void getSensor(sensor_t *sensor);
  uint8_t getDeviceID(void);
  void writeRegister(uint8_t reg, uint8_t value);
  uint8_t readRegister(uint8_t reg);
  int16_t getX(void);
  int16_t getY(void);
  int16_t getZ(void);
};
