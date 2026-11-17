#pragma once
#include "WiFiClient.h"
#define HTTPC_ERROR_CONNECTION_REFUSED (-1)
#define HTTPC_ERROR_SEND_HEADER_FAILED (-2)
#define HTTPC_ERROR_SEND_PAYLOAD_FAILED (-3)
#define HTTPC_ERROR_NOT_CONNECTED (-4)
#define HTTPC_ERROR_CONNECTION_LOST (-5)
#define HTTPC_ERROR_NO_STREAM (-6)
#define HTTPC_ERROR_NO_HTTP_SERVER (-7)
#define HTTPC_ERROR_TOO_LESS_RAM (-8)
#define HTTPC_ERROR_ENCODING (-9)
#define HTTPC_ERROR_STREAM_WRITE (-10)
#define HTTPC_ERROR_READ_TIMEOUT (-11)
typedef enum { HTTP_CODE_OK = 200, HTTP_CODE_CREATED = 201, HTTP_CODE_NO_CONTENT = 204, HTTP_CODE_MOVED_PERMANENTLY = 301, HTTP_CODE_FOUND = 302, HTTP_CODE_BAD_REQUEST = 400, HTTP_CODE_UNAUTHORIZED = 401, HTTP_CODE_FORBIDDEN = 403, HTTP_CODE_NOT_FOUND = 404, HTTP_CODE_INTERNAL_SERVER_ERROR = 500 } t_http_codes;
typedef enum { HTTPC_DISABLE_FOLLOW_REDIRECTS, HTTPC_STRICT_FOLLOW_REDIRECTS, HTTPC_FORCE_FOLLOW_REDIRECTS } followRedirects_t;
class HTTPClient {
 public:
  bool begin(const String &url);
  bool begin(const String &url, const char *CAcert);
  bool begin(WiFiClient &client, const String &url);
  bool begin(const String &host, uint16_t port, const String &uri = "/");
  bool begin(WiFiClient &client, const String &host, uint16_t port, const String &uri = "/", bool https = false);
  void end();
  bool connected();
  void setReuse(bool reuse);
  void setUserAgent(const String &userAgent);
  void setAuthorization(const char *user, const char *password);
  void setAuthorization(const char *auth);
  void setTimeout(uint16_t timeout);
  void setConnectTimeout(int32_t connectTimeout);
  void setFollowRedirects(followRedirects_t follow);
  void useHTTP10(bool usehttp10 = true);
  int GET();
  int PATCH(const String &payload);
  int POST(const String &payload);
  int POST(uint8_t *payload, size_t size);
  int PUT(const String &payload);
  int PUT(uint8_t *payload, size_t size);
  int sendRequest(const char *type, const String &payload);
  int sendRequest(const char *type, uint8_t *payload = nullptr, size_t size = 0);
  void addHeader(const String &name, const String &value, bool first = false, bool replace = true);
  void collectHeaders(const char *headerKeys[], const size_t headerKeysCount);
  String header(const char *name);
  bool hasHeader(const char *name);
  int headers();
  String getLocation();
  int getSize();
  WiFiClient &getStream();
  WiFiClient *getStreamPtr();
  String getString();
  static String errorToString(int error);
};
