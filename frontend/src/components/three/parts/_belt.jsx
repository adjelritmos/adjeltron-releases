// Correia GT2 fechada desenhada à volta de polias (usada pela polia GT2 — correias por letra —
// e pela peça "Correia GT2"). A correia vive num referencial estável: origem na 1.ª polia, eixo
// = eixo dessa polia, base (u, v) que não roda com o veio (shared/parts/_belt.js planeBasis).
// A geometria (fita com dentes por dentro, passo 2 mm) só se refaz quando as polias se mexem ou
// a correia anda (os dentes deslizam com a rotação da 1.ª polia).
import { useFrame, useRef, useMemo, mat, THREE } from '../kit.jsx'
import { simRef } from '../../../contexts/simRef.js'
import { pulleyR, GT2 } from '@shared/parts/_mech.js'
import { beltLoop, loopLength, planeBasis, BELT_AXIS_TOL, BELT_PLANE_TOL } from '@shared/parts/_belt.js'
import { GT2P } from '@shared/parts/gt2Pulley.js'

// perfil (cm, a partir da circunferência primitiva, + para fora)
const IN_TOOTH = 0.0 // ponta dos dentes
const IN_BACK = 0.07 // costas por dentro (fora das pontas dos dentes da polia)
const OUT = 0.135 // face de fora
const STEP = GT2 / 8

