// Condensador eletrolítico radial: tamanho conforme a capacidade (série de 5 × 11 a 16 × 25 mm),
// manga termorretrátil azul com a faixa clara do − (+x) cheia de sinais "−" e o valor impresso
// ao longo da altura; a manga dobra sobre as arestas e deixa à vista a tampa de alumínio com o
// corte em K da válvula de segurança; ranhura de cravação junto à base e o vedante de borracha
// por baixo. Incha e abre quando rebenta (live.burst).
import { THREE, geo, mat, mergedGeo, useFrame, useRef, liveOf, METAL } from '../kit.jsx'
import { Wires } from './_dip.jsx'
import { capDiameter } from '@shared/parts/capacitor.js'
import { Badge, Boom, fmt } from './group-c-ui.jsx'

const HEIGHT = { 0.5: 1.1, 0.63: 1.1, 0.8: 1.25, 1.0: 1.6, 1.25: 2.0, 1.6: 2.5 }
const Y0 = 0.25
const SLEEVE = '#1d3478'

// lata de alumínio coberta pela manga: perfil de revolução (base com o vedante, ranhura de
// cravação, aresta de cima boleada onde a manga dobra)
const canGeo = (r, h) =>
  geo(`ecan${r},${h}`, () => {
    const g0 = 0.12 + r * 0.1 // altura da ranhura
    const p = [
      [0.001, 0.02], [r * 0.82, 0.02], [r * 0.9, 0.0], [r - 0.02, 0.005], [r, 0.04],
      [r, g0 - 0.05], [r - 0.035, g0 - 0.02], [r - 0.035, g0 + 0.02], [r, g0 + 0.05],
      [r, h - 0.05], [r - 0.012, h - 0.015], [r - 0.04, h], [r * 0.84, h], [r * 0.84, h - 0.004],
    ]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 36)
    g.computeVertexNormals()
    return g
  })
// impressão da manga: faixa clara com sinais "−" (do lado +x) e o valor ao longo da altura
const SLEEVE_MAT = new Map()
function sleeveMat(uF, d) {
  const k = `${uF}|${d}`
  let m = SLEEVE_MAT.get(k)
  if (!m) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const x = c.getContext('2d')
    // u: 0..1 à volta (u = 0,25 em +x); v: de baixo para cima
    const sx = 512 * 0.25
    const sw = 512 * 0.18
    x.fillStyle = '#c7d2e8'
    x.fillRect(sx - sw / 2, 0, sw, 256)
    x.fillStyle = SLEEVE
    for (let i = 0; i < 4; i++) x.fillRect(sx - sw * 0.18, 40 + i * 52, sw * 0.36, 12)
    // valor e tensão impressos a branco, a ler de baixo para cima (do lado −x)
    x.save()
    x.translate(512 * 0.75, 128)
    x.rotate(-Math.PI / 2)
    x.fillStyle = '#e8edf6'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = 'bold 40px Arial'
    x.fillText(`${uF >= 1 ? uF : uF.toFixed(2)}µF`, 0, -26)
    x.font = 'bold 32px Arial'
    x.fillText('25V  105°C', 0, 22)
    x.restore()
    x.save()
    x.translate(512 * 0.5, 128)
    x.rotate(-Math.PI / 2)
    x.fillStyle = '#e8edf6'
    x.textAlign = 'center'
    x.font = 'bold 28px Arial'
    x.fillText('(M) 347', 0, 10)
    x.restore()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    SLEEVE_MAT.set(k, (m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })))
  }
  return m
}
// cortes em K da tampa (válvula de segurança)
const ventGeo = (r) =>
  mergedGeo(`event${r}`, () => {
    const u = geo('gull', () => new THREE.BoxGeometry(1, 1, 1))
    const L = r * 0.75
    return [
      [u, [0, 0, 0], [0, Math.PI / 2, 0], [L, 0.006, 0.022]],
      [u, [L * 0.18, 0, -L * 0.18], [0, -Math.PI / 4, 0], [L * 0.62, 0.006, 0.022]],
      [u, [L * 0.18, 0, L * 0.18], [0, Math.PI / 4, 0], [L * 0.62, 0.006, 0.022]],
    ]
  })

function Model({ part }) {
  const uF = part.config?.uF ?? 100
  const d = capDiameter(uF)
  const r = d / 2
  const h = HEIGHT[d] ?? 1.2
  const top = useRef()
  const fume = useRef()
  useFrame(() => {
    const burst = !!liveOf(part.id)?.burst
    if (top.current) top.current.visible = !burst
    if (fume.current) fume.current.visible = burst
  })
  // manga lisa entre a ranhura e o topo, onde vai a impressão
  const g0 = 0.12 + r * 0.1
  const ph = h - 0.06 - (g0 + 0.06)
  return (
    <group>
      {/* pernas: + (comprida) e −; saem do vedante de borracha */}
      <Wires id="ecapLegs" r={0.025} lines={[[[-0.127, 0, 0], [-0.127, Y0 + 0.03, 0]], [[0.127, 0, 0], [0.127, Y0 + 0.03, 0]]]} />
      <mesh position={[0, Y0 + 0.01, 0]} geometry={geo(`ebung${r}`, () => new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.02, 24))} material={mat('#1b1b1b', 0, 0.8)} />
      <group position={[0, Y0, 0]}>
        <mesh geometry={canGeo(r, h)} material={mat(SLEEVE, 0, 0.32)} castShadow receiveShadow />
        <mesh position={[0, g0 + 0.06 + ph / 2, 0]} geometry={geo(`esleeve${r},${ph}`, () => new THREE.CylinderGeometry(r + 0.002, r + 0.002, ph, 36, 1, true))} material={sleeveMat(uF, d)} />
      </group>
      <group ref={top}>
        <mesh position={[0, Y0 + h - 0.004, 0]} geometry={geo(`ecapTop${r}`, () => new THREE.CylinderGeometry(r * 0.84, r * 0.84, 0.006, 32))} material={mat(METAL.alu, 1, 0.38)} />
        <mesh position={[0, Y0 + h - 0.0005, 0]} geometry={ventGeo(r)} material={mat('#868b92', 1, 0.5)} />
      </group>
      <group ref={fume} visible={false}>
        <mesh position={[0, Y0 + h, 0]}>
          <sphereGeometry args={[r * 0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#6b5a3a" roughness={0.9} />
        </mesh>
        <mesh position={[0, Y0 + h + 0.5, 0]}>
          <cylinderGeometry args={[r * 0.6, r * 0.6, 0.4, 16]} />
          <meshStandardMaterial color="#9a9a9a" transparent opacity={0.35} />
        </mesh>
      </group>
    </group>
  )
}

function Overlay2D({ info, live }) {
  if (!live) return null
  if (live.burst) return <Boom info={info} />
  return <Badge info={info} text={`${fmt(live.v, 2)} V`} color={live.hot ? '#dc2626' : '#f5f5f5'} />
}

export default { type: 'capacitor', Model, Overlay2D }
