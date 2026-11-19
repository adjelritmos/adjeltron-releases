// Amortecedor com mola (tipo "coilover" de alumínio dos carros RC/robôs): corpo anodizado
// vermelho com a rosca do anel de pré-carga, anel de aperto, olhais com casquilho e furo
// segundo z; haste cromada, olhal e prato de cima deslizam com o mount "top"; a mola de aço
// (pontas fechadas) estica entre os dois pratos.
import { useFrame, useRef, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { SHOCK } from '@shared/parts/shockAbsorber.js'
import { scaleOf } from '@shared/components.js'

// mola de altura H (escala em y): hélice com as pontas fechadas (última volta de cada lado
// com passo pequeno, assente no prato) como as molas reais
function coilGeo(H) {
  return geo(`shockCoil2:${H}`, () => {
    const pts = []
    const turns = Math.max(3, Math.round(H * 1.6))
    const e = 0.8 // voltas de cada ponta
    const k = 0.2 // passo das pontas (fração do passo ativo)
    const A = turns - 2 * e
    const total = A + 2 * e * k
    const prog = (u) => (u < e ? u * k : u < turns - e ? e * k + (u - e) : e * k + A + (u - (turns - e)) * k)
    for (let i = 0; i <= turns * 24; i++) {
      const u = (i / (turns * 24)) * turns
      const a = u * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * 0.62, 0.07 + (prog(u) / total) * (H - 0.14), Math.sin(a) * 0.62))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.07, 6, false)
  })
}

// olhal: anel com furo segundo z (centro na origem) e o casquilho de latão
function eyeGeo() {
  return geo('shockEye', () => {
    const sh = new THREE.Shape()
    sh.absarc(0, 0, 0.35, 0, Math.PI * 2, false)
    const h = new THREE.Path()
    h.absarc(0, 0, 0.16, 0, Math.PI * 2, true)
    sh.holes.push(h)
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.44, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelOffset: -0.03, bevelSegments: 1, curveSegments: 18 })
    g.translate(0, 0, -0.22)
    return g
  })
}
// rosca do corpo (anéis finos ao longo de y, de y0 a y1)
function threadGeo(R, y0, y1) {
  return mergedGeo(`shockThr${R},${y0},${y1}`, () => {
    const t = geo(`shockThrT${R}`, () => new THREE.TorusGeometry(R, 0.018, 4, 28).rotateX(Math.PI / 2))
    const out = []
    for (let y = y0; y <= y1; y += 0.07) out.push([t, [0, y, 0]])
    return out
  })
}
// corpo: tubo com os topos chanfrados (perfil girado) de y0 a y1
function bodyGeo(R, y0, y1) {
  return geo(`shockBody${R},${y0},${y1}`, () => {
    const c = 0.06
    const p = [[0.18, y0], [R - c, y0], [R, y0 + c], [R, y1 - c], [R - c, y1], [0.22, y1], [0.22, y1 - 0.05]].map(([a, b]) => new THREE.Vector2(a, b))
    return new THREE.LatheGeometry(p, 32)
  })
}

function Model({ part }) {
  const L = part.config?.length ?? 7
  const up = useRef()
  const coil = useRef()
  const y0 = 0.9 // prato de baixo
  const H = L - 0.9 - y0 // comprimento livre da mola
  useFrame(() => {
    const d = slideNow(part.id, 'top', [0, 1, 0]) / scaleOf(part)[1] // o grupo do modelo já está escalado
    if (up.current) up.current.position.y = d
    if (coil.current) coil.current.scale.y = Math.max(0.2, (H + d) / H)
  })
  return (
    <group>
      {/* olhal de baixo (casquilho de latão) + corpo com a rosca e o anel de pré-carga */}
      <mesh geometry={eyeGeo()} material={mat('#c62828', 0.75, 0.3)} castShadow />
      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geo('shockBush', () => new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14, 1, true))} material={mat('#c9a227', 0.85, 0.3, { side: THREE.DoubleSide })} />
      <mesh geometry={bodyGeo(SHOCK.R, 0.3, L * 0.55)} material={mat('#c62828', 0.75, 0.3)} castShadow receiveShadow />
      <mesh geometry={threadGeo(SHOCK.R, y0 + 0.2, L * 0.55 - 0.3)} material={mat('#b71c1c', 0.75, 0.32)} />
      <mesh position={[0, y0 - 0.1, 0]} geometry={geo('shockLock', () => new THREE.CylinderGeometry(0.72, 0.72, 0.12, 6))} material={mat('#c62828', 0.75, 0.3)} castShadow />
      <mesh position={[0, y0, 0]} geometry={geo('shockPlate', () => new THREE.CylinderGeometry(0.8, 0.8, 0.12, 28))} material={mat('#263238', 0.6, 0.4)} castShadow />
      <mesh ref={coil} position={[0, y0, 0]} geometry={coilGeo(H)} material={mat('#fdd835', 0.5, 0.35)} castShadow />
      <group ref={up}>
        <mesh position={[0, L - L * 0.25 - 0.2, 0]} geometry={geo(`shockRod${L}`, () => new THREE.CylinderGeometry(0.2, 0.2, L * 0.5, 16))} material={mat('#eef0f2', 1, 0.1)} castShadow />
        <mesh position={[0, L - 0.9, 0]} geometry={geo('shockPlate', () => new THREE.CylinderGeometry(0.8, 0.8, 0.12, 28))} material={mat('#263238', 0.6, 0.4)} castShadow />
        <mesh position={[0, L - 0.78, 0]} geometry={geo('shockCap', () => new THREE.CylinderGeometry(0.42, 0.5, 0.14, 20))} material={mat('#263238', 0.6, 0.4)} />
        <mesh position={[0, L, 0]} geometry={eyeGeo()} material={mat('#263238', 0.6, 0.4)} castShadow />
        <mesh position={[0, L, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geo('shockBush', () => new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14, 1, true))} material={mat('#c9a227', 0.85, 0.3, { side: THREE.DoubleSide })} />
      </group>
    </group>
  )
}

export default { type: 'shockAbsorber', Model }
