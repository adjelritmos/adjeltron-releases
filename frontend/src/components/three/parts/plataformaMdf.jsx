// Plataforma giratória do meArm em MDF: disco com furos e as duas placas laterais de pé, com o
// recorte dos servos SG90 deitados e os parafusos de latão das abas.
import { THREE } from '../kit.jsx'
import { Mdf, Screw, extrudeXY, extrudeXZ, holeCircle, holeRect } from './_mdfKit.jsx'
import { PMDF } from '@shared/parts/plataformaMdf.js'

const { T, R, zp, ys, plate, hornX } = PMDF
const SX = -hornX // centro do corpo do servo (x)

const disc = () =>
  extrudeXZ('platMdfDisc', T, () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, R, 0, Math.PI * 2, false)
    holeCircle(s, 0, 0, 0.3)
    for (let k = 0; k < 4; k++) holeCircle(s, Math.cos((k * Math.PI) / 2) * 0.6, Math.sin((k * Math.PI) / 2) * 0.6, 0.08)
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + (k * Math.PI) / 3
      if (Math.abs(Math.sin(a)) > 0.7) continue // por baixo das placas
      holeCircle(s, Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.18)
    }
    return s
  })

const side = () =>
  extrudeXY('platMdfSide', T, () => {
    const { x0, x1, top } = plate
    const y1 = ys + top
    const r = 1.0
    const s = new THREE.Shape()
    s.moveTo(x0, T)
    s.lineTo(x1, T)
    s.lineTo(x1, y1 - r)
    s.quadraticCurveTo(x1, y1, x1 - r, y1)
    s.lineTo(x0 + r, y1)
    s.quadraticCurveTo(x0, y1, x0, y1 - r)
    s.lineTo(x0, T)
    holeRect(s, SX - 1.2, ys - 0.66, SX + 1.2, ys + 0.66, 0.05)
    holeCircle(s, SX - 1.42, ys, 0.1)
    holeCircle(s, SX + 1.42, ys, 0.1)
    holeCircle(s, x0 + 0.6, T + 0.6, 0.15)
    holeCircle(s, x1 - 0.5, T + 0.6, 0.15)
    return s
  })

function Model({ part }) {
  const c = part.config || {}
  return (
    <group>
      <Mdf geometry={disc()} cfg={c} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Mdf geometry={side()} cfg={c} pos={[0, 0, s * zp]} />
          {/* parafusos das abas do servo (cabeça do lado de fora) */}
          {[-1.42, 1.42].map((dx) => (
            <Screw key={dx} pos={[SX + dx, ys, s * (zp + T / 2)]} axis={s < 0 ? '-z' : 'z'} len={T + 0.25} />
          ))}
          {/* cantoneiras de latão (parafuso + porca) entre a placa e o disco */}
          {[plate.x0 + 0.6, plate.x1 - 0.5].map((x) => (
            <Screw key={x} pos={[x, T + 0.6, s * (zp + T / 2)]} axis={s < 0 ? '-z' : 'z'} len={T + 0.2} />
          ))}
        </group>
      ))}
    </group>
  )
}

export default { type: 'plataformaMdf', Model }
