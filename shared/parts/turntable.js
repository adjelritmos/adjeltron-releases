// Mesa giratória: rolamento "lazy susan" com coroa dentada de 96 dentes (módulo 1).
import { GEAR_M, gearR } from './_mech.js'

export const TT = { BASE: 10, BASE_T: 0.4, TOP_Y: 1.0, Z: 96 }

export default {
  type: 'turntable',
  name: 'Mesa giratória com coroa dentada',
  short: 'Mesa giratória',
  cat: 'mech',
  description:
    'Rolamento de esferas plano (lazy susan) de 10 cm com a parte de cima livre e uma coroa dentada de 96 dentes (módulo 1, Ø primitivo 96 mm). Base de torres, gruas, braços robóticos e plataformas de câmara. Para a rodar com um motor ponha uma engrenagem reta no veio (eixo vertical) à distância 48 mm + raio do pinhão do centro e à altura da coroa (4–10 mm): com um pinhão de 12 dentes a redução é 8:1. Prenda as peças em cima (rodam com ela).',
  size: [TT.BASE, TT.TOP_Y, TT.BASE],
  pins: [],
  mech: true,
  mass: 220,
  // base e o prato dentado (redondo, r 4,9: caixa de lado ≈ 0,85 × diâmetro, não muda ao rodar)
  collider: [
    { size: [TT.BASE, TT.BASE_T, TT.BASE], pos: [0, TT.BASE_T / 2, 0] },
    { size: [8.4, TT.TOP_Y - TT.BASE_T, 8.4], pos: [0, (TT.TOP_Y + TT.BASE_T) / 2, 0] },
  ],
  gear: () => ({ z: TT.Z, m: GEAR_M, w: 0.6, y0: 0.4, on: 'top' }),
  mounts: { top: { pos: [0, TT.TOP_Y, 0], servo: true, idler: true, plane: true, torque: 60, label: 'prato (roda)' } },
  ringR: gearR(TT.Z),
}
