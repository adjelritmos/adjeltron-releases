#pragma once
#include "Arduino.h"
#include "Wire.h"
class MPU6050 {
 public:
  MPU6050(TwoWire &w);
  byte begin(int gyro_config_num = 1, int acc_config_num = 0);
  byte writeData(byte reg, byte data);
  byte readData(byte reg);
  void setAddress(uint8_t addr);
  uint8_t getAddress();
  void calcOffsets(bool is_calc_gyro = true, bool is_calc_acc = true);
  void calcGyroOffsets();
  void calcAccOffsets();
  void setGyroOffsets(float x, float y, float z);
  void setAccOffsets(float x, float y, float z);
  void setFilterGyroCoef(float c);
  void setFilterAccCoef(float c);
  float getFilterGyroCoef();
  float getFilterAccCoef();
  void upsideDownMounting(bool v);
  float getGyroXoffset();
  float getGyroYoffset();
  float getGyroZoffset();
  float getAccXoffset();
  float getAccYoffset();
  float getAccZoffset();
  void fetchData();
  void update();
  float getTemp();
  float getAccX();
  float getAccY();
  float getAccZ();
  float getGyroX();
  float getGyroY();
  float getGyroZ();
  float getAccAngleX();
  float getAccAngleY();
  float getAngleX();
  float getAngleY();
  float getAngleZ();
};
