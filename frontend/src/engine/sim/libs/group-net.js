// Grupo de bibliotecas de rede do ESP32 (Wi-Fi, MQTT, HTTP, JSON, servidor web, hora/NTP)
// e o runtime de texto C (char[], String, <string.h>) usado por elas.
import cstring from './CString.js'
import { wifiClientLib, wifiClientSecureLib } from './WiFiClient.js'
import pubsub from './PubSubClient.js'
import httpClient from './HTTPClient.js'
import arduinoJson from './ArduinoJson.js'
import { webServerLib, dnsServerLib, mdnsLib } from './WebServer.js'
import { timeLib, ntpClientLib, wifiUdpLib } from './TimeNTP.js'

export const LIBS_NET = [cstring, wifiClientLib, wifiClientSecureLib, pubsub, httpClient, arduinoJson, webServerLib, dnsServerLib, mdnsLib, timeLib, ntpClientLib, wifiUdpLib]
