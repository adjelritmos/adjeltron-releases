#pragma once
// sensor_t (Adafruit Unified Sensor) — partilhado pelas bibliotecas do grupo G
#ifndef ROBOLAB_SENSOR_T
#define ROBOLAB_SENSOR_T
#define SENSOR_TYPE_ACCELEROMETER 1
#define SENSOR_TYPE_MAGNETIC_FIELD 2
typedef struct {
  char name[12];
  int32_t version;
  int32_t sensor_id;
  int32_t type;
  float max_value;
  float min_value;
  float resolution;
  int32_t min_delay;
} sensor_t;
#endif
