// Peças comuns dos sensores do grupo G (não é um componente): serigrafia, passivos 0805,
// chips QFN/LGA, SOT-23, LED SMD, furos metalizados, borne KF301 e fábrica de modelos para os
// módulos I2C pequenos (placa com regulador 662K, condensadores e pull-ups).
import { Pcb, HeaderPins, GlowLed, liveOf, useLabel, THREE, geo, mat, mergedGeo, METAL } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// texto branco impresso na placa (plano horizontal)
export function Silk({ text, pos, w, h, color = '#fff', rot = 0 }) {
  // canvas com a proporção do rótulo; letra a ~75 % da altura, reduzida se o texto não couber
  const ch = Math.max(16, Math.round(512 * (h / w)))
  const size = Math.min(Math.round(ch * 0.78), Math.floor((512 / Math.max(1, text.length)) * 1.6))
  const tex = useLabel([{ text, font: `bold ${size}px Arial` }], 512, ch)
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, rot]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent color={color} />
    </mesh>
  )
}

const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// componente SMD (resistência/condensador 0805, 2 × 1,25 mm): corpo cerâmico e terminais
// estanhados que envolvem as pontas, assentes em almofadas
export const Smd = ({ pos, color = '#222', rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <mesh position={[0, 0.026, 0]} geometry={geo('g0805Body', () => new RoundedBoxGeometry(0.14, 0.05, 0.12, 1, 0.006))} material={mat(color, 0, 0.55)} castShadow />
    <mesh geometry={mergedGeo('g0805Ends', () => [-1, 1].flatMap((k) => [
      [unitBox(), [k * 0.085, 0.027, 0], [0, 0, 0], [0.04, 0.054, 0.124]],
      [unitBox(), [k * 0.09, 0.004, 0], [0, 0, 0], [0.07, 0.008, 0.14]],
    ]))} material={mat(METAL.tin, 1, 0.28)} />
  </group>
)

// chip QFN/LGA preto (ou com tampa metálica): corpo e as almofadas à volta na base
export const Ic = ({ pos, size = [0.3, 0.08, 0.3], color = '#141414', metal = 0 }) => {
  const [w, h, d] = size
  const pads = mergedGeo(`gIcPads${w},${d}`, () => {
    const out = []
    const n = Math.max(2, Math.round(Math.min(w, d) / 0.05) - 1)
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * 0.8
      for (const s of [-1, 1]) {
        out.push([unitBox(), [t * w, 0.006, s * (d / 2 + 0.004)], [0, 0, 0], [0.022, 0.012, 0.03]])
        out.push([unitBox(), [s * (w / 2 + 0.004), 0.006, t * d], [0, 0, 0], [0.03, 0.012, 0.022]])
      }
    }
    return out
  })
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} geometry={geo(`gIc${w},${h},${d}`, () => new RoundedBoxGeometry(w, h, d, 1, Math.min(0.01, h / 3)))} material={mat(color, metal, metal ? 0.3 : 0.45)} castShadow />
      <mesh geometry={pads} material={mat(METAL.tin, 1, 0.3)} />
      {!metal && <mesh position={[-w / 2 + 0.05, h + 0.001, -d / 2 + 0.05]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('gIcDot', () => new THREE.CircleGeometry(0.018, 10))} material={mat('#3a3a3a', 0, 0.9)} />}
    </group>
  )
}

// LED SMD 0805 de alimentação / estado: almofadas estanhadas e o LED que acende
export const Led = ({ pos, color = '#ff3030', read }) => (
  <group>
    <mesh position={[pos[0], pos[1] + 0.004, pos[2]]} geometry={mergedGeo('gLedPads', () => [-1, 1].map((k) => [unitBox(), [k * 0.075, 0, 0], [0, 0, 0], [0.05, 0.008, 0.12]]))} material={mat(METAL.tin, 1, 0.3)} />
    <GlowLed pos={[pos[0], pos[1] + 0.04, pos[2]]} size={[0.16, 0.07, 0.1]} color={color} read={read} />
  </group>
)

// furo de montagem metalizado: anel dourado (ENIG) e o furo escuro
export const Hole = ({ x, z, y, r = 0.15 }) => (
  <group position={[x, y, z]}>
    <mesh geometry={geo(`gHoleRing${r}`, () => new THREE.RingGeometry(r * 0.6, r, 20).rotateX(-Math.PI / 2))} material={mat(METAL.gold, 1, 0.3)} />
    <mesh position={[0, 0.0005, 0]} geometry={geo(`gHoleIn${r}`, () => new THREE.CircleGeometry(r * 0.6, 16).rotateX(-Math.PI / 2))} material={mat('#060606', 0, 0.9)} />
  </group>
)

// regulador SOT-23 (2,9 × 1,3 mm, 3 pernas em asa de gaivota)
const sot23Legs = () =>
  mergedGeo('gSot23Legs', () =>
    [[-0.095, -1], [0.095, -1], [0, 1]].flatMap(([x, s]) => [
      [unitBox(), [x, 0.05, s * 0.085], [0, 0, 0], [0.04, 0.015, 0.05]],
      [unitBox(), [x, 0.028, s * 0.11], [0, 0, 0], [0.04, 0.045, 0.015]],
      [unitBox(), [x, 0.007, s * 0.13], [0, 0, 0], [0.04, 0.014, 0.05]],
    ]),
  )
