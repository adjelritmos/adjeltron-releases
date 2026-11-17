// Peças comuns dos sensores do grupo G (não é um componente): serigrafia, chips SMD,
// tampa de sensor e fábrica de modelos para os módulos I2C pequenos.
import { Box, Cyl, Pcb, HeaderPins, GlowLed, liveOf, useLabel } from '../kit.jsx'

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

// componente SMD (resistência/condensador 0805): corpo + terminais
export const Smd = ({ pos, color = '#222', rot = 0 }) => (
  <group position={pos} rotation={[0, rot, 0]}>
    <Box size={[0.2, 0.05, 0.12]} pos={[0, 0.025, 0]} color={color} />
    <Box size={[0.05, 0.055, 0.12]} pos={[-0.09, 0.027, 0]} color="#cfcfcf" metal={0.8} />
    <Box size={[0.05, 0.055, 0.12]} pos={[0.09, 0.027, 0]} color="#cfcfcf" metal={0.8} />
  </group>
)

// chip QFN/LGA preto (ou com tampa metálica)
export const Ic = ({ pos, size = [0.3, 0.08, 0.3], color = '#141414', metal = 0 }) => <Box size={size} pos={[pos[0], pos[1] + size[1] / 2, pos[2]]} color={color} metal={metal} rough={metal ? 0.3 : 0.5} />

// LED SMD de alimentação / estado
export const Led = ({ pos, color = '#ff3030', read }) => <GlowLed pos={[pos[0], pos[1] + 0.04, pos[2]]} size={[0.16, 0.08, 0.1]} color={color} read={read} />

// furos de montagem
export const Hole = ({ x, z, y, r = 0.15 }) => <Cyl r={r} h={0.02} pos={[x, y, z]} color="#c9a227" metal={0.8} rough={0.3} seg={16} />

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
        {reg && <Box size={[0.3, 0.1, 0.16]} pos={[board.x[0] + 0.45, T + 0.05, cz + 0.05]} color="#1a1a1a" />}
        {reg && <Smd pos={[board.x[0] + 0.45, T, cz + 0.3]} color="#c8a165" />}
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

// borne de parafuso azul de 2 vias (passo 5 mm) ao longo de z, centrado em (x, z), com
// a abertura dos fios virada para +x
export function ScrewTerminal({ x, z = 0, y, n = 2, pitch = 0.5 }) {
  const w = n * pitch
  return (
    <group position={[x, y, z]}>
      <Box size={[0.75, 0.85, w]} pos={[0, 0.425, 0]} color="#1565c0" rough={0.55} />
      {Array.from({ length: n }, (_, i) => {
        const zz = (i - (n - 1) / 2) * pitch
        return (
          <group key={i}>
            <Cyl r={0.15} h={0.04} pos={[-0.1, 0.86, zz]} color="#c0c4c8" metal={0.85} rough={0.3} seg={16} />
            <Box size={[0.04, 0.02, 0.22]} pos={[-0.1, 0.885, zz]} color="#555" />
            <Box size={[0.02, 0.3, 0.3]} pos={[0.38, 0.4, zz]} color="#0b0b0b" />
          </group>
        )
      })}
    </group>
  )
}
