// Hélice de ventoinha de mesa translúcida: cubo em copo (parede, fundo e nervuras por dentro)
// e pás largas em forma de pá de remo, curvas e inclinadas. Eixo +y; roda com o veio.
import { useMemo } from 'react'
import { geo, THREE } from '../kit.jsx'
import { mesaDims } from '@shared/parts/heliceMesa.js'

// pá larga: estreita junto ao cubo, larga e arredondada na ponta, com o bordo de ataque
// curvo (forma no plano XZ, ao longo de +x, a partir do raio do cubo)
function bladeGeo(r, hubR) {
  return geo(`mesaBlade${r},${hubR}`, () => {
    const L = r - hubR
    const w = Math.min(L * 0.95, ((2 * Math.PI * r) / 4) * 0.8)
    const s = new THREE.Shape()
    s.moveTo(0, -w * 0.22)
    s.bezierCurveTo(L * 0.35, -w * 0.62, L * 0.8, -w * 0.62, L, -w * 0.18)
    s.quadraticCurveTo(L * 1.04, w * 0.2, L * 0.82, w * 0.42)
    s.bezierCurveTo(L * 0.55, w * 0.52, L * 0.25, w * 0.35, 0, w * 0.22)
    s.lineTo(0, -w * 0.22)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 20 })
    g.translate(0, 0, -0.035)
    g.rotateX(-Math.PI / 2)
    // curvatura da pá: dobra as pontas (y ∝ distância ao meio da largura²)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i)
      p.setY(i, p.getY(i) + (z * z) / (w * 2.2))
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
  return (
    <group>
      {/* copo do cubo: parede, fundo e anel interior com nervuras */}
      <mesh position={[0, hubH / 2, 0]} material={m} renderOrder={2}>
        <cylinderGeometry args={[hubR, hubR * 1.04, hubH, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m} renderOrder={2}>
        <circleGeometry args={[hubR * 1.03, 40]} />
      </mesh>
      <mesh position={[0, hubH * 0.55, 0]} material={m} renderOrder={2}>
        <cylinderGeometry args={[hubR * 0.32, hubR * 0.32, hubH * 1.1, 24]} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} position={[0, hubH * 0.45, 0]} rotation={[0, (i / ribs) * Math.PI * 2, 0]} material={m} renderOrder={2}>
          <boxGeometry args={[hubR * 1.9, hubH * 0.8, 0.06]} />
        </mesh>
      ))}
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
