// GPS GY-GPS6MV2: placa azul de 36 × 26 mm com 4 furos de 3 mm metalizados, módulo u-blox NEO-6M
// (16 × 12,2 mm: lata metálica gravada sobre a placa acastelada), conector u.FL,
// pilha de backup recarregável, LED de posição (PPS) e a antena cerâmica de
// 25 × 25 × 4 mm (elemento de prata com os cantos chanfrados e o pino de alimentação) colada por cima.
import { Box, RBox, Cyl, HeaderPins, useCanvasTexture, GlowLed, liveOf, geo, mat, METAL, THREE } from '../kit.jsx'
import { PcbPlate, Smds } from './_boardKit.jsx'
import def from '@shared/parts/gpsNeo6m.js'
import { Glow2D } from './group-c-ui.jsx'

const L = 3.6
const D = 2.6
const T = 0.16
const BY = 0.0
const TOP = BY + T
const PX = 110
const LED = [-1.25, TOP + 0.04, 1.0]
const HOLES = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [sx * (L / 2 - 0.25), sz * (D / 2 - 0.25), 0.15])
const SMDS = [[-1.25, 0.75, 0, 'r'], [-1.0, 1.15, 0, 'C'], [-0.15, -1.15, 0, 'c']]
// elemento radiante de prata da antena (quadrado com dois cantos opostos chanfrados: polarização circular)
const patchGeo = () =>
  geo('gpsPatch', () => {
    const a = 0.7
    const c = 0.14
    const sh = new THREE.Shape()
    sh.moveTo(-a + c, -a)
    sh.lineTo(a, -a)
    sh.lineTo(a, a - c)
    sh.lineTo(a - c, a)
    sh.lineTo(-a, a)
    sh.lineTo(-a, -a + c)
    sh.closePath()
    return new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2)
  })

function Model({ part }) {
  const silk = useCanvasTexture(
    (ctx) => {
      const at = (x, z) => [(x + L / 2) * PX, (z + D / 2) * PX]
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 13px Arial'
      for (const p of def.pins) {
        const [x, y] = at(p.pos[0] + 0.2, p.pos[2])
        ctx.fillText(p.id, x, y)
      }
      ctx.font = 'bold 10px Arial'
      const [tx, ty] = at(-1.3, -1.12)
      ctx.fillText('GY-GPS6MV2', tx, ty)
    },
    ['gps6m'],
    Math.round(L * PX),
    Math.round(D * PX),
  )
  const top = useCanvasTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#5a5a5a'
      ctx.textAlign = 'center'
      ctx.font = 'bold 30px Arial'
      ctx.fillText('u-blox', w / 2, h / 2 - 14)
      ctx.font = 'bold 26px Arial'
      ctx.fillText('NEO-6M-0-001', w / 2, h / 2 + 24)
    },
    ['gps-can'],
    256,
    128,
  )
  return (
    <group>
      <PcbPlate id="gps6m" w={L} d={D} t={T} y={BY} r={0.08} holes={HOLES} color="#1f4fb5" />
      <mesh position={[0, TOP + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, D]} />
        <meshBasicMaterial map={silk} transparent />
      </mesh>
      {/* módulo NEO-6M: placa acastelada verde + lata metálica gravada, visível à esquerda da antena */}
      <Box size={[1.22, 0.08, 1.6]} pos={[-0.9, TOP + 0.04, -0.15]} color="#1b5e33" rough={0.5} />
      <RBox size={[1.14, 0.18, 1.52]} r={0.02} pos={[-0.9, TOP + 0.17, -0.15]} color={METAL.nickel} metal={1} rough={0.32} />
      <mesh position={[-0.85, TOP + 0.262, -0.15]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[1.5, 0.75]} />
        <meshBasicMaterial map={top} transparent />
      </mesh>
      {/* conector u.FL da antena e passivos (o regulador fica por baixo) */}
      <Cyl r={0.1} h={0.1} pos={[-0.45, TOP + 0.05, -1.1]} color={METAL.gold} metal={1} rough={0.3} seg={14} />
      <Cyl r={0.04} h={0.11} pos={[-0.45, TOP + 0.06, -1.1]} color="#e8e1d0" seg={10} />
      <Smds id="gps6m" y={TOP} items={SMDS} />
      {/* pilha de backup recarregável (botão de 6,8 mm, soldada pelas patilhas) */}
      <Cyl r={0.28} h={0.14} pos={[-0.6, TOP + 0.09, 0.98]} color="#c8cbcf" metal={1} rough={0.3} seg={24} />
      <Cyl r={0.21} h={0.02} pos={[-0.6, TOP + 0.165, 0.98]} color="#b4b8bd" metal={1} rough={0.35} seg={24} />
      <Box size={[0.75, 0.02, 0.12]} pos={[-0.6, TOP + 0.03, 0.98]} color={METAL.tin} metal={1} rough={0.3} />
      {/* antena cerâmica 25 × 25 × 4 mm à direita: fita adesiva, cerâmica bege, elemento de prata e pino */}
      <Box size={[1.9, 0.04, 1.9]} pos={[0.72, TOP + 0.02, 0]} color="#e9e5da" rough={0.8} />
      <RBox size={[1.8, 0.36, 1.8]} r={0.04} pos={[0.72, TOP + 0.22, 0]} color="#d9c9a0" rough={0.85} />
      <mesh position={[0.72, TOP + 0.402, 0]} geometry={patchGeo()} material={mat('#d7d9db', 1, 0.32)} />
      <Cyl r={0.06} h={0.03} pos={[0.92, TOP + 0.41, 0.2]} color={METAL.tin} metal={1} rough={0.25} seg={12} />
      <GlowLed pos={LED} color="#2f9bff" read={() => (liveOf(part.id)?.pps ? 1 : 0)} />
      <HeaderPins pins={def.pins} base={TOP} />
    </group>
  )
}

function Overlay2D({ info, live }) {
  return <Glow2D info={info} pos={LED} color="#2f9bff" on={!!live?.pps} r={4} />
}

export default { type: 'gpsNeo6m', Model, Overlay2D }
