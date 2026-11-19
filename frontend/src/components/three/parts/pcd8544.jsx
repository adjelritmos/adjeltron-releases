// LCD Nokia 5110: placa vermelha, moldura metálica e o vidro do LCD com fundo cinzento-esverdeado.
// Pontos escuros com o contraste (live.contrast); com BL a HIGH a luz de fundo fica azulada.
import { SCREEN_TINT, Pcb, HeaderPins, GlowLed, liveOf, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import def, { PCD_ACT as A, PCD_FRAME as F } from '@shared/parts/pcd8544.js'
import { rectOf } from './_groupA.jsx'
import { screen, b64bytes, MountHoles, SolderPads, SmdParts, GlassSheen, PinLabels } from './_gDisplays.jsx'

const W = 84
const H = 48
const scr = screen({
  key: (e, L) => (L ? `${L.powered}|${L.on}|${L.ver}|${L.inv}|${L.contrast}|${L.bl}` : ''),
  draw(e, L) {
    const ctx = e.view.getContext('2d')
    const bl = !!L?.bl
    ctx.fillStyle = bl ? '#b9d7f2' : '#a9b49c'
    ctx.fillRect(0, 0, W, H)
    if (!L?.powered || !L.on || !L.fb) return
    const c = L.contrast ?? 40
    // contraste: < ~30 quase invisível, 45–70 bom, > 80 o fundo também escurece
    const ink = Math.max(0.05, Math.min(1, (c - 10) / 35))
    const bg = Math.max(0, Math.min(0.8, (c - 75) / 45))
    if (bg > 0) {
      ctx.fillStyle = `rgba(20,28,40,${bg})`
      ctx.fillRect(0, 0, W, H)
    }
    const bytes = b64bytes(L.fb)
    ctx.fillStyle = `rgba(16,22,34,${ink})`
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let on = (bytes[y * 11 + (x >> 3)] >> (7 - (x & 7))) & 1
        if (L.inv) on ^= 1
        if (on) ctx.fillRect(x, y, 1, 1)
      }
  },
})

// placa vermelha de 43,6 × 43,1 mm: moldura de chapa estanhada com patilhas, vidro do LCD,
// 4 LEDs brancos da luz de fundo junto à moldura (acendem com BL), fila de 8 pinos em cima e a
// fila alternativa de 8 furos em baixo, serigrafia "1 RST … 8 GND"
const NAMES = ['RST', 'CE', 'DC', 'Din', 'Clk', 'Vcc', 'BL', 'Gnd']
function Model({ part }) {
  const tex = scr.useTex(part.id, W, H)
  const fw = F.x[1] - F.x[0]
  const fd = F.z[1] - F.z[0]
  const fz = (F.z[0] + F.z[1]) / 2
  const T = 0.16
  const top = 0.56
  const bl = () => (liveOf(part.id)?.bl && liveOf(part.id)?.powered ? 1 : 0)
  return (
    <group>
      <Pcb size={[4.36, T, 4.31]} color="#b71c1c" holes={false} />
      <MountHoles pts={[[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]} y={T} r={0.13} ring={0.22} />
      {/* moldura metálica (laterais e rebordo com a janela) */}
      <mesh position={[0, T + (top - T) / 2, fz]} scale={[fw, top - T, fd]} geometry={geo('gull', () => new THREE.BoxGeometry(1, 1, 1))} material={mat('#c3c7cb', 1, 0.32)} castShadow receiveShadow />
      <mesh position={[0, top + 0.001, fz]} rotation={[-Math.PI / 2, 0, 0]} scale={[fw - 0.08, fd - 0.08, 1]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} material={mat('#aeb3b8', 1, 0.42)} />
      {/* vidro do LCD (polarizador cinzento-esverdeado) dentro da janela */}
      <mesh position={[(A.x[0] + A.x[1]) / 2, top + 0.003, (A.z[0] + A.z[1]) / 2 - 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[A.x[1] - A.x[0] + 0.26, A.z[1] - A.z[0] + 0.36, 1]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} material={mat('#8f9a86', 0, 0.3)} />
      <mesh position={[(A.x[0] + A.x[1]) / 2, top + 0.005, (A.z[0] + A.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[A.x[1] - A.x[0], A.z[1] - A.z[0]]} />
        <meshBasicMaterial map={tex} color={SCREEN_TINT} toneMapped={false} />
      </mesh>
      <GlassSheen w={A.x[1] - A.x[0] + 0.26} d={A.z[1] - A.z[0] + 0.36} pos={[(A.x[0] + A.x[1]) / 2, top + 0.008, (A.z[0] + A.z[1]) / 2 - 0.05]} />
      {/* patilhas da moldura dobradas para a placa */}
      <mesh
        geometry={mergedGeo('pcdTabs', () =>
          [-1, 1].flatMap((sx) => [
            [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [sx * 1.4, T + 0.2, F.z[1] + 0.03], [0, 0, 0], [0.3, 0.42, 0.06]],
            [geo('gull', () => new THREE.BoxGeometry(1, 1, 1)), [sx * 1.4, T + 0.2, F.z[0] - 0.03], [0, 0, 0], [0.3, 0.42, 0.06]],
          ]),
        )}
        material={mat('#b9bdc2', 1, 0.35)}
      />
      {/* LEDs brancos da luz de fundo, encostados à guia de luz no bordo de cima da moldura */}
      {[-1.15, -0.5, 0.5, 1.15].map((x) => [x, F.z[0] - 0.14]).map(([x, z], i) => (
        <GlowLed key={i} pos={[x, T + 0.035, z]} size={[0.2, 0.07, 0.12]} color="#cfe6ff" read={bl} halo={0.5} />
      ))}
      <SmdParts list={[[0, F.z[0] - 0.14, 0, 'R']]} y={T} />
      {/* fila de 8 furos alternativa (em baixo) e serigrafia dos pinos */}
      <SolderPads pts={def.pins.map((p) => [p.pos[0], 1.95])} y={T} r={0.09} blob={false} square0 />
      <mesh position={[0, T + 0.004, 1.95]} rotation={[-Math.PI / 2, 0, 0]} geometry={mergedGeo('pcdHoles', () => def.pins.map((p) => [geo('pcdHole', () => new THREE.CircleGeometry(0.05, 12)), [p.pos[0], 0, 0]]))} material={mat('#050505', 0, 0.9)} />
      <PinLabels xs={def.pins.map((p) => p.pos[0])} names={NAMES} z={-1.6} y={T + 0.002} h={0.1} />
      <HeaderPins pins={def.pins} base={0} />
    </group>
  )
}

function Overlay2D({ part, info, live }) {
  const url = scr.useUrl(part.id, W, H, live)
  if (!live?.powered) return null
  const r = rectOf(info, A.x[0], A.z[0], A.x[1], A.z[1])
  return <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
}

export default { type: 'pcd8544', Model, Overlay2D }
