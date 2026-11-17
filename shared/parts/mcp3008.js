// Conversor analógico-digital MCP3008 (DIP-16): 8 canais de 10 bits por SPI — dá mais entradas
// analógicas ao Arduino (ou entradas analógicas a placas que não as têm, como o Raspberry Pi).
import { PITCH } from '../geometry.js'

const X = (i) => (i - 3.5) * PITCH
// pinos 1–8 em baixo (esquerda → direita): CH0–CH7; 9–16 em cima (direita → esquerda); entalhe à esquerda
const BOTTOM = Array.from({ length: 8 }, (_, k) => [`CH${k}`, 'in', `CH${k} (entrada analógica)`])
const TOP = [['DGND', 'gnd', 'DGND (massa digital)'], ['CS', 'in', 'CS/SHDN (seleção, ativo LOW)'], ['DIN', 'in', 'DIN (MOSI)'], ['DOUT', 'out', 'DOUT (MISO)'], ['CLK', 'in', 'CLK (SCK)'], ['AGND', 'gnd', 'AGND (massa analógica)'], ['VREF', 'in', 'VREF (tensão de referência)'], ['VDD', 'pwr', 'VDD (2,7–5,5 V)']]

export default {
  type: 'mcp3008',
  name: 'Conversor A/D MCP3008 (8 canais, SPI)',
  short: 'MCP3008',
  cat: 'discrete',
  description:
    'Oito entradas analógicas de 10 bits (0–1023) por SPI. Encaixe-o sobre o canal central da breadboard. VDD e VREF → 5V (VREF é o valor que dá 1023), AGND e DGND → GND, CLK → D13 (SCK), DOUT → D12 (MISO), DIN → D11 (MOSI), CS → D10 (ou outro pino). Com a biblioteca Adafruit_MCP3008: adc.begin(10) e adc.readADC(canal). Também responde a SPI.transfer() direto (3 bytes: 0x01, 0x80 | canal << 4, 0x00). Modo diferencial: readADCDifference(0) = CH0 − CH1.',
  size: [2.0, 0.55, 0.65],
  pins: [
    ...BOTTOM.map(([id, kind, label], i) => ({ id, label, pos: [X(i), 0, 0.381], kind })),
    ...TOP.map(([id, kind, label], i) => ({ id, label, pos: [X(7 - i), 0, -0.381], kind })),
  ],
  lib: {
    header: 'Adafruit_MCP3008.h',
    usage: '#include <Adafruit_MCP3008.h>\nAdafruit_MCP3008 adc;\nadc.begin(10); // pino CS (SPI por hardware)\nint v = adc.readADC(0); // 0–1023',
  },
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.5, 0.5] },
}
