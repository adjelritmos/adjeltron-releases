// Micro servos do grupo G com o corpo do SG90: MG90S (preto, engrenagens metálicas) e
// FS90R (rotação contínua: o braço segue live.mountAngle). O 2D é desenhado em parts2d.jsx.
import { ServoBody } from '../models.jsx'
import { liveOf } from '../kit.jsx'

const DIMS = { L: 2.3, H: 2.27, W: 1.22, hornX: 0.55, tabY: 1.6, pinX: -2.3 }

export default [
  { type: 'servoMG90', Model: ({ part }) => <ServoBody part={part} dims={{ ...DIMS, color: '#1c1c1c', label: 'MG90S', metalGear: true }} /> },
  {
    type: 'servoFS90R',
    Model: ({ part }) => <ServoBody part={part} dims={{ ...DIMS, color: '#262626', label: 'FS90R', angleOf: (id) => liveOf(id)?.mountAngle ?? 90 }} />,
    Overlay2D: ({ info, live }) => {
      if (!live) return null
      const [x, y] = info.project([0.55, 0, -1.2])
      const rpm = live.rpm || 0
      return (
        <text x={x} y={y - 6} textAnchor="middle" fontSize={10} fontWeight="700" fill={Math.abs(rpm) > 1 ? '#22c55e' : '#9ca3af'} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">
          {Math.abs(rpm) > 1 ? `${rpm > 0 ? '↻' : '↺'} ${Math.abs(rpm).toFixed(0)} rpm` : 'parado'}
        </text>
      )
    },
  },
]
