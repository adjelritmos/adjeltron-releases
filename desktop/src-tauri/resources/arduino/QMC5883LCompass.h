#pragma once
#include "Arduino.h"
#include "Wire.h"
class QMC5883LCompass {
 public:
  QMC5883LCompass();
  void init();
  void setADDR(byte b);
  void setMode(byte mode, byte odr, byte rng, byte osr);
  void setMagneticDeclination(int degrees, uint8_t minutes);
  void setSmoothing(byte steps, bool adv);
  void calibrate();
  void setCalibration(int x_min, int x_max, int y_min, int y_max, int z_min, int z_max);
  void setCalibrationOffsets(float x_offset, float y_offset, float z_offset);
  void setCalibrationScales(float x_scale, float y_scale, float z_scale);
  void clearCalibration();
  void setReset();
  void read();
  int getX();
  int getY();
  int getZ();
  int getAzimuth();
  byte getBearing(int azimuth);
  void getDirection(char *myArray, int azimuth);
};
