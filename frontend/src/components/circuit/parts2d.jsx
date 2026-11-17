// Desenhos SVG das peças "vivas" no editor 2D, ao estilo wokwi-elements (Velxio):
// LED 5 mm de lado (cúpula, aro, pernas) e servos com o braço a rodar.
// Os pinos ficam exatamente onde pins2dLocal os põe (o desenho é que se ajusta a eles).
import { useStore } from '../../contexts/store.js'
import { t } from '../../i18n/index.js'
import { DEFS, LED_COLORS, S2D, view2dInfo } from '@shared/components.js'

const mix = (hex, t, to = 255) => {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * t))
  return `rgb(${c.join(',')})`
}

// ---------- LED ----------
// pernas a terminar em (±5,08, 0); cúpula para cima (y negativo)
export const LED_HIT = { x: -14, y: -42, w: 28, h: 46 }
export function LedImage({ part }) {
  const tele = useStore((s) => s.telemetry)
  const mode = useStore((s) => s.mode)
  const l = mode === 'sim' ? tele?.leds?.find((x) => x.id === part.id) : null
  const b = l && !l.burned ? Math.min(1, l.b) : 0
  const c = LED_COLORS[part.config?.color]?.hex || '#ff2a2a'
  const id = `led-${part.id}`
  const p = 5.08
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1">
          <stop offset="0" stopColor={mix(c, 0.25 + b * 0.5)} />
          <stop offset="0.45" stopColor={b > 0.05 ? mix(c, 0.35 + b * 0.55) : c} />
          <stop offset="1" stopColor={mix(c, 0.35, 0)} />
        </linearGradient>
      </defs>
      {/* pernas: ânodo (esq.) mais comprido e dobrado, cátodo (dir.) direito */}
      <path d={`M ${-p} 0 L ${-p} -6 L -3 -9 L -3 -14`} fill="none" stroke="#9e9e9e" strokeWidth={1.6} strokeLinejoin="round" />
      <path d={`M ${p} 0 L ${p} -6 L 3 -9 L 3 -14`} fill="none" stroke="#9e9e9e" strokeWidth={1.6} strokeLinejoin="round" />
      {/* brilho */}
      {b > 0.03 && <circle cx={0} cy={-27} r={9 + b * 16} fill={c} opacity={Math.min(0.75, b * 0.8)} filter="url(#glow)" pointerEvents="none" />}
      {/* aro (com o lado plano do cátodo à direita) */}
      <path d="M -11.5 -14 L 10 -14 L 10 -18 L -11.5 -18 Z" fill={mix(c, 0.15, 0)} opacity={0.95} />
      {/* cúpula */}
      <path d="M -10 -18 L -10 -31 A 10 10 0 0 1 10 -31 L 10 -18 Z" fill={`url(#${id}-g)`} opacity={0.93} stroke={mix(c, 0.45, 0)} strokeWidth={0.6} />
      {/* reflexo e o "copo" interno (bigorna/poste) */}
      <path d="M -6.5 -20 L -6.5 -31 A 6.5 6.5 0 0 1 -2 -37" fill="none" stroke="#fff" strokeWidth={1.6} opacity={0.55} strokeLinecap="round" />
      <path d="M -3 -18 L -3 -24 M 3 -18 L 3 -22 L 0 -25" fill="none" stroke={mix(c, 0.55, 0)} strokeWidth={1} opacity={0.7} />
      {l?.burned && (
        <text x={0} y={-44} textAnchor="middle" fontSize={11}>
          💥
        </text>
      )}
    </g>
  )
}

// ---------- Servos ----------
const SERVO_DIMS = {
  servo: { L: 2.3, W: 1.22, hornX: 0.55, pinX: -2.3, color: '#2a62d8', label: 'SG90', arm: 1.6 },
  servoMG: { L: 4.07, W: 1.98, hornX: 1.0, pinX: -3.4, color: '#1c1c1c', label: 'MG996R', arm: 2.2, metal: true },
  // grupo G: MG90S (posicional) e FS90R (rotação contínua: ângulo em live.mountAngle)
  servoMG90: { L: 2.3, W: 1.22, hornX: 0.55, pinX: -2.3, color: '#1c1c1c', label: 'MG90S', arm: 1.6, metal: true },
  servoFS90R: { L: 2.3, W: 1.22, hornX: 0.55, pinX: -2.3, color: '#262626', label: 'FS90R', arm: 1.6, live: true },
  // pato robô: servo Feetech de barramento (comandado por impulsos no simulador)
  servoFeetech: { L: 2.9, W: 2.3, hornX: 0.55, pinX: -2.35, color: '#1a1a1a', label: 'FEETECH', arm: 1.0, metal: true },
}
export const hasServoImage = (type) => !!SERVO_DIMS[type]

