// Orientação dos pinos de cabeçalho de um módulo (config.pinosDir): para cima, para baixo
// ou em ângulo reto. Só muda o 3D (desenho da barra e por onde os fios ligam); ver
// shared/pinOrient.js. Com os pinos para baixo o módulo encaixa na breadboard (no editor 2D).
import { Select, SelectItem } from '@heroui/react'
import { ArrowDown, ArrowUp, CornerDownRight } from 'lucide-react'
import { DEFS, pinOrient, pinOrientMode, PIN_DIR_LABEL } from '@shared/components.js'
import { useStore } from '../../contexts/store.js'
import { seatStatus, seatMessage } from '@shared/placement.js'
import { useT } from '../../i18n/index.js'

const ICON = { cima: ArrowUp, baixo: ArrowDown }

export function PinOrientPick({ part }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const info = pinOrient(part.type)
  if (!info) return null
  const cur = pinOrientMode(part)
  const label = (k) => `${info.labels?.[k] || PIN_DIR_LABEL[k]}${k === info.out && k !== 'cima' && k !== 'baixo' ? t('tools.pins.outward') : ''}${k === info.d0 ? t('tools.pins.original') : ''}`
  const change = (k) => {
    if (!k || k === cur) return
    const st = useStore.getState()
    const before = seatStatus(st.parts, part.id)
    st.updateConfig(part.id, { pinosDir: k === info.d0 ? undefined : k })
    // estava encaixado (levantado) na breadboard com os pinos para baixo: fica pousado nela,
    // com os pinos fora dos furos (sem ligação)
    const host = part.parent && st.parts.find((q) => q.id === part.parent.id)
    if (cur === 'baixo' && DEFS[host?.type]?.breadboard && part.parent.mount === 'top') st.update3dRaw(part.id, { pos: [part.pos[0], 0, part.pos[2]] })
    // pinos para baixo em cima dos furos: encaixa (shared/placement.js syncBreadboards)
    if (k === 'baixo') st.finishMoves(part.id)
    else {
      st.finishMoves()
      const msg = seatMessage(before, seatStatus(useStore.getState().parts, part.id))
      if (msg) st.notify(msg)
    }
  }
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-700/60 pt-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">{t('tools.pins.title')}</div>
      <Select
        size="sm"
        variant="bordered"
        aria-label={t('tools.pins.title')}
        isDisabled={mode !== 'build'}
        selectedKeys={[cur]}
        disallowEmptySelection
        onChange={(e) => change(e.target.value)}
      >
        {info.options.map((k) => {
          const Icon = ICON[k] || CornerDownRight
          return (
            <SelectItem key={k} startContent={<Icon size={14} className="text-neutral-400" />}>
              {label(k)}
            </SelectItem>
          )
        })}
      </Select>
      <span className="text-[11px] text-neutral-500 leading-snug">
        {t('tools.pins.help')}
        {info.roots.size === DEFS[part.type].pins.length && DEFS[part.type].view2d ? t('tools.pins.helpSeat') : ''}
      </span>
    </div>
  )
}
