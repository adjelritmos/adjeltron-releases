// Relé de sinal KS2E-M-DC5 (wokwi-ks2e-m-dc5): bobina de 5 V e 2 contactos inversores
// (DPDT). Corpo DIP de 20 × 10 mm que encaixa na breadboard por cima do canal central.
const X = [-0.762, -0.254, 0.254, 0.762]
const TOP = ['COIL1', 'NO1', 'P1', 'NC1']
const BOT = ['COIL2', 'NO2', 'P2', 'NC2']
const LABEL = { COIL1: 'COIL1 (bobina)', COIL2: 'COIL2 (bobina)', P1: 'P1 (comum 1)', P2: 'P2 (comum 2)', NO1: 'NO1 (normalmente aberto)', NO2: 'NO2 (normalmente aberto)', NC1: 'NC1 (normalmente fechado)', NC2: 'NC2 (normalmente fechado)' }

export default {
  type: 'ks2eRelay',
  name: 'Relé KS2E-M-DC5 (DPDT, 5 V)',
  short: 'KS2E',
  cat: 'output',
  description:
    'Relé de sinal com bobina de 5 V (~125 Ω, 40 mA) e dois comutadores independentes: em repouso P1–NC1 e P2–NC2 estão ligados; com 5 V na bobina (COIL1–COIL2, sem polaridade) passam a P1–NO1 e P2–NO2. Contactos até 2 A. A bobina pede 40 mA — no limite de um pino: comande-a com um transístor (2N2222 + 1 kΩ na base) e ponha um díodo 1N4007 em paralelo com a bobina (cátodo no +) para absorver o pico ao desligar. Com 2 contactos pode inverter o sentido de um motor (ponte H).',
  size: [2.0, 1.1, 1.0],
  pins: [
    ...TOP.map((id, i) => ({ id, label: LABEL[id], pos: [X[i], 0, -0.381], kind: 'pass' })),
    ...BOT.map((id, i) => ({ id, label: LABEL[id], pos: [X[i], 0, 0.381], kind: 'pass' })),
  ],
  view2d: { view: 'top', x: [-1.05, 1.05], z: [-0.55, 0.55] },
}
