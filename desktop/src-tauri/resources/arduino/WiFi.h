#pragma once
#include "Arduino.h"
#if !defined(ESP32) && !defined(PICO_CYW43_SUPPORTED)
#error "WiFi.h: esta placa não tem Wi-Fi — escolha a ESP32 DevKit, a Pico W ou a Pico 2 W"
#endif
#include "robolab_net.h"
#include "WiFiClient.h"
typedef enum { WL_NO_SHIELD = 255, WL_IDLE_STATUS = 0, WL_NO_SSID_AVAIL, WL_SCAN_COMPLETED, WL_CONNECTED, WL_CONNECT_FAILED, WL_CONNECTION_LOST, WL_DISCONNECTED } wl_status_t;
typedef enum { WIFI_OFF = 0, WIFI_STA, WIFI_AP, WIFI_AP_STA } wifi_mode_t;
#define WIFI_MODE_NULL WIFI_OFF
#define WIFI_MODE_STA WIFI_STA
#define WIFI_MODE_AP WIFI_AP
#define WIFI_MODE_APSTA WIFI_AP_STA
typedef enum { WIFI_AUTH_OPEN = 0, WIFI_AUTH_WEP, WIFI_AUTH_WPA_PSK, WIFI_AUTH_WPA2_PSK, WIFI_AUTH_WPA_WPA2_PSK, WIFI_AUTH_WPA2_ENTERPRISE, WIFI_AUTH_WPA3_PSK } wifi_auth_mode_t;
typedef enum { WIFI_PS_NONE, WIFI_PS_MIN_MODEM, WIFI_PS_MAX_MODEM } wifi_ps_type_t;
#define WIFI_SCAN_RUNNING (-1)
#define WIFI_SCAN_FAILED (-2)
class WiFiClass {
 public:
  bool mode(wifi_mode_t m);
  wifi_mode_t getMode();
  wl_status_t begin(const char *ssid, const char *pass = nullptr, int32_t channel = 0, const uint8_t *bssid = nullptr, bool connect = true);
  wl_status_t begin(const String &ssid, const String &pass);
  wl_status_t status();
  uint8_t waitForConnectResult(unsigned long timeoutLength = 60000);
  bool isConnected();
  bool disconnect(bool wifioff = false, bool eraseap = false);
  bool reconnect();
  bool setAutoReconnect(bool v);
  bool getAutoReconnect();
  bool setAutoConnect(bool v);
  void persistent(bool v);
  bool setSleep(bool v);
  bool setTxPower(int power);
  bool config(IPAddress local_ip, IPAddress gateway, IPAddress subnet, IPAddress dns1 = IPAddress(), IPAddress dns2 = IPAddress());
  IPAddress localIP();
  IPAddress gatewayIP();
  IPAddress subnetMask();
  IPAddress dnsIP(uint8_t n = 0);
  IPAddress broadcastIP();
  String SSID();
  String SSID(uint8_t i);
  int8_t RSSI();
  int32_t RSSI(uint8_t i);
  wifi_auth_mode_t encryptionType(uint8_t i);
  int32_t channel();
  int32_t channel(uint8_t i);
  String BSSIDstr();
  String BSSIDstr(uint8_t i);
  String psk();
  String macAddress();
  bool setHostname(const char *name);
  const char *getHostname();
  int16_t scanNetworks(bool async = false, bool show_hidden = false, bool passive = false, uint32_t max_ms_per_chan = 300);
  int16_t scanComplete();
  void scanDelete();
  bool softAP(const char *ssid, const char *pass = nullptr, int channel = 1, int ssid_hidden = 0, int max_connection = 4);
  bool softAP(const String &ssid, const String &pass);
  bool softAPConfig(IPAddress local_ip, IPAddress gateway, IPAddress subnet);
  IPAddress softAPIP();
  uint8_t softAPgetStationNum();
  bool softAPdisconnect(bool wifioff = false);
  String softAPmacAddress();
  String softAPSSID();
  template <typename F> int onEvent(F cb, int event = 0);
};
extern WiFiClass WiFi;
class WiFiServer : public Print {
 public:
  WiFiServer(uint16_t port = 80, uint8_t max_clients = 4);
  void begin(uint16_t port = 0);
  WiFiClient available();
  WiFiClient accept();
  bool hasClient();
  void setNoDelay(bool nodelay);
  void stop();
  void close();
  size_t write(uint8_t c);
  operator bool();
};
typedef WiFiServer NetworkServer;
