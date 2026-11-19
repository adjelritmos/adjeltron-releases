// Motor RS-775 (12 V, sem redutor, Ø42 × 66 mm): lata de aço com os frisos da cravação, tampa da
// frente de alumínio com o rolamento, 2 furos M4 a 29 mm e as janelas de ventilação em arco,
// tampa de trás de plástico preto com as janelas por onde se vê a ventoinha interna, terminais
// de latão com a marca vermelha do +; veio de 5 mm (roda com o mount "shaft").
import { Box, Cyl, THREE, geo, mat, METAL, useFrame, useRef } from '../kit.jsx'
import { mountRotNow } from '../../../functions/mechLive.js'
import { rotX } from './_mechKit.jsx'
import { MotorOverlay } from './motorEnc.jsx'
import def, { M775 } from '@shared/parts/motor775.js'

const { AY, canL, canR } = M775

// janelas em arco (n) entre os raios r0 e r1, num plano virado para +x
const ventGeo = (r0, r1, n, gap) =>
  geo(`m775vent:${r0},${r1},${n},${gap}`, () => {
    const shapes = []
    for (let k = 0; k < n; k++) {
      const a0 = (k * 2 * Math.PI) / n + gap / 2
      const a1 = ((k + 1) * 2 * Math.PI) / n - gap / 2
      const s = new THREE.Shape()
      s.absarc(0, 0, r1, a0, a1, false)
      s.absarc(0, 0, r0, a1, a0, true)
      shapes.push(s)
    }
    const g = new THREE.ShapeGeometry(shapes, 8)
    g.rotateY(Math.PI / 2)
    return g
  })

function Model({ part }) {
  const shaft = useRef()
  useFrame(() => {
    if (shaft.current) shaft.current.rotation.x = mountRotNow(part.id, 'shaft')
  })
  const dark = mat('#0b0c0d', 0, 0.85)
  return (
    <group>
      {/* lata de aço e frisos da cravação */}
      <Cyl r={canR} h={canL - 0.5} pos={[-(canL + 0.5) / 2, AY, 0]} rot={rotX} color="#9aa1a7" metal={0.85} rough={0.38} seg={48} />
      {[-0.56, -canL + 0.06].map((x) => (
        <Cyl key={x} r={canR + 0.01} h={0.05} pos={[x, AY, 0]} rot={rotX} color="#6f767c" metal={0.85} rough={0.45} seg={48} />
      ))}
      {/* tampa da frente (alumínio) com chanfro, janelas de ventilação, furos M4 e rolamento */}
      <Cyl r={canR + 0.02} h={0.42} pos={[-0.29, AY, 0]} rot={rotX} color="#c9ccd1" metal={0.85} rough={0.3} seg={48} />
      <Cyl r={canR - 0.12} r2={canR + 0.02} h={0.08} pos={[-0.04, AY, 0]} rot={[0, 0, -Math.PI / 2]} color="#c9ccd1" metal={0.85} rough={0.3} seg={48} />
      <mesh position={[0.001, AY, 0]} geometry={ventGeo(1.15, 1.75, 4, 0.75)} material={dark} />
      {[-1.45, 1.45].map((z) => (
        <Cyl key={z} r={0.2} h={0.02} pos={[0.002, AY, z]} rot={rotX} color="#121314" seg={14} />
      ))}
      <Cyl r={0.75} h={0.06} pos={[0.03, AY, 0]} rot={rotX} color="#b6bbc0" metal={0.9} rough={0.3} seg={32} />
      <Cyl r={0.55} h={0.25} pos={[0.12, AY, 0]} rot={rotX} color="#9ea7ad" metal={0.9} rough={0.25} seg={24} />
      <Cyl r={0.36} h={0.02} pos={[0.25, AY, 0]} rot={rotX} color="#2a2d30" metal={0.6} rough={0.4} seg={20} />
      {/* tampa de trás (plástico preto): janelas laterais com a ventoinha, casquilho e terminais */}
      <Cyl r={canR - 0.1} h={0.4} pos={[-canL - 0.2, AY, 0]} rot={rotX} color="#111" rough={0.6} seg={40} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return <Box key={i} size={[0.26, 0.04, 0.5]} pos={[-canL - 0.2, AY + Math.cos(a) * (canR - 0.1), Math.sin(a) * (canR - 0.1)]} rot={[a, 0, 0]} color="#26292c" metal={0.4} rough={0.5} />
      })}
      <Cyl r={0.35} h={0.12} pos={[-canL - 0.44, AY, 0]} rot={rotX} color="#b9bfc4" metal={0.85} rough={0.3} seg={20} />
      <Cyl r={0.09} h={0.02} pos={[-canL - 0.401, AY + 0.5, def.pins[0].pos[2]]} rot={rotX} color="#e53935" seg={12} />
      {def.pins.map((p) => (
        <group key={p.id} position={[p.pos[0] + 0.15, p.pos[1], p.pos[2]]}>
          <Box size={[0.6, 0.35, 0.06]} color={METAL.brass} metal={1} rough={0.3} />
          <Cyl r={0.07} h={0.07} pos={[-0.12, 0, 0]} rot={[Math.PI / 2, 0, 0]} color="#151515" seg={10} />
        </group>
      ))}
      <group ref={shaft} position={[0, AY, 0]}>
        <Cyl r={0.25} h={1.7} pos={[0.85, 0, 0]} rot={rotX} color="#e6e8ea" metal={0.95} rough={0.2} seg={16} />
      </group>
    </group>
  )
}

export default { type: 'motor775', Model, Overlay2D: MotorOverlay }
