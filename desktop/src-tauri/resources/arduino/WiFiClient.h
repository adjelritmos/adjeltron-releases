#pragma once
#include "robolab_net.h"
class WiFiClient : public Client {
 public:
  WiFiClient();
  int connect(IPAddress ip, uint16_t port);
  int connect(const char *host, uint16_t port);
  int connect(const char *host, uint16_t port, int32_t timeout);
  uint8_t connected();
  int available();
  int read();
  int read(uint8_t *buf, size_t size);
  int peek();
  void stop();
  void flush();
  void setTimeout(uint32_t seconds);
  using Print::write;
  size_t write(uint8_t c);
  size_t write(const uint8_t *buf, size_t size);
  operator bool();
};
typedef WiFiClient NetworkClient;
