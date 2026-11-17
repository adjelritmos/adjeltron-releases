// Módulo de cartão microSD (SPI, com regulador e conversor de níveis).
import { rowZ } from '../geometry.js'

export default {
  type: 'microSD',
  name: 'Módulo cartão microSD (SPI)',
  short: 'microSD',
  cat: 'output',
  description:
    'Guarda ficheiros num cartão microSD (FAT16/FAT32, nomes 8.3). No Uno: CS → D10 (ou outro), MOSI → D11, MISO → D12, SCK → D13, VCC → 5V, GND → GND. Biblioteca SD: SD.begin(10); File f = SD.open("dados.txt", FILE_WRITE); f.println(…); f.close();. O conteúdo do cartão aparece na simulação e mantém-se enquanto ela corre.',
  size: [4.2, 1.0, 2.4],
  pins: rowZ(['GND', 'VCC', 'MISO', 'MOSI', 'SCK', 'CS'], -2.0, 0.3, ['gnd', 'pwr', 'out', 'in', 'in', 'in']),
  lib: {
    header: 'SD.h',
    usage: 'SD.begin(10);\nFile f = SD.open("log.txt", FILE_WRITE);\nif (f) {\n  f.println("ola");\n  f.close();\n}',
  },
  view2d: { view: 'top', x: [-2.25, 2.15], z: [-1.25, 1.25] },
}
