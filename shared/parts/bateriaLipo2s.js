// Bateria LiPo 2S (7,4 V) de 2200 mAh com ficha T (Deans).
import { lipoCellVoltage } from './lipo3s.js'

export const LIPO2 = { cells: 2, mAh: 2200, rint: 0.03 }
export const lipo2Voltage = (charge) => LIPO2.cells * lipoCellVoltage(charge)

export default {
  type: 'bateriaLipo2s',
  name: 'Bateria LiPo 2S 2200 mAh (7,4 V)',
  short: 'LiPo 2S',
  cat: 'power',
  description:
    '2 células de lítio-polímero em série: 7,4 V nominal, 8,4 V cheia, ~6,6 V vazia. 2200 mAh e ~30 mΩ de resistência interna: aguenta os picos dos 8–12 servos de um cão robô. NÃO ligue os servos diretamente (8,4 V queima-os): use um regulador de 5–6 V (LM2596/UBEC) para o V+ do PCA9685; o Arduino pode ir ao VIN. Ficha T (+ vermelho, − preto). Nunca a descarregue abaixo de 3,3 V por célula. ~120 g: ponha-a por baixo do chassi, ao centro, para baixar o centro de massa.',
  size: [10.5, 1.8, 3.4],
  pins: [
    { id: '+', label: '+ (ficha T, vermelho)', pos: [6.25, 0.9, -0.35], kind: 'bat+' },
    { id: '-', label: '− (ficha T, preto)', pos: [6.25, 0.9, 0.35], kind: 'bat-' },
  ],
  config: { charge: 100, color: '#1565c0' },
  fields: [
    { key: 'charge', label: 'Carga', type: 'range', min: 0, max: 100, step: 5, unit: '%' },
    { key: 'color', label: 'Cor da manga', type: 'color' },
  ],
  mass: 120,
  collider: { size: [10.5, 1.8, 3.4], pos: [0, 0.9, 0] },
  view2d: { view: 'top', x: [-5.4, 6.65], z: [-1.85, 1.85] },
}
