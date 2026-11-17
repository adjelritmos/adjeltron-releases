// Módulo GPS u-blox NEO-6M (placa GY-GPS6MV2) com antena cerâmica: frases NMEA a 9600 baud.
import { rowZ } from '../geometry.js'

export const GPS_DEFAULT = { lat: 38.7369, lon: -9.1427, speed: 0, course: 0, sats: 8, alt: 95 }

export default {
  type: 'gpsNeo6m',
  name: 'GPS NEO-6M',
  short: 'GPS',
  cat: 'sensor',
  description:
    'Recetor GPS que envia, uma vez por segundo, frases de texto NMEA ($GPRMC, $GPGGA, $GPGSV…) pela porta série a 9600 baud. VCC → 5V (tem regulador de 3,3 V), GND → GND, TX do GPS → pino RX do Arduino, RX do GPS → TX do Arduino (só para configurar). No Uno use a SoftwareSerial (ex.: SoftwareSerial gps(4, 3) com o TX do módulo no D4) — os pinos 0/1 são da USB; no Mega use a Serial1 (RX1 = 19), no ESP32 a Serial2 (RX2 = 16). Descodifique com a TinyGPS++: gps.encode(c) para cada carácter e depois gps.location.lat(). Ao ligar demora alguns segundos a encontrar satélites (o LED pisca quando tem posição). Posição, velocidade e satélites ajustam-se no painel "Controlos".',
  size: [3.6, 1.6, 2.6],
  mass: 7.5, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  collider: { size: [3.6, 0.6, 2.6], pos: [0, 0.3, 0] },
  pins: rowZ(['VCC', 'RX', 'TX', 'GND'], -1.6, 0.42, ['pwr', 'in', 'out', 'gnd']),
  config: { ...GPS_DEFAULT, fixTime: 2 },
  fields: [
    { key: 'fixTime', label: 'Tempo até ter posição (arranque)', type: 'number', min: 0, max: 60, step: 1, unit: 's' },
    { key: 'lat', label: 'Latitude inicial', type: 'number', min: -90, max: 90, step: 0.0001, unit: '°' },
    { key: 'lon', label: 'Longitude inicial', type: 'number', min: -180, max: 180, step: 0.0001, unit: '°' },
  ],
  interactive: {
    kind: 'fields',
    items: [
      { key: 'lat', label: 'Latitude', min: -90, max: 90, step: 0.0001, unit: '°' },
      { key: 'lon', label: 'Longitude', min: -180, max: 180, step: 0.0001, unit: '°' },
      { key: 'speed', label: 'Velocidade', min: 0, max: 300, step: 1, unit: 'km/h' },
      { key: 'course', label: 'Rumo', min: 0, max: 359, step: 1, unit: '°' },
      { key: 'sats', label: 'Satélites', min: 0, max: 12, step: 1 },
      { key: 'alt', label: 'Altitude', min: -100, max: 9000, step: 1, unit: 'm' },
    ],
  },
  lib: {
    header: 'TinyGPS++.h',
    usage: '#include <SoftwareSerial.h>\n#include <TinyGPS++.h>\nSoftwareSerial ss(4, 3);   // RX, TX\nTinyGPSPlus gps;\nss.begin(9600);\nwhile (ss.available()) gps.encode(ss.read());\nif (gps.location.isUpdated()) Serial.println(gps.location.lat(), 6);',
  },
  view2d: { view: 'top', x: [-1.95, 1.85], z: [-1.35, 1.35] },
}
