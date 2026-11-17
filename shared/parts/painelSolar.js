// Painel solar (fotovoltaico) pequeno, de resina sobre placa, para projetos com Arduino.
// Origem no centro da face de baixo; células em cima (+y). O bloco de terminais de parafuso
// fica sempre no mesmo sítio (x = −3,6), para o esquema 2D não mudar com o modelo.
import { SOLAR_MODELS } from './_solar.js'

const model = (c) => SOLAR_MODELS[c.model] || SOLAR_MODELS.m1
export const solarGeom = (c) => {
  const m = model(c)
  return { m, L: m.L, W: m.W, T: 0.3 }
}

export default {
  type: 'painelSolar',
  name: 'Painel solar',
  short: 'Painel solar',
  cat: 'power',
  description:
    'Converte luz em eletricidade. A corrente é proporcional à luz (curto-circuito: Isc) e a tensão sobe até à tensão em vazio (Voc) — num dia de sol (1000 W/m²) um painel de 6 V 1 W dá ~6 V e ~170 mA no ponto de potência máxima. A luz útil depende do ângulo entre o painel e o sol (elevação e azimute no painel): incline-o para o sol, ou monte-o num servo para seguir o sol. Para carregar uma bateria ponha um díodo (1N5819) em série, ou um módulo carregador (TP4056); ligado diretamente ao Arduino (VIN) só funciona com muita luz. Use o slider durante a simulação para mudar a luz (nuvens, noite…).',
  size: [11, 0.3, 6],
  pins: [
    { id: '+', label: '+ (vermelho)', pos: [-3.6, 0.95, -0.35], kind: 'bat+', conn: 'screw', dir: [0, 1, 0] },
    { id: '-', label: '− (preto)', pos: [-3.6, 0.95, 0.35], kind: 'bat-', conn: 'screw', dir: [0, 1, 0] },
  ],
  config: { model: 'm1', sunElev: 90, sunAz: 0 },
  fields: [
    { key: 'model', label: 'Modelo', type: 'select', options: Object.entries(SOLAR_MODELS).map(([k, m]) => [k, m.name]) },
    { key: 'sunElev', label: 'Elevação do sol', type: 'range', min: 0, max: 90, step: 5, unit: '°' },
    { key: 'sunAz', label: 'Azimute do sol (0° = +x, 90° = +z)', type: 'range', min: 0, max: 355, step: 5, unit: '°' },
  ],
  interactive: { kind: 'slider', label: 'Luz do sol', unit: 'W/m²', min: 0, max: 1200, step: 10, default: 800 },
  mass: (c) => {
    const { L, W } = solarGeom(c)
    return L * W * 0.45 // ~30 g o de 6 V 1 W
  },
  collider: (c) => {
    const { L, W, T } = solarGeom(c)
    // painel e o bloco de terminais por cima (sempre em x = −3,6)
    return [
      { size: [L, T, W], pos: [0, T / 2, 0] },
      { size: [0.75, 0.65, 1.45], pos: [-3.6, T + 0.325, 0] },
    ]
  },
  // por baixo: para o prender a um servo, suporte ou mastro
  mounts: {
    back: { pos: [0, 0, 0], rot: [180, 0, 0], label: 'traseira (centro)' },
    top: { pos: (c) => [0, solarGeom(c).T, 0], plane: true, label: 'em cima' },
  },
  view2d: { view: 'top', x: [-5.6, 5.6], z: [-3.1, 3.1] },
}
