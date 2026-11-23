// Campo numérico (HeroUI Input) que aceita vírgula OU ponto como separador decimal, em qualquer
// idioma do browser. O NumberInput da HeroUI interpreta o separador pelo locale: em inglês
// "9,5" vira 95 e em pt-BR "9.5" vira 95 — e depois corta ao máximo (ex.: a fonte ficava a 30 V).
// Aqui o texto só é aplicado ao confirmar (Enter ou sair do campo), limitado a [min, max];
// ↑/↓ somam/subtraem um passo.
import { useEffect, useState } from 'react'
import { Input } from '@heroui/react'

// "1,5" "1.5" " 2 " "1e3" → número; texto inválido → NaN. Com vírgula E ponto ("1.234,5" ou
// "1,234.5") o último é o decimal e o outro é separador de milhares.
export function parseNum(text) {
  let t = String(text ?? '').trim().replace(/\s/g, '')
  if (!t) return NaN
  const c = t.lastIndexOf(',')
  const d = t.lastIndexOf('.')
  if (c >= 0 && d >= 0) t = c > d ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (c >= 0) t = t.replace(',', '.')
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN
}

const decimals = (step) => String(step ?? 1).split('.')[1]?.length ?? 0
export const fmtNum = (v, step) => {
  if (!Number.isFinite(v)) return ''
  const r = Number(v.toFixed(Math.max(decimals(step), 0) + 3))
  return String(r)
}

export function NumField({ label, value, onChange, min = -Infinity, max = Infinity, step = 1, unit, isDisabled, size = 'sm', className, ariaLabel, endContent, ...rest }) {
  const [text, setText] = useState(fmtNum(Number(value), step))
  const [focus, setFocus] = useState(false)
  // valor mudado por fora (outro painel, desfazer…): atualiza o texto se não estiver a ser editado
  useEffect(() => {
    if (!focus) setText(fmtNum(Number(value), step))
  }, [value, step, focus])
  const clamp = (v) => Math.min(max, Math.max(min, v))
  const commit = (t = text) => {
    const v = parseNum(t)
    if (!Number.isFinite(v)) return setText(fmtNum(Number(value), step))
    const c = clamp(v)
    setText(fmtNum(c, step))
    if (c !== Number(value)) onChange(c)
  }
  const bump = (dir) => {
    const cur = parseNum(text)
    const base = Number.isFinite(cur) ? cur : Number(value) || 0
    const v = clamp(Number((base + dir * step).toFixed(decimals(step) + 3)))
    setText(fmtNum(v, step))
    onChange(v)
  }
  const outOfRange = (() => {
    const v = parseNum(text)
    return Number.isFinite(v) && (v < min || v > max)
  })()
  return (
    <Input
      {...rest}
      size={size}
      variant="bordered"
      label={label}
      aria-label={ariaLabel || label}
      className={className}
      isDisabled={isDisabled}
      inputMode="decimal"
      value={text}
      onValueChange={setText}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false)
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          bump(e.key === 'ArrowUp' ? 1 : -1)
        }
      }}
      isInvalid={!!text && (!Number.isFinite(parseNum(text)) || outOfRange)}
      errorMessage={outOfRange ? `${fmtNum(min, step)} – ${fmtNum(max, step)}${unit ? ` ${unit}` : ''}` : undefined}
      endContent={endContent ?? (unit ? <span className="text-[10px] text-neutral-500 whitespace-nowrap">{unit}</span> : null)}
    />
  )
}

export default NumField
