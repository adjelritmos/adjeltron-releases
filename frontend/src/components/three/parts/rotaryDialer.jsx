// Marcador rotativo de telefone: caixa preta, placa de números branca e disco de dedos
// (com 10 furos) que roda com live.angle. No 2D: arraste um furo no sentido horário até
// ao batente e largue (ou simplesmente clique no furo) para marcar esse algarismo.
import { useRef as useRefR, useState } from 'react'
import { Box, Cyl, Pcb, HeaderPins, useFrame, useRef, useMemo, THREE, liveOf, D2R } from '../kit.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import def, { DIALER_GEOM as G, DIALER_DIGITS, holeAngle, holeTurn } from '@shared/parts/rotaryDialer.js'

const rad = (deg) => deg * D2R
// posição (vista de cima) do furo k com o disco rodado `rot` graus no sentido horário
const holeXZ = (k, rot = 0, r = G.ringR) => {
  const a = rad(holeAngle(k) + rot)
  return [r * Math.sin(a), G.cz - r * Math.cos(a)]
}

// textura da placa de números (fixa) e do disco (furos transparentes)
function plateTexture() {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 512 })
  const ctx = c.getContext('2d')
  const s = 256 / G.r
  ctx.fillStyle = '#f3efe4'
  ctx.beginPath()
  ctx.arc(256, 256, 250, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1b1b1b'
  ctx.font = 'bold 54px Georgia'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  DIALER_DIGITS.forEach((d, k) => {
    const a = rad(holeAngle(k))
    const r = G.ringR * s
    ctx.fillText(d, 256 + r * Math.sin(a), 256 - r * Math.cos(a))
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function wheelTexture() {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 512 })
  const ctx = c.getContext('2d')
  const s = 256 / G.r
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256)
  grad.addColorStop(0, '#3a3a3a')
  grad.addColorStop(1, '#151515')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(256, 256, 254, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  DIALER_DIGITS.forEach((_, k) => {
    const a = rad(holeAngle(k))
    ctx.beginPath()
    ctx.arc(256 + G.ringR * s * Math.sin(a), 256 - G.ringR * s * Math.cos(a), G.holeR * s, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.beginPath()
  ctx.arc(256, 256, 1.15 * s, 0, Math.PI * 2)
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function centerTexture() {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 })
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f3efe4'
  ctx.beginPath()
  ctx.arc(128, 128, 126, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b71c1c'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.fillStyle = '#b71c1c'
  ctx.font = 'bold 40px Georgia'
  ctx.textAlign = 'center'
  ctx.fillText('adjeltron', 128, 112)
  ctx.font = '30px Georgia'
  ctx.fillStyle = '#333'
  ctx.fillText('Tel. 112', 128, 160)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Model({ part }) {
  const wheel = useRef()
  const plate = useMemo(plateTexture, [])
  const disk = useMemo(wheelTexture, [])
  const center = useMemo(centerTexture, [])
  useFrame(() => {
    if (wheel.current) wheel.current.rotation.y = -rad(liveOf(part.id)?.angle || 0)
  })
  const sa = rad(G.stopDeg)
  return (
    <group>
      {/* caixa (baquelite) e placa de ligação com os 3 pinos */}
      <Cyl r={3.55} h={0.6} pos={[0, 0.3, G.cz]} color="#141414" rough={0.35} seg={64} />
      <Cyl r={3.4} h={0.05} pos={[0, 0.625, G.cz]} color="#c9ccd0" metal={0.8} rough={0.35} seg={64} />
      <mesh position={[0, 0.66, G.cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[G.r, 64]} />
        <meshStandardMaterial map={plate} roughness={0.5} />
      </mesh>
      <group position={[0, 0.8, G.cz]}>
        <group ref={wheel}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[G.r, 64]} />
            <meshStandardMaterial map={disk} transparent alphaTest={0.5} side={THREE.DoubleSide} roughness={0.25} metalness={0.2} />
          </mesh>
        </group>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 48]} />
          <meshStandardMaterial map={center} roughness={0.5} />
        </mesh>
      </group>
      {/* batente do dedo (gancho de metal) */}
      <group position={[(G.r + 0.05) * Math.sin(sa), 0.9, G.cz - (G.r + 0.05) * Math.cos(sa)]} rotation={[0, -sa, 0]}>
        <Box size={[0.12, 0.28, 0.9]} pos={[0, 0, 0.25]} color="#d0d4d8" metal={0.85} rough={0.3} />
      </group>
      <Pcb size={[1.6, 0.16, 0.75]} pos={[0, 0, 3.6]} color="#1f5f2f" holes={false} />
      <HeaderPins pins={def.pins} base={0} up={0.45} />
    </group>
  )
}

// disco interativo no 2D
function Overlay2D({ part, info, live }) {
  const g = useRefR(null)
  const [drag, setDrag] = useState(null) // { k, a0, rot }
  const [cx, cy] = info.project([0, 0, G.cz])
  const S = info.project([1, 0, G.cz])[0] - cx // px por cm
  const rot = drag ? drag.rot : live?.angle || 0
  const local = (e) => {
    const svg = g.current?.ownerSVGElement
    if (!svg) return [0, 0]
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(g.current.getScreenCTM().inverse())
    return [p.x, p.y]
  }
  const angAt = (e) => {
    const [x, y] = local(e)
    return (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI
  }
  const busy = !!live?.dialing
  const down = (k) => (e) => {
    e.stopPropagation()
    if (busy) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ k, a0: angAt(e), rot: 0, moved: false })
  }
  const move = (e) => {
    if (!drag) return
    let d = angAt(e) - drag.a0
    d = ((d % 360) + 360) % 360
    if (d > 345 && drag.rot < 30) d = 0 // a voltar para trás do ponto de partida
    setDrag({ ...drag, rot: Math.min(holeTurn(drag.k), d), moved: drag.moved || d > 8 })
  }
  const up = () => {
    if (!drag) return
    const k = drag.k
    // dial completo (até ao batente) ou simples clique
    if (!drag.moved || drag.rot >= holeTurn(k) - 12) {
      setInput(part.id, { key: DIALER_DIGITS[k] })
      setTimeout(() => releaseButtons(), 120)
    }
    setDrag(null)
  }
  const r = G.r * S
  return (
    <g ref={g} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      {/* placa de números */}
      <circle cx={cx} cy={cy} r={r} fill="#f3efe4" stroke="#999" strokeWidth={1} />
      {DIALER_DIGITS.map((d, k) => {
        const [x, z] = holeXZ(k)
        const [px, py] = info.project([x, 0, z])
        return (
          <text key={d} x={px} y={py + 6} textAnchor="middle" fontSize={17} fontWeight="700" fontFamily="Georgia" fill="#1b1b1b" pointerEvents="none">
            {d}
          </text>
        )
      })}
      {/* disco dos dedos (roda) com furos */}
      <defs>
        <mask id={`dial-${part.id}`}>
          <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill="#fff" />
          {DIALER_DIGITS.map((d, k) => {
            const [x, z] = holeXZ(k, rot)
            const [px, py] = info.project([x, 0, z])
            return <circle key={d} cx={px} cy={py} r={G.holeR * S} fill="#000" />
          })}
          <circle cx={cx} cy={cy} r={1.15 * S} fill="#000" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#1c1c1c" mask={`url(#dial-${part.id})`} pointerEvents="none" />
      <circle cx={cx} cy={cy} r={1.1 * S} fill="#f3efe4" stroke="#b71c1c" strokeWidth={2} pointerEvents="none" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontFamily="Georgia" fill="#b71c1c" pointerEvents="none">
        {live?.number ? live.number.slice(-8) : 'adjeltron'}
      </text>
      {/* zonas clicáveis dos furos (rodam com o disco) */}
      {DIALER_DIGITS.map((d, k) => {
        const [x, z] = holeXZ(k, drag?.k === k ? rot : busy ? rot : 0)
        const [px, py] = info.project([x, 0, z])
        return <circle key={d} cx={px} cy={py} r={G.holeR * S} fill="#fff" fillOpacity={0.001} stroke={drag?.k === k ? '#ffb300' : 'none'} strokeWidth={2} style={{ cursor: busy ? 'wait' : 'grab' }} onPointerDown={down(k)} />
      })}
      {/* batente */}
      {(() => {
        const a = rad(G.stopDeg)
        const [px, py] = info.project([(G.r - 0.25) * Math.sin(a), 0, G.cz - (G.r - 0.25) * Math.cos(a)])
        return <circle cx={px} cy={py} r={5} fill="#d0d4d8" stroke="#555" pointerEvents="none" />
      })()}
      {live?.dialing && (
        <text x={cx} y={cy - r - 8} textAnchor="middle" fontSize={12} fontWeight="700" fill="#ffb300" stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
          a marcar {live.digit}…
        </text>
      )}
    </g>
  )
}

export default { type: 'rotaryDialer', Model, Overlay2D }
