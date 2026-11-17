// Peças de interface partilhadas pelos componentes do grupo C (sobreposições 2D).

// etiqueta arredondada por cima da peça (mesmo estilo das do editor 2D)
export function Badge({ info, text, color = '#f5f5f5', dy = 0 }) {
  const w = Math.max(48, String(text).length * 6.6 + 14)
  const dark = color !== '#f5f5f5'
  return (
    <g transform={`translate(0, ${-info.h / 2 - 12 + dy})`} pointerEvents="none">
      <rect x={-w / 2} y={-9} width={w} height={17} rx={8} fill={color} opacity={0.94} />
      <text textAnchor="middle" y={4} fontSize={11} fill={dark ? '#fff' : '#0a0a0a'} fontWeight="700">
        {text}
      </text>
    </g>
  )
}

// brilho de um LED na vista 2D, na posição local [x, y, z] (cm)
export function Glow2D({ info, pos, color, on, r = 5 }) {
  if (!on) return null
  const [x, y] = info.project(pos)
  return <circle cx={x} cy={y} r={r} fill={color} opacity={0.85} filter="url(#glow)" pointerEvents="none" />
}

export const Boom = ({ info }) => (
  <text y={-info.h / 2 - 6} textAnchor="middle" fontSize={13} pointerEvents="none">
    💥
  </text>
)

// formata com vírgula decimal
export const fmt = (v, d = 1) => Number(v || 0).toFixed(d).replace('.', ',')
