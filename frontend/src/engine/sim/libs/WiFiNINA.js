// WiFiNINA.h — Wi‑Fi do módulo u-blox NINA (Arduino Nano RP2040 Connect, Nano 33 IoT, MKR WiFi 1010).
// A API é a mesma da WiFi.h (WiFi.begin, status, localIP, WiFiClient, WiFiServer…): usa a
// mesma simulação de rede (libs/WiFi.js e libs/WiFiClient.js).
import wifi from './WiFi.js'

export default { ...wifi, header: 'WiFiNINA.h', globals: { ...wifi.globals, WL_NO_MODULE: 255 } }
