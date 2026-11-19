// Marcador rotativo de telefone (disco de 10 furos à moda dos telefones de baquelite): caixa
// preta com o aro cromado, placa de números branca, disco de dedos com os furos recortados
// que roda com live.angle, cartão do número ao centro e o batente de aço. No 2D: arraste um
// furo no sentido horário até ao batente e largue (ou simplesmente clique no furo) para marcar
// esse algarismo.
import { useRef as useRefR, useState } from 'react'
import { Cyl, Pcb, HeaderPins, geo, mat, useFrame, useRef, useMemo, THREE, liveOf, D2R } from '../kit.jsx'
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
// disco dos dedos: placa de policarbonato fumado/baquelite com os 10 furos e o furo central
// recortados de verdade (extrusão com furos), com o rebordo dos furos boleado
function wheelGeo() {
  return geo('dialWheel', () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, G.r - 0.025, 0, Math.PI * 2, false)
    DIALER_DIGITS.forEach((_, k) => {
      const a = rad(holeAngle(k))
      const p = new THREE.Path()
      // forma: x = x do mundo, y = −z (a malha deita-se com rotação −90° em x)
      p.absarc(G.ringR * Math.sin(a), G.ringR * Math.cos(a), G.holeR + 0.025, 0, Math.PI * 2, true)
      s.holes.push(p)
    })
    const ctr = new THREE.Path()
    ctr.absarc(0, 0, 1.175, 0, Math.PI * 2, true)
    s.holes.push(ctr)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 20 })
    g.translate(0, 0, 0.025)
    return g
  })
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
  const center = useMemo(centerTexture, [])
  useFrame(() => {
    if (wheel.current) wheel.current.rotation.y = -rad(liveOf(part.id)?.angle || 0)
  })
  const sa = rad(G.stopDeg)
  // batente do dedo: lâmina de aço curva (arco) que entra por cima do disco
  const stop = geo('dialStop', () => {
    const s = new THREE.Shape()
    s.moveTo(-0.07, 0)
    s.lineTo(0.07, 0)
    s.lineTo(0.07, 0.75)
    s.quadraticCurveTo(0.07, 1.0, -0.12, 1.05)
    s.lineTo(-0.12, 0.93)
    s.quadraticCurveTo(-0.07, 0.9, -0.07, 0.75)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false, curveSegments: 8 })
    g.translate(0, 0, -0.11)
    return g
  })
  return (
    <group>
      {/* caixa (baquelite) com o aro cromado e a placa de ligação com os 3 pinos */}
      <Cyl r={3.55} r2={3.62} h={0.6} pos={[0, 0.3, G.cz]} color="#141414" rough={0.3} seg={64} />
      <mesh position={[0, 0.62, G.cz]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dialBezel', () => new THREE.TorusGeometry(3.42, 0.06, 8, 64))} material={mat('#d4d8dc', 1, 0.2)} />
      <Cyl r={3.4} h={0.05} pos={[0, 0.625, G.cz]} color="#c9ccd0" metal={0.8} rough={0.35} seg={64} />
      <mesh position={[0, 0.66, G.cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[G.r, 64]} />
        <meshStandardMaterial map={plate} roughness={0.5} />
      </mesh>
      <group position={[0, 0.72, G.cz]}>
        {/* disco dos dedos (roda com live.angle): furos recortados */}
        <group ref={wheel}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={wheelGeo()} material={mat('#121212', 0.1, 0.18)} castShadow />
        </group>
        {/* cartão do número no centro, com o aro cromado */}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 48]} />
          <meshStandardMaterial map={center} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('dialCtrRing', () => new THREE.TorusGeometry(1.1, 0.04, 6, 40))} material={mat('#d4d8dc', 1, 0.2)} />
      </group>
      {/* batente do dedo (gancho de aço) preso no aro */}
      <group position={[(G.r + 0.12) * Math.sin(sa), 0.62, G.cz - (G.r + 0.12) * Math.cos(sa)]} rotation={[0, -sa + Math.PI / 2, 0]}>
        <Cyl r={0.06} h={0.3} pos={[0, 0.15, 0]} color="#c4c9ce" metal={0.9} rough={0.3} seg={10} />
        <mesh geometry={stop} material={mat('#d0d4d8', 0.9, 0.28)} rotation={[0, 0, Math.PI / 2]} position={[0, 0.32, 0]} castShadow />
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
