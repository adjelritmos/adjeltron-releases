#pragma once
#include "WiFiUdp.h"
class NTPClient {
 public:
  NTPClient(WiFiUDP &udp);
  NTPClient(WiFiUDP &udp, long timeOffset);
  NTPClient(WiFiUDP &udp, const char *poolServerName);
  NTPClient(WiFiUDP &udp, const char *poolServerName, long timeOffset);
  NTPClient(WiFiUDP &udp, const char *poolServerName, long timeOffset, unsigned long updateInterval);
  void setPoolServerName(const char *poolServerName);
  void begin();
  void begin(unsigned int port);
  bool update();
  bool forceUpdate();
  bool isTimeSet() const;
  int getDay() const;
  int getHours() const;
  int getMinutes() const;
  int getSeconds() const;
  void setTimeOffset(int timeOffset);
  void setUpdateInterval(unsigned long updateInterval);
  String getFormattedTime() const;
  String getFormattedDate() const;
  unsigned long getEpochTime() const;
  void end();
};
