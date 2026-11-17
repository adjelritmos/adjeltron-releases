// Interruptor DIP de 8 vias (DIP-16). ON = alavanca para cima (−z). No 2D clica-se nos interruptores.
import { Box, Leg, useCanvasTexture, useFrame, useRef, liveOf } from '../kit.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import def, { DIP_X } from '@shared/parts/dipSwitch8.js'
import { rectOf } from './_groupA.jsx'

const BODY = { w: 2.1, d: 1.0, y0: 0.1, h: 0.5 }
const WELL = { w: 0.16, d: 0.5 }
const SL = 0.2 // comprimento da alavanca
const slZ = (on) => (on ? -1 : 1) * (WELL.d / 2 - SL / 2)
const TOP = BODY.y0 + BODY.h

const stateOf = (part, live) => {
  if (live?.sw) return live.sw
  const s = String(part.config?.on || '')
  return Array.from({ length: 8 }, (_, i) => s[i] === '1')
}

function drawFace(ctx, w, h) {
  const sx = w / BODY.w
  const sz = h / BODY.d
  ctx.fillStyle = '#c62828'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(0.17 * sz)}px Arial`
  ctx.fillText('ON', (DIP_X(0) - 0.05 + BODY.w / 2) * sx, 0.1 * sz)
  ctx.font = `bold ${Math.round(0.16 * sz)}px Arial`
  for (let i = 0; i < 8; i++) {
    const x = (DIP_X(i) + BODY.w / 2) * sx
    ctx.fillStyle = '#3a0c0c'
    ctx.fillRect(x - (WELL.w / 2) * sx, (BODY.d / 2 - WELL.d / 2) * sz, WELL.w * sx, WELL.d * sz)
    ctx.fillStyle = '#fff'
    ctx.fillText(String(i + 1), x, (BODY.d - 0.11) * sz)
  }
}

function Model({ part }) {
  const tex = useCanvasTexture(drawFace, [], 420, 200)
  const sl = useRef([])
  useFrame(() => {
    const s = stateOf(part, liveOf(part.id))
    sl.current.forEach((m, i) => m && (m.position.z = slZ(s[i])))
  })
  const init = stateOf(part, null)
  return (
    <group>
      {def.pins.map((p) => (
        <Leg key={p.id} from={p.pos} to={[p.pos[0], BODY.y0 + 0.1, p.pos[2]]} r={0.03} />
      ))}
      <Box size={[BODY.w, BODY.h, BODY.d]} pos={[0, BODY.y0 + BODY.h / 2, 0]} color="#c62828" rough={0.6} />
      <mesh position={[0, TOP + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BODY.w, BODY.d]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={(m) => (sl.current[i] = m)} position={[DIP_X(i), TOP + 0.04, slZ(init[i])]}>
          <boxGeometry args={[WELL.w * 0.85, 0.08, SL]} />
          <meshStandardMaterial color="#f4f4f4" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Overlay2D({ part, info, live, input }) {
  const s = stateOf(part, live)
  const down = (n) => (e) => {
    e.stopPropagation()
    setInput(part.id, { key: String(n) })
  }
  const up = () => releaseButtons()
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const x = DIP_X(i)
        const well = rectOf(info, x - WELL.w / 2, -WELL.d / 2, x + WELL.w / 2, WELL.d / 2)
        const z = slZ(s[i])
        const k = rectOf(info, x - WELL.w * 0.42, z - SL / 2, x + WELL.w * 0.42, z + SL / 2)
        const hit = rectOf(info, x - 0.125, -BODY.d / 2, x + 0.125, BODY.d / 2)
        const on = input?.key === String(i + 1)
        return (
          <g key={i} style={{ cursor: 'pointer' }} onPointerDown={down(i + 1)} onPointerUp={up} onPointerLeave={() => on && up()}>
            <rect x={hit.x} y={hit.y} width={hit.w} height={hit.h} fill="#fff" fillOpacity={0.001} stroke={on ? '#ffb300' : 'none'} strokeWidth={1.5} />
            <rect x={well.x} y={well.y} width={well.w} height={well.h} fill="#3a0c0c" />
            <rect x={k.x} y={k.y} width={k.w} height={k.h} fill="#f4f4f4" />
          </g>
        )
      })}
    </g>
  )
}

export default { type: 'dipSwitch8', Model, Overlay2D }
