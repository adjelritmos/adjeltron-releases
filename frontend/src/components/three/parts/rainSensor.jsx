// Sensor de chuva FC-37: módulo LM393 azul + placa coletora com pistas entrelaçadas
// (ligada por 2 fios). A água na placa aparece como gotas.
import { Box, Cyl, useCanvasTexture, liveOf, inputOf, useFrame, useRef } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/rainSensor.js'

const PX = [2.5, 7.9] // placa coletora em x
const PZ = [-2.0, 2.0]

function drawTraces(ctx, w, h) {
  ctx.fillStyle = '#123a8a'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#d8d2c0'
  ctx.lineWidth = 9
  // dois pentes entrelaçados
  ctx.beginPath()
  ctx.moveTo(40, 30)
  ctx.lineTo(40, h - 30)
  ctx.moveTo(w - 40, 30)
  ctx.lineTo(w - 40, h - 30)
  for (let k = 0, y = 45; y < h - 40; y += 26, k++) {
    if (k % 2) {
      ctx.moveTo(40, y)
      ctx.lineTo(w - 80, y)
    } else {
      ctx.moveTo(80, y)
      ctx.lineTo(w - 40, y)
    }
  }
  ctx.stroke()
}

const DROPS = Array.from({ length: 24 }, (_, i) => [PX[0] + 0.5 + ((i * 37) % 47) / 10, PZ[0] + 0.4 + ((i * 53) % 33) / 10, 0.08 + ((i * 7) % 5) / 40])

function Plate({ part }) {
  const tex = useCanvasTexture(drawTraces, ['rain'], 512, 384)
  const drops = useRef([])
  useFrame(() => {
    const v = (inputOf(part.id).value ?? 0) / 100
    drops.current.forEach((m, i) => m && (m.visible = !!liveOf(part.id) && i < v * DROPS.length))
  })
  const cx = (PX[0] + PX[1]) / 2
  return (
    <group>
      <Box size={[PX[1] - PX[0], 0.16, PZ[1] - PZ[0]]} pos={[cx, 0.08, 0]} color="#123a8a" />
      <mesh position={[cx, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PX[1] - PX[0] - 0.1, PZ[1] - PZ[0] - 0.1]} />
        <meshStandardMaterial map={tex} roughness={0.45} metalness={0.2} />
      </mesh>
      {DROPS.map(([x, z, r], i) => (
        <mesh key={i} ref={(m) => (drops.current[i] = m)} position={[x, 0.17, z]} scale={[1, 0.35, 1]} visible={false}>
          <sphereGeometry args={[r, 12, 8]} />
          <meshStandardMaterial color="#bfe3ff" transparent opacity={0.7} roughness={0.05} />
        </mesh>
      ))}
      {/* 2 pinos da placa e fios ao módulo */}
      {[-0.13, 0.13].map((z, i) => (
        <group key={z}>
          <Box size={[0.25, 0.25, 0.25]} pos={[PX[0] + 0.25, 0.29, z]} color="#111" />
          <Cyl r={0.04} h={1.1} pos={[1.95, 0.32, z]} rot={[0, 0, Math.PI / 2]} color={i ? '#1a1a1a' : '#d32f2f'} />
        </group>
      ))}
    </group>
  )
}

export default makeModuleUI({
  type: 'rainSensor',
  def,
  board: { x: [-1.7, 1.6], z: [-0.75, 0.75], color: '#1d4ed8' },
  pot: [-0.35, -0.25],
  chip: [0.55, 0.33],
  leds: { pwr: [0.8, -0.45], dout: [1.1, -0.45] },
  Extra: Plate,
})
