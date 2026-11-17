#pragma once
#include "WiFi.h"
typedef enum { HTTP_GET = 0b00000001, HTTP_POST = 0b00000010, HTTP_DELETE = 0b00000100, HTTP_PUT = 0b00001000, HTTP_PATCH = 0b00010000, HTTP_HEAD = 0b00100000, HTTP_OPTIONS = 0b01000000, HTTP_ANY = 0b01111111 } HTTPMethod;
#define CONTENT_LENGTH_UNKNOWN ((size_t)-1)
#define CONTENT_LENGTH_NOT_SET ((size_t)-2)
class WebServer {
 public:
  typedef void (*THandlerFunction)(void);
  WebServer(int port = 80);
  void begin();
  void begin(uint16_t port);
  void handleClient();
  void close();
  void stop();
  template <typename F> WebServer &on(const String &uri, F handler);
  template <typename F> WebServer &on(const String &uri, HTTPMethod method, F fn);
  template <typename F, typename G> WebServer &on(const String &uri, HTTPMethod method, F fn, G ufn);
  template <typename F> void onNotFound(F fn);
  template <typename F> void onFileUpload(F fn);
  String uri();
  HTTPMethod method();
  WiFiClient client();
  String arg(const String &name);
  String arg(int i);
  String argName(int i);
  int args();
  bool hasArg(const String &name);
  void collectHeaders(const char *headerKeys[], const size_t headerKeysCount);
  String header(const String &name);
  String header(int i);
  String headerName(int i);
  int headers();
  bool hasHeader(const String &name);
  String hostHeader();
  bool authenticate(const char *username, const char *password);
  void requestAuthentication();
  void enableCORS(bool enable = true);
  void send(int code, const char *content_type = nullptr, const String &content = String(""));
  void send(int code, const String &content_type, const String &content);
  void send(int code, const char *content_type, const char *content);
  void send_P(int code, const char *content_type, const char *content);
  void setContentLength(const size_t contentLength);
  void sendHeader(const String &name, const String &value, bool first = false);
  void sendContent(const String &content);
  void sendContent_P(const char *content);
};
