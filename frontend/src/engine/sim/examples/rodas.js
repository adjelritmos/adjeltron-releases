// Robô de duas rodas grandes impressas em 3D (como o da foto): chassi 2WD com o "Motor DC +
// roda" na opção "150 mm impressa 3D (disco com furos)", corpo azul por cima, Arduino, L298N,
// bateria e o sensor ultrassónico à frente. Evita obstáculos. As rodas grandes levantam o
// chassi sozinhas e fazem o robô andar mais depressa (raio 7,5 cm em vez de 3,3 cm).
import { H, CODE_OBSTACLES } from '../examples.js'

const { part, w, RED, BLK } = H

function buildRodasGrandes() {
  const roda = { wheel: 'discoGrande', wheelColor: '#e53935' }
  const parts = [
    part('ch', 'chassis', { pos: [0, 0, 0] }),
    part('mL', 'motor', { parent: ['ch', 'motorL'], config: roda, sch: [-640, -170] }),
    part('mR', 'motor', { parent: ['ch', 'motorR'], config: roda, sch: [-640, 140] }),
    // corpo azul (caixa impressa) por cima da placa do chassi; a eletrónica vai em cima dele
    part('corpo', 'bloco', { parent: ['ch', 'top'], pos: [0.5, 0, 0], config: { x: 17, y: 2.5, z: 9.5, material: 'pla', color: '#1e40af' } }),
    part('bat', 'battery', { parent: ['corpo', 'top'], pos: [-6.7, 0, 0], rot: [0, -90, 0], sch: [-300, 290] }),
    part('drv', 'l298n', { parent: ['corpo', 'top'], pos: [-2.5, 0, 0], sch: [-330, -20] }),
    part('uno', 'arduino', { parent: ['corpo', 'top'], pos: [4.1, 0, 0], sch: [0, 0], config: { usb: false } }),
    part('son', 'hcsr04', { parent: ['corpo', 'top'], pos: [7.9, 0, 0], sch: [320, -170] }),
  ]
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', '5V', 'uno', '5V', RED),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    w('drv', 'OUT1', 'mL', 'M+', '#fb8c00'),
    w('drv', 'OUT2', 'mL', 'M-', '#8e24aa'),
    // o motor direito está rodado 180°: fios trocados para girar no mesmo sentido
    w('drv', 'OUT3', 'mR', 'M-', '#8e24aa'),
    w('drv', 'OUT4', 'mR', 'M+', '#fb8c00'),
    w('uno', 'D5', 'drv', 'ENA', '#fdd835'),
    w('uno', 'D7', 'drv', 'IN1', '#43a047'),
    w('uno', 'D8', 'drv', 'IN2', '#1e88e5'),
    w('uno', 'D9', 'drv', 'IN3', '#43a047'),
    w('uno', 'D10', 'drv', 'IN4', '#1e88e5'),
    w('uno', 'D6', 'drv', 'ENB', '#fdd835'),
    w('son', 'VCC', 'uno', '5V', RED),
    w('son', 'GND', 'uno', 'GND.1', BLK),
    w('son', 'Trig', 'uno', 'D11', '#fdd835'),
    w('son', 'Echo', 'uno', 'D12', '#43a047'),
  ]
  return { parts, wires }
}

export const PRESETS = {
  rodasGrandes: {
    name: 'Robô de rodas grandes impressas (evita obstáculos)',
    cat: 'Robótica',
    track: 'obstaculos',
    build: buildRodasGrandes,
    code: CODE_OBSTACLES,
    scenario: {
      check: (S) => (S.serial.includes('Distancia') && S.moved > 1 ? `andou ${S.moved.toFixed(1)} cm com as rodas de 150 mm; ${S.serial.match(/Distancia: [\d.]+/)?.[0]}` : null),
    },
  },
}
