// Humidade do solo capacitivo v1.2: placa preta comprida em ponta, linha branca de
// profundidade máxima, TLC555 + regulador no topo e conector de 3 pinos.
import { Box, HeaderPins, THREE, useMemo } from '../kit.jsx'
import def from '@shared/parts/soilCapacitive.js'
import { Silk, Smd, Ic } from './_groupG.jsx'

const T = 0.16

function Board() {
  // contorno: de x = −4,9 (conector) a +4,9 (ponta em bico)
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-4.9, -1.15)
    s.lineTo(3.9, -1.15)
    s.lineTo(4.9, 0)
    s.lineTo(3.9, 1.15)
    s.lineTo(-4.9, 1.15)
    s.closePath()
    return s
  }, [])
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, T, 0]} castShadow>
      <extrudeGeometry args={[shape, { depth: T, bevelEnabled: false }]} />
      <meshStandardMaterial color="#141414" roughness={0.55} />
    </mesh>
  )
}

function Model() {
  return (
    <group>
      <Board />
      {/* pista do elétrodo (sob o verniz) e linha de enterramento */}
      <Box size={[6.0, 0.01, 1.3]} pos={[1.0, T + 0.005, 0]} color="#1e1e1e" rough={0.3} />
      <Box size={[0.06, 0.012, 2.25]} pos={[-1.8, T + 0.006, 0]} color="#f2f2f2" />
      <Silk text="Capacitive Soil Moisture Sensor v1.2" pos={[1.2, T + 0.012, 0.85]} w={4.6} h={0.22} />
      <Ic pos={[-3.2, T, 0.25]} size={[0.5, 0.15, 0.4]} />
      <Box size={[0.3, 0.1, 0.16]} pos={[-3.2, T + 0.05, -0.55]} color="#1a1a1a" />
      {[[-2.5, -0.5], [-2.5, 0.2], [-2.5, 0.6], [-3.8, 0.7], [-3.8, -0.6]].map(([x, z], i) => (
        <Smd key={i} pos={[x, T, z]} color={i % 2 ? '#c8a165' : '#222'} />
      ))}
      <Silk text="GND VCC AOUT" pos={[-3.95, T + 0.012, 0]} w={1.6} h={0.16} rot={Math.PI / 2} />
      {/* conector JST de 3 vias por trás dos pinos */}
      <Box size={[0.5, 0.55, 1.0]} pos={[-4.55, T + 0.275, 0]} color="#f2f2f2" rough={0.6} />
      <HeaderPins pins={def.pins} base={T + 0.3} up={0.45} />
    </group>
  )
}

export default { type: 'soilCapacitive', Model }
