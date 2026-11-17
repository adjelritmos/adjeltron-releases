// Comando de infravermelho (NEC, endereço 0x00) de 21 teclas, como o do Wokwi.
// Não tem pinos: as teclas premidas chegam a todos os recetores IR do projeto.

// [rótulo, comando NEC]
export const REMOTE_KEYS = [
  [['POWER', 0x45], ['MENU', 0x47], ['TEST', 0x44]],
  [['+', 0x40], ['BACK', 0x43], ['-', 0x19]],
  [['PREV', 0x07], ['PLAY', 0x15], ['NEXT', 0x09]],
  [['1', 0x0c], ['2', 0x18], ['3', 0x5e]],
  [['4', 0x08], ['5', 0x1c], ['6', 0x5a]],
  [['7', 0x42], ['8', 0x52], ['9', 0x4a]],
  [['0', 0x16], ['C', 0x0d]],
]
export const REMOTE_CODE = Object.fromEntries(REMOTE_KEYS.flat())
// geometria das teclas (cm, vista de cima)
export const REMOTE_GEOM = { colX: [-1.15, 0, 1.15], rowZ: [-2.9, -1.85, -0.85, 0.15, 1.15, 2.15, 3.15], r: 0.4 }
// centro de cada tecla (clique na vista 3D: interactive.geom.points)
export const REMOTE_POINTS = REMOTE_KEYS.flatMap((row, r) =>
  row.map(([key], c) => ({ key, x: row.length === 3 ? REMOTE_GEOM.colX[c] : (REMOTE_GEOM.colX[c] + REMOTE_GEOM.colX[c + 1]) / 2, z: REMOTE_GEOM.rowZ[r], r: REMOTE_GEOM.r })),
)

export default {
  type: 'irRemote',
  name: 'Comando IR (NEC)',
  short: 'Comando',
  cat: 'input',
  description:
    'Comando à distância de 21 teclas (protocolo NEC, endereço 0x00): POWER = 0x45, MENU = 0x47, 0 = 0x16, 1 = 0x0C, 2 = 0x18… Não se liga com fios — basta haver um recetor IR no projeto. Na simulação clique nas teclas — no circuito 2D, na vista 3D ou no painel "Controlos" (manter premido envia códigos de repetição a cada 108 ms).',
  size: [4.0, 0.8, 8.6],
  pins: [],
  interactive: { kind: 'keypad', keys: REMOTE_KEYS.map((r) => r.map(([k]) => k)), geom: { points: REMOTE_POINTS } },
  view2d: { view: 'top', x: [-2.05, 2.05], z: [-4.35, 4.35] },
}
