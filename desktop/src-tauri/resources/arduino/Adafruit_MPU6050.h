#pragma once
#include "Arduino.h"
#include "Wire.h"
#include "Adafruit_Sensor.h"
#define MPU6050_I2CADDR_DEFAULT 0x68
typedef enum { MPU6050_RANGE_2_G, MPU6050_RANGE_4_G, MPU6050_RANGE_8_G, MPU6050_RANGE_16_G } mpu6050_accel_range_t;
typedef enum { MPU6050_RANGE_250_DEG, MPU6050_RANGE_500_DEG, MPU6050_RANGE_1000_DEG, MPU6050_RANGE_2000_DEG } mpu6050_gyro_range_t;
typedef enum {
  MPU6050_BAND_260_HZ, MPU6050_BAND_184_HZ, MPU6050_BAND_94_HZ, MPU6050_BAND_44_HZ,
  MPU6050_BAND_21_HZ, MPU6050_BAND_10_HZ, MPU6050_BAND_5_HZ
} mpu6050_bandwidth_t;
class Adafruit_MPU6050 {
 public:
  Adafruit_MPU6050();
  bool begin(uint8_t i2c_addr = MPU6050_I2CADDR_DEFAULT, TwoWire *wire = &Wire, int32_t sensorID = 0);
  bool getEvent(sensors_event_t *accel, sensors_event_t *gyro, sensors_event_t *temp);
  void reset();
  bool enableSleep(bool enable);
  void setAccelerometerRange(mpu6050_accel_range_t r);
  mpu6050_accel_range_t getAccelerometerRange();
  void setGyroRange(mpu6050_gyro_range_t r);
  mpu6050_gyro_range_t getGyroRange();
  void setFilterBandwidth(mpu6050_bandwidth_t bw);
  mpu6050_bandwidth_t getFilterBandwidth();
  void setSampleRateDivisor(uint8_t d);
  uint8_t getSampleRateDivisor();
  void setHighPassFilter(int f);
  void setMotionInterrupt(bool on);
  void setMotionDetectionThreshold(uint8_t t);
  void setMotionDetectionDuration(uint8_t d);
  void setInterruptPinLatch(bool l);
  void setInterruptPinPolarity(bool p);
  bool getMotionInterruptStatus();
};
