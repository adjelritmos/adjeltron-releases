// Ventoinha de pé / de mesa (o modelo de 40 cm das lojas): base redonda torneada com as teclas
// de velocidade (0-1-2-3), coluna telescópica com o aperto da altura (na de pé), forquilha com o
// manípulo de inclinação, motor com a carcaça boleada e o botão de oscilação por cima, hélice
// de 3 pás translúcidas torcidas com o cubo e a porca-tampão, e grelha de arame cromado em
// cúpula (raios e anéis à frente e atrás, emblema ao centro). A hélice roda com live.rpm e a
// cabeça oscila com live.osc (graus). Sopra para +x.
import { Cyl, Box, geo, mat, mergedGeo, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { vpeDims } from '@shared/parts/ventoinhaPe.js'
import { Bornes, latheGeo, rodItem } from './_casaKit.jsx'

// grelha (frente em cúpula e trás mais plana): raios, anéis e aros numa só malha
function guardGeo(R, x) {
  return mergedGeo(`vpeGuard${R},${x}`, () => {
    const out = []
    const ring = (r, xx, t) => [geo(`vpeTor${r.toFixed(3)},${t}`, () => new THREE.TorusGeometry(r, t, 5, 48).rotateY(Math.PI / 2)), [xx, 0, 0]]
    const xf = x + 0.35
    const xb = x - 0.35
    const n = 28
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const p = (r, xx) => [xx, Math.cos(a) * r, Math.sin(a) * r]
      // frente: do emblema até ao aro, a cúpula
      out.push(rodItem(p(0.34, xf + 0.2), p(R * 0.6, xf + 0.12), 0.014))
      out.push(rodItem(p(R * 0.6, xf + 0.12), p(R, xf), 0.014))
      // trás: do casquilho do motor até ao aro
      out.push(rodItem(p(0.5, xb - 0.12), p(R * 0.6, xb - 0.05), 0.014))
      out.push(rodItem(p(R * 0.6, xb - 0.05), p(R, xb), 0.014))
    }
    out.push(ring(R, xf, 0.045), ring(R, xb, 0.045), ring(R * 0.35, xf + 0.17, 0.018), ring(R * 0.6, xf + 0.12, 0.02), ring(R * 0.82, xf + 0.065, 0.018))
    out.push(ring(R * 0.6, xb - 0.05, 0.02), ring(R * 0.85, xb - 0.02, 0.018))
    // grampos que unem as duas grelhas (4 à volta)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      out.push(rodItem([xb, Math.cos(a) * (R + 0.03), Math.sin(a) * (R + 0.03)], [xf, Math.cos(a) * (R + 0.03), Math.sin(a) * (R + 0.03)], 0.05))
    }
    return out
  })
}

// pá: forma no plano (x = raio, y = largura), torcida, orientada com o raio em +y e a largura em z
function bladeGeo(R) {
  return geo(`vpeBlade${R}`, () => {
    const L = R * 0.92 - 0.3
    const w = Math.min(L * 0.8, R * 0.8)
    const s = new THREE.Shape()
    s.moveTo(0, -w * 0.15)
    s.bezierCurveTo(L * 0.4, -w * 0.6, L * 0.85, -w * 0.62, L, -w * 0.15)
    s.quadraticCurveTo(L * 1.03, w * 0.25, L * 0.8, w * 0.42)
    s.bezierCurveTo(L * 0.5, w * 0.5, L * 0.2, w * 0.3, 0, w * 0.15)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false, curveSegments: 14 })
    g.translate(0.3, 0, -0.02)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      // torção (raiz mais inclinada) e concavidade
      const a = ((14 - 20 * Math.min(1, Math.max(0, (x - 0.3) / L))) * Math.PI) / 180
      const zz = z + (y * y) / (w * 2.5)
      p.setY(i, y * Math.cos(a) - zz * Math.sin(a))
      p.setZ(i, y * Math.sin(a) + zz * Math.cos(a))
    }
    g.rotateZ(Math.PI / 2).rotateY(Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}

