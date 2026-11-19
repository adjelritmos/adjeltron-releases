// Referencial de uma correia à volta de polias, a partir dos objetos 3D (simRef.objects): usado
// pelo desenho da correia (_belt.jsx) e pelo seu corpo na física (physics/beltSurface.js).
//
// Origem no centro da 1.ª polia à altura y (no referencial da polia), eixo y = eixo dessa polia,
// x = U (base estável de planeBasis, não roda com o veio), z = V = U × eixo. As polias são
// circunferências [x, z, r] nesse plano; o contorno de beltLoop é CCW em (x, z) — rodar de +x
// para +z é rodar em torno de −y, por isso uma polia que roda +ω em torno do seu +y faz a
// correia andar −ω·r ao longo do contorno CCW.
import * as THREE from 'three'
import { simRef } from '../../../contexts/simRef.js'
import { pulleyR } from '@shared/parts/_mech.js'
import { planeBasis, BELT_AXIS_TOL, BELT_PLANE_TOL } from '@shared/parts/_belt.js'

const _c = new THREE.Vector3()
const _a = new THREE.Vector3()
const _x = new THREE.Vector3()
const _o = new THREE.Vector3()
const U = new THREE.Vector3()
const V = new THREE.Vector3()

export const radiusOf = (p) => p.r ?? pulleyR(p.teeth ?? 20)

/**
 * pulleys: [{ id, teeth } | { id, r }]; y: altura da correia no referencial da polia.
 * Devolve null (menos de 2 polias presentes) ou { ok, circles, F, theta, r0 }:
 *   ok      false se alguma polia estiver desalinhada (eixo ou plano) — essas ficam de fora;
 *   circles [[x, z, r]] no referencial F; F = matriz mundo do referencial (sem escala);
 *   theta   rotação da 1.ª polia em torno do seu eixo (rad, medida na base estável); r0 o raio dela.
 */
export function beltFrame(pulleys, y, F = new THREE.Matrix4()) {
  const objs = pulleys.map((p) => ({ ...p, o: simRef.objects.get(p.id) })).filter((p) => p.o)
  if (objs.length < 2) return null
  let ok = true
  const first = objs[0].o
  first.updateWorldMatrix(true, false)
  _a.set(0, 1, 0).transformDirection(first.matrixWorld).normalize()
  _o.set(0, y, 0).applyMatrix4(first.matrixWorld)
  const { u, v } = planeBasis([_a.x, _a.y, _a.z])
  let circles = []
  for (const p of objs) {
    p.o.updateWorldMatrix(true, false)
    _x.set(0, 1, 0).transformDirection(p.o.matrixWorld)
    _c.set(0, y, 0).applyMatrix4(p.o.matrixWorld).sub(_o)
    if (Math.abs(_x.dot(_a)) < BELT_AXIS_TOL || Math.abs(_c.dot(_a)) > BELT_PLANE_TOL) {
      ok = false
      continue
    }
    circles.push([_c.x * u[0] + _c.y * u[1] + _c.z * u[2], _c.x * v[0] + _c.y * v[1] + _c.z * v[2], radiusOf(p)])
  }
  _x.set(1, 0, 0).transformDirection(first.matrixWorld)
  const theta = Math.atan2(_x.x * v[0] + _x.y * v[1] + _x.z * v[2], _x.x * u[0] + _x.y * u[1] + _x.z * u[2])
  U.set(...u)
  V.crossVectors(U, _a)
  // coordenada z = projeção em V: troca-se o sinal de v se for preciso
  if (V.x * v[0] + V.y * v[1] + V.z * v[2] < 0) circles = circles.map(([x, z, r]) => [x, -z, r])
  F.makeBasis(U, _a, V).setPosition(_o.x, _o.y, _o.z)
  return { ok, circles, F, theta, r0: radiusOf(objs[0]) }
}
