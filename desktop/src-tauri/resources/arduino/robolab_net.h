// Declarações comuns das bibliotecas de rede do ESP32 (Stream, Client, IPAddress, hora/SNTP)
// — só para a verificação com o compilador C++; a simulação está em backend/sim/libs.
#pragma once
#include "Arduino.h"
#if !defined(ESP32) && !defined(PICO_CYW43_SUPPORTED)
#error "As bibliotecas de rede (WiFi, MQTT, HTTP, WebServer, NTP) precisam de Wi-Fi: escolha a ESP32 DevKit, a Pico W ou a Pico 2 W"
#endif
#include <time.h>
#include <sys/time.h>
#ifndef PROGMEM
#define PROGMEM
#endif
#ifndef FPSTR
#define FPSTR(p) ((const char *)(p))
#endif

#ifndef ROBOLAB_STREAM_DEFINED
#define ROBOLAB_STREAM_DEFINED
class Stream : public Print {
 public:
  virtual int available();
  virtual int read();
  virtual int peek();
  void setTimeout(unsigned long ms);
  String readString();
  String readStringUntil(char terminator);
  size_t readBytes(char *buf, size_t len);
  size_t readBytes(uint8_t *buf, size_t len);
  long parseInt();
  float parseFloat();
  bool find(const char *target);
  size_t write(const uint8_t *buf, size_t size);
  size_t printf(const char *format, ...) __attribute__((format(printf, 2, 3)));
  using Print::write;
};
#endif

class IPAddress : public Printable {
 public:
  IPAddress();
  IPAddress(uint8_t a, uint8_t b, uint8_t c, uint8_t d);
  IPAddress(uint32_t addr);
  IPAddress(const char *s);
  bool fromString(const char *s);
  bool fromString(const String &s);
  String toString() const;
  size_t printTo(Print &p) const;
  operator uint32_t() const;
  uint8_t operator[](int i) const;
  bool operator==(const IPAddress &o) const;
  bool operator!=(const IPAddress &o) const;
};

class Client : public Stream {
 public:
  virtual int connect(IPAddress ip, uint16_t port);
  virtual int connect(const char *host, uint16_t port);
  int connect(const char *host, uint16_t port, int32_t timeout);
  virtual uint8_t connected();
  virtual void stop();
  virtual void flush();
  int read(uint8_t *buf, size_t size);
  using Stream::read;
  void setNoDelay(bool v);
  IPAddress remoteIP();
  uint16_t remotePort();
  operator bool();
};

// SNTP / hora do core ESP32
void configTime(long gmtOffset_sec, int daylightOffset_sec, const char *server1, const char *server2 = nullptr, const char *server3 = nullptr);
void configTzTime(const char *tz, const char *server1, const char *server2 = nullptr, const char *server3 = nullptr);
bool getLocalTime(struct tm *info, uint32_t ms = 5000);
