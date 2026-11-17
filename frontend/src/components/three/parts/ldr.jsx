// LDR de 5 mm: disco cerâmico com a pista de CdS em zigue-zague.
import { Cyl, Leg, PITCH, useCanvasTexture } from '../kit.jsx'

function drawFace(ctx, w, h) {
  ctx.fillStyle = '#efe4c4'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#c4572a'
  ctx.lineWidth = w * 0.07
  ctx.beginPath()
  const n = 6
  for (let i = 0; i <= n; i++) {
    const y = h * (0.18 + (0.64 * i) / n)
    ctx.lineTo(i % 2 ? w * 0.2 : w * 0.8, y)
    if (i < n) ctx.lineTo(i % 2 ? w * 0.2 : w * 0.8, h * (0.18 + (0.64 * (i + 1)) / n))
  }
  ctx.stroke()
}

function Model() {
  const tex = useCanvasTexture(drawFace, [], 128, 128)
  return (
    <group>
      {[-0.5, 0.5].map((k) => (
        <Leg key={k} from={[k * PITCH, 0, 0]} to={[k * 0.14, 0.46, 0]} />
      ))}
      <Cyl r={0.26} h={0.18} pos={[0, 0.55, 0]} color="#d8cba4" rough={0.5} />
      <mesh position={[0, 0.645, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <circleGeometry args={[0.24, 32]} />
        <meshStandardMaterial map={tex} roughness={0.3} />
      </mesh>
    </group>
  )
}

export default { type: 'ldr', Model }
