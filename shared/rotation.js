// Rotações das peças 3D: guardadas como ângulos de Euler XYZ em graus (part.rot), mas
// compostas com quaterniões. Somar graus a uma componente do Euler não é rodar em torno
// desse eixo: com Y a ±90° os eixos X e Z ficam alinhados (gimbal lock) e "rodar em X" e
// "rodar em Z" faziam o mesmo. Aqui a rotação é sempre em torno do eixo FIXO do referencial
// do pai (mesa ou ponto de fixação), seja qual for a orientação atual.
// Matemática pura (sem three.js), com as mesmas convenções do THREE.Euler 'XYZ'.

const D2R = Math.PI / 180

// arredonda e limpa ruído numérico (89.9999 → 90, −0 → 0, −180 → 180)
const clean = (v) => {
  let r = Math.round(v * 1000) / 1000
  if (Math.abs(r - Math.round(r)) < 0.002) r = Math.round(r)
  if (r <= -180 + 1e-6) r += 360
  return r + 0
}

// quaternião [x, y, z, w] de um Euler XYZ em graus (como THREE.Quaternion.setFromEuler)
export function eulerToQuat(rot) {
  const [c1, c2, c3] = rot.map((a) => Math.cos((a * D2R) / 2))
  const [s1, s2, s3] = rot.map((a) => Math.sin((a * D2R) / 2))
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3]
}

// a · b
export function quatMul([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [ax * bw + aw * bx + ay * bz - az * by, ay * bw + aw * by + az * bx - ax * bz, az * bw + aw * bz + ax * by - ay * bx, aw * bw - ax * bx - ay * by - az * bz]
}

// Euler XYZ em graus de um quaternião (como THREE.Euler.setFromQuaternion(q, 'XYZ'))
export function quatToEuler([x, y, z, w]) {
  const m11 = 1 - 2 * (y * y + z * z)
  const m12 = 2 * (x * y - z * w)
  const m13 = 2 * (x * z + y * w)
  const m22 = 1 - 2 * (x * x + z * z)
  const m23 = 2 * (y * z - x * w)
  const m32 = 2 * (y * z + x * w)
  const m33 = 1 - 2 * (x * x + y * y)
  const ry = Math.asin(Math.max(-1, Math.min(1, m13)))
  let rx, rz
  if (Math.abs(m13) < 0.9999999) {
    rx = Math.atan2(-m23, m33)
    rz = Math.atan2(-m12, m11)
  } else {
    rx = Math.atan2(m32, m22)
    rz = 0
  }
  return [rx, ry, rz].map((v) => clean(v / D2R))
}

// rot (graus XYZ) rodado `deg` graus em torno do eixo `axis` (0 = X, 1 = Y, 2 = Z) do pai
export function rotateEuler(rot, axis, deg) {
  const h = (deg * D2R) / 2
  const r = [0, 0, 0, Math.cos(h)]
  r[axis] = Math.sin(h)
  return quatToEuler(quatMul(r, eulerToQuat(rot)))
}
