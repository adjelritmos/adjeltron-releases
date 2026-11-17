// Constantes e utilitários de geometria (sem dependências) para o catálogo e plugins.
// Unidades 3D: cm. Referencial local: +x frente, +y cima, +z direita.
export const S2D = 40 // px por cm no editor 2D
export const PITCH = 0.254 // 0,1" em cm
export const PITCH_PX = PITCH * S2D

// fila de pinos de cabeçalho (0,1") ao longo de z, centrada em z0
// rowZ(['VCC','GND','SDA','SCL'], x, y, kinds) -> [{id, pos, kind}]
export function rowZ(ids, x, y, kinds = [], z0 = 0) {
  const n = ids.length
  return ids.map((id, i) => ({ id, pos: [x, y, z0 + (i - (n - 1) / 2) * PITCH], kind: kinds[i] || 'io' }))
}
// fila de pinos ao longo de x, centrada em x0
export function rowX(ids, z, y, kinds = [], x0 = 0) {
  const n = ids.length
  return ids.map((id, i) => ({ id, pos: [x0 + (i - (n - 1) / 2) * PITCH, y, z], kind: kinds[i] || 'io' }))
}
