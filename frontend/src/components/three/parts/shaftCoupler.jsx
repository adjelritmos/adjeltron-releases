// Acoplador flexível de alumínio (tipo "5 × 8 mm", de feixe helicoidal): corpo torneado com
// os topos chanfrados, ranhura helicoidal a meio (o corte que o torna flexível), 2 pares de
// parafusos sem cabeça M3 a 90° em cada ponta e os furos dos veios (5 mm em baixo, 8 mm em cima).
import { geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { brushedMat } from './_mechKit.jsx'
import { COUPLER } from '@shared/parts/shaftCoupler.js'

function helixGeo() {
  return geo('couplerHelix', () => {
    const pts = []
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const a = t * Math.PI * 2 * 3
      pts.push(new THREE.Vector3(Math.cos(a) * COUPLER.R, 0.8 + t * 0.9, Math.sin(a) * COUPLER.R))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.05, 6, false)
  })
}
// corpo: perfil girado com os chanfros e os dois furos (em degrau a meio)
function bodyGeo() {
  return geo('couplerBody', () => {
    const R = COUPLER.R
    const H = COUPLER.H
    const c = 0.06
    const p = [
      [0.25, c],
      [0.25 + c, 0],
      [R - c, 0],
      [R, c],
      [R, H - c],
      [R - c, H],
      [0.4 + c, H],
      [0.4, H - c],
      [0.4, H / 2],
      [0.25, H / 2],
      [0.25, c],
    ].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 40)
  })
}
// parafusos sem cabeça (topo rente ao corpo, sextavado interior): 2 a 90° em cada ponta
function setGeo(hex) {
  return mergedGeo(`couplerSet${hex}`, () => {
    const g = hex ? geo('cplHex', () => new THREE.CylinderGeometry(0.075, 0.075, 0.004, 6)) : geo('cplSet', () => new THREE.CylinderGeometry(0.15, 0.15, 0.01, 14))
    const R = COUPLER.R + (hex ? 0.008 : 0.002)
    const out = []
    for (const y of [0.35, COUPLER.H - 0.35])
      for (const a of [0, Math.PI / 2]) out.push([g, [Math.cos(a) * R, y, -Math.sin(a) * R], [0, a, -Math.PI / 2]])
    return out
  })
}

function Model() {
  return (
    <group>
      <mesh geometry={bodyGeo()} material={brushedMat('#c7d0d6', 0.85, 0.3)} castShadow receiveShadow />
      <mesh geometry={helixGeo()} material={mat('#1b1f22', 0.3, 0.6)} />
      <mesh geometry={setGeo(false)} material={mat('#2a2c2f', 0.7, 0.4)} />
      <mesh geometry={setGeo(true)} material={mat('#050505', 0, 0.9)} />
    </group>
  )
}

export default { type: 'shaftCoupler', Model }
