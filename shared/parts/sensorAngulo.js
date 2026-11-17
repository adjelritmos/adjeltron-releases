// Sensor de ângulo magnético (AS5600) com eixo e rolamento: o que se prende no eixo roda
// livremente (pêndulo, plano defletor, porta) e o sensor mede o ângulo real. Saída analógica
// OUT: 0 V a −180°, VCC/2 na posição de montagem (0°), VCC a +180°.
// Origem no centro da face de trás (que aparafusa a uma barra/placa); eixo segundo +y.
export const SA = { R: 1.3, H: 1.0, AXIS_Y: 1.6 }
const P = 0.254
// medidas editáveis do eixo: comprimento fora do corpo e diâmetro (o corpo redimensiona-se pela
// escala genérica do painel "Dimensões", que também afasta o eixo e a ficha)
export const SHAFT_OPTS = [['0.3', '3 mm'], ['0.4', '4 mm'], ['0.5', '5 mm'], ['0.6', '6 mm'], ['0.8', '8 mm'], ['1', '10 mm'], ['1.2', '12 mm']]
export function saDims(c = {}) {
  const axle = Math.max(0.2, +(c.axle ?? 0.6))
  const shaftD = Math.max(0.2, +(c.shaftD ?? 0.6))
  return { axle, shaftD, axisY: SA.H + axle }
}

export default {
  type: 'sensorAngulo',
  name: 'Sensor de ângulo AS5600 (com eixo)',
  short: 'Sensor de ângulo',
  cat: 'sensor',
  description:
    'Sensor de ângulo sem contacto (íman no eixo + chip AS5600) com eixo de 6 mm em rolamento: a peça presa no eixo roda livremente e o sensor mede o ângulo real. OUT dá uma tensão proporcional ao ângulo: VCC/2 na posição em que foi montado (0°), 0 V a −180° e VCC a +180°. No Arduino: angulo = analogRead(A0) * 360.0 / 1023 - 180. Na física o eixo roda com o peso e com o vento de uma hélice (plano defletor, pêndulo). Redimensionável: escala do corpo em "Dimensões" e comprimento/diâmetro do eixo nas propriedades.',
  size: [2.6, 1.0, 2.6],
  scalable: true, // redimensionável (Dimensões) apesar de ter pinos
  config: { axle: 0.6, shaftD: '0.6' },
  fields: [
    { key: 'axle', label: 'Comprimento do eixo', type: 'range', min: 0.2, max: 10, step: 0.1, unit: 'cm' },
    { key: 'shaftD', label: 'Diâmetro do eixo', type: 'select', options: SHAFT_OPTS },
  ],
  pins: [
    { id: 'VCC', pos: [-1.3, 0.4, -P], kind: 'pwr', dir: [-1, 0, 0] },
    { id: 'GND', pos: [-1.3, 0.4, 0], kind: 'gnd', dir: [-1, 0, 0] },
    { id: 'OUT', pos: [-1.3, 0.4, P], kind: 'out', dir: [-1, 0, 0] },
  ],
  mass: 12,
  // só o corpo colide (o eixo ficaria em contacto com a peça que roda nele)
  // corpo e o cubo do eixo por cima (redondo: roda sem mudar; o que se prende ao eixo não lhe toca)
  collider: [
    { size: [2.6, 1.0, 2.6], pos: [0, 0.5, 0] },
    { size: [1.04, 0.65, 1.04], pos: [0, 1.3, 0] },
  ],
  mounts: {
    // damping: rolamento + resistência do ar de uma placa pendurada (kg·cm²/s)
    eixo: { pos: (c) => [0, saDims(c).axisY, 0], servo: true, idler: true, free: true, torque: 0.05, damping: 6, label: 'eixo (roda livre, ângulo medido)' },
  },
  view2d: { view: 'top', x: [-1.6, 1.4], z: [-1.4, 1.4] },
}
