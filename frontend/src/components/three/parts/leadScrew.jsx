// Eixo linear com fuso T8 (como os módulos das impressoras 3D/CNC): topos de alumínio
// anodizado preto, 2 guias de aço retificado de 8 mm, fuso T8 de 4 entradas (passo 2 mm,
// avanço 8 mm) com a rosca real, acoplador flexível do lado do motor e rolamento de flange
// KFL08 do outro. O fuso roda com live.screwAngle; o carro de alumínio (casquilhos LM8UU e
// porca de latão de flange) desliza com o mount "carriage".
import { useFrame, useRef, liveOf, D2R, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { slideNow } from '../../../functions/mechLive.js'
import { Holes, rotX, BRASS, plateGeo, rrectShape, addHole, brushedMat, SocketScrews } from './_mechKit.jsx'
import { LS, lsLen } from '@shared/parts/leadScrew.js'
import { scaleOf } from '@shared/components.js'

const ANOD_BLACK = '#24272b'
const PITCH_T8 = 0.2
const LEAD_T8 = 0.8
// rotação da chapa dos topos: forma x → −z, forma y → y, espessura → +x
const END_ROT = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)))

// rosca trapezoidal do fuso T8 ao longo de +y (de 0 a L): raio de 4 mm na crista, 3,4 no fundo
function profile(t) {
  if (t < 0.15) return t / 0.15
  if (t < 0.45) return 1
  if (t < 0.6) return (0.6 - t) / 0.15
  return 0
}
function t8Geo(L) {
  return geo(`t8:${L.toFixed(3)}`, () => {
    const NA = 20
    const NY = Math.max(8, Math.round((L / PITCH_T8) * 5))
    const pos = []
    const idx = []
    for (let j = 0; j <= NY; j++) {
      const y = (j / NY) * L
      for (let i = 0; i <= NA; i++) {
        const a = (i / NA) * Math.PI * 2
        let t = (y - (a / (Math.PI * 2)) * LEAD_T8) / PITCH_T8
        t -= Math.floor(t)
        const r = 0.34 + 0.06 * profile(t)
        pos.push(Math.cos(a) * r, y, -Math.sin(a) * r)
      }
    }
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NA; i++) {
        const a = j * (NA + 1) + i
        const b = a + NA + 1
        idx.push(a, a + 1, b, a + 1, b + 1, b)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  })
}
// topo: chapa de 1,2 cm (segundo x) com furos das guias e do fuso, cantos boleados
function endShape() {
  const s = rrectShape(-LS.W / 2, 0, LS.W / 2, 3.4, 0.25)
  for (const z of [-2, 2]) addHole(s, z, LS.AY, 0.4)
  addHole(s, 0, LS.AY, 0.55)
  return s
}
// acoplador flexível de alumínio (ranhura helicoidal) ao longo de y, de 0 a 2
function couplerGeo() {
  return geo('lsCoupler', () => {
    const pts = []
    for (let i = 0; i <= 90; i++) {
      const t = i / 90
      const a = t * Math.PI * 2 * 3
      pts.push(new THREE.Vector3(Math.cos(a) * 0.95, 0.55 + t * 0.9, Math.sin(a) * 0.95))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.04, 5, false)
  })
}
// casquilho linear LM8UU (só se veem as pontas): anel de aço com o vedante preto
function lmGeo() {
  return mergedGeo('lsLm8', () => {
    const ring = geo('lsLmRing', () => new THREE.CylinderGeometry(0.75, 0.75, 0.12, 24))
    return [-1, 1].flatMap((sx) => [-2, 2].map((z) => [ring, [sx * (LS.CAR / 2 + 0.06), LS.AY, z], rotX]))
  })
}

