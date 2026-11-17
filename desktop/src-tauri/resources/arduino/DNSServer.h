#pragma once
#include "WiFi.h"
enum class DNSReplyCode { NoError = 0, FormError = 1, ServerFailure = 2, NonExistentDomain = 3, NotImplemented = 4, Refused = 5 };
class DNSServer {
 public:
  bool start(const uint16_t &port, const String &domainName, const IPAddress &resolvedIP);
  void stop();
  void processNextRequest();
  void setErrorReplyCode(const DNSReplyCode &replyCode);
  void setTTL(const uint32_t &ttl);
};