export function ServoImage({ part }) {
  const d = SERVO_DIMS[part.type]
  const info = view2dInfo(part.type)
  const tele = useStore((s) => s.telemetry)
  const mode = useStore((s) => s.mode)
  const s = mode === 'sim' ? tele?.servos?.find((x) => x.id === part.id) : null
  const angle = d.live ? (mode === 'sim' ? tele?.live?.[part.id]?.mountAngle ?? 90 : 90) : s ? s.angle : 90
  const [cx, , cz] = info.center
  const X = (x) => (x - cx) * S2D
  const Z = (z) => (z - cz) * S2D
  const { L, W } = d
  const hx = X(d.hornX)
  const pins = DEFS[part.type].pins
  const P = pins.map((p) => [X(p.pos[0]), Z(p.pos[2])])
  const conX = X(d.pinX + 0.42)
  const body = mix(d.color, 0.18)
  const dark = mix(d.color, 0.35, 0)
  return (
    <g>
      {/* cabo castanho/vermelho/laranja até à ficha */}
      {P.map(([px, py], i) => (
        <path key={i} d={`M ${X(-L / 2 + 0.05)} ${(i - 1) * 4} C ${X(-L / 2 - 0.25)} ${(i - 1) * 4}, ${conX + 10} ${py}, ${conX} ${py}`} fill="none" stroke={['#6d4c41', '#e53935', '#fb8c00'][i]} strokeWidth={3} />
      ))}
      <rect x={P[0][0]} y={Z(-0.39)} width={conX - P[0][0]} height={Z(0.39) - Z(-0.39)} rx={2} fill="#151515" />
      {/* abas de fixação */}
      <rect x={X(-L / 2 - 0.5)} y={Z(-W / 2) + 2} width={X(L / 2 + 0.5) - X(-L / 2 - 0.5)} height={W * S2D - 4} rx={4} fill={dark} />
      {[-1, 1].map((k) => (
        <circle key={k} cx={X(k * (L / 2 + 0.27))} cy={0} r={0.1 * S2D + 1} fill="#0a0a0a" />
      ))}
      {/* corpo */}
      <rect x={X(-L / 2)} y={Z(-W / 2)} width={L * S2D} height={W * S2D} rx={5} fill={body} stroke={dark} strokeWidth={1} />
      <text x={X(-L / 2) + 6} y={Z(W / 2) - 5} fontSize={L > 3 ? 12 : 8} fontWeight="700" fill="#ffffffcc" fontFamily="Arial">
        {d.label}
      </text>
      {/* tampa das engrenagens */}
      <circle cx={X(d.hornX - W * 0.5)} cy={0} r={W * 0.26 * S2D} fill={mix(d.color, 0.3)} stroke={dark} strokeWidth={0.8} />
      <circle cx={hx} cy={0} r={W * 0.48 * S2D} fill={mix(d.color, 0.3)} stroke={dark} strokeWidth={0.8} />
      {/* braço (roda com o ângulo: 0° → +90° no ecrã, 180° → −90°, como no 3D) */}
      <g transform={`translate(${hx},0) rotate(${90 - angle})`} style={d.live ? undefined : { transition: 'transform 40ms linear' }}>
        <path
          d={`M -8 -6 L ${d.arm * S2D - 4} -4 A 4 4 0 0 1 ${d.arm * S2D - 4} 4 L -8 6 A 8 8 0 0 1 -8 -6 Z`}
          fill="#f5f5f5"
          stroke="#bdbdbd"
          strokeWidth={0.8}
        />
        {Array.from({ length: Math.round(d.arm * 2.5) }, (_, i) => (
          <circle key={i} cx={(0.45 + i * 0.35) * S2D} cy={0} r={1.4} fill="#9e9e9e" />
        ))}
        <circle r={0.34 * S2D} fill="#fafafa" stroke="#bdbdbd" strokeWidth={0.8} />
        <circle r={0.13 * S2D} fill={d.metal ? '#d4af37' : '#e0e0e0'} stroke="#9e9e9e" strokeWidth={0.6} />
      </g>
      {s && s.target != null && s.powered === false && (
        <g transform={`translate(${hx}, ${Z(-W / 2) - 4})`}>
          <rect x={-46} y={-14} width={92} height={15} rx={7} fill="#f59e0b" />
          <text textAnchor="middle" y={-3} fontSize={10} fontWeight="700" fill="#000">
            {t({ pt: 'sem alimentação', en: 'no power' })}
          </text>
        </g>
      )}
    </g>
  )
}
