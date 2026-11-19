// GY-271 (HMC5883L / QMC5883L): placa azul quadrada de 14 mm com o magnetómetro LCC de
// 3 × 3 mm, condensadores, eixos X/Y serigrafados e 5 pinos; no 2D uma agulha mostra o
// norte magnético visto pelo sensor.
import { Chip, SilkText } from '../kit.jsx'
import { hmc5883l as dH, qmc5883l as dQ } from '@shared/parts/compass.js'
import { Breakout } from './_analogModule.jsx'

const T = 0.12
const board = { x: [-0.7, 0.7], z: [-0.7, 0.7], color: '#1f4fb4' }

function make(def, chip) {
  function Model({ part }) {
    return (
      <Breakout
        part={part}
        def={def}
        board={board}
        T={T}
        holes={[[-0.48, -0.48, 0.15], [0.48, -0.48, 0.15]]}
        led={[-0.55, 0.0]}
        passives={[[-0.33, 0.0, 'c'], [0.35, 0.0, 'c'], [0.3, -0.2, 'c', Math.PI / 2], [0, -0.52, 'c']]}
        silk={[{ text: 'GY-271', pos: [0, -0.64], w: 0.36, d: 0.1 }]}
        pinLabels={['VCC', 'GND', 'SCL', 'SDA', 'DRDY']}
      >
        <Chip pos={[0, T, -0.2]} size={[0.3, 0.09, 0.3]} pkg="qfn" n={4} label={chip === 'HMC5883L' ? 'L883' : 'DA5883'} />
        <SilkText lines={[{ text: 'X →', font: 'bold 36px Arial', x: 64, y: 32 }, { text: 'Y ↑', font: 'bold 36px Arial', x: 190, y: 32 }]} px={[256, 64]} pos={[0, T + 0.002, 0.02]} w={0.36} d={0.09} />
      </Breakout>
    )
  }
  function Overlay2D({ info, input, live }) {
    if (!live?.powered) return null
    const h = ((input?.value ?? 0) * Math.PI) / 180
    const [x, y] = info.project([0.1, 0, -0.15])
    // norte magnético a −rumo do eixo X (X para a direita no 2D, Z para baixo)
    const dx = Math.cos(-h) * 14
    const dy = Math.sin(-h) * 14
    return (
      <g pointerEvents="none">
        <line x1={x - dx * 0.5} y1={y - dy * 0.5} x2={x + dx} y2={y + dy} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" />
        <text x={x + dx * 1.35} y={y + dy * 1.35 + 3} textAnchor="middle" fontSize={9} fontWeight="700" fill="#ef4444">
          N
        </text>
      </g>
    )
  }
  return { type: def.type, Model, Overlay2D }
}

export const hmc5883l = make(dH, 'HMC5883L')
export const qmc5883l = make(dQ, 'QMC5883L')
