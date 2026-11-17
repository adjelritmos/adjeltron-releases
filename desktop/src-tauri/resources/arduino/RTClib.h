#pragma once
#include "Arduino.h"
#include "Wire.h"
// RTClib (Adafruit) — interface usada pelo simulador
class TimeSpan {
 public:
  TimeSpan(int32_t seconds = 0);
  TimeSpan(int16_t days, int8_t hours, int8_t minutes, int8_t seconds);
  int16_t days() const;
  int8_t hours() const;
  int8_t minutes() const;
  int8_t seconds() const;
  int32_t totalseconds() const;
};
class DateTime {
 public:
  DateTime(uint32_t t = 946684800UL);
  DateTime(uint16_t year, uint8_t month, uint8_t day, uint8_t hour = 0, uint8_t min = 0, uint8_t sec = 0);
  DateTime(const DateTime &copy);
  DateTime(const char *date, const char *time);
  uint16_t year() const;
  uint8_t month() const;
  uint8_t day() const;
  uint8_t hour() const;
  uint8_t twelveHour() const;
  uint8_t isPM() const;
  uint8_t minute() const;
  uint8_t second() const;
  uint8_t dayOfTheWeek() const;
  uint32_t secondstime() const;
  uint32_t unixtime(void) const;
  bool isValid() const;
  String timestamp() const;
  char *toString(char *buffer) const;
};
enum Ds1307SqwPinMode { DS1307_OFF = 0x00, DS1307_ON = 0x80, DS1307_SquareWave1HZ = 0x10 };
enum Ds3231SqwPinMode { DS3231_OFF = 0x1C, DS3231_SquareWave1Hz = 0x00 };
class RTC_DS1307 {
 public:
  bool begin(TwoWire *wireInstance = &Wire);
  void adjust(const DateTime &dt);
  uint8_t isrunning(void);
  DateTime now();
  void writeSqwPinMode(Ds1307SqwPinMode mode);
  Ds1307SqwPinMode readSqwPinMode();
};
class RTC_DS3231 {
 public:
  bool begin(TwoWire *wireInstance = &Wire);
  void adjust(const DateTime &dt);
  bool lostPower(void);
  DateTime now();
  float getTemperature();
  void writeSqwPinMode(Ds3231SqwPinMode mode);
  Ds3231SqwPinMode readSqwPinMode();
  void enable32K(void);
  void disable32K(void);
};
class RTC_Millis {
 public:
  void begin(const DateTime &dt);
  void adjust(const DateTime &dt);
  DateTime now();
};
