#pragma once
#include "WiFiClient.h"
class WiFiClientSecure : public WiFiClient {
 public:
  void setInsecure();
  void setCACert(const char *rootCA);
  void setCertificate(const char *cert);
  void setPrivateKey(const char *key);
};
typedef WiFiClientSecure NetworkClientSecure;
