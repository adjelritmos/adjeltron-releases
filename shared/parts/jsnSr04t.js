// Sensor ultrassónico à prova de água JSN-SR04T (placa de comando + sonda em cabo de 2,5 m).
import { rowZ } from '../geometry.js'

export default {
  type: 'jsnSr04t',
  name: 'Ultrassónico à prova de água JSN-SR04T',
  short: 'JSN-SR04T',
  cat: 'sensor',
  description:
    'Mesmo protocolo do HC-SR04 (impulso de 10 µs em Trig, pulseIn(Echo, HIGH) → distância = µs × 0,0343 / 2), mas com uma só sonda selada (transmite e recebe) num cabo comprido: ideal para depósitos de água, estacionamento, exterior. 5V → 5V, Trig e Echo a pinos digitais, GND → GND. Alcance 25–450 cm: abaixo de ~20–25 cm (zona cega) o eco ainda não chegou ao fim da emissão e a leitura fica presa em ~23 cm. Faça leituras com ≥ 60 ms de intervalo. Na simulação a distância ajusta-se no painel "Controlos".',
  size: [7.0, 1.6, 2.8],
  mass: 15.7, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  // placa e sonda à prova de água (cilindro de r 1,15 cm)
  collider: [
    { size: [4.1, 0.9, 2.8], pos: [0, 0.45, 0] },
    { size: [2.0, 1.47, 2.0], pos: [3.75, 0.735, 0] },
  ],
  pins: rowZ(['5V', 'Trig', 'Echo', 'GND'], -1.85, 0.3, ['pwr', 'in', 'out', 'gnd']),
  interactive: { kind: 'slider', label: 'Distância ao alvo', unit: 'cm', min: 5, max: 600, step: 1, default: 120 },
  view2d: { view: 'top', x: [-2.15, 4.95], z: [-1.45, 1.45] },
}
