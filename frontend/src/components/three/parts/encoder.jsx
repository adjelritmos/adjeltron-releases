// Codificador rotativo KY-040: o botão roda com a posição (20 passos/volta) e desce ao premir.
// No 2D: clicar no botão prime SW; a roda do rato sobre o botão roda um passo.
import { Box, Cyl, Pcb, HeaderPins, inputOf, useFrame, useRef } from '../kit.jsx'
import { setInput } from '../../../services/simControl.js'
import def from '@shared/parts/encoder.js'

const K = [0.3, 0, 0] // eixo do botão
const STEP = (2 * Math.PI) / 20

function Model({ part }) {
  const knob = useRef()
  useFrame(() => {
    const i = inputOf(part.id)
    if (!knob.current) return
    knob.current.rotation.y = -(Math.round(+i.value || 0) * STEP)
    knob.current.position.y = i.pressed ? 1.12 : 1.2
  })
  return (
    <group>
      <Pcb size={[2.6, 0.16, 1.9]} pos={[0.05, 0, 0]} color="#1a2b5c" />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
      {[-0.35, 0, 0.35].map((z) => (
        <Box key={z} size={[0.2, 0.06, 0.12]} pos={[-0.55, 0.19, z]} color="#222" />
      ))}
      <Box size={[1.25, 0.65, 1.25]} pos={[K[0], 0.485, 0]} color="#b9bcc0" metal={0.8} rough={0.35} />
      <Cyl r={0.36} h={0.4} pos={[K[0], 1.0, 0]} color="#c9a227" metal={0.8} rough={0.3} />
      <group ref={knob} position={[K[0], 1.2, 0]}>
        <Cyl r={0.75} h={1.2} pos={[0, 0.6, 0]} color="#2a2a2a" rough={0.5} seg={20} />
        <Cyl r={0.68} h={0.02} pos={[0, 1.21, 0]} color="#3a3a3a" rough={0.4} seg={32} />
        <Box size={[0.08, 0.03, 0.55]} pos={[0, 1.225, -0.35]} color="#fff" />
      </group>
    </group>
  )
}

function Overlay2D({ part, info, input }) {
  const [cx, cy] = info.project(K)
  const r = info.project([K[0] + 0.75, 0, 0])[0] - cx
  const a = Math.round(+input?.value || 0) * STEP
  const turn = (d) => {
    const ia = def.interactive
    const v = Math.max(ia.min, Math.min(ia.max, Math.round(+input?.value || 0) + d))
    setInput(part.id, { value: v })
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={input?.pressed ? '#6b5a22' : '#2a2a2a'}
        stroke="#444"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          setInput(part.id, { pressed: true })
        }}
        onPointerUp={() => setInput(part.id, { pressed: false })}
        onWheel={(e) => {
          e.stopPropagation()
          turn(e.deltaY < 0 ? 1 : -1)
        }}
      />
      {/* marca branca do botão (rodado como no 3D, visto de cima) */}
      <line x1={cx} y1={cy} x2={cx + Math.sin(a) * r * 0.85} y2={cy - Math.cos(a) * r * 0.85} stroke="#fff" strokeWidth={3} strokeLinecap="round" pointerEvents="none" />
    </g>
  )
}

export default { type: 'encoder', Model, Overlay2D }
