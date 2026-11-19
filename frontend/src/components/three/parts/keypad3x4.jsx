// Teclado de membrana 3×4 com fita e conector de 7 pinos. As teclas do 2D são clicáveis.
import { membraneModel } from './keypad4x4.jsx'
import { setInput, releaseButtons } from '../../../services/simControl.js'
import def, { KEYPAD3_KEYS as KEYS, KEYPAD3_GEOM as G } from '@shared/parts/keypad3x4.js'

const PAD = { x: [-2.7, 2.7], z: [-4.6, 2.85] }
const keyColor = (k) => (/[*#]/.test(k) ? '#1e88e5' : '#f2f2f2')

// membrana, teclas almofadadas, fita e ficha de 7 vias (mesmo desenho do teclado 4×4)
const Model = membraneModel({ keys: KEYS, G, PAD, keyColor, pins: def.pins, texW: 540, texH: 745, cable: { z: 4.65 } })

function Overlay2D({ part, info, input }) {
  const down = (k) => (e) => {
    e.stopPropagation()
    setInput(part.id, { key: k })
  }
  const up = () => releaseButtons()
  return (
    <g>
      {KEYS.map((row, r) =>
        row.map((k, c) => {
          const [x0, y0] = info.project([G.colX[c] - G.w / 2, 0, G.rowZ[r] - G.d / 2])
          const [x1, y1] = info.project([G.colX[c] + G.w / 2, 0, G.rowZ[r] + G.d / 2])
          const on = input?.key === k
          return (
            <rect key={k} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={6} fill={on ? '#000' : '#fff'} fillOpacity={on ? 0.45 : 0.001} stroke={on ? '#ffb300' : 'none'} strokeWidth={2} style={{ cursor: 'pointer' }} onPointerDown={down(k)} onPointerUp={up} onPointerLeave={() => on && up()} />
          )
        }),
      )}
    </g>
  )
}

export default { type: 'keypad3x4', Model, Overlay2D }
