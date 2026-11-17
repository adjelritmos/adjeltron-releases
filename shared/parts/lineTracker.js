// Módulos seguidores de linha com 3 e 5 sensores TCRT5000 (saídas digitais por canal).
import { rowZ } from '../geometry.js'

// posições (z, cm) dos sensores ao longo da barra
export const TRACKER_Z = { lineTracker3: [-1.5, 0, 1.5], lineTracker5: [-2.0, -1.0, 0, 1.0, 2.0] }
export const LINE_W = 1.8 // largura da fita preta (cm)

function make(type, n, outs) {
  const W = n === 3 ? 5.0 : 6.6
  return {
    type,
    name: `Seguidor de linha de ${n} canais (TCRT5000)`,
    short: `Linha ${n}`,
    cat: 'sensor',
    description: `Barra com ${n} sensores de reflexão IR TCRT5000 (cada um com o seu comparador e LED). GND → GND, VCC → 5V, ${outs.join(', ')} → pinos digitais. Cada saída fica HIGH sobre a linha preta (pouco reflexo) e LOW sobre o fundo branco — leia todas e decida: só a do meio = em frente; a da esquerda = virar à esquerda… Monte-a por baixo do robô a 3–10 mm do chão. Na simulação: posição da linha (cm, 0 = centro, negativo = esquerda) no painel "Controlos"; fita preta de ${String(LINE_W).replace('.', ',')} cm.`,
    size: [2.0, 1.4, W],
    mass: 1.4 * W, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
    // placa com os componentes e os sensores TCRT5000 por baixo (0,6 cm abaixo da placa)
    collider: [
      { size: [2.0, 0.9, W], pos: [0, 0.45, 0] },
      { size: [0.6, 0.6, W - 1.0], pos: [0.55, -0.3, 0] },
    ],
    pins: rowZ(['GND', 'VCC', ...outs], -0.75, 0.3, ['gnd', 'pwr', ...outs.map(() => 'out')]),
    config: { invert: false },
    fields: [{ key: 'invert', label: 'Saída', type: 'select', options: [[false, 'HIGH sobre preto'], [true, 'LOW sobre preto (módulos invertidos)']] }],
    interactive: { kind: 'slider', label: 'Posição da linha', unit: 'cm', min: -4, max: 4, step: 0.1, default: 0 },
    view2d: { view: 'top', x: [-1.05, 1.05], z: [-W / 2 - 0.05, W / 2 + 0.05] },
  }
}

export const lineTracker3 = make('lineTracker3', 3, ['L', 'C', 'R'])
export const lineTracker5 = make('lineTracker5', 5, ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5'])
