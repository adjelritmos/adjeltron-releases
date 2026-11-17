// Campo de propriedades `type: 'parts'` (shared/parts/*: fields): escolhe várias peças do projeto
// de certos tipos (f.of), guardadas como lista de ids em config[f.key]. Ex.: as polias por onde
// passa a "Correia GT2" ou o "Elástico". A ordem guardada é a do projeto.
// É o passo principal destas peças, por isso aparece como uma lista de caixas de seleção sempre
// à vista (nome da polia, tamanho e onde está montada), com o estado da correia e os avisos.
import { useMemo } from 'react'
import { Button, Checkbox, CheckboxGroup, Chip } from '@heroui/react'
import { CircleCheck, Plus, Spline, TriangleAlert } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { DEFS, shortName } from '@shared/components.js'
import { checkBelt } from '@shared/parts/_belt.js'
import { beltPulleys } from '@engine/sim/parts/correiaGt2.js'
import { useT } from '../../i18n/index.js'

// peças candidatas de um campo `parts`: [{ id, name, info, taken }] (taken = nome da outra
// correia que já usa a polia — cada polia só leva uma)
export function partsFieldItems(parts, part, f, t) {
  return parts
    .filter((p) => f.of.includes(p.type))
    .map((p) => {
      const host = p.parent && parts.find((q) => q.id === p.parent.id)
      const size = p.config?.teeth ? t('tools.parts.teeth', { n: p.config.teeth }) : p.config?.diameter ? t('tools.parts.diam', { n: Math.round(p.config.diameter * 10) }) : ''
      const where = host ? t('tools.parts.on', { host: shortName(host, parts) }) : t('tools.parts.loose')
      const other = parts.find((q) => q.id !== part.id && DEFS[q.type]?.belt && (q.config?.pulleys || []).includes(p.id))
      return { id: p.id, name: shortName(p, parts), info: `${size}${where}`.replace(/^ · /, ''), taken: other ? shortName(other, parts) : '' }
    })
}

export function PartsField({ part, f, value, isDisabled, onChange }) {
  const t = useT()
  const parts = useStore((s) => s.parts)
  const items = useMemo(() => partsFieldItems(parts, part, f, t), [parts, part, f, t])
  const sel = (value || []).filter((id) => items.some((it) => it.id === id))
  const n = sel.length
  const min = f.min || 1
  // correia: as polias escolhidas estão alinhadas (eixos paralelos, mesmo plano)?
  const aligned = useMemo(() => {
    if (!DEFS[part.type]?.belt || n < 2) return true
    try {
      return checkBelt(beltPulleys(parts, part)).ok
    } catch {
      return true
    }
  }, [parts, part, n])
  const kind = DEFS[f.of[0]]?.short || DEFS[f.of[0]]?.name
  // junta uma peça nova do tipo certo e escolhe-a logo (a seleção volta para esta peça)
  const addOne = () => {
    const st = useStore.getState()
    const p = st.addPart(f.of[0])
    if (!p) return
    const cur = useStore.getState().parts.find((q) => q.id === part.id)?.config?.[f.key] || []
    st.updateConfig(part.id, { [f.key]: [...cur, p.id] })
    st.set({ selected: { kind: 'part', id: part.id } })
  }
  return (
    <div className="flex flex-col gap-2 rounded-medium border border-white/15 bg-white/[0.03] p-2.5" data-parts-field={f.key}>
      <div className="flex items-center gap-2">
        <Spline size={14} className="text-neutral-300 shrink-0" />
        <span className="text-xs font-semibold text-neutral-100">{f.label}</span>
        <Chip size="sm" variant="flat" color={n >= min && aligned ? 'success' : 'warning'} className="ml-auto h-5 text-[10px]" startContent={n >= min && aligned ? <CircleCheck size={11} /> : <TriangleAlert size={11} />}>
          {t('tools.parts.count', { n, min })}
        </Chip>
      </div>
      <p className="text-[11px] text-neutral-400 leading-snug">{f.hint || f.placeholder || t('tools.parts.choose')}</p>
      {items.length > 0 && (
        <CheckboxGroup
          size="sm"
          aria-label={f.label}
          isDisabled={isDisabled}
          value={sel}
          onValueChange={(keys) => {
            const set = new Set(keys)
            onChange(items.map((it) => it.id).filter((id) => set.has(id)))
          }}
          classNames={{ wrapper: 'gap-1' }}
        >
          {items.map((it) => (
            <Checkbox key={it.id} value={it.id} isDisabled={!!it.taken && !sel.includes(it.id)} classNames={{ base: 'max-w-full w-full m-0 rounded-small px-1.5 py-1 data-[hover=true]:bg-white/5', label: 'w-full min-w-0' }}>
              <span className="flex flex-col leading-tight">
                <span className="text-xs text-neutral-100 truncate">{it.name}</span>
                <span className="text-[10px] text-neutral-500 truncate">{it.taken ? t('tools.parts.taken', { belt: it.taken }) : it.info}</span>
              </span>
            </Checkbox>
          ))}
        </CheckboxGroup>
      )}
      {items.length < min && <span className="text-[11px] text-amber-400 leading-snug">{items.length ? t('tools.parts.few', { n: items.length, min, kind }) : t('tools.parts.none', { kind })}</span>}
      {items.length >= min && n < min && <span className="text-[11px] text-amber-400 leading-snug">{t('tools.parts.min', { n: min })}</span>}
      {n >= min && !aligned && <span className="text-[11px] text-amber-400 leading-snug">{t('tools.parts.misaligned')}</span>}
      <div className="flex gap-1.5">
        {items.length >= min && items.some((it) => !it.taken && !sel.includes(it.id)) && n < min && (
          <Button size="sm" variant="flat" className="h-7 flex-1 text-[11px]" isDisabled={isDisabled} startContent={<CircleCheck size={12} />} onPress={() => onChange(items.filter((it) => !it.taken || sel.includes(it.id)).map((it) => it.id))}>
            {t('tools.parts.all')}
          </Button>
        )}
        <Button size="sm" variant={items.length < min ? 'solid' : 'light'} color={items.length < min ? 'primary' : 'default'} className="h-7 flex-1 text-[11px]" isDisabled={isDisabled} startContent={<Plus size={12} />} onPress={addOne}>
          {t('tools.parts.add', { kind })}
        </Button>
      </div>
    </div>
  )
}
