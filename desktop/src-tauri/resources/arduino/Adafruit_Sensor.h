#pragma once
#include "Arduino.h"
#define SENSORS_GRAVITY_EARTH (9.80665F)
#define SENSORS_GRAVITY_STANDARD (SENSORS_GRAVITY_EARTH)
#define SENSORS_DPS_TO_RADS (0.017453293F)
#define SENSORS_RADS_TO_DPS (57.29577793F)
struct sensors_vec_t {
  float x, y, z;
  float roll, pitch, heading;
  float v[3];
};
struct sensors_event_t {
  int32_t version;
  int32_t sensor_id;
  int32_t type;
  int32_t reserved0;
  int32_t timestamp;
  sensors_vec_t acceleration;
  sensors_vec_t gyro;
  sensors_vec_t magnetic;
  sensors_vec_t orientation;
  float temperature;
  float distance;
  float light;
  float pressure;
  float relative_humidity;
  float current;
  float voltage;
};
