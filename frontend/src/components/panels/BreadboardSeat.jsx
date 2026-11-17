// Estado do encaixe de uma peça na breadboard (shared/seating.js): só conduz quando está
// mesmo encaixada no 3D (pinos para baixo, pontas nos furos, assente). Levantada, inclinada
// ou com a barra de pinos para cima fica "desencaixada" (sem ligação) — botão para voltar a
// encaixar na posição do esquema 2D.
import { useMemo } from 'react'
import { Button, Chip, Tooltip } from '@heroui/react'
import { CircleCheck, Unplug, PlugZap } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { seatStatus } from '@shared/placement.js'
import { canHeaderDown, pluggablePart } from '@shared/seating.js'
import { useT } from '../../i18n/index.js'

export function BreadboardSeat({ part }) {
  const t = useT()
  const parts = useStore((s) => s.parts)
  const mode = useStore((s) => s.mode)
  const st = useMemo(() => seatStatus(parts, part.id), [parts, part.id])
  if (!st) return null
  if (st === 'in')
    return (
      <Chip size="sm" variant="flat" color="success" startContent={<CircleCheck size={13} />} classNames={{ content: 'text-[11px]' }}>
        {t('tools.seat.in')}
      </Chip>
    )
  const canSeat = pluggablePart(part) || canHeaderDown(part)
  const why = st === 'pinos' ? (canSeat ? t('tools.seat.whyUp') : t('tools.seat.whyNoFit')) : t('tools.seat.whyLifted')
  return (
    <div className="flex flex-col gap-1.5">
      <Tooltip content={t('tools.seat.tip', { why })} delay={300}>
        <Chip size="sm" variant="flat" color="warning" startContent={<Unplug size={13} />} classNames={{ content: 'text-[11px]' }}>
          {t('tools.seat.out')}
        </Chip>
      </Tooltip>
      <span className="text-[11px] text-neutral-500 leading-snug">{t('tools.seat.noLink', { why })}</span>
      {canSeat && (
        <Button size="sm" variant="flat" startContent={<PlugZap size={14} />} isDisabled={mode !== 'build'} onPress={() => useStore.getState().reseat(part.id)}>
          {t('tools.seat.reseat')}
        </Button>
      )}
    </div>
  )
}
