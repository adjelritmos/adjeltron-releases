#pragma once
#include "Arduino.h"
#include "OneWire.h"
// DallasTemperature (Miles Burton) — interface usada pelo simulador
#define DEVICE_DISCONNECTED_C -127
#define DEVICE_DISCONNECTED_F -196.6
#define DEVICE_DISCONNECTED_RAW -7040
typedef uint8_t DeviceAddress[8];
class DallasTemperature {
 public:
  struct request_t {
    bool result;
    unsigned long timestamp;
  };
  DallasTemperature();
  DallasTemperature(OneWire *oneWire);
  void setOneWire(OneWire *oneWire);
  void begin(void);
  uint8_t getDeviceCount(void);
  uint8_t getDS18Count(void);
  bool validAddress(const uint8_t *deviceAddress);
  bool getAddress(uint8_t *deviceAddress, uint8_t index);
  bool isConnected(const uint8_t *deviceAddress);
  uint8_t getResolution();
  bool setResolution(uint8_t newResolution);
  bool setResolution(const uint8_t *deviceAddress, uint8_t newResolution, bool skipGlobalBitResolutionCalculation = false);
  void setWaitForConversion(bool flag);
  bool getWaitForConversion(void);
  bool isParasitePowerMode(void);
  bool isConversionComplete(void);
  int16_t millisToWaitForConversion(uint8_t bitResolution);
  request_t requestTemperatures(void);
  request_t requestTemperaturesByAddress(const uint8_t *deviceAddress);
  request_t requestTemperaturesByIndex(uint8_t index);
  float getTempC(const uint8_t *deviceAddress);
  float getTempF(const uint8_t *deviceAddress);
  float getTempCByIndex(uint8_t index);
  float getTempFByIndex(uint8_t index);
  static float toFahrenheit(float celsius);
  static float toCelsius(float fahrenheit);
};
