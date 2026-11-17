// Motor TT 1:48 sem roda (o mesmo do "Motor DC + roda", mas para montar onde se quiser):
// caixa redutora amarela deitada, veio duplo em D segundo z, motor metálico atrás (−x) com a
// tampa de plástico branca e, por omissão, a braçadeira transparente à volta do motor.
// Origem no centro da face de baixo, por baixo do veio.
//
// Veio DUPLO: o mesmo veio sai dos dois lados da caixa. Dois pontos de fixação que rodam juntos:
//   shaft   lado esquerdo (−z), +y do mount = −z
//   shaft2  lado direito (+z), +y do mount = +z e `rev: true` (ângulo simétrico — o mesmo sentido
//           físico de rotação; ver mountMatrix em backend/sim/kinematics.js).
// ttDef(enc) gera também o motor TT com encoder (motorTTEnc.js).
import { encMotorPins, ENC_SIGN_NOTE } from './_encMotor.js'

const P = 0.254
// AY: altura do veio; motorX: centro da lata do motor; can: [x de trás, x da frente] da lata;
// ENC: disco magnético e placa do encoder atrás da tampa (motorTTEnc)
export const TT = { AY: 1.1, motorX: -2.95, canR: 1.0, can: [-4.1, -1.8], cap: -4.26, ENC: { disc: -4.55, pcb: -4.8, pin: -5.25 } }

export const TT_CLIPS = [
  ['transparente', 'Com braçadeira transparente (como vem nos kits)'],
  ['nenhum', 'Sem braçadeira'],
]
export const ttClip = (c) => (c?.suporte ?? 'transparente') !== 'nenhum'

const mounts = {
  shaft: { pos: [0, TT.AY, -1.45], rot: [-90, 0, 0], servo: true, torque: 0.8, label: 'veio — lado esquerdo (−z)' },
  shaft2: { pos: [0, TT.AY, 1.45], rot: [90, 0, 0], servo: true, rev: true, torque: 0.8, label: 'veio — lado direito (+z)' },
  top: { pos: [0.5, 2.2, 0], plane: true, label: 'em cima' },
}

export function ttDef(enc) {
  const back = enc ? TT.ENC.pin - 0.2 : -4.4
  return {
    type: enc ? 'motorTTEnc' : 'motorTT',
    name: enc ? 'Motor TT 1:48 com encoder' : 'Motor TT 1:48 (sem roda)',
    short: enc ? 'Motor TT encoder' : 'Motor TT',
    cat: 'motion',
    // solto na mesa (sem estar preso a nada) tem física: cai, tomba, choca e a roda presa no veio
    // empurra-o (ver shared/physics.js)
    loose: true,
    description: enc
      ? 'Motor TT amarelo (caixa redutora 1:48, 3–6 V, ~200 rpm a 6 V) com encoder magnético de efeito Hall atrás do motor: disco de 11 impulsos por volta do rotor e 2 canais em quadratura (A e B). Por volta do veio de saída: 11 × 48 = 528 impulsos em cada canal — 528 com RISING em A, 1056 com CHANGE em A, 2112 com a Encoder.h (4 flancos). Ficha de 6 vias: M+ · GND · A · B · VCC · M−. Comande o motor (M+/M−) com uma ponte H e alimente o encoder com 5 V; ligue A e B a pinos com interrupção (no Uno D2 e D3). ' +
        ENC_SIGN_NOTE +
        ' O veio é duplo: prenda uma roda, engrenagem ou polia em qualquer dos lados (rodam juntos).'
      : 'Motor DC amarelo com caixa redutora 1:48 (3–6 V, ~200 rpm a 6 V, ~0,8 kg·cm), sem roda. O veio em D é duplo e sai dos dois lados da caixa: prenda uma roda (com pneu ou impressa), uma engrenagem, uma polia GT2 ou uma barra em qualquer dos lados (rodam juntos, no mesmo sentido). Comande-o com uma ponte H (L298N, L293D, TB6612) ligada a M+ e M−; com mais tensão roda mais depressa. É o motor dos robôs 2WD/4WD baratos.',
    size: [2.8 - back, 2.2, 2.2],
    pins: enc
      ? encMotorPins(TT.ENC.pin, TT.AY, P)
      : [
          { id: 'M+', label: 'M+ (vermelho)', pos: [-4.3, 1.8, -P], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
          { id: 'M-', label: 'M− (preto)', pos: [-4.3, 1.8, P], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
        ],
    config: { ratio: 48, suporte: 'transparente' },
    fields: [
      { key: 'ratio', label: 'Redução', type: 'select', options: [[48, '1:48 (≈ 200 rpm a 6 V)'], [120, '1:120 (≈ 80 rpm, mais força)']] },
      { key: 'suporte', label: 'Braçadeira do motor', type: 'select', options: TT_CLIPS },
    ],
    interactive: { kind: 'slider', label: 'Carga no veio', unit: 'kg·cm', min: 0, max: 3, step: 0.1, default: 0 },
    ...(enc ? { lib: { header: 'Encoder.h', usage: 'Encoder enc(2, 3);   // A → D2, B → D3\nlong n = enc.read();   // 2112 contagens por volta do veio (1:48)' } } : {}),
    mounts,
    mass: enc ? 34 : 30,
    // caixa de engrenagens + motor, aba de fixação, o veio duplo (redondo: roda sem mudar) e,
    // no motor com encoder, a placa e a ficha atrás
    collider: (c) => [
      { size: [7.0, 2.2, 1.9], pos: [-0.8, 1.1, 0] },
      { size: [0.7, 0.25, 0.9], pos: [3.05, 0.405, 0] },
      { size: [0.54, 0.54, 3.0], pos: [0, TT.AY, 0] },
      ...(ttClip(c) ? [{ size: [2.5, 0.12, 2.3], pos: [TT.motorX, 0.06, 0] }] : []),
      ...(enc ? [{ size: [TT.ENC.disc - back + 0.3, 2.0, 2.0], pos: [(TT.ENC.disc + back) / 2 - 0.15, TT.AY, 0] }] : []),
    ],
    view2d: { view: 'top', x: [back - 0.2, 2.8], z: [-1.6, 1.6] },
  }
}

export default ttDef(false)
