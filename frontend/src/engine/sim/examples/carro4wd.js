// Carro 4WD que evita obstáculos: chassi de duas placas com 4 motores TT. Os dois motores de
// cada lado estão em paralelo no mesmo canal do L298N (OUT1/OUT2 = esquerda, OUT3/OUT4 =
// direita); bateria e driver entre as placas, Arduino e sensor ultrassónico em cima.
import { H, CODE_OBSTACLES } from '../examples.js'

const { part, w, RED, BLK } = H

function buildCarro4wd(umaPlaca = false) {
  const parts = [
    part('ch', umaPlaca ? 'chassis4wd1' : 'chassis4wd', { pos: [0, 0, 0] }),
    part('mL', 'motor', { parent: ['ch', 'motorL'], sch: [-640, -230] }),
    part('mL2', 'motor', { parent: ['ch', 'motorL2'], sch: [-990, -230] }),
    part('mR', 'motor', { parent: ['ch', 'motorR'], sch: [-640, 170] }),
    part('mR2', 'motor', { parent: ['ch', 'motorR2'], sch: [-990, 170] }),
    // entre as placas
    part('bat', 'battery', { parent: ['ch', umaPlaca ? 'top' : 'mid'], pos: [-8.5, 0, 0], rot: [0, -90, 0], sch: [-300, 330] }),
    part('drv', 'l298n', { parent: ['ch', umaPlaca ? 'top' : 'mid'], pos: [umaPlaca ? -3.5 : 2.5, 0, 0], sch: [-330, -20] }),
    // em cima
    part('uno', 'arduino', { parent: ['ch', 'top'], pos: [umaPlaca ? 3.6 : 0, 0, 0], sch: [0, 0], config: { usb: false } }),
    part('son', 'hcsr04', { parent: ['ch', 'top'], pos: [9.4, 0, 0], sch: [320, -170] }),
  ]
  const wires = [
    w('bat', '+', 'drv', '12V', RED),
    w('bat', '-', 'drv', 'GND', BLK),
    w('drv', '5V', 'uno', '5V', RED),
    w('drv', 'GND', 'uno', 'GND.2', BLK),
    // lado esquerdo: os dois motores em paralelo
    w('drv', 'OUT1', 'mL', 'M+', '#fb8c00'),
    w('drv', 'OUT2', 'mL', 'M-', '#8e24aa'),
    w('mL', 'M+', 'mL2', 'M+', '#fb8c00'),
    w('mL', 'M-', 'mL2', 'M-', '#8e24aa'),
    // lado direito (motores rodados 180°: fios trocados para girar no mesmo sentido)
    w('drv', 'OUT3', 'mR', 'M-', '#8e24aa'),
    w('drv', 'OUT4', 'mR', 'M+', '#fb8c00'),
    w('mR', 'M+', 'mR2', 'M+', '#fb8c00'),
    w('mR', 'M-', 'mR2', 'M-', '#8e24aa'),
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
  carro4wd: {
    name: 'Carro 4WD que evita obstáculos (4 motores TT)',
    cat: 'Robótica',
    track: 'obstaculos',
    build: buildCarro4wd,
    code: CODE_OBSTACLES,
    scenario: {
      check: (S) => (S.serial.includes('Distancia') && S.moved > 1 ? `andou ${S.moved.toFixed(1)} cm com 4 rodas; ${S.serial.match(/Distancia: [\d.]+/)?.[0]}` : null),
    },
  },
  carro4wd1: {
    name: 'Carro 4WD de uma placa que evita obstáculos',
    cat: 'Robótica',
    track: 'obstaculos',
    build: () => buildCarro4wd(true),
    code: CODE_OBSTACLES,
    scenario: {
      check: (S) => (S.serial.includes('Distancia') && S.moved > 1 ? `andou ${S.moved.toFixed(1)} cm (uma placa); ${S.serial.match(/Distancia: [\d.]+/)?.[0]}` : null),
    },
  },
}
