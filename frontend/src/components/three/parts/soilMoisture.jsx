// Sensor de humidade do solo: módulo comparador YL-38 (LM393 azul, 30 × 15 mm) + sonda YL-69
// (60 × 19 mm, dois dentes pontiagudos com o cobre exposto niquelado), ligados por um cabo
// dupont curto de 2 fios.
import { RBox, HeaderPins, geo, mat, METAL, THREE } from '../kit.jsx'
import { lm393Module, ShapedPcb, Art, pcbGeo, polyShape } from './mq2.jsx'
import def from '@shared/parts/soilMoisture.js'

const T = 0.16
// pinos de saída do módulo e de entrada da sonda (barras de 2 vias)
const MPINS = [-0.127, 0.127].map((z, i) => ({ id: `m${i}`, pos: [-1.72, 0.3, z] }))
const PPINS = [-0.127, 0.127].map((z, i) => ({ id: `p${i}`, pos: [-1.0, 0.3, z] }))

// contorno da sonda: cabeça + dois dentes com ponta em bico
const PROBE = [
  [-1.3, -0.95],
  [4.2, -0.95],
  [4.65, -0.65],
  [4.2, -0.35],
  [-0.15, -0.35],
  [-0.15, 0.35],
  [4.2, 0.35],
  [4.65, 0.65],
  [4.2, 0.95],
  [-1.3, 0.95],
]
// cobre exposto (niquelado) de cada dente
const plating = (zc) => [
  [-0.05, zc - 0.2],
  [4.1, zc - 0.2],
  [4.42, zc],
  [4.1, zc + 0.2],
  [-0.05, zc + 0.2],
]

// cabo dupont em arco entre as duas barras
function cableGeo(z) {
  return geo(`soilM:cable${z}`, () => {
    const a = MPINS[0].pos[0]
    const b = PPINS[0].pos[0]
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(a, 0.72, z), new THREE.Vector3(a + 0.12, 0.79, z), new THREE.Vector3((a + b) / 2, 0.8, z), new THREE.Vector3(b - 0.12, 0.79, z), new THREE.Vector3(b, 0.72, z)])
    return new THREE.TubeGeometry(c, 12, 0.04, 6, false)
  })
}

function Probe() {
  return (
    <group>
      <ShapedPcb id="soilM:probe" t={T} outline={() => polyShape(PROBE)} color="#1f6a2c" />
      {[-0.65, 0.65].map((zc) => (
        <mesh key={zc} position={[0, T, 0]} geometry={pcbGeo(`soilM:plating${zc}`, { t: 0.012, outline: () => polyShape(plating(zc)) })} material={mat(METAL.nickel, 1, 0.3)} receiveShadow />
      ))}
      <Art
        id="soilM:probe"
        w={1.1}
        d={1.9}
        pos={[-0.75, T + 0.0015, 0]}
        origin={[-0.75, 0]}
        draw={(p) => {
          p.text('YL-69', -0.55, 0.55, 0.15, { rot: -Math.PI / 2 })
          p.text('+', -0.7, -0.13, 0.12)
          p.text('−', -0.7, 0.13, 0.12)
          // pistas dos pinos aos dentes
          p.line([[-1.0, -0.127], [-0.35, -0.127], [-0.2, -0.65]], { lw: 0.08, stroke: '#2f8a3e' })
          p.line([[-1.0, 0.127], [-0.35, 0.127], [-0.2, 0.65]], { lw: 0.08, stroke: '#2f8a3e' })
        }}
      />
      {/* barras de 2 pinos e o cabo dupont (fêmea-fêmea) */}
      <HeaderPins pins={MPINS} base={0} />
      <HeaderPins pins={PPINS} base={0} />
      {[-0.127, 0.127].map((z, i) => (
        <group key={z}>
          {[MPINS[0].pos[0], PPINS[0].pos[0]].map((x) => (
            <RBox key={x} size={[0.25, 0.42, 0.25]} r={0.02} pos={[x, 0.51, z]} color="#121212" rough={0.5} />
          ))}
          <mesh geometry={cableGeo(z)} material={mat(i ? '#1a1a1a' : '#c62828', 0, 0.5)} castShadow />
        </group>
      ))}
    </group>
  )
}

export default lm393Module({
  type: 'soilMoisture',
  def,
  board: { x: [-4.6, -1.5], z: [-0.75, 0.75], color: '#1d4ed8' },
  pot: [-3.4, -0.2],
  chip: [-2.4, 0.35],
  leds: { pwr: [-2.1, -0.45], dout: [-1.8, -0.45] },
  ledLabel: [0, -0.2],
  pinLabelDx: 0.32,
  smd: [
    [-2.85, 0.4, Math.PI / 2],
    [-1.95, 0.4, Math.PI / 2],
    [-2.35, -0.3, 0],
    [-3.6, 0.45, 0, 'c'],
  ],
  art: (p) => {
    p.text('YL-38', -3.2, 0.5, 0.12)
    p.text('+', -1.6, -0.31, 0.1)
    p.text('−', -1.6, 0.33, 0.1)
  },
  Extra: Probe,
})
