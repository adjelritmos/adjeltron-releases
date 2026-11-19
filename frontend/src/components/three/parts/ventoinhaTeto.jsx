// Ventoinha de teto (estilo clássico de 5 pás): florão em sino torneado (com os fios do motor),
// rótula e haste de latão com o acoplador, carcaça do motor torneada com o friso de latão,
// suportes das pás em chapa recortada com os parafusos e 5 pás de madeira com a ponta
// arredondada, que rodam com live.rpm, e a tampa de baixo. Pendurada por baixo de uma laje
// (y local = para baixo).
import { Cyl, geo, mat, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { latheGeo, ScrewHead } from './_casaKit.jsx'

const BODY = '#e9e7e2'
const BRASS = '#b8913f'

// pá: retângulo com a ponta arredondada (forma no plano xz, ao longo de +x), espessura em y
function bladeGeo() {
  return geo('vtBlade', () => {
    const L = 4.0
    const w = 1.15
    const s = new THREE.Shape()
    s.moveTo(-L / 2, -w * 0.42)
    s.lineTo(L / 2 - w / 2, -w / 2)
    s.absarc(L / 2 - w / 2, 0, w / 2, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(-L / 2, w * 0.42)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.015, bevelSegments: 1, curveSegments: 12 })
    g.translate(0, 0, -0.03)
    g.rotateX(Math.PI / 2)
    return g
  })
}
// suporte da pá: chapa recortada, estreita no motor e larga na pá
function ironGeo() {
  return geo('vtIron', () => {
    const s = new THREE.Shape()
    s.moveTo(0.9, -0.14)
    s.bezierCurveTo(1.4, -0.14, 1.7, -0.36, 2.35, -0.36)
    s.lineTo(2.35, 0.36)
    s.bezierCurveTo(1.7, 0.36, 1.4, 0.14, 0.9, 0.14)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 10 })
    g.translate(0, 0, -0.04)
    g.rotateX(Math.PI / 2)
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const haste = Math.max(0.3, +(c.haste ?? 1.5))
  const rot = useRef()
  useFrame((_, dt) => {
    const rpm = liveOf(part.id)?.rpm || 0
    if (rot.current) rot.current.rotation.y += ((rpm * 2 * Math.PI) / 60) * Math.min(dt, 0.1)
  })
  const ym = 0.6 + haste
  const brass = mat(BRASS, 0.9, 0.28)
  return (
    <group>
      {/* florão em sino e rótula */}
      <mesh geometry={latheGeo('vtCanopy', [[0.001, 0], [1.05, 0], [1.05, 0.06], [0.98, 0.2], [0.82, 0.42], [0.66, 0.56], [0.3, 0.6], [0.001, 0.6]], 36)} material={mat(BODY, 0, 0.4)} castShadow />
      <mesh position={[0, 0.6, 0]} geometry={geo('vtBall', () => new THREE.SphereGeometry(0.2, 16, 10))} material={brass} />
      <Cyl r={0.14} h={haste} pos={[0, 0.6 + haste / 2, 0]} color={BRASS} metal={0.9} rough={0.28} seg={12} />
      <Cyl r={0.08} h={0.45} pos={[-0.95, 0.3, -0.3]} rot={[0, 0, Math.PI / 2]} color="#c62828" rough={0.5} seg={8} />
      <Cyl r={0.08} h={0.45} pos={[-0.95, 0.3, 0.3]} rot={[0, 0, Math.PI / 2]} color="#212121" rough={0.5} seg={8} />
      {/* acoplador, carcaça torneada do motor e friso de latão */}
      <Cyl r={0.22} r2={0.26} h={0.25} pos={[0, ym + 0.02, 0]} color={BRASS} metal={0.9} rough={0.28} seg={16} />
      <mesh position={[0, ym, 0]} geometry={latheGeo('vtMotor', [[0.24, 0], [0.7, 0.04], [1.15, 0.14], [1.4, 0.3], [1.5, 0.45], [1.5, 0.56], [1.42, 0.72], [1.25, 0.86], [1.0, 0.9], [0.001, 0.9]], 40)} material={mat(BODY, 0, 0.38)} castShadow />
      <mesh position={[0, ym + 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo('vtBand', () => new THREE.TorusGeometry(1.51, 0.045, 6, 48))} material={brass} />
      <group ref={rot} position={[0, ym + 0.75, 0]}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} rotation={[0, (i * 2 * Math.PI) / 5, 0]}>
            <mesh geometry={ironGeo()} material={brass} position={[0, 0.05, 0]} castShadow />
            <group position={[3.6, 0.12, 0]} rotation={[0.12, 0, 0]}>
              <mesh geometry={bladeGeo()} material={mat(c.pas || '#8b5a2b', 0, 0.5)} castShadow receiveShadow />
            </group>
            {[-0.18, 0.18].map((z) => (
              <ScrewHead key={z} pos={[2.1, 0.11, z]} r={0.07} color="#d4b36a" />
            ))}
          </group>
        ))}
        {/* tampa de baixo (caixa do interruptor) com o remate */}
        <Cyl r={0.7} r2={0.62} h={0.3} pos={[0, 0.25, 0]} color={BODY} rough={0.4} seg={24} />
        <mesh position={[0, 0.4, 0]} geometry={latheGeo('vtFinial', [[0.62, 0], [0.5, 0.05], [0.25, 0.1], [0.12, 0.18], [0.001, 0.2]], 20)} material={brass} />
      </group>
    </group>
  )
}

export default { type: 'ventoinhaTeto', Model }
