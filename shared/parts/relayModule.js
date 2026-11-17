// Placas de relés de 2, 4 e 8 canais (relés SRD-05VDC-SL-C com optoacoplador). Barra de
// pinos GND, IN1…INn, VCC; bornes NO/COM/NC de cada canal na borda de cima.
import { PITCH } from '../geometry.js'

export const RELAY_BOARD = {
  relayModule2: { n: 2, w: 5.1, d: 3.9, pitch: 1.95 },
  relayModule4: { n: 4, w: 7.5, d: 5.5, pitch: 1.75 },
  relayModule8: { n: 8, w: 13.8, d: 5.6, pitch: 1.62 },
}
// x do centro do relé k (0…n−1); os relés ficam alinhados ao longo de x
export const relayX = (g, k) => (k - (g.n - 1) / 2) * g.pitch

function def(type) {
  const g = RELAY_BOARD[type]
  const ids = ['GND', ...Array.from({ length: g.n }, (_, i) => `IN${i + 1}`), 'VCC']
  const zH = g.d / 2 - 0.35 // barra de pinos na borda de baixo (+z)
  const zT = -g.d / 2 + 0.45 // bornes na borda de cima (−z)
  const pins = ids.map((id, i) => ({ id, pos: [(i - (ids.length - 1) / 2) * PITCH, 0.3, zH], kind: id === 'GND' ? 'gnd' : id === 'VCC' ? 'pwr' : 'in' }))
  for (let k = 0; k < g.n; k++) {
    const x = relayX(g, k)
    ;['NO', 'COM', 'NC'].forEach((t, j) =>
      pins.push({ id: `${t}${k + 1}`, label: `${t}${k + 1} (${t === 'NO' ? 'normalmente aberto' : t === 'NC' ? 'normalmente fechado' : 'comum'})`, pos: [x + (j - 1) * 0.5, 1.0, zT], kind: 'pass', conn: 'screw', dir: [0, 0, -1] }),
    )
  }
  return {
    type,
    name: `Placa de relés (${g.n} canais)`,
    short: `Relés ×${g.n}`,
    cat: 'output',
    description: `${g.n} relés de 5 V (contactos 10 A / 250 V) com optoacoplador. Barra de pinos: GND → GND, VCC → 5V, IN1…IN${g.n} → pinos digitais. ATENÇÃO: estas placas são ativas a LOW — digitalWrite(pino, LOW) liga o relé (acende o LED do canal) e HIGH desliga; no setup() faça pinMode(pino, OUTPUT) e logo a seguir digitalWrite(pino, HIGH), para os relés não ligarem no arranque. Cada relé ligado gasta ~72 mA do VCC${g.n >= 4 ? ` (com os ${g.n} ligados ~${Math.round(g.n * 0.075 * 100) / 100} A: use uma fonte de 5 V externa no JD-VCC)` : ''}. Em cada canal: COM comum, NO ligado a COM com o relé ativo, NC ligado em repouso.`,
    size: [g.w, 1.9, g.d],
    pins,
    config: { trigger: 'low' },
    fields: [{ key: 'trigger', label: 'Ativação', type: 'select', options: [['low', 'IN a LOW liga (optoacoplador, o normal)'], ['high', 'IN a HIGH liga (jumper H)']] }],
    view2d: { view: 'top', x: [-g.w / 2 - 0.05, g.w / 2 + 0.05], z: [-g.d / 2 - 0.05, g.d / 2 + 0.05] },
  }
}

export default [def('relayModule2'), def('relayModule4'), def('relayModule8')]