function Model({ part }) {
  const c = part.config || {}
  const d = vpeDims(c)
  const body = c.cor || '#f2f4f5'
  const head = useRef()
  const rotor = useRef()
  useFrame((_, dt) => {
    const L = liveOf(part.id)
    const rpm = L?.rpm || 0
    if (rotor.current) rotor.current.rotation.x += ((rpm * 2 * Math.PI) / 60) * Math.min(dt, 0.1)
    if (head.current) {
      const target = ((L?.osc ?? 0) * Math.PI) / 180
      head.current.rotation.y += (target - head.current.rotation.y) * Math.min(1, dt * 8)
    }
  })
  const b = d.base
  const bladeMat = mat('#8fc8ef', 0, 0.2, { transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false })
  const colH = d.hub - 0.55
  // base torneada (baixa junto aos bornes, cúpula ao centro)
  const baseGeo = latheGeo(`vpeBase${b}`, [[0.001, 0], [b * 1.05, 0], [b * 1.05, 0.07], [b * 0.98, 0.18], [b * 0.8, 0.24], [0.55, 0.28], [0.4, 0.4], [0.3, 0.55], [0.001, 0.55]], 40)
  // carcaça do motor (revolução segundo x): traseira boleada, frente estreita até ao veio
  const motorGeo = geo('vpeMotor2', () => latheGeo('vpeMotorL', [[0.001, -1.75], [0.3, -1.72], [0.48, -1.6], [0.56, -1.35], [0.58, -0.6], [0.5, -0.25], [0.3, -0.06], [0.12, 0.05], [0.001, 0.05]], 28).clone().rotateZ(-Math.PI / 2))
  // rasgos de ventilação na traseira da carcaça
  const vents = mergedGeo('vpeVents', () => {
    const u = geo('vpeUnit', () => new THREE.BoxGeometry(1, 1, 1))
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2
      return [u, [-1.45, Math.cos(a) * 0.5, Math.sin(a) * 0.5], [a, 0, 0], [0.3, 0.02, 0.07]]
    })
  })
  return (
    <group>
      {/* base, teclas de velocidade e régua de bornes */}
      <mesh geometry={baseGeo} material={mat(body, 0, 0.35)} castShadow receiveShadow />
      {[-0.36, -0.12, 0.12, 0.36].map((z, i) => (
        <Box key={z} size={[0.32, 0.1, 0.2]} pos={[b * 0.68, 0.3, z]} rot={[0, 0, -0.3]} color={i === 0 ? '#e5484d' : '#9ca3af'} rough={0.4} />
      ))}
      <Bornes pos={[-1.0, 0.25, 0]} size={[0.4, 0.3, 1.0]} holeY={0.05} />
      {/* coluna: tubo de baixo, aperto da altura e tubo cromado de cima */}
      <Cyl r={0.2} h={colH * 0.55} pos={[0, 0.5 + (colH * 0.55) / 2, 0]} color={body} rough={0.35} seg={16} />
      <Cyl r={0.24} r2={0.22} h={0.3} pos={[0, 0.5 + colH * 0.55, 0]} color={body} rough={0.35} seg={16} />
      <Cyl r={0.09} h={0.3} pos={[0.3, 0.5 + colH * 0.55, 0]} rot={[0, 0, Math.PI / 2]} color="#3a3d41" rough={0.5} seg={10} />
      <Cyl r={0.13} h={colH * 0.5} pos={[0, 0.5 + colH * 0.55 + (colH * 0.45) / 2, 0]} color="#c7ccd0" metal={0.85} rough={0.25} seg={14} />
      {/* cabeça que oscila em torno da coluna */}
      <group ref={head} position={[0, d.hub, 0]}>
        {/* forquilha e manípulo de inclinação */}
        <Cyl r={0.22} h={0.6} pos={[-0.35, -0.35, 0]} color={body} rough={0.35} seg={14} />
        <Box size={[0.5, 0.35, 0.5]} pos={[-0.5, -0.05, 0]} color={body} rough={0.35} />
        <Cyl r={0.14} h={0.22} pos={[-0.5, -0.05, 0.34]} rot={[Math.PI / 2, 0, 0]} color="#3a3d41" rough={0.5} seg={12} />
        {/* motor e botão de oscilação */}
        <mesh geometry={motorGeo} material={mat(body, 0, 0.32)} castShadow />
        <mesh geometry={vents} material={mat('#26292c', 0, 0.8)} />
        <Cyl r={0.12} h={0.3} pos={[-1.1, 0.62, 0]} color="#9ca3af" rough={0.45} seg={12} />
        <Cyl r={0.16} h={0.05} pos={[-1.1, 0.78, 0]} color="#9ca3af" rough={0.45} seg={12} />
        <Cyl r={0.04} h={0.22} pos={[0.15, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#cfd4d8" metal={0.9} rough={0.25} seg={8} />
        {/* hélice: cubo, porca-tampão e 3 pás */}
        <group ref={rotor} position={[0.25, 0, 0]}>
          <Cyl r={0.3} r2={0.32} h={0.36} rot={[0, 0, -Math.PI / 2]} color={body} rough={0.3} seg={20} />
          <mesh position={[0.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={latheGeo('vpeSpinner', [[0.24, 0], [0.24, 0.06], [0.2, 0.14], [0.1, 0.2], [0.001, 0.21]], 18)} material={mat('#8fc8ef', 0, 0.25)} />
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[(i * 2 * Math.PI) / 3, 0, 0]}>
              <group rotation={[0, 0.4, 0]}>
                <mesh geometry={bladeGeo(d.R)} material={bladeMat} renderOrder={2} />
              </group>
            </group>
          ))}
        </group>
        <mesh geometry={guardGeo(d.R, 0.25)} material={mat('#d9dde0', 1, 0.28)} castShadow />
        {/* emblema ao centro da grelha */}
        <Cyl r={0.34} h={0.06} pos={[0.82, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#3b82f6" metal={0.4} rough={0.3} seg={24} />
        <Cyl r={0.36} h={0.03} pos={[0.8, 0, 0]} rot={[0, 0, Math.PI / 2]} color="#d9dde0" metal={0.9} rough={0.25} seg={24} />
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  const rpm = Math.abs(live?.rpm || 0)
  if (rpm < 10) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#93c5fd" fontFamily="monospace" pointerEvents="none">
      {rpm} rpm
    </text>
  )
}

export default { type: 'ventoinhaPe', Model, Overlay2D }
