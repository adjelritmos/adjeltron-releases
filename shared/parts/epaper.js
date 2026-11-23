// Ecrãs e-paper (tinta eletrónica) em módulo SPI ao estilo Waveshare, um tipo por tamanho.
// Pinos (conector de 8 vias na ponta esquerda): VCC, GND, DIN, CLK, CS, DC, RST, BUSY.
// A imagem fica no ecrã sem alimentação; cada atualização demora (o pino BUSY fica a HIGH nos
// controladores SSD16xx e a LOW nos UC81xx — busyLow — como na GxEPD2).
import { rowZ } from '../geometry.js'

// nw × nh = dimensões nativas do controlador (WIDTH × HEIGHT na GxEPD2); portrait = nativo
// "ao alto" (a face do módulo mostra-o rodado: setRotation(1) dá texto direito).
// fullMs / partMs: tempos reais de atualização (partMs 0 = sem atualização parcial).
// geometria em cm: L × D (placa), glass (vidro) e act (área ativa) no referencial local.
export const EPAPER = {
  epaper154: { inch: '1,54', nw: 200, nh: 200, ctl: 'SSD1681', L: 4.8, D: 3.3, glass: { x: [-1.6, 2.13], z: [-1.59, 1.59] }, act: { x: [-1.115, 1.645], z: [-1.38, 1.38] }, colors: ['bw', 'bwr'], full: { bw: 2000, bwr: 15000 }, part: { bw: 300, bwr: 0 } },
  epaper213: { inch: '2,13', nw: 122, nh: 250, portrait: true, ctl: 'SSD1680', L: 6.5, D: 3.0, glass: { x: [-2.66, 3.26], z: [-1.46, 1.46] }, act: { x: [-2.13, 2.725], z: [-1.185, 1.185] }, colors: ['bw', 'bwr'], full: { bw: 2000, bwr: 15000 }, part: { bw: 300, bwr: 0 } },
  epaper290: { inch: '2,9', nw: 128, nh: 296, portrait: true, ctl: 'SSD1680', L: 8.95, D: 3.8, glass: { x: [-3.5, 4.4], z: [-1.83, 1.83] }, act: { x: [-2.89, 3.8], z: [-1.4525, 1.4525] }, colors: ['bw', 'bwr'], full: { bw: 2000, bwr: 15000 }, part: { bw: 300, bwr: 0 } },
  epaper420: { inch: '4,2', nw: 400, nh: 300, ctl: 'SSD1683', L: 10.3, D: 7.85, glass: { x: [-4.0, 5.1], z: [-3.85, 3.85] }, act: { x: [-3.69, 4.79], z: [-3.18, 3.18] }, colors: ['bw', 'bwr'], full: { bw: 3500, bwr: 16000 }, part: { bw: 600, bwr: 0 } },
  epaper750: { inch: '7,5', nw: 800, nh: 480, ctl: 'UC8179', busyLow: true, L: 17.8, D: 11.4, glass: { x: [-8.4, 8.62], z: [-5.56, 5.56] }, act: { x: [-8.05, 8.27], z: [-4.895, 4.895] }, colors: ['bw', 'bwr'], full: { bw: 4000, bwr: 20000 }, part: { bw: 900, bwr: 0 } },
  epaper565: { inch: '5,65', nw: 600, nh: 448, ctl: 'UC8159C', busyLow: true, L: 13.0, D: 10.0, glass: { x: [-5.9, 6.6], z: [-4.98, 4.98] }, act: { x: [-5.6, 5.89], z: [-4.29, 4.29] }, colors: ['7c'], full: { '7c': 12000 }, part: { '7c': 0 } },
}
export const EPAPER_TYPES = new Set(Object.keys(EPAPER))
// dimensões da imagem na face do módulo (sempre "deitada")
export const faceDims = (g) => (g.portrait ? [g.nh, g.nw] : [g.nw, g.nh])

