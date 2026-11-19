// Sensor de chuva FC-37 / YL-83: módulo comparador LM393 azul (30 × 16 mm) + placa coletora
// azul de 54 × 40 mm com os dois pentes entrelaçados estanhados, 2 furos de fixação e a barra
// de 2 pinos, ligada ao módulo por um cabo dupont de 2 fios. A água na placa aparece como gotas.
import { RBox, HeaderPins, liveOf, inputOf, useFrame, useRef, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import { lm393Module, ShapedPcb, Art } from './mq2.jsx'
import def from '@shared/parts/rainSensor.js'

const PX = [2.5, 7.9] // placa coletora em x
const PZ = [-2.0, 2.0]
const PT = 0.16 // espessura da placa coletora
const PW = PX[1] - PX[0]
const PD = PZ[1] - PZ[0]
const CX = (PX[0] + PX[1]) / 2
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
// furos de fixação (Ø 3 mm) nos cantos do lado dos pinos
const PHOLES = [
  [PX[0] + 0.35 - CX, PZ[0] + 0.35, 0.16],
  [PX[0] + 0.35 - CX, PZ[1] - 0.35, 0.16],
]
// pinos da placa coletora (barra de 2 vias junto à aresta −x)
const PPINS = [-0.127, 0.127].map((z, i) => ({ id: `p${i}`, pos: [PX[0] + 0.3, 0.3, z] }))
// pinos de saída do módulo para a placa (lado +x do módulo)
const MPINS = [-0.127, 0.127].map((z, i) => ({ id: `m${i}`, pos: [1.38, 0.3, z] }))

// pentes entrelaçados: dois barramentos (topo e fundo) e dedos alternados de 1,5 mm
function combGeo() {
  return mergedGeo('rain:comb', () => {
    const out = []
    const xb = PX[0] + 0.55 // início dos barramentos (ligação aos pinos)
    const x0 = PX[0] + 0.85 // primeiro dedo
    const x1 = PX[1] - 0.25
    const z0 = PZ[0] + 0.25
    const z1 = PZ[1] - 0.25
    const y = PT + 0.008
    const seg = (xa, za, xc, zc, w) => out.push([unit(), [(xa + xc) / 2, y, (za + zc) / 2], [0, 0, 0], [Math.max(w, xc - xa), 0.016, Math.max(w, zc - za)]])
    // barramentos ao longo de x
    seg(xb - 0.045, z0 - 0.075, x1, z0 + 0.075, 0.15)
    seg(xb - 0.045, z1 - 0.075, x1, z1 + 0.075, 0.15)
    // dedos ao longo de z, alternados entre os dois barramentos
    const n = 15
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.12 + (i * (x1 - x0 - 0.24)) / (n - 1)
      if (i % 2 === 0) seg(x - 0.075, z0, x + 0.075, z1 - 0.3, 0.15)
      else seg(x - 0.075, z0 + 0.3, x + 0.075, z1, 0.15)
    }
    // pistas dos 2 pinos aos barramentos
    seg(PX[0] + 0.3, -0.172, xb, -0.082, 0.09)
    seg(xb - 0.045, z0, xb + 0.045, -0.082, 0.09)
    seg(PX[0] + 0.3, 0.082, xb, 0.172, 0.09)
    seg(xb - 0.045, 0.082, xb + 0.045, z1, 0.09)
    return out
  })
}

const DROPS = Array.from({ length: 24 }, (_, i) => [PX[0] + 0.9 + ((i * 37) % 44) / 10, PZ[0] + 0.4 + ((i * 53) % 33) / 10, 0.08 + ((i * 7) % 5) / 40])

// cabo dupont de 2 fios em arco do módulo à placa
function cableGeo(z) {
  return geo(`rain:cable${z}`, () => {
    const a = MPINS[0].pos[0] + 0.0
    const b = PPINS[0].pos[0]
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(a + 0.1, 1.05, z), new THREE.Vector3(a + 0.45, 1.25, z), new THREE.Vector3((a + b) / 2 + 0.3, 1.05, z), new THREE.Vector3(b - 0.35, 1.2, z), new THREE.Vector3(b - 0.05, 1.05, z)])
    return new THREE.TubeGeometry(c, 20, 0.045, 6, false)
  })
}

function Plate({ part }) {
  const drops = useRef([])
  useFrame(() => {
    const v = (inputOf(part.id).value ?? 0) / 100
    drops.current.forEach((m, i) => m && (m.visible = !!liveOf(part.id) && i < v * DROPS.length))
  })
  const dropGeo = geo('rain:drop', () => new THREE.SphereGeometry(1, 12, 8))
  const dropMat = mat('#bfe3ff', 0, 0.05, { transparent: true, opacity: 0.7 })
  return (
    <group>
      <ShapedPcb id="rain:plate" pos={[CX, 0, 0]} w={PW} d={PD} t={PT} r={0.12} holes={PHOLES} color="#1846b8" />
      <Art
        id="rain:plate"
        w={PW}
        d={PD}
        pos={[CX, PT + 0.0015, 0]}
        draw={(p) => {
          for (const [x, z] of PHOLES) p.ring(x, z, 0.16, 0.28)
          p.text('YL-83', -PW / 2 + 0.5, 0.75, 0.16, { rot: -Math.PI / 2 })
          p.text('Rain', -PW / 2 + 0.5, -0.75, 0.15, { rot: -Math.PI / 2, weight: 'normal' })
        }}
      />
      <mesh geometry={combGeo()} material={mat(METAL.tin, 1, 0.32)} castShadow receiveShadow />
      {DROPS.map(([x, z, r], i) => (
        <mesh key={i} ref={(m) => (drops.current[i] = m)} position={[x, PT + 0.02, z]} scale={[r, r * 0.35, r]} visible={false} geometry={dropGeo} material={dropMat} />
      ))}
      {/* barras de 2 pinos (placa e saída do módulo) e o cabo dupont */}
      <HeaderPins pins={PPINS} base={0} />
      <HeaderPins pins={MPINS} base={0} />
      {[-0.127, 0.127].map((z, i) => (
        <group key={z}>
          {[MPINS[0].pos[0], PPINS[0].pos[0]].map((x) => (
            <RBox key={x} size={[0.25, 0.6, 0.25]} r={0.02} pos={[x, 0.75, z]} color="#121212" rough={0.5} />
          ))}
          <mesh geometry={cableGeo(z)} material={mat(i ? '#1a1a1a' : '#c62828', 0, 0.5)} castShadow />
        </group>
      ))}
    </group>
  )
}

export default lm393Module({
  type: 'rainSensor',
  def,
  board: { x: [-1.7, 1.6], z: [-0.75, 0.75], color: '#1d4ed8' },
  pot: [-0.35, -0.25],
  chip: [0.55, 0.33],
  leds: { pwr: [0.8, -0.45], dout: [1.1, -0.45] },
  ledLabel: [0, -0.2],
  pinLabelDx: 0.32,
  smd: [
    [0.0, 0.4, Math.PI / 2],
    [1.0, 0.25, Math.PI / 2],
    [1.0, 0.55, Math.PI / 2],
    [0.25, -0.4, 0],
    [-0.25, 0.55, 0, 'c'],
  ],
  art: (p) => {
    p.text('+', 1.38 + 0.05, -0.33, 0.1)
    p.text('−', 1.38 + 0.05, 0.33, 0.1)
    p.text('FC-37', -0.6, 0.45, 0.12)
  },
  Extra: Plate,
})
