// Hélice de ventoinha de mesa translúcida (AS/policarbonato injetado): cubo em copo (parede com
// o boleado da boca, fundo, casquilho do veio com o rasgo do perno e nervuras por dentro) e pás
// largas em forma de pá de remo, curvas e torcidas (mais inclinadas junto ao cubo, mais planas
// na ponta), com o rebordo de ataque mais grosso. Eixo +y; roda com o veio.
import { useMemo } from 'react'
import { geo, mergedGeo, THREE } from '../kit.jsx'
import { mesaDims } from '@shared/parts/heliceMesa.js'

// pá larga: estreita junto ao cubo, larga e arredondada na ponta, com o bordo de ataque
// curvo (forma no plano XZ, ao longo de +x, a partir do raio do cubo)
function bladeGeo(r, hubR) {
  return geo(`mesaBlade2${r},${hubR}`, () => {
    const L = r - hubR
    const w = Math.min(L * 0.95, ((2 * Math.PI * r) / 4) * 0.8)
    const s = new THREE.Shape()
    s.moveTo(0, -w * 0.22)
    s.bezierCurveTo(L * 0.35, -w * 0.62, L * 0.8, -w * 0.62, L, -w * 0.18)
    s.quadraticCurveTo(L * 1.04, w * 0.2, L * 0.82, w * 0.42)
    s.bezierCurveTo(L * 0.55, w * 0.52, L * 0.25, w * 0.35, 0, w * 0.22)
    s.lineTo(0, -w * 0.22)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 1, curveSegments: 20 })
    g.translate(0, 0, -0.035)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      let y = p.getY(i)
      let z = p.getZ(i)
      // curvatura da pá: dobra as pontas (y ∝ distância ao meio da largura²)
      y += (z * z) / (w * 2.2)
      // torção: junto ao cubo +9°, na ponta −7° (em torno do comprimento da pá, x)
      const a = ((9 - 16 * Math.min(1, Math.max(0, x / L))) * Math.PI) / 180
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const y2 = y * ca - z * sa
      z = y * sa + z * ca
      p.setY(i, y2)
      p.setZ(i, z)
    }
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const { n, r, pitch, hubR, hubH } = mesaDims(c)
  const color = c.color || '#dfe9f3'
  const m = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0, transmission: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    [color],
  )
  const ribs = 6
  // copo do cubo: parede (com o lábio boleado na boca), fundo, casquilho e nervuras numa só malha
  const hub = mergedGeo(`mesaHub${hubR},${hubH}`, () => {
    const wall = new THREE.CylinderGeometry(hubR, hubR * 1.04, hubH, 40, 1, true)
    const lip = new THREE.TorusGeometry(hubR * 1.0, 0.05, 6, 40).rotateX(Math.PI / 2)
    const bottom = new THREE.CircleGeometry(hubR * 1.03, 40).rotateX(-Math.PI / 2)
    const boss = new THREE.CylinderGeometry(hubR * 0.32, hubR * 0.36, hubH * 1.1, 24)
    const bore = new THREE.CylinderGeometry(hubR * 0.12, hubR * 0.12, hubH * 1.12, 12, 1, true)
    const pin = new THREE.BoxGeometry(hubR * 0.7, hubH * 0.12, hubR * 0.08)
    const rib = new THREE.BoxGeometry(hubR * 1.9, hubH * 0.8, 0.06)
    const out = [
      [wall, [0, hubH / 2, 0]],
      [lip, [0, hubH, 0]],
      [bottom, [0, 0.06, 0]],
      [boss, [0, hubH * 0.55, 0]],
      [bore, [0, hubH * 0.55, 0]],
      [pin, [0, hubH * 0.18, 0]],
    ]
    for (let i = 0; i < ribs; i++) out.push([rib, [0, hubH * 0.45, 0], [0, (i / ribs) * Math.PI * 2, 0]])
    return out
  })
  return (
    <group>
      <mesh geometry={hub} material={m} renderOrder={2} />
      {/* pás inclinadas à volta do cubo */}
      {Array.from({ length: n }, (_, i) => (
        <group key={i} rotation={[0, (i / n) * Math.PI * 2, 0]}>
          <group position={[hubR * 0.92, hubH * 0.45, 0]} rotation={[(pitch * Math.PI) / 180, 0, 0]}>
            <mesh geometry={bladeGeo(r, hubR)} material={m} renderOrder={2} />
          </group>
        </group>
      ))}
    </group>
  )
}

export default { type: 'heliceMesa', Model }
