#pragma once
#include "robolab_net.h"
class WiFiUDP : public Stream {
 public:
  uint8_t begin(uint16_t port);
  void stop();
  int beginPacket(const char *host, uint16_t port);
  int beginPacket(IPAddress ip, uint16_t port);
  int endPacket();
  using Print::write;
  size_t write(uint8_t c);
  size_t write(const uint8_t *buf, size_t size);
  int parsePacket();
  int available();
  int read();
  int read(unsigned char *buf, size_t len);
  int peek();
  void flush();
  IPAddress remoteIP();
  uint16_t remotePort();
};
typedef WiFiUDP NetworkUDP;