const COLOR_NAMES = { bw: 'Preto/branco', bwr: 'Preto/branco/vermelho', '7c': '7 cores (ACeP)' }
const PANEL_EX = {
  epaper154: { bw: 'GxEPD2_154_D67', bwr: 'GxEPD2_154_Z90c' },
  epaper213: { bw: 'GxEPD2_213_BN', bwr: 'GxEPD2_213_Z98c' },
  epaper290: { bw: 'GxEPD2_290_BS', bwr: 'GxEPD2_290_C90c' },
  epaper420: { bw: 'GxEPD2_420_GDEY042T81', bwr: 'GxEPD2_420c_Z21' },
  epaper750: { bw: 'GxEPD2_750_T7', bwr: 'GxEPD2_750c_Z08' },
  epaper565: { '7c': 'GxEPD2_565c' },
}

function make(type) {
  const g = EPAPER[type]
  const [fw, fh] = faceDims(g)
  const c0 = g.colors[0]
  const ex = PANEL_EX[type][c0]
  const cls = c0 === '7c' ? 'GxEPD2_7C' : 'GxEPD2_BW'
  return {
    type,
    name: `E-paper ${g.inch}" ${fw}×${fh} (SPI)`,
    short: `E-paper ${g.inch}"`,
    cat: 'output',
    description:
      `Ecrã de tinta eletrónica ${g.inch}" (${fw}×${fh} pontos, controlador ${g.ctl}). Como papel: só gasta energia ao mudar e a imagem fica mesmo sem alimentação. Módulo com regulador e conversor de nível: VCC 3,3–5 V, GND → GND, DIN → MOSI (D11 no Uno), CLK → SCK (D13), CS, DC, RST e BUSY a pinos à escolha (ex.: 10, 9, 8, 7). ` +
      `Cada atualização completa demora ~${(g.full[c0] / 1000).toFixed(1).replace('.', ',')} s e pisca (preto/branco) — enquanto isso BUSY fica a ${g.busyLow ? 'LOW (neste controlador o BUSY é ativo a LOW; em repouso está a HIGH)' : 'HIGH'}. ` +
      (g.part[c0] ? `A atualização parcial (setPartialWindow) demora ~${g.part[c0]} ms e não pisca. ` : '') +
      'Biblioteca GxEPD2 (com Adafruit_GFX): desenhe entre firstPage() e nextPage(), ou chame display().',
    size: [g.L, 0.6, g.D],
    pins: rowZ(['VCC', 'GND', 'DIN', 'CLK', 'CS', 'DC', 'RST', 'BUSY'], -g.L / 2 + 0.3, 0.3, ['pwr', 'gnd', 'in', 'in', 'in', 'in', 'in', 'out']),
    config: { color: c0, speed: 'real' },
    fields: [
      ...(g.colors.length > 1 ? [{ key: 'color', label: 'Cores do painel', type: 'select', options: g.colors.map((c) => [c, COLOR_NAMES[c]]) }] : []),
      { key: 'speed', label: 'Tempo de atualização', type: 'select', options: [['real', 'Real (como o painel)'], ['fast', 'Rápido (50 ms)']] },
    ],
    lib: {
      header: c0 === '7c' ? 'GxEPD2_7C.h' : 'GxEPD2_BW.h',
      usage:
        `#include <${c0 === '7c' ? 'GxEPD2_7C.h' : 'GxEPD2_BW.h'}>\n#include <Fonts/FreeMonoBold9pt7b.h>\n${cls}<${ex}, ${ex}::HEIGHT> ecra(${ex}(/*CS*/ 10, /*DC*/ 9, /*RST*/ 8, /*BUSY*/ 7));\n` +
        `ecra.init(115200);\necra.setRotation(1);\necra.setFont(&FreeMonoBold9pt7b);\necra.setTextColor(GxEPD_BLACK);\necra.setFullWindow();\necra.firstPage();\ndo {\n  ecra.fillScreen(GxEPD_WHITE);\n  ecra.setCursor(10, 30);\n  ecra.print("Ola!");\n} while (ecra.nextPage());\necra.hibernate();`,
    },
    view2d: { view: 'top', x: [-g.L / 2 - 0.05, g.L / 2 + 0.05], z: [-g.D / 2 - 0.05, g.D / 2 + 0.05] },
  }
}

export const EPAPER_DEFS = Object.keys(EPAPER).map(make)
export default EPAPER_DEFS
