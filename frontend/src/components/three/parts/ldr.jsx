// LDR GL5528 de 5 mm: pastilha cerâmica branca (Ø 5,1 mm com dois lados planos, 2 mm de
// espessura); no topo, os dois elétrodos metálicos em pente entrelaçados deixam entre eles a
// pista de CdS cor de laranja em zigue-zague; tudo coberto por uma camada de epóxi transparente
// e brilhante. Pernas finas e compridas.
import { THREE, geo, mat, PITCH, useCanvasTexture } from '../kit.jsx'
import { Wires } from './_dip.jsx'

const R = 0.255
const FLAT = 0.215 // meia largura entre os lados planos
const Y = 0.46 // base da pastilha
const T = 0.2

function drawFace(ctx, w, h) {
  // fundo de CdS (laranja-acastanhado)
  ctx.fillStyle = '#c2582a'
  ctx.fillRect(0, 0, w, h)
  // elétrodos em pente (prateado-acinzentado) a partir dos dois lados; o espaço entre os
  // dedos é a pista de CdS em zigue-zague
  ctx.fillStyle = '#b9bcbf'
  const n = 7
  const g = h * 0.075 // largura da pista
  const pitch = (h * 0.84) / n
  ctx.fillRect(0, 0, w * 0.13, h)
  ctx.fillRect(w * 0.87, 0, w * 0.13, h)
  for (let i = 0; i < n; i++) {
    const y = h * 0.08 + i * pitch
    const fh = pitch - g
    if (i % 2) ctx.fillRect(w * 0.13, y + g / 2, w * 0.74 - g, fh)
    else ctx.fillRect(w * 0.13 + g, y + g / 2, w * 0.74 - g, fh)
  }
  // orla cerâmica branca à volta
  ctx.strokeStyle = '#efe9dc'
  ctx.lineWidth = w * 0.09
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2)
  ctx.stroke()
}

// pastilha: círculo cortado por dois lados planos (paralelos às pernas), arestas boleadas
const pillGeo = () =>
  geo('ldrPill', () => {
    const s = new THREE.Shape()
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2
      const x = Math.max(-FLAT, Math.min(FLAT, (R - 0.015) * Math.cos(a)))
      const z = (R - 0.015) * Math.sin(a)
      if (i === 0) s.moveTo(x, z)
      else if (i < 48) s.lineTo(x, z)
    }
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: T - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, Y + 0.015, 0)
    g.computeVertexNormals()
    return g
  })

function Model() {
  const tex = useCanvasTexture(drawFace, [], 128, 128)
  return (
    <group>
      <Wires id="ldrLegs" r={0.022} lines={[-0.5, 0.5].map((k) => [[k * PITCH, 0, 0], [k * PITCH, 0.3, 0], [k * 0.14, Y - 0.04, 0], [k * 0.14, Y + 0.02, 0]])} />
      <mesh geometry={pillGeo()} material={mat('#efe9dc', 0, 0.5)} castShadow receiveShadow />
      {/* face sensível (lê-se de cima) e camada de epóxi transparente */}
      <mesh position={[0, Y + T + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.23, 32]} />
        <meshStandardMaterial map={tex} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, Y + T + 0.001, 0]} geometry={geo('ldrCoat', () => new THREE.SphereGeometry(0.235, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.06, 1))} material={mat('#ffffff', 0, 0.05, { transparent: true, opacity: 0.18, depthWrite: false })} />
    </group>
  )
}

export default { type: 'ldr', Model }
