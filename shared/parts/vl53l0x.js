// Sensor de distância laser (tempo de voo) VL53L0X (módulo GY-VL53L0XV2, I2C).
import { rowX } from '../geometry.js'

export default {
  type: 'vl53l0x',
  name: 'Distância laser ToF VL53L0X',
  short: 'VL53L0X',
  cat: 'sensor',
  description:
    'Mede a distância pelo tempo de voo de um laser infravermelho de 940 nm (invisível): 3–200 cm com resolução de 1 mm, feixe estreito de 25°, quase não depende da cor do alvo. VIN → 5V ou 3,3V, GND → GND, SCL → A5, SDA → A4 (endereço 0x29). XSHUT a GND desliga o sensor (serve para dar endereços diferentes a vários sensores); GPIO1 é a interrupção. Bibliotecas: Adafruit_VL53L0X (lox.rangingTest(&medida, false); medida.RangeMilliMeter, RangeStatus ≠ 4) ou VL53L0X da Pololu (sensor.init(); sensor.readRangeSingleMillimeters(); fora de alcance dá 8190). Cada medição demora ~33 ms. Na simulação a distância ajusta-se no painel "Controlos".',
  size: [2.5, 0.55, 1.1],
  pins: rowX(['VIN', 'GND', 'SCL', 'SDA', 'GPIO1', 'XSHUT'], 0.4, 0.3, ['pwr', 'gnd', 'io', 'io', 'out', 'in']),
  config: { addr: 0x29 },
  interactive: { kind: 'slider', label: 'Distância ao alvo', unit: 'mm', min: 0, max: 2500, step: 1, default: 300 },
  lib: {
    header: 'Adafruit_VL53L0X.h',
    usage: 'Adafruit_VL53L0X lox = Adafruit_VL53L0X();\nlox.begin();\nVL53L0X_RangingMeasurementData_t medida;\nlox.rangingTest(&medida, false);\nif (medida.RangeStatus != 4) Serial.println(medida.RangeMilliMeter);',
  },
  view2d: { view: 'top', x: [-1.27, 1.27], z: [-0.58, 0.58] },
}
