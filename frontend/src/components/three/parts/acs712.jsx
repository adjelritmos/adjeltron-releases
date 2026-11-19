// ACS712: placa vermelha de 31 × 13 mm com o chip SOIC-8 ACS712ELC, pistas largas de cobre
// até ao borne azul KF301 de 2 vias (5,08 mm, IP+/IP−), condensadores de filtro, LED de
// alimentação e 3 pinos (VCC OUT GND).
import { THREE, geo, mat, pcbMat, METAL, HeaderPins, liveOf } from '../kit.jsx'
import def from '@shared/parts/acs712.js'
import { Board, Chip, Passive, SmdLed, Silk, PinLabels } from './_analogModule.jsx'

const T = 0.16
const MARK = { '5A': '05B', '20A': '20A', '30A': '30A' }
// só os 3 pinos de cabeçalho (IP+/IP− são o borne)
const HDR = def.pins.filter((p) => !p.conn)

// perfil do borne KF301 (plano xy, frente em +x): parte de trás alta com os parafusos e
// frente rebaixada em rampa com as entradas dos fios; extrudido ao longo de z (10,16 mm)
const termGeo = () =>
  geo('kf301x2', () => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(0.75, 0)
    s.lineTo(0.75, 0.7)
    s.lineTo(0.58, 0.85)
    s.lineTo(0, 0.85)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 1.016, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }).translate(0, 0, -0.508)
  })

// borne de parafuso KF301-2P com a abertura dos fios virada para +x; x0 = face de trás
function ScrewTerminal({ x0, y }) {
  return (
    <group position={[x0, y, 0]}>
      <mesh castShadow receiveShadow geometry={termGeo()} material={mat('#1d6fd1', 0, 0.5)} />
      {[-0.254, 0.254].map((z) => (
        <group key={z}>
          {/* poço do parafuso e cabeça com fenda (aço niquelado) */}
          <mesh position={[0.3, 0.867, z]} geometry={geo('kfWell', () => new THREE.CircleGeometry(0.17, 18).rotateX(-Math.PI / 2))} material={mat('#0e2f5c', 0, 0.8)} />
          <mesh position={[0.3, 0.84, z]} geometry={geo('kfScrew', () => new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16))} material={mat(METAL.nickel, 1, 0.3)} />
          <mesh position={[0.3, 0.872, z]} rotation={[0, Math.PI / 4, 0]} geometry={geo('kfSlot', () => new THREE.BoxGeometry(0.26, 0.012, 0.04))} material={mat('#5b6066', 1, 0.5)} />
          {/* entrada do fio com a gaiola de aperto estanhada lá dentro */}
          <mesh position={[0.767, 0.6, z]} rotation={[0, Math.PI / 2, 0]} geometry={geo('kfHole', () => new THREE.PlaneGeometry(0.32, 0.3))} material={mat('#070707', 0, 0.9)} />
          <mesh position={[0.77, 0.5, z]} geometry={geo('kfCage', () => new THREE.BoxGeometry(0.008, 0.05, 0.26))} material={mat(METAL.tin, 1, 0.3)} />
        </group>
      ))}
    </group>
  )
}

function Model({ part }) {
  const rng = part.config?.range || '5A'
  return (
    <group>
      <Board x={[-1.55, 1.55]} z={[-0.675, 0.675]} t={T} color="#c62828" r={0.06} />
      {/* pistas largas de cobre (corrente) sob a máscara: ficam num vermelho mais claro */}
      {[-0.17, 0.17].map((z) => (
        <mesh key={z} position={[0.52, T + 0.001, z]} geometry={geo('acsTrace', () => new THREE.BoxGeometry(0.42, 0.002, 0.26))} material={pcbMat('#d94545')} />
      ))}
      <Chip pos={[0.1, T, 0]} size={[0.49, 0.17, 0.39]} label={`712${MARK[rng] || '05B'}`} />
      <Silk text={`ACS712ELC-${MARK[rng] || '05B'}`} pos={[-0.3, T + 0.003, -0.52]} w={1.0} d={0.14} />
      <Silk text="IP+  IP-" pos={[0.55, T + 0.003, 0.52]} w={0.5} d={0.12} />
      <Passive pos={[-0.55, T, -0.12]} kind="c" big />
      <Passive pos={[-0.55, T, 0.12]} kind="c" big />
      <Passive pos={[-0.6, T, 0.36]} kind="r" />
      <SmdLed pos={[-0.95, T, 0.45]} color="#ff3030" read={() => (liveOf(part.id)?.powered ? 1 : 0)} />
      <ScrewTerminal x0={0.625} y={T} />
      <PinLabels pins={HDR} y={T} w={0.3} d={0.12} />
      <HeaderPins pins={HDR} base={0} up={0.45} />
    </group>
  )
}
function Overlay2D({ info, live }) {
  if (!live?.powered) return null
  const [x, y] = info.project([0.1, 0, 0.45])
  return (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff" fontFamily="monospace" pointerEvents="none">
      {live.amps.toFixed(2)} A
    </text>
  )
}

export default { type: 'acs712', Model, Overlay2D }
