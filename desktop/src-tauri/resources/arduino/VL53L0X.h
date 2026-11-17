#pragma once
#include "Arduino.h"
#include "Wire.h"
class VL53L0X {
 public:
  enum vcselPeriodType { VcselPeriodPreRange, VcselPeriodFinalRange };
  uint8_t last_status;
  VL53L0X();
  void setBus(TwoWire *bus);
  void setAddress(uint8_t new_addr);
  uint8_t getAddress();
  bool init(bool io_2v8 = true);
  bool setSignalRateLimit(float limit_Mcps);
  float getSignalRateLimit();
  bool setMeasurementTimingBudget(uint32_t budget_us);
  uint32_t getMeasurementTimingBudget();
  bool setVcselPulsePeriod(vcselPeriodType type, uint8_t period_pclks);
  uint8_t getVcselPulsePeriod(vcselPeriodType type);
  void startContinuous(uint32_t period_ms = 0);
  void stopContinuous();
  uint16_t readRangeContinuousMillimeters();
  uint16_t readRangeSingleMillimeters();
  void setTimeout(uint16_t timeout);
  uint16_t getTimeout();
  bool timeoutOccurred();
};
