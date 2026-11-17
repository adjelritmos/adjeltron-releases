// Família Raspberry Pi Pico (group-pico): Pico W, Pico 2 e Pico 2 W. Mesma placa de 21 × 51 mm
// e o mesmo conector de 40 pinos (furos acastelados) da Pico original (./pico.js) — por isso
// encaixam na breadboard e no soquete de placas como a Pico4Drive (forma 'pico40').
import pico from './pico.js'

const PICO_PINS = pico.pins

const common = {
  cat: 'mcu',
  size: [5.1, 0.9, 2.1],
  pins: PICO_PINS,
  internal: pico.internal,
  form: 'pico40', // cabe em soquetes de Pico (ver shared/sockets.js)
  config: { usb: true },
  fields: [{ key: 'usb', label: 'Alimentação', type: 'select', options: [[true, 'USB (computador)'], [false, 'Externa (VSYS, 3V3 ou placa-mãe)']] }],
  interactive: { kind: 'press', label: 'BOOTSEL' },
  view2d: pico.view2d,
}
const WIFI_LIB = {
  header: 'WiFi.h',
  usage: '#include <WiFi.h>\nWiFi.begin("RoboLab", "12345678");\nwhile (WiFi.status() != WL_CONNECTED) delay(500);\nSerial.println(WiFi.localIP());',
}

export const picow = {
  ...common,
  type: 'picow',
  name: 'Raspberry Pi Pico W',
  short: 'Pico W',
  board: { profile: 'picow' },
  wireless: true,
  description:
    'RP2040 a 133 MHz + chip Wi‑Fi/Bluetooth CYW43439 (core Arduino-Pico: WiFi.h, WebServer.h, HTTPClient.h, PubSubClient). Pinos de 3,3 V! GP0–GP22 e GP26–GP28; ADC de 12 bits em GP26–28 (A0–A2) e A3 = VSYS/3. GP23/24/25/29 são usados pelo Wi‑Fi. O LED da placa está no chip Wi‑Fi (WL_GPIO0): use LED_BUILTIN (= 64). BOOTSEL legível no código (if (BOOTSEL)). Encaixa na breadboard e em placas Pico4Drive.',
  lib: WIFI_LIB,
}

export const pico2 = {
  ...common,
  type: 'pico2',
  name: 'Raspberry Pi Pico 2',
  short: 'Pico 2',
  board: { profile: 'pico2' },
  description:
    'RP2350 (2 × Cortex-M33 a 150 MHz, 520 KB de SRAM, 4 MB de flash), core Arduino-Pico. Mesmo pinout da Pico: GP0–GP22 e GP26–GP28, pinos de 3,3 V, ADC de 12 bits em GP26–28 (A0–A2), A3 = VSYS/3, PWM em todos os pinos, I2C em GP4/GP5. LED da placa no GP25 (LED_BUILTIN). BOOTSEL legível no código. Encaixa na breadboard e na Pico4Drive.',
}

export const pico2w = {
  ...common,
  type: 'pico2w',
  name: 'Raspberry Pi Pico 2 W',
  short: 'Pico 2 W',
  board: { profile: 'pico2w' },
  wireless: true,
  description:
    'RP2350 (2 × Cortex-M33 a 150 MHz, 520 KB SRAM, 4 MB flash) + Wi‑Fi 2,4 GHz / Bluetooth 5.2 (CYW43439). Core Arduino-Pico: WiFi.h, WebServer.h, HTTPClient.h, PubSubClient (MQTT). Pinos de 3,3 V! ADC de 12 bits em GP26–28 (A0–A2), A3 = VSYS/3. GP23/24/25/29 são do Wi‑Fi; LED da placa no WL_GPIO0 do CYW43 (LED_BUILTIN = 64). BOOTSEL legível no código. Encaixa na breadboard e na Pico4Drive.',
  lib: WIFI_LIB,
}

export const PICO_FAMILY = [picow, pico2, pico2w]
// tipos com o formato da Pico (incluindo a original, que não declara `form`)
export const PICO40 = ['pico', 'picow', 'pico2', 'pico2w']
