// Bússolas magnéticas de 3 eixos HMC5883L e QMC5883L (módulos GY-271, I2C).
import { rowX } from '../geometry.js'

function make(type, chip, addr, lib, usage, extra) {
  return {
    type,
    name: `Bússola ${chip} (GY-271)`,
    short: chip,
    cat: 'sensor',
    description: `Magnetómetro de 3 eixos (campo da Terra ≈ 0,25–0,65 gauss) por I2C, endereço 0x${addr.toString(16).toUpperCase().padStart(2, '0')}. VCC → 5V ou 3,3V, GND → GND, SCL → A5, SDA → A4 (DRDY não é preciso). Com o módulo plano, o rumo = atan2(Y, X) em graus (0° = norte magnético, X a apontar para lá); some a declinação local (Portugal ≈ −1°). Ímanes, motores e ferro por perto desviam a leitura (calibre). ${extra} Na simulação o rumo ajusta-se no painel "Controlos".`,
    size: [1.4, 0.55, 1.4],
    pins: rowX(['VCC', 'GND', 'SCL', 'SDA', 'DRDY'], 0.55, 0.3, ['pwr', 'gnd', 'io', 'io', 'out']),
    config: { addr, incl: 60 },
    fields: [{ key: 'incl', label: 'Inclinação magnética do local', type: 'range', min: 0, max: 80, step: 1, unit: '°' }],
    interactive: { kind: 'slider', label: 'Rumo (para onde aponta X)', unit: '°', min: 0, max: 359, step: 1, default: 0 },
    lib: { header: lib, usage },
    view2d: { view: 'top', x: [-0.72, 0.72], z: [-0.72, 0.72] },
  }
}

export const hmc5883l = make(
  'hmc5883l',
  'HMC5883L',
  0x1e,
  'Adafruit_HMC5883_U.h',
  'Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);\nmag.begin();\nsensors_event_t ev;\nmag.getEvent(&ev);\nfloat rumo = atan2(ev.magnetic.y, ev.magnetic.x) * 180 / PI;',
  'Biblioteca Adafruit_HMC5883_U (valores em µT). Atenção: muitos GY-271 recentes trazem o clone QMC5883L (0x0D), que precisa de outra biblioteca.',
)
export const qmc5883l = make(
  'qmc5883l',
  'QMC5883L',
  0x0d,
  'QMC5883LCompass.h',
  'QMC5883LCompass bussola;\nbussola.init();\nbussola.read();\nint rumo = bussola.getAzimuth();',
  'É o clone chinês do HMC5883L (registos diferentes): biblioteca QMC5883LCompass (read(), getX(), getAzimuth()).',
)
