// Garras (def.grab): pose do cubo apertado entre as maxilas e colisores das maxilas.
// Puro (matrizes 4×4 coluna-maior como THREE.Matrix4.elements), usado pelo backend (engine.js:
// cubo agarrado) e pela física do browser (junta fixa garra ↔ cubo, maxilas que param no objeto).
//
// Num aperto real as maxilas empurram o cubo para o meio e endireitam-no: quando a garra o
// agarra, o cubo fica centrado entre as maxilas (no eixo em que elas fecham, z da pega) e com duas
// faces paralelas às almofadas (rotação mínima). Assim as maxilas (que param à largura do cubo)
// tocam nas faces em vez de entrarem nele.

// roda a matriz (só a parte 3×3) o mínimo para que o eixo do cubo mais chegado a z da pega fique
// exatamente segundo z (as faces ficam paralelas às maxilas); a rotação em torno de z (a garra
// inclinada para baixo, a rodar no eixo em que as maxilas fecham) mantém-se: as almofadas são
// planas e apertam o cubo em qualquer ângulo à volta desse eixo
function alignToZ(m) {
  let k = 0
  for (let i = 1; i < 3; i++) if (Math.abs(m[i * 4 + 2]) > Math.abs(m[k * 4 + 2])) k = i
  const s = m[k * 4 + 2] < 0 ? -1 : 1
  const a = [s * m[k * 4], s * m[k * 4 + 1], s * m[k * 4 + 2]]
  const n = Math.hypot(...a) || 1
  a[0] /= n
  a[1] /= n
  a[2] /= n
  // rotação mínima de a para z = (0,0,1): eixo a × z, ângulo acos(a·z) (fórmula de Rodrigues)
  const ax = [a[1], -a[0], 0]
  const sn = Math.hypot(ax[0], ax[1])
  const cs = a[2]
  const cols = [0, 1, 2].map((j) => [m[j * 4], m[j * 4 + 1], m[j * 4 + 2]])
  if (sn < 1e-9) return cols
  const u = [ax[0] / sn, ax[1] / sn, 0]
  const rot = (v) => {
    const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
    const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    return [0, 1, 2].map((i) => v[i] * cs + c[i] * sn + u[i] * d * (1 - cs))
  }
  return cols.map(rot)
}

/**
 * Pose relativa do cubo agarrado.
 * @param rel  number[16] pose do cubo (origem no centro da face de baixo) no referencial da pega
 * @param size [x, y, z] dimensões do cubo (cm)
 * @returns number[16] mesma pose com o cubo alinhado com as maxilas e centrado no eixo z da pega
 */
export function gripRel(rel, size) {
  const h = size[1] / 2
  // centro do cubo no referencial da pega
  const c = [rel[12] + rel[4] * h, rel[13] + rel[5] * h, rel[14] + rel[6] * h]
  c[2] = 0
  const [x, y, z] = alignToZ(rel)
  // origem = centro − (eixo y do cubo) × h
  return [...x, 0, ...y, 0, ...z, 0, c[0] - y[0] * h, c[1] - y[1] * h, c[2] - y[2] * h, 1]
}

// largura do cubo segundo o eixo em que as maxilas fecham (z da pega), depois de alinhado
export function gripWidth(rel, size) {
  const r = gripRel(rel, size)
  // a coluna k é o eixo k do cubo; a componente z de cada coluna diz qual fica segundo z
  for (let k = 0; k < 3; k++) if (Math.abs(r[k * 4 + 2]) > 0.5) return size[k]
  return Math.min(size[0], size[2])
}

// caixas (cm, referencial da peça) → formato dos colisores: { size, pos, yaw (rad, em torno de y) }
// Usado por def.jaws(config, ângulo do servo) das garras.
export const jawBox = (size, pos, yaw = 0) => ({ size, pos, yaw })