// reamostra o contorno com passo uniforme; devolve [x, y, nx, ny] (normal para fora)
function resample(loop, step) {
  const n = loop.length
  const L = loopLength(loop)
  const N = Math.max(8, Math.round(L / step))
  const ds = L / N
  const out = []
  let i = 0
  let acc = 0 // comprimento até ao início do segmento i
  for (let k = 0; k < N; k++) {
    const s = k * ds
    let a = loop[i]
    let b = loop[(i + 1) % n]
    let len = Math.hypot(b[0] - a[0], b[1] - a[1])
    while (acc + len < s && i < n - 1) {
      acc += len
      i++
      a = loop[i]
      b = loop[(i + 1) % n]
      len = Math.hypot(b[0] - a[0], b[1] - a[1])
    }
    const t = len > 0 ? (s - acc) / len : 0
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  // normais (contorno CCW no plano (u, v): para fora = (dy, −dx))
  return { pts: out.map((p, k) => {
    const a = out[(k - 1 + N) % N]
    const b = out[(k + 1) % N]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [p[0], p[1], dy / l, -dx / l]
  }), L, ds }
}

// fita com dentes: coordenadas (u, eixo, v) → x, y, z do referencial da correia
function beltGeometry(samples, ds, phase, y, w, toothed = true) {
  const n = samples.length
  const pos = new Float32Array(n * 4 * 3)
  const idx = []
  for (let k = 0; k < n; k++) {
    const [x, z, nx, nz] = samples[k]
    // dente: metade do passo (com flancos a 1/8), deslocado pela rotação
    const f = ((((k * ds + phase) % GT2) + GT2) % GT2) / GT2
    const inn = toothed && f > 0.25 && f < 0.75 ? IN_TOOTH : IN_BACK
    const xi = x + nx * inn
    const zi = z + nz * inn
    const xo = x + nx * OUT
    const zo = z + nz * OUT
    pos.set([xi, y - w / 2, zi, xi, y + w / 2, zi, xo, y - w / 2, zo, xo, y + w / 2, zo], k * 12)
  }
  for (let k = 0; k < n; k++) {
    const a = k * 4
    const b = ((k + 1) % n) * 4
    idx.push(a, b, a + 1, b, b + 1, a + 1) // dentro
    idx.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3) // fora
    idx.push(a, a + 2, b, b, a + 2, b + 2) // baixo
    idx.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3) // cima
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const _c = new THREE.Vector3()
const _a = new THREE.Vector3()
const _x = new THREE.Vector3()
const _o = new THREE.Vector3()
const _F = new THREE.Matrix4()
const _P = new THREE.Matrix4()

/**
 * Correia à volta das polias `pulleys` ([{ id, teeth }]).
 * parentId: peça em cujo grupo 3D a malha está (a correia é desenhada no mundo e compensada).
 * onInfo({ length, ok, center }) opcional, chamado quando a geometria muda.
 * loose: { r } — sem polias suficientes: anel solto de raio r no plano xz da peça-mãe.
 */
// pulleys: [{ id, teeth } (GT2) | { id, r } (raio da gola)]; y/w: altura e largura da correia no
// referencial da polia; toothed: correia dentada (GT2) ou lisa (elástico)
export function BeltMesh({ pulleys, parentId, onInfo, loose, y = GT2P.BELT_Y, w = GT2P.BELT_W, color = '#1d1d1d', toothed = true }) {
  const mesh = useRef()
  const key = useRef('')
  const material = useMemo(() => mat(color, 0, 0.85, { side: THREE.DoubleSide }), [color])
  // anel solto já pronto ao desenhar (miniaturas da lista: sem ciclo de frames nem peça na cena)
  const looseGeo = useMemo(() => {
    if (!loose) return null
    const { pts, ds } = resample(beltLoop([[0, 0, loose.r]], 96), STEP)
    return beltGeometry(pts, ds, 0, w / 2, w, toothed)
  }, [loose?.r, w, toothed])
  useFrame(() => {
    const m = mesh.current
    const parent = simRef.objects.get(parentId)
    if (!m || !parent) return
    parent.updateWorldMatrix(true, false)
    // polias presentes, com o eixo da 1.ª
    const objs = pulleys.map((p) => ({ ...p, o: simRef.objects.get(p.id) })).filter((p) => p.o)
    let circles = []
    let phase = 0
    let ok = objs.length >= 2
    if (ok) {
      const first = objs[0].o
      first.updateWorldMatrix(true, false)
      _a.set(0, 1, 0).transformDirection(first.matrixWorld).normalize()
      _o.set(0, y, 0).applyMatrix4(first.matrixWorld)
      const { u, v } = planeBasis([_a.x, _a.y, _a.z])
      for (const p of objs) {
        p.o.updateWorldMatrix(true, false)
        _x.set(0, 1, 0).transformDirection(p.o.matrixWorld)
        _c.set(0, y, 0).applyMatrix4(p.o.matrixWorld).sub(_o)
        if (Math.abs(_x.dot(_a)) < BELT_AXIS_TOL || Math.abs(_c.dot(_a)) > BELT_PLANE_TOL) {
          ok = false
          continue
        }
        circles.push([_c.x * u[0] + _c.y * u[1] + _c.z * u[2], _c.x * v[0] + _c.y * v[1] + _c.z * v[2], p.r ?? pulleyR(p.teeth ?? 20)])
      }
      // rotação θ da 1.ª polia em torno do eixo → a correia anda −θ·r ao longo do contorno CCW
      // (os dentes em s com (s + phase) no meio do passo: phase = +θ·r desloca-os −θ·r)
      _x.set(1, 0, 0).transformDirection(first.matrixWorld)
      const th = Math.atan2(_x.x * v[0] + _x.y * v[1] + _x.z * v[2], _x.x * u[0] + _x.y * u[1] + _x.z * u[2])
      phase = th * (objs[0].r ?? pulleyR(objs[0].teeth ?? 20))
      // referencial da correia: x = U = u, y = eixo, z = V = U × eixo (= −v)
      const U = new THREE.Vector3(...u)
      const V = new THREE.Vector3().crossVectors(U, _a)
      // coordenada z = projeção em V: troca-se o sinal de v se for preciso
      const sgn = V.x * v[0] + V.y * v[1] + V.z * v[2] < 0 ? -1 : 1
      if (sgn < 0) circles = circles.map(([x, y, r]) => [x, -y, r])
      _F.makeBasis(U, _a, V).setPosition(_o.x, _o.y, _o.z)
      _P.copy(parent.matrixWorld).invert().multiply(_F)
    }
    if (!ok || circles.length < 2) {
      if (!loose) {
        m.visible = false
        key.current = ''
        return
      }
      // anel solto à volta da origem da peça (no seu plano xz)
      circles = [[0, 0, loose.r]]
      phase = 0
      _P.identity()
    }
    const k = circles.map((c) => c.map((x) => x.toFixed(3)).join(',')).join(';') + `|${(phase % GT2).toFixed(4)}`
    m.matrixAutoUpdate = false
    m.matrix.copy(_P)
    m.matrixWorldNeedsUpdate = true
    if (k === key.current) return
    const kGeo = k.split('|')[0]
    const kOld = key.current.split('|')[0]
    key.current = k
    const loop = beltLoop(circles, 96)
    const { pts, L, ds } = resample(loop, STEP)
    m.geometry?.dispose()
    m.geometry = beltGeometry(pts, ds, phase, circles.length === 1 ? w / 2 : 0, w, toothed)
    m.visible = true
    if (onInfo && kGeo !== kOld) {
      // centro da correia no referencial da peça-mãe (para uma etiqueta)
      const cx = circles.reduce((a, c) => a + c[0], 0) / circles.length
      const cz = circles.reduce((a, c) => a + c[1], 0) / circles.length
      const c = new THREE.Vector3(cx, 0, cz).applyMatrix4(_P)
      onInfo({ length: circles.length >= 2 ? L : 0, ok: circles.length >= 2, center: [c.x, c.y, c.z] })
    }
  })
  return <mesh ref={mesh} material={material} geometry={looseGeo || undefined} castShadow visible={!!looseGeo} />
}
