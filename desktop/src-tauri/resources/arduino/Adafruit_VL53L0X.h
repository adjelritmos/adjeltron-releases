#pragma once
#include "Arduino.h"
#include "Wire.h"
#define VL53L0X_I2C_ADDR 0x29
#define VL53L0X_ERROR_NONE 0
typedef int8_t VL53L0X_Error;
typedef struct {
  uint32_t TimeStamp;
  uint32_t MeasurementTimeUsec;
  uint16_t RangeMilliMeter;
  uint16_t RangeDMaxMilliMeter;
  uint32_t SignalRateRtnMegaCps;
  uint32_t AmbientRateRtnMegaCps;
  uint16_t EffectiveSpadRtnCount;
  uint8_t ZoneId;
  uint8_t RangeFractionalPart;
  uint8_t RangeStatus;
} VL53L0X_RangingMeasurementData_t;
class Adafruit_VL53L0X {
 public:
  typedef enum { VL53L0X_SENSE_DEFAULT = 0, VL53L0X_SENSE_LONG_RANGE, VL53L0X_SENSE_HIGH_SPEED, VL53L0X_SENSE_HIGH_ACCURACY } VL53L0X_Sense_config_t;
  Adafruit_VL53L0X();
  bool begin(uint8_t i2c_addr = VL53L0X_I2C_ADDR, bool debug = false, TwoWire *i2c = &Wire, VL53L0X_Sense_config_t vl_config = VL53L0X_SENSE_DEFAULT);
  bool setAddress(uint8_t newAddr);
  VL53L0X_Error rangingTest(VL53L0X_RangingMeasurementData_t *pRangingMeasurementData, bool debug = false);
  VL53L0X_Error getSingleRangingMeasurement(VL53L0X_RangingMeasurementData_t *pRangingMeasurementData, bool debug = false);
  uint16_t readRange(void);
  uint8_t readRangeStatus(void);
  bool startRangeContinuous(uint16_t period_ms = 50);
  void stopRangeContinuous(void);
  bool isRangeComplete(void);
  uint8_t waitRangeComplete(void);
  uint16_t readRangeResult(void);
  bool setMeasurementTimingBudgetMicroSeconds(uint32_t budget_us);
  uint32_t getMeasurementTimingBudgetMicroSeconds(void);
  bool configSensor(VL53L0X_Sense_config_t vl_config);
  bool timeoutOccurred(void);
  VL53L0X_Error Status;
};