function Model({ part }) {
  const c = part.config || {}
  const L = lsLen(c)
  const screw = useRef()
  const car = useRef()
  const x0 = -L / 2 + 3.3 // início do fuso (depois do acoplador)
  const x1 = L / 2 - 0.6
  const sl = x1 - x0
  useFrame(() => {
    if (screw.current) screw.current.rotation.x = (liveOf(part.id)?.screwAngle || 0) * D2R
    if (car.current) car.current.position.x = slideNow(part.id, 'carriage', [1, 0, 0]) / scaleOf(part)[0] // o grupo do modelo já está escalado
  })
  const endG = plateGeo('lsEnd', LS.BLOCK, endShape, 0.03)
  const black = brushedMat(ANOD_BLACK, 0.6, 0.45)
  return (
    <group>
      {/* topos (chapa de pé, espessura segundo x) */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={endG} position={[s * (L / 2 - LS.BLOCK / 2) - LS.BLOCK / 2, 0, 0]} rotation={END_ROT} material={black} castShadow receiveShadow />
          <Holes pts={[[s * (L / 2 - LS.BLOCK / 2), 0.4, -2.3], [s * (L / 2 - LS.BLOCK / 2), 0.4, 2.3]]} r={0.2} h={LS.BLOCK + 0.02} axis="x" />
          {/* parafusos que apertam as guias (no topo) */}
          <SocketScrews pts={[[s * (L / 2 - LS.BLOCK / 2), 3.4, -2], [s * (L / 2 - LS.BLOCK / 2), 3.4, 2]]} rh={0.27} hh={0.1} />
        </group>
      ))}
      {/* guias de aço retificado */}
      {[-2, 2].map((z) => (
        <mesh key={z} position={[0, LS.AY, z]} rotation={rotX} geometry={geo(`lsRod${L}`, () => new THREE.CylinderGeometry(0.4, 0.4, L - 0.1, 24))} material={mat('#e6e9eb', 1, 0.12)} castShadow />
      ))}
      {/* acoplador do lado do motor e rolamento de flange do outro lado */}
      <group position={[-L / 2 + 1.3, LS.AY, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, 1, 0]} geometry={geo('lsCoupBody', () => new THREE.CylinderGeometry(0.95, 0.95, 2, 32))} material={brushedMat('#c7d0d6', 0.85, 0.3)} castShadow />
        <mesh geometry={couplerGeo()} material={mat('#1b1f22', 0.3, 0.6)} />
      </group>
      <mesh position={[L / 2 - LS.BLOCK - 0.05, LS.AY, 0]} rotation={rotX} geometry={geo('lsKfl', () => new THREE.CylinderGeometry(0.55, 0.62, 0.1, 24))} material={mat('#9e9e9e', 0.8, 0.3)} />
      <mesh position={[L / 2 - LS.BLOCK - 0.1, LS.AY, 0]} rotation={rotX} geometry={geo('lsKflSeal', () => new THREE.CylinderGeometry(0.38, 0.38, 0.02, 20))} material={mat('#141414', 0, 0.6)} />
      {/* fuso T8 (roda) */}
      <group ref={screw} position={[0, LS.AY, 0]}>
        <mesh position={[x1, 0, 0]} rotation={rotX} geometry={t8Geo(sl)} material={mat('#c2c7cb', 0.85, 0.3)} castShadow />
        {/* marca no acoplador para se ver a rotação */}
        <mesh position={[-L / 2 + 2.3, 0.955, 0]} geometry={geo('lsMark', () => new THREE.BoxGeometry(1.9, 0.02, 0.18))} material={mat('#e53935', 0, 0.5)} />
      </group>
      {/* carro com porca e casquilhos */}
      <group ref={car}>
        <mesh geometry={plateGeo('lsCar', 2.6, () => rrectShape(-LS.CAR / 2, -LS.W / 2, LS.CAR / 2, LS.W / 2, 0.3), 0.04)} position={[0, 1.0, 0]} material={brushedMat('#cfd8dc', 0.85, 0.32)} castShadow receiveShadow />
        <mesh geometry={lmGeo()} material={mat('#c9ced2', 0.9, 0.25)} />
        {/* porca T8 de latão: corpo e flange com 4 furos */}
        <mesh position={[LS.CAR / 2 + 0.6, LS.AY, 0]} rotation={rotX} geometry={geo('lsNut', () => new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24))} material={mat(BRASS, 0.85, 0.3)} castShadow />
        <mesh position={[LS.CAR / 2 + 0.12, LS.AY, 0]} rotation={rotX} geometry={geo('lsNutFl', () => new THREE.CylinderGeometry(1.1, 1.1, 0.25, 32))} material={mat(BRASS, 0.85, 0.3)} castShadow />
        <SocketScrews pts={[0, 1, 2, 3].map((k) => [LS.CAR / 2 + 0.245, LS.AY + Math.cos((k * Math.PI) / 2 + Math.PI / 4) * 0.8, Math.sin((k * Math.PI) / 2 + Math.PI / 4) * 0.8])} rh={0.14} hh={0.1} axis="x" />
        <Holes pts={[[-1.6, LS.CAR_TOP, -2.2], [1.6, LS.CAR_TOP, -2.2], [-1.6, LS.CAR_TOP, 2.2], [1.6, LS.CAR_TOP, 2.2]]} r={0.17} h={0.04} />
      </group>
    </group>
  )
}

export default { type: 'leadScrew', Model }
