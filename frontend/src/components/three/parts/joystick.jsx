// Joystick KY-023: placa de 34 × 26 mm com 4 furos metalizados e a serigrafia dos pinos, o
// mecanismo de manípulo tipo PS2 (base de plástico preto, moldura de chapa niquelada com a
// abertura redonda, potenciómetros X e Y com as presilhas metálicas, botão tátil por baixo) e o
// manípulo com a rótula, o veio e o chapéu de borracha côncavo com estrias. O manípulo inclina
// conforme o controlo X/Y e desce ao premir (SW).
import { RBox, TactSwitch, HeaderPins, inputOf, useFrame, useRef, geo, mat, mergedGeo, METAL, THREE } from '../kit.jsx'
import def from '@shared/parts/joystick.js'
import { ShapedPcb, Art, pcbGeo } from './mq2.jsx'

const C = [0.35, 0, 0] // centro do mecanismo (cm)
const TILT = 0.45 // inclinação máxima (rad)
const T = 0.16
const BX = 0.05 // centro da placa (x)
const HOLES = [
  [-1.43, -1.03, 0.16],
  [-1.43, 1.03, 0.16],
  [1.43, -1.03, 0.16],
  [1.43, 1.03, 0.16],
] // relativos ao centro da placa
const unit = () => geo('sb:unitBox', () => new THREE.BoxGeometry(1, 1, 1))
const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))

// chapéu de borracha: saia, flanco e topo côncavo (perfil torneado)
const capGeo = () =>
  geo('joy:cap', () =>
    new THREE.LatheGeometry(
      v2([[0.17, 0.72], [0.96, 0.72], [1.04, 0.77], [1.1, 0.98], [1.1, 1.27], [1.06, 1.33], [0.97, 1.35], [0.86, 1.3], [0.5, 1.255], [0, 1.25]]),
      40,
    ),
  )
// estrias à volta do flanco do chapéu
const ribsGeo = () =>
  mergedGeo('joy:ribs', () =>
    Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2
      return [unit(), [Math.cos(a) * 1.1, 1.12, Math.sin(a) * 1.1], [0, -a, 0], [0.05, 0.26, 0.05]]
    }),
  )

function draw(p) {
  for (const [x, z] of HOLES) p.ring(x + BX, z, 0.16, 0.28)
  for (const pin of def.pins) p.text(pin.id, -1.24, pin.pos[2], 0.11)
  p.text('X', C[0] + 0.7, -1.05, 0.13)
  p.text('Y', C[0] + 1.05, 0.62, 0.13)
  p.rect(C[0], 0, 1.75, 1.75, { lw: 0.014 })
}

function Model({ part }) {
  const stick = useRef()
  useFrame(() => {
    const i = inputOf(part.id)
    const g = stick.current
    if (!g) return
    g.rotation.z = -((i.x ?? 0.5) - 0.5) * 2 * TILT
    g.rotation.x = ((i.y ?? 0.5) - 0.5) * 2 * TILT
    g.position.y = i.pressed ? 1.05 : 1.15
  })
  return (
    <group>
      <ShapedPcb id="joy" pos={[BX, 0, 0]} w={3.4} d={2.6} t={T} r={0.1} holes={HOLES} color="#16213f" />
      <Art id="joy" w={3.4} d={2.6} pos={[BX, T + 0.0015, 0]} draw={draw} origin={[BX, 0]} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {/* potenciómetros X e Y: corpo preto, presilha niquelada e as patas */}
      <RBox size={[1.0, 0.9, 0.45]} r={0.04} pos={[C[0], 0.61, -1.05]} color="#1c1c1c" rough={0.55} />
      <RBox size={[0.45, 0.9, 1.0]} r={0.04} pos={[C[0] + 1.05, 0.61, 0]} color="#1c1c1c" rough={0.55} />
      <mesh
        geometry={mergedGeo('joy:clips', () => [
          [unit(), [C[0], 0.62, -1.28], [0, 0, 0], [0.7, 0.6, 0.02]],
          [unit(), [C[0] + 1.28, 0.62, 0], [0, 0, 0], [0.02, 0.6, 0.7]],
        ])}
        material={mat(METAL.nickel, 1, 0.32)}
      />
      {/* base do mecanismo e moldura de chapa com a abertura redonda */}
      <RBox size={[1.5, 0.55, 1.5]} r={0.05} pos={[C[0], T + 0.275, 0]} color="#222222" rough={0.6} />
      <mesh position={[C[0], T + 0.79, 0]} geometry={pcbGeo('joy:frame', { w: 1.6, d: 1.6, t: 0.04, r: 0.06, holes: [[0, 0, 0.64]] })} material={mat(METAL.nickel, 1, 0.3)} castShadow />
      <mesh
        geometry={mergedGeo('joy:frameSides', () => [-1, 1].flatMap((s) => [[unit(), [C[0] + s * 0.79, T + 0.48, 0], [0, 0, 0], [0.025, 0.66, 1.2]], [unit(), [C[0], T + 0.48, s * 0.79], [0, 0, 0], [1.2, 0.66, 0.025]]]))}
        material={mat(METAL.nickel, 1, 0.3)}
      />
      <TactSwitch pos={[C[0] - 1.0, T, 0.85]} size={0.45} cap="#e6e6e6" />
      <group ref={stick} position={[C[0], 1.15, 0]}>
        {/* rótula (cúpula preta que gira na abertura) e o veio */}
        <mesh position={[0, -0.12, 0]} geometry={geo('joy:ball', () => new THREE.SphereGeometry(0.62, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2))} material={mat('#1d1d1d', 0, 0.45)} castShadow />
        <mesh position={[0, 0.4, 0]} geometry={geo('joy:shaft', () => new THREE.CylinderGeometry(0.17, 0.2, 0.75, 16))} material={mat('#1a1a1a', 0, 0.5)} />
        <mesh geometry={capGeo()} material={mat('#1e1e1e', 0, 0.82)} castShadow />
        <mesh geometry={ribsGeo()} material={mat('#262626', 0, 0.75)} />
      </group>
    </group>
  )
}

// posição atual do manípulo vista de cima
function Overlay2D({ info, input }) {
  const x = input?.x ?? 0.5
  const y = input?.y ?? 0.5
  const [cx, cy] = info.project(C)
  const [px, py] = info.project([C[0] + (x - 0.5) * 1.4, 0, (y - 0.5) * 1.4])
  return (
    <g pointerEvents="none">
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
      <circle cx={px} cy={py} r={9} fill={input?.pressed ? '#ffb300' : '#ffffff'} fillOpacity={0.35} stroke="#fff" strokeWidth={1.5} />
    </g>
  )
}

export default { type: 'joystick', Model, Overlay2D }
