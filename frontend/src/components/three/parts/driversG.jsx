// Drivers do grupo G, iguais às placas comerciais:
// - DRV8825 (placa Pololu roxa de 0,6" × 0,8"): dissipador de alumínio colado sobre o CI,
//   trimmer de limite de corrente, resistências de medida "R100", condensadores SMD e os nomes
//   dos pinos serigrafados junto a cada pino;
// - TB6612FNG (placa vermelha de 0,8" × 0,8"): CI SSOP-24 ao centro, condensadores de 10 µF e
//   0,1 µF e a serigrafia dos pinos.
// Barras de pinos macho por baixo (espaçador preto e pinos dourados com a solda por cima).
import { THREE, geo, mat, mergedGeo, pcbMat, Chip, Smd, SilkText, METAL } from '../kit.jsx'
import drvDef from '@shared/parts/drv8825.js'
import tbDef from '@shared/parts/tb6612.js'

const PCB_Y = 0.35
const T = 0.16
const TOP = PCB_Y + T
const unitBox = () => geo('gull', () => new THREE.BoxGeometry(1, 1, 1))

// pinos, espaçadores e soldas das duas filas (geometria em cache por placa)
function Header({ def, w }) {
  const rows = [...new Set(def.pins.map((p) => p.pos[2]))]
  const plastic = mergedGeo(`drvHdrB${def.type}`, () => rows.map((z) => [unitBox(), [0, PCB_Y - 0.125, z], [0, 0, 0], [w, 0.25, 0.25]]))
  const pins = mergedGeo(`drvHdrP${def.type}`, () =>
    def.pins.flatMap((p) => [
      [unitBox(), [p.pos[0], (p.pos[1] + TOP + 0.05) / 2, p.pos[2]], [0, 0, 0], [0.064, TOP + 0.05 - p.pos[1], 0.064]],
    ]),
  )
  const solder = mergedGeo(`drvHdrS${def.type}`, () =>
    def.pins.flatMap((p) => [
      [geo('drvPad', () => new THREE.CylinderGeometry(0.085, 0.085, 0.01, 14)), [p.pos[0], TOP + 0.005, p.pos[2]]],
      [geo('drvFillet', () => new THREE.CylinderGeometry(0.04, 0.08, 0.05, 12)), [p.pos[0], TOP + 0.03, p.pos[2]]],
    ]),
  )
  return (
    <group>
      <mesh geometry={plastic} material={mat('#141414', 0, 0.5)} castShadow receiveShadow />
      <mesh geometry={pins} material={mat(METAL.gold, 1, 0.25)} />
      <mesh geometry={solder} material={mat(METAL.tin, 1, 0.25)} />
    </group>
  )
}

// serigrafia de toda a placa: nomes dos pinos junto a cada pino e o título
function boardSilk(def, W, D, labels, title, extra = []) {
  const px = [512, Math.round((512 * D) / W)]
  const X = (x) => (x / W + 0.5) * px[0]
  const Z = (z) => (z / D + 0.5) * px[1]
  const lines = def.pins.map((p, i) => ({ text: labels[i], font: 'bold 19px Arial', x: X(p.pos[0]), y: Z(p.pos[2] * 0.72) }))
  if (title) lines.push({ text: title.text, font: title.font, x: X(title.x), y: Z(title.z) })
  return { lines: lines.concat(extra.map((e) => ({ ...e, x: X(e.x), y: Z(e.z) }))), px }
}

// dissipador de 9 × 9 × 5 mm colado: base, alhetas (numa só malha) e almofada térmica
const sinkGeo = () =>
  mergedGeo('drvSink', () => [
    [unitBox(), [0, 0.06, 0], [0, 0, 0], [0.9, 0.12, 0.9]],
    ...Array.from({ length: 6 }, (_, i) => [unitBox(), [0, 0.12 + 0.2, -0.4 + i * 0.16], [0, 0, 0], [0.9, 0.4, 0.07]]),
  ])

