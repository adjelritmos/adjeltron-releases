#pragma once
#include "Arduino.h"
#include "Wire.h"
// Adafruit_BMP280 — interface usada pelo simulador
#define BMP280_ADDRESS (0x77)
#define BMP280_ADDRESS_ALT (0x76)
#define BMP280_CHIPID (0x58)
class Adafruit_BMP280 {
 public:
  enum sensor_sampling { SAMPLING_NONE = 0, SAMPLING_X1, SAMPLING_X2, SAMPLING_X4, SAMPLING_X8, SAMPLING_X16 };
  enum sensor_mode { MODE_SLEEP = 0, MODE_FORCED = 1, MODE_NORMAL = 3, MODE_SOFT_RESET_CODE = 0xB6 };
  enum sensor_filter { FILTER_OFF = 0, FILTER_X2, FILTER_X4, FILTER_X8, FILTER_X16 };
  enum standby_duration { STANDBY_MS_1 = 0, STANDBY_MS_63, STANDBY_MS_125, STANDBY_MS_250, STANDBY_MS_500, STANDBY_MS_1000, STANDBY_MS_2000, STANDBY_MS_4000 };
  Adafruit_BMP280(TwoWire *theWire = &Wire);
  bool begin(uint8_t addr = BMP280_ADDRESS, uint8_t chipid = BMP280_CHIPID);
  void reset(void);
  uint8_t getStatus(void);
  uint8_t sensorID(void);
  float readTemperature();
  float readPressure(void);
  float readAltitude(float seaLevelhPa = 1013.25);
  float seaLevelForAltitude(float altitude, float atmospheric);
  float waterBoilingPoint(float pressure);
  bool takeForcedMeasurement();
  void setSampling(sensor_mode mode = MODE_NORMAL, sensor_sampling tempSampling = SAMPLING_X16, sensor_sampling pressSampling = SAMPLING_X16, sensor_filter filter = FILTER_OFF, standby_duration duration = STANDBY_MS_1);
};
