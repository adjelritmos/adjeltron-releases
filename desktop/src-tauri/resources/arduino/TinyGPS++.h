#pragma once
#include "Arduino.h"
struct RawDegrees {
  uint16_t deg;
  uint32_t billionths;
  bool negative;
};
class TinyGPSLocation {
 public:
  bool isValid() const;
  bool isUpdated() const;
  uint32_t age() const;
  const RawDegrees &rawLat();
  const RawDegrees &rawLng();
  double lat();
  double lng();
  int FixQuality();
  int FixMode();
};
class TinyGPSDate {
 public:
  bool isValid() const;
  bool isUpdated() const;
  uint32_t age() const;
  uint32_t value();
  uint16_t year();
  uint8_t month();
  uint8_t day();
};
class TinyGPSTime {
 public:
  bool isValid() const;
  bool isUpdated() const;
  uint32_t age() const;
  uint32_t value();
  uint8_t hour();
  uint8_t minute();
  uint8_t second();
  uint8_t centisecond();
};
class TinyGPSDecimal {
 public:
  bool isValid() const;
  bool isUpdated() const;
  uint32_t age() const;
  int32_t value();
};
class TinyGPSInteger {
 public:
  bool isValid() const;
  bool isUpdated() const;
  uint32_t age() const;
  uint32_t value();
};
class TinyGPSSpeed : public TinyGPSDecimal {
 public:
  double knots();
  double mph();
  double mps();
  double kmph();
};
class TinyGPSCourse : public TinyGPSDecimal {
 public:
  double deg();
};
class TinyGPSAltitude : public TinyGPSDecimal {
 public:
  double meters();
  double miles();
  double kilometers();
  double feet();
};
class TinyGPSHDOP : public TinyGPSDecimal {
 public:
  double hdop();
};
class TinyGPSPlus {
 public:
  TinyGPSPlus();
  bool encode(char c);
  TinyGPSPlus &operator<<(char c);
  TinyGPSLocation location;
  TinyGPSDate date;
  TinyGPSTime time;
  TinyGPSSpeed speed;
  TinyGPSCourse course;
  TinyGPSAltitude altitude;
  TinyGPSInteger satellites;
  TinyGPSHDOP hdop;
  static const char *libraryVersion();
  static double distanceBetween(double lat1, double long1, double lat2, double long2);
  static double courseTo(double lat1, double long1, double lat2, double long2);
  static const char *cardinal(double course);
  uint32_t charsProcessed() const;
  uint32_t sentencesWithFix() const;
  uint32_t failedChecksum() const;
  uint32_t passedChecksum() const;
};