export const Sot23 = ({ pos }) => (
  <group position={pos}>
    <mesh position={[0, 0.065, 0]} geometry={geo('gSot23', () => new RoundedBoxGeometry(0.29, 0.1, 0.16, 1, 0.01))} material={mat('#171717', 0, 0.45)} castShadow />
    <mesh geometry={sot23Legs()} material={mat(METAL.tin, 1, 0.3)} />
  </group>
)

/**
 * Módulo I2C pequeno (placa colorida, pinos numa fila, chip do sensor, regulador, LED de alimentação).
 * o: { def, board: { x: [x0,x1], z: [z0,z1], color }, label: { text, pos: [x, z], w, h }, Sensor (componente), holes: [[x,z]…], led: [x,z] }
 */
export function i2cModuleUI({ def, board, label, Sensor, holes = [], led, reg = true }) {
  const T = 0.12
  const cx = (board.x[0] + board.x[1]) / 2
  const cz = (board.z[0] + board.z[1]) / 2
  function Model({ part }) {
    return (
      <group>
        <Pcb size={[board.x[1] - board.x[0], T, board.z[1] - board.z[0]]} pos={[cx, 0, cz]} color={board.color} holes={false} />
        {holes.map(([x, z], i) => (
          <Hole key={i} x={x} z={z} y={T + 0.002} />
        ))}
        {/* regulador 662K (SOT-23) com os condensadores cerâmicos e as resistências de pull-up do I2C */}
        {reg && <Sot23 pos={[board.x[0] + 0.45, T, cz + 0.05]} />}
        {reg && <Smd pos={[board.x[0] + 0.45, T, cz + 0.3]} color="#c8a165" />}
        {reg && <Smd pos={[board.x[0] + 0.45, T, cz - 0.2]} color="#c8a165" />}
        <Smd pos={[cx + 0.3, T, board.z[0] + 0.25]} />
        <Smd pos={[cx - 0.3, T, board.z[0] + 0.25]} />
        {led && <Led pos={[led[0], T, led[1]]} read={() => (liveOf(part.id)?.powered ? 1 : 0)} />}
        {label && <Silk text={label.text} pos={[label.pos[0], T + 0.002, label.pos[1]]} w={label.w} h={label.h} />}
        {Sensor && <Sensor part={part} T={T} />}
        <HeaderPins pins={def.pins} base={0} up={0.45} />
      </group>
    )
  }
  return { type: def.type, Model }
}

// borne de parafuso azul de 2 vias (KF301, passo 5 mm) ao longo de z, centrado em (x, z), com
// a abertura dos fios virada para +x: corpo com o topo em rampa para a frente, parafusos de
// cabeça com fenda dentro dos poços, bocas dos fios com o grampo metálico à vista
const termGeo = (w) =>
  geo(`gTerm${w}`, () => {
    const s = new THREE.Shape()
    s.moveTo(-0.375, 0)
    s.lineTo(0.375, 0)
    s.lineTo(0.375, 0.62)
    s.lineTo(0.2, 0.85)
    s.lineTo(-0.375, 0.85)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: w - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 })
    g.translate(0, 0, -(w - 0.03) / 2)
    g.computeVertexNormals()
    return g
  })
export function ScrewTerminal({ x, z = 0, y, n = 2, pitch = 0.5 }) {
  const w = n * pitch
  const zs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch)
  return (
    <group position={[x, y, z]}>
      <mesh geometry={termGeo(w)} material={mat('#1565c0', 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={mergedGeo(`gTermWell${n},${pitch}`, () => zs.map((zz) => [geo('gTermWellG', () => new THREE.RingGeometry(0.13, 0.18, 20).rotateX(-Math.PI / 2)), [-0.1, 0.8515, zz]]))} material={mat('#0b2a55', 0, 0.8)} />
      <mesh geometry={mergedGeo(`gTermScrew${n},${pitch}`, () => zs.map((zz) => [geo('gTermHead', () => new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16)), [-0.1, 0.83, zz]]))} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh geometry={mergedGeo(`gTermSlot${n},${pitch}`, () => zs.map((zz) => [unitBox(), [-0.1, 0.852, zz], [0, 0.6, 0], [0.04, 0.008, 0.24]]))} material={mat('#3a3d42', 1, 0.5)} />
      <mesh geometry={mergedGeo(`gTermMouth${n},${pitch}`, () => zs.map((zz) => [unitBox(), [0.392, 0.36, zz], [0, 0, 0], [0.006, 0.3, 0.3]]))} material={mat('#050505', 0, 0.9)} />
      <mesh geometry={mergedGeo(`gTermClamp${n},${pitch}`, () => zs.map((zz) => [unitBox(), [0.396, 0.47, zz], [0, 0, 0], [0.006, 0.05, 0.26]]))} material={mat(METAL.nickel, 1, 0.35)} />
    </group>
  )
}
