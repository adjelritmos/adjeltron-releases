// JSN-SR04T: placa de comando verde (41 × 28 mm) com transformador e cristal, e a sonda
// selada preta (Ø 23 mm) ligada por cabo, virada para cima.
import { Box, Cyl, Pcb, HeaderPins } from '../kit.jsx'
import def from '@shared/parts/jsnSr04t.js'
import { Silk, Smd, Ic } from './_groupG.jsx'

const T = 0.16

function Model() {
  return (
    <group>
      <Pcb size={[4.1, T, 2.8]} color="#1b5e20" />
      <Ic pos={[-0.4, T, 0.4]} size={[0.6, 0.15, 0.5]} />
      <Ic pos={[0.6, T, -0.5]} size={[0.5, 0.15, 0.4]} />
      {/* transformador e cristal */}
      <Box size={[0.8, 0.7, 0.8]} pos={[1.2, T + 0.35, 0.55]} color="#222" />
      <Box size={[0.5, 0.3, 0.2]} pos={[-0.6, T + 0.15, -0.6]} color="#c0c4c8" metal={0.8} rough={0.3} />
      {[[0, -1.0], [0.4, -1.0], [-1.2, 0.9], [0.4, 0.0]].map(([x, z], i) => (
        <Smd key={i} pos={[x, T, z]} />
      ))}
      <Silk text="JSN-SR04T" pos={[0.3, T + 0.003, 1.15]} w={1.6} h={0.24} />
      {/* conector da sonda e cabo */}
      <Box size={[0.5, 0.5, 0.7]} pos={[1.75, T + 0.25, -0.6]} color="#f2f2f2" />
      <Cyl r={0.12} h={1.6} pos={[2.75, 0.35, -0.6]} rot={[0, 0, Math.PI / 2]} color="#111" />
      {/* sonda (transdutor selado) */}
      <group position={[3.75, 0, 0]}>
        <Cyl r={1.15} h={0.25} pos={[0, 0.125, 0]} color="#151515" seg={40} />
        <Cyl r={0.98} h={1.2} pos={[0, 0.85, 0]} color="#1a1a1a" rough={0.5} seg={40} />
        <Cyl r={0.9} h={0.02} pos={[0, 1.46, 0]} color="#2d2d2d" rough={0.85} seg={40} />
      </group>
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

export default { type: 'jsnSr04t', Model }
