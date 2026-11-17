#pragma once
#include "WiFi.h"
class MDNSResponder {
 public:
  bool begin(const char *hostName);
  void end();
  bool addService(const char *service, const char *proto, uint16_t port);
  bool addServiceTxt(const char *name, const char *proto, const char *key, const char *value);
  void setInstanceName(const char *name);
  int queryService(const char *service, const char *proto);
};
extern MDNSResponder MDNS;