const DRV_LBL = ['EN', 'M0', 'M1', 'M2', 'RST', 'SLP', 'STP', 'DIR', 'VMT', 'GND', 'B2', 'B1', 'A1', 'A2', 'FLT', 'GND']
function DrvModel() {
  const silk = boardSilk(drvDef, 2.03, 1.52, DRV_LBL, { text: 'DRV8825', font: 'bold 26px Arial', x: -0.62, z: 0.22 })
  return (
    <group>
      <Header def={drvDef} w={2.03} />
      <mesh position={[0, PCB_Y + T / 2, 0]} geometry={geo('drvPcb', () => new THREE.BoxGeometry(2.03, T, 1.52))} material={pcbMat('#4b237a')} castShadow receiveShadow />
      <SilkText lines={silk.lines} px={silk.px} pos={[0, TOP + 0.001, 0]} w={2.03} d={1.52} />
      {/* almofada térmica cinzenta e dissipador de alumínio sobre o CI */}
      <mesh position={[0.25, TOP + 0.01, 0]} geometry={unitBox()} scale={[0.86, 0.02, 0.86]} material={mat('#8f9499', 0, 0.8)} />
      <mesh position={[0.25, TOP + 0.02, 0]} geometry={sinkGeo()} material={mat('#c9cdd2', 1, 0.36)} castShadow />
      {/* trimmer do limite de corrente: corpo bege e rotor metálico com fenda em cruz */}
      <mesh position={[-0.6, TOP + 0.04, -0.15]} geometry={unitBox()} scale={[0.32, 0.08, 0.32]} material={mat('#d9cfb8', 0, 0.55)} castShadow />
      <mesh position={[-0.6, TOP + 0.1, -0.15]} geometry={geo('drvPotRot', () => new THREE.CylinderGeometry(0.13, 0.13, 0.05, 20))} material={mat(METAL.nickel, 1, 0.3)} />
      <mesh position={[-0.6, TOP + 0.126, -0.15]} rotation={[0, Math.PI / 4, 0]} geometry={mergedGeo('drvPotX', () => [[unitBox(), [0, 0, 0], [0, 0, 0], [0.2, 0.01, 0.035]], [unitBox(), [0, 0, 0], [0, 0, 0], [0.035, 0.01, 0.2]]])} material={mat('#3a3d42', 1, 0.5)} />
      {/* resistências de medida (R100) e condensadores 0805 */}
      <Smd pos={[-0.78, TOP, 0.32]} len={0.32} wid={0.16} h={0.055} />
      <Smd pos={[-0.36, TOP, 0.32]} len={0.32} wid={0.16} h={0.055} />
      <SilkText lines={[{ text: 'R100', font: 'bold 30px Arial' }]} px={[128, 48]} pos={[-0.78, TOP + 0.057, 0.32]} w={0.16} d={0.06} color="#e8e8e8" />
      <SilkText lines={[{ text: 'R100', font: 'bold 30px Arial' }]} px={[128, 48]} pos={[-0.36, TOP + 0.057, 0.32]} w={0.16} d={0.06} color="#e8e8e8" />
      <Smd pos={[-0.86, TOP, -0.2]} rotY={Math.PI / 2} color="#b98a5a" />
      <Smd pos={[-0.32, TOP, -0.2]} rotY={Math.PI / 2} color="#b98a5a" />
      <Smd pos={[0.85, TOP, 0.42]} color="#b98a5a" />
    </group>
  )
}

const TB_LBL = ['PWMA', 'AIN2', 'AIN1', 'STBY', 'BIN1', 'BIN2', 'PWMB', 'GND', 'VM', 'VCC', 'GND', 'A01', 'A02', 'B02', 'B01', 'GND']
function TbModel() {
  const silk = boardSilk(tbDef, 2.03, 2.03, TB_LBL, { text: 'TB6612FNG', font: 'bold 30px Arial', x: 0, z: 0.42 }, [{ text: 'MOTOR DRIVER', font: 'bold 18px Arial', z: -0.42, x: 0 }])
  return (
    <group>
      <Header def={tbDef} w={2.03} />
      <mesh position={[0, PCB_Y + T / 2, 0]} geometry={geo('tbPcb', () => new THREE.BoxGeometry(2.03, T, 2.03))} material={pcbMat('#c0262d')} castShadow receiveShadow />
      <SilkText lines={silk.lines} px={silk.px} pos={[0, TOP + 0.001, 0]} w={2.03} d={2.03} />
      {/* CI SSOP-24 (TB6612FNG) e condensadores: 2 × 10 µF (1206) e 0,1 µF (0805) */}
      <Chip pos={[0, TOP, 0]} size={[0.78, 0.13, 0.44]} pkg="soic" n={12} label="TB6612" />
      <Smd pos={[-0.72, TOP, 0]} rotY={Math.PI / 2} len={0.32} wid={0.16} h={0.1} color="#c9a46a" />
      <Smd pos={[0.72, TOP, 0]} rotY={Math.PI / 2} len={0.32} wid={0.16} h={0.1} color="#c9a46a" />
      <Smd pos={[0.5, TOP, -0.3]} color="#b98a5a" />
    </group>
  )
}

function TbOverlay({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0, 0, 0])
  return (
    <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={live.hot ? '#f87171' : '#fff'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
      {live.hot ? 'QUENTE' : live.stby ? `A ${live.out?.[0] ?? 0}V B ${live.out?.[1] ?? 0}V` : 'STBY'}
    </text>
  )
}

export default [
  { type: 'drv8825', Model: DrvModel, Overlay2D: ({ info, live }) => (live?.enabled ? <text x={info.project([0, 0, 0])[0]} y={info.project([0, 0, 0])[1] + 4} textAnchor="middle" fontSize={9} fill="#fff" stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">{`1/${live.micro}`}</text> : null) },
  { type: 'tb6612', Model: TbModel, Overlay2D: TbOverlay },
]
