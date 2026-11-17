import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { linter, lintGutter, setDiagnostics } from '@codemirror/lint'
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Chip,
  Code,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Kbd,
  Listbox,
  ListboxItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ScrollShadow,
  Select,
  SelectItem,
  Slider,
  Snippet,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  useDisclosure,
} from '@heroui/react'
import { cpp } from '@codemirror/lang-cpp'
import { foguLanguage, foguAutocomplete, detectLang, FOGU_SKETCH } from '@engine/fogu/editor.js'
import { ArrowDown, ArrowUp, Car, Check, ChevronDown, Circle, CircleCheck, CircleX, Code2, Copy, FlipHorizontal2, Info, Pencil, Plus, RotateCcw, RotateCw, SendHorizontal, Timer, Trash2, TriangleAlert, Undo2, ListPlus } from 'lucide-react'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { useStore, NEW_SKETCH as CPP_SKETCH } from '../../contexts/store.js'
import { midpointToAdd, wireEnds3d, clampWirePt } from '../three/Wires3D.jsx'
import { ARENA } from '@shared/tracks.js'
import { wirePolyline, polylineToPts, moveCorner, SNAP } from '../../functions/wires.js'
import { PinOrientPick } from './PinOrientPick.jsx'
import { BreadboardSeat } from './BreadboardSeat.jsx'
import { PartsField } from './PartsField.jsx'
import { DEFS, WIRE_COLORS, COLOR_PALETTE, wireColorLabel, pin2dWorld, pinLabel, shortName, LED_COLORS, RESISTOR_VALUES, fmtOhms, mountsOf, batteryVoltage, scalable, mirrorable, baseDims, genericMaterial, chosenMaterial } from '@shared/components.js'
import { MATERIALS, MATERIAL_OPTS } from '@shared/parts/_materials.js'
import { mountOptions } from '@shared/assembly.js'
import { PHYSICS_MODES, physicsModeOf, autoPhysics, physicsLabel } from '@shared/physics.js'

const AXIS_COLORS = ['#ef5350', '#66bb6a', '#42a5f5'] // X vermelho, Y verde, Z azul (como os eixos do three.js)
import { setPot, compileCode, setInput, sendSerial, releaseButtons } from '../../services/simControl.js'
import { simRef } from '../../contexts/simRef.js'
import { SERVER } from '../../services/platform.js'
import { FieldsControl, TextControl } from './controlsE.jsx'
import { useT } from '../../i18n/index.js'

// ---------------- peças de UI partilhadas (todas HeroUI) ----------------
// paleta de cores clicáveis (LED, botão, fio, cubo…)
// paleta de cores: quadrados do mesmo tamanho em todos os sítios; a cor fica sempre igual
// (num quadrado interior) e a selecionada só ganha uma borda azul à volta.
// `cols`: grelha com esse número de colunas.
export function Swatches({ colors, value, onChange, isDisabled, size = 'md', cols }) {
  const box = size === 'sm' ? 'w-5 h-5 min-w-5 min-h-5' : 'w-6 h-6 min-w-6 min-h-6'
  const cur = String(value || '').toLowerCase()
  return (
    <div className={cols ? 'grid gap-1' : 'flex gap-1 flex-wrap items-center'} style={cols ? { gridTemplateColumns: `repeat(${cols}, max-content)` } : undefined}>
      {colors.map(({ value: c, label }) => {
        const on = cur === String(c).toLowerCase()
        return (
          <Tooltip placement="bottom" key={c} content={label} delay={400} closeDelay={0} size="sm">
            <Button
              isIconOnly
              variant="light"
              radius="none"
              aria-label={label}
              aria-pressed={on}
              isDisabled={isDisabled}
              disableAnimation
              onPress={() => onChange(c)}
              className={`${box} p-[2px] rounded-[4px] border-2 bg-transparent data-[hover=true]:bg-transparent data-[pressed=true]:scale-100 ${on ? 'border-sky-400' : 'border-transparent data-[hover=true]:border-white/40'}`}
            >
              <span className="block w-full h-full rounded-[2px] border border-white/20" style={{ background: c }} />
            </Button>
          </Tooltip>
        )
      })}
    </div>
  )
}

const SLIDER_CLS = { label: 'text-xs text-neutral-400', value: 'text-xs font-mono text-neutral-100', base: 'gap-1' }
// slider HeroUI com o valor ao lado do rótulo (onChange dispara em contínuo durante o arraste)
function SliderField({ label, value, min, max, step = 1, onChange, isDisabled, format }) {
  return (
    <Slider
      size="sm"
      color="foreground"
      label={label}
      minValue={min}
      maxValue={max}
      step={step}
      value={Number(value) || 0}
      isDisabled={isDisabled}
      onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      getValue={format ? (v) => format(Array.isArray(v) ? v[0] : v) : undefined}
      classNames={SLIDER_CLS}
    />
  )
}

// paleta das cores de peças e materiais: a paleta única (shared/components.js)
// lido a cada desenho: os nomes das cores seguem o idioma (shared/i18n/en/catalog.js)
const palette = () => COLOR_PALETTE.map((c) => ({ value: c.hex, label: c.name }))
// campo de cor: popover com amostras + hexadecimal
function ColorField({ label, value, onChange, isDisabled }) {
  const t = useT()
  const [hex, setHex] = useState(value || '#ffffff')
  useEffect(() => setHex(value || '#ffffff'), [value])
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-400">{label}</span>
      <Popover placement="bottom-start">
        <PopoverTrigger>
          <Button size="sm" variant="bordered" isDisabled={isDisabled} className="justify-start w-full" startContent={<span className="w-4 h-4 rounded border border-white/30" style={{ background: value }} />}>
            <span className="font-mono text-xs">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-auto items-stretch gap-3">
          <Swatches cols={10} colors={palette()} value={value} onChange={onChange} />
          <Input
            size="sm"
            variant="bordered"
            aria-label={t('panels.hexColor')}
            value={hex}
            onValueChange={(t) => {
              setHex(t)
              if (/^#[0-9a-f]{6}$/i.test(t)) onChange(t)
            }}
            startContent={<span className="w-3.5 h-3.5 rounded-sm border border-white/30 shrink-0" style={{ background: hex }} />}
            classNames={{ input: 'font-mono text-xs' }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function Thumb({ type, size = 48 }) {
  const t = useStore((s) => s.thumbs[type])
  return (
    <div className="shrink-0 rounded-lg bg-gradient-to-br from-neutral-700/40 to-neutral-900/60 grid place-items-center overflow-hidden" style={{ width: size, height: size }}>
      {t?.iso ? <img src={t.iso} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain' }} /> : <div className="w-3 h-3 rounded-full bg-neutral-600 animate-pulse" />}
    </div>
  )
}

// diagnóstico calculado no backend (ver store.js)
export function useIssues() {
  return useStore((s) => s.issues)
}

// ---------------- Propriedades ----------------
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-neutral-300">
      <span className="text-neutral-400">{label}</span>
      {children}
    </div>
  )
}
function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-700/60 pt-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">{title}</div>
      {children}
    </div>
  )
}

function PinList({ part }) {
  const t = useT()
  const wires = useStore((s) => s.wires)
  const parts = useStore((s) => s.parts)
  const pending = useStore((s) => s.pendingPin)
  const clickPin = useStore((s) => s.clickPin)
  const mode = useStore((s) => s.mode)
  const def = DEFS[part.type]
  if (DEFS[part.type]?.breadboard) return <p className="text-[11px] text-neutral-400">{t('panels.breadboardHint')}</p>
  const conns = (pin) =>
    wires
      .filter((w) => (w.a.part === part.id && w.a.pin === pin) || (w.b.part === part.id && w.b.pin === pin))
      .map((w) => {
        const o = w.a.part === part.id && w.a.pin === pin ? w.b : w.a
        const op = parts.find((p) => p.id === o.part)
        return { w, label: op ? `${shortName(op, parts)} ${pinLabel(op.type, o.pin)}` : '?' }
      })
  return (
    <ScrollShadow className="max-h-64" size={24}>
      <Listbox
        aria-label={t('panels.pins')} data-shortcuts
        variant="bordered"
        disabledKeys={mode !== 'build' ? def.pins.map((p) => String(p.id)) : []}
        onAction={(k) => {
          const pin = def.pins.find((p) => String(p.id) === String(k))
          if (pin) clickPin(part.id, pin.id)
        }}
        classNames={{ base: 'p-0', list: 'gap-1' }}
        itemClasses={{ base: 'px-2 py-1 rounded-md border gap-2 data-[hover=true]:border-white/30 data-[hover=true]:bg-white/[0.06]', title: 'text-xs' }}
      >
        {def.pins.map((pin) => {
          const isPending = pending?.part === part.id && pending?.pin === pin.id
          const cs = conns(pin.id)
          return (
            <ListboxItem
              key={String(pin.id)}
              textValue={String(pin.label || pin.id)}
              className={isPending ? 'bg-white/15 border-white' : 'bg-white/[0.03] border-white/10'}
              startContent={<Circle size={9} strokeWidth={2} className={`shrink-0 ${cs.length ? 'fill-white text-white' : 'text-neutral-500'}`} />}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold min-w-12 whitespace-nowrap shrink-0 text-neutral-100">{pin.label || pin.id}</span>
                <span className="text-neutral-400 truncate flex-1">
                  {cs.length
                    ? cs.map((c) => (
                        <span key={c.w.id} className="mr-2">
                          <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: c.w.color }} />
                          {c.label}
                        </span>
                      ))
                    : '—'}
                </span>
              </span>
            </ListboxItem>
          )
        })}
      </Listbox>
    </ScrollShadow>
  )
}

// comprimento / altura / largura de uma peça estrutural (config.scale sobre a caixa envolvente
// da peça sem escala; ver scalable() em shared/components.js)
// material de uma peça mecânica (madeira, PLA, alumínio…): aspeto 3D, massa e atrito
function MaterialPick({ part }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const { updateConfig } = useStore.getState()
  const base = genericMaterial(part.type)
  const cur = chosenMaterial(part) || base
  const dis = mode !== 'build'
  return (
    <Section title={t('panels.material')}>
      <Select
        size="sm"
        variant="bordered"
        aria-label={t('panels.material')}
        isDisabled={dis}
        selectedKeys={[cur]}
        onChange={(e) => e.target.value && updateConfig(part.id, { material: e.target.value === base ? undefined : e.target.value, matColor: undefined })}
      >
        {MATERIAL_OPTS.map(([k, label]) => (
          <SelectItem key={k}>{k === base ? t('panels.original', { label }) : label}</SelectItem>
        ))}
      </Select>
      {cur !== base && <ColorField label={t('panels.color')} value={part.config?.matColor || MATERIALS[cur].color} isDisabled={dis} onChange={(c) => updateConfig(part.id, { matColor: c })} />}
      <span className="text-[11px] text-neutral-500 leading-snug">
        {t('panels.materialInfo', { dens: MATERIALS[cur].dens, friction: MATERIALS[cur].friction })}
        {cur !== base ? t('panels.massRel', { k: (MATERIALS[cur].dens / MATERIALS[base].dens).toFixed(2), name: MATERIALS[base].name.split(' (')[0].toLowerCase() }) : ''}
      </span>
    </Section>
  )
}

const r2 = (v) => Math.round(v * 100) / 100
const AXIS_CLS = { input: 'text-xs font-mono', inputWrapper: 'h-7 min-h-7 px-2' }
// um eixo de um ponto: slider (arrasto contínuo, atualiza o fio ao vivo) + caixa numérica precisa
function AxisRow({ label, value, min, max, step, unit, isDisabled, onChange }) {
  const t = useT()
  const lo = Math.min(min, value)
  const hi = Math.max(max, value)
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 text-[11px] font-semibold text-neutral-400">{label}</span>
      <Slider
        size="sm"
        color="foreground"
        aria-label={t('panels.ofPoint', { axis: label })}
        className="flex-1"
        minValue={lo}
        maxValue={hi}
        step={step}
        value={value}
        isDisabled={isDisabled}
        onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      <NumberInput
        size="sm"
        variant="bordered"
        aria-label={`${label} (${unit})`}
        className="w-[5.5rem] shrink-0"
        hideStepper
        step={step < 1 ? 0.01 : step}
        formatOptions={{ maximumFractionDigits: 2 }}
        isDisabled={isDisabled}
        value={value}
        onValueChange={(v) => Number.isFinite(v) && onChange(v)}
        endContent={<span className="text-[10px] text-neutral-500">{unit}</span>}
        classNames={AXIS_CLS}
      />
    </div>
  )
}

// botões numerados para escolher um ponto da lista
function PointPicker({ count, sel, onSelect, isDisabled, noun }) {
  const t = useT()
  noun ??= t('panels.point')
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }, (_, i) => (
        <Button
          key={i}
          size="sm"
          isIconOnly
          className="h-7 w-7 min-w-0 text-xs font-mono"
          variant={i === sel ? 'solid' : 'flat'}
          color={i === sel ? 'primary' : 'default'}
          isDisabled={isDisabled}
          aria-label={`${noun} ${i + 1}`}
          onPress={() => onSelect(i === sel ? null : i)}
        >
          {i + 1}
        </Button>
      ))}
    </div>
  )
}

// limites dos sliders 3D: à volta das pontas do fio (ou da arena, se ainda não houver percurso)
function ranges3d(ends) {
  if (!ends) return [[-ARENA.w / 2, ARENA.w / 2], [0, 60], [-ARENA.h / 2, ARENA.h / 2]]
  const M = 30
  const lo = (k) => Math.floor(Math.min(ends.a[k], ends.b[k]) - M)
  const hi = (k) => Math.ceil(Math.max(ends.a[k], ends.b[k]) + M)
  // fora de um robô o referencial é o mundo: y = 0 é o tampo da mesa
  const yLo = ends.container ? Math.floor(Math.min(ends.a.y, ends.b.y) - 10) : 0
  return [[lo('x'), hi('x')], [yLo, Math.ceil(Math.max(ends.a.y, ends.b.y) + 40)], [lo('z'), hi('z')]]
}

// pontos de passagem do fio na vista 3D (wire.pts3d)
function Wire3DPoints({ wire }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const active = useStore((s) => s.wirePt)
  const { setWirePts3d, setWirePt3d, set } = useStore.getState()
  const pts = wire.pts3d || []
  const dis = mode !== 'build'
  const sel = active != null && active < pts.length ? active : null
  const ends = wireEnds3d(wire.id)
  const rng = ranges3d(ends)
  const add = () => {
    const m = midpointToAdd(wire.id, pts)
    if (!m) return
    setWirePts3d(wire.id, [...pts.slice(0, m.index), m.p, ...pts.slice(m.index)])
    set({ wirePt: m.index })
  }
  // ponto novo entre o escolhido e o seguinte (ou a ponta do fio)
  const insertAfter = () => {
    const next = pts[sel + 1] || (ends ? ends.b.toArray() : null)
    const p = next ? pts[sel].map((v, k) => r2((v + next[k]) / 2)) : pts[sel].map((v, k) => r2(v + (k === 0 ? 2 : 0)))
    setWirePts3d(wire.id, [...pts.slice(0, sel + 1), p, ...pts.slice(sel + 1)])
    set({ wirePt: sel + 1 })
  }
  const swap = (d) => {
    const j = sel + d
    const next = [...pts]
    ;[next[sel], next[j]] = [next[j], next[sel]]
    setWirePts3d(wire.id, next)
    set({ wirePt: j })
  }
  // um ponto não pode ficar dentro de uma peça: é empurrado para a superfície mais próxima
  const [pushed, setPushed] = useState(false)
  useEffect(() => setPushed(false), [sel, wire.id])
  const setAxis = (k, v) => {
    const q = clampWirePt(wire.id, pts[sel].map((x, j) => (j === k ? r2(v) : x)))
    setPushed(q.moved)
    setWirePt3d(wire.id, sel, q.p)
  }
  return (
    <Section title={t('panels.path3d')}>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="flat" startContent={<Plus size={13} />} isDisabled={dis} onPress={add}>
          {t('panels.point')}
        </Button>
        <Button size="sm" variant="light" startContent={<Undo2 size={13} />} isDisabled={dis || !pts.length} onPress={() => (setWirePts3d(wire.id, null), set({ wirePt: null }))}>
          {t('panels.auto')}
        </Button>
      </div>
      {pts.length > 0 && <PointPicker count={pts.length} sel={sel} isDisabled={dis} onSelect={(i) => set({ wirePt: i })} />}
      {sel != null && (
        <div className="flex flex-col gap-1.5 rounded-medium bg-neutral-800/50 p-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-neutral-300 mr-auto">{t('panels.pointN', { n: sel + 1 })}</span>
            <Tooltip placement="bottom" content={t('panels.earlier')} delay={400}>
              <Button size="sm" variant="light" isIconOnly className="h-6 w-6 min-w-0" aria-label={t('panels.earlier')} isDisabled={dis || sel === 0} onPress={() => swap(-1)}>
                <ArrowUp size={13} />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" content={t('panels.later')} delay={400}>
              <Button size="sm" variant="light" isIconOnly className="h-6 w-6 min-w-0" aria-label={t('panels.later')} isDisabled={dis || sel === pts.length - 1} onPress={() => swap(1)}>
                <ArrowDown size={13} />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" content={t('panels.insertAfterTip')} delay={400}>
              <Button size="sm" variant="light" isIconOnly className="h-6 w-6 min-w-0" aria-label={t('panels.insertAfter')} isDisabled={dis} onPress={insertAfter}>
                <ListPlus size={13} />
              </Button>
            </Tooltip>
            <Tooltip placement="bottom" content={t('panels.removePointTip')} delay={400}>
              <Button
                size="sm"
                variant="light"
                color="danger"
                isIconOnly
                className="h-6 w-6 min-w-0"
                aria-label={t('panels.removePoint')}
                isDisabled={dis}
                onPress={() => (setWirePts3d(wire.id, pts.filter((_, i) => i !== sel)), set({ wirePt: pts.length > 1 ? Math.max(0, sel - 1) : null }))}
              >
                <Trash2 size={13} />
              </Button>
            </Tooltip>
          </div>
          {['X', 'Y', 'Z'].map((label, k) => (
            <AxisRow key={label} label={label} unit="cm" step={0.1} min={rng[k][0]} max={rng[k][1]} value={pts[sel][k]} isDisabled={dis} onChange={(v) => setAxis(k, v)} />
          ))}
          {(pushed || ends?.moved) && (
            <Chip size="sm" variant="flat" color="warning" startContent={<TriangleAlert size={12} />} className="max-w-full h-auto py-0.5 whitespace-normal" classNames={{ content: 'text-[11px] leading-snug' }}>
              {pushed ? t('panels.pointPushed') : t('panels.pointsInside')}
            </Chip>
          )}
        </div>
      )}
      <span className="text-[11px] text-neutral-500 leading-snug">
        {pts.length ? t('panels.pointsHelp', { n: pts.length, robot: !!ends?.container }) : t('panels.autoRoute')}
        {t('panels.dblClickHint')}
      </span>
    </Section>
  )
}

// cantos do fio no esquema 2D (wire.pts): o fio continua ortogonal, por isso mudar o X ou o Y
// de um canto arrasta o troço que passa por ele (como arrastar no editor 2D)
function Wire2DPoints({ wire }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const parts = useStore((s) => s.parts)
  const active = useStore((s) => s.wirePt2d)
  const { setWirePts2d, set } = useStore.getState()
  const pa = parts.find((p) => p.id === wire.a.part)
  const pb = parts.find((p) => p.id === wire.b.part)
  const a = pa?.sch && pin2dWorld(pa, wire.a.pin)
  const b = pb?.sch && pin2dWorld(pb, wire.b.pin)
  if (!a || !b) return null
  const poly = wirePolyline(a, wire.pts || [], b)
  const corners = poly.slice(1, -1)
  if (!corners.length) return null
  const dis = mode !== 'build'
  const sel = active != null && active < corners.length ? active : null
  const M = 200
  const rng = [0, 1].map((k) => [Math.floor((Math.min(a[k], b[k]) - M) / SNAP) * SNAP, Math.ceil((Math.max(a[k], b[k]) + M) / SNAP) * SNAP])
  const setAxis = (k, v) => {
    const r = moveCorner(poly, sel + 1, k, v)
    if (r.poly === poly) return
    setWirePts2d(wire.id, polylineToPts(r.poly))
    if (r.index - 1 !== sel) set({ wirePt2d: r.index - 1 })
  }
  return (
    <Section title={t('panels.corners2d')}>
      <PointPicker noun={t('panels.corner')} count={corners.length} sel={sel} isDisabled={dis} onSelect={(i) => set({ wirePt2d: i })} />
      {sel != null && (
        <div className="flex flex-col gap-1.5 rounded-medium bg-neutral-800/50 p-2">
          <span className="text-[11px] text-neutral-300">{t('panels.cornerN', { n: sel + 1 })}</span>
          {['X', 'Y'].map((label, k) => (
            <AxisRow key={label} label={label} unit="px" step={SNAP} min={rng[k][0]} max={rng[k][1]} value={corners[sel][k]} isDisabled={dis} onChange={(v) => setAxis(k, v)} />
          ))}
        </div>
      )}
      <span className="text-[11px] text-neutral-500 leading-snug">{t('panels.ortho')}</span>
    </Section>
  )
}

function Dimensions({ part }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const { updateConfig } = useStore.getState()
  const [lock, setLock] = useState(false)
  const base = baseDims(part)
  const sc = Array.isArray(part.config?.scale) ? part.config.scale : [1, 1, 1]
  const dis = mode !== 'build'
  const setDim = (i, v) => {
    if (!Number.isFinite(v) || v <= 0 || !(base[i] > 0)) return
    const k = v / base[i]
    // proporcional: os três fatores mudam na mesma razão
    const next = lock ? sc.map((x) => Math.round(((x * k) / sc[i]) * 1e4) / 1e4) : sc.map((x, j) => (j === i ? Math.round(k * 1e4) / 1e4 : x))
    updateConfig(part.id, { scale: next.every((x) => Math.abs(x - 1) < 1e-4) ? undefined : next })
  }
  const canScale = scalable(part.type)
  const mir = part.config?.mirror || {}
  const toggleMirror = (k) => {
    const next = { ...mir, [k]: !mir[k] }
    updateConfig(part.id, { mirror: ['x', 'y', 'z'].some((a) => next[a]) ? next : undefined })
  }
  return (
    <Section title={canScale ? t('panels.dimsMirror') : t('panels.mirror')}>
      {canScale && (
        <>
      <div className="grid grid-cols-3 gap-1">
        {[t('panels.dimLength'), t('panels.dimHeight'), t('panels.dimWidth')].map((label, i) => (
          <NumberInput
            key={label}
            size="sm"
            variant="bordered"
            label={label}
            labelPlacement="outside"
            hideStepper
            step={0.1}
            minValue={0.05}
            isDisabled={dis || !(base[i] > 0)}
            formatOptions={{ maximumFractionDigits: 2 }}
            value={Math.round(base[i] * sc[i] * 100) / 100}
            onValueChange={(v) => setDim(i, v)}
            endContent={<span className="text-[10px] text-neutral-500">cm</span>}
            classNames={{ label: 'text-[10px]', input: 'text-xs font-mono', inputWrapper: 'h-8 min-h-8 px-2' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Switch size="sm" isSelected={lock} onValueChange={setLock} isDisabled={dis}>
          <span className="text-[11px] text-neutral-400">{t('panels.keepRatio')}</span>
        </Switch>
        <Tooltip placement="bottom" content={t('panels.resetDimsTip')} delay={400}>
          <Button size="sm" variant="light" isIconOnly className="h-7 w-7 min-w-0 ml-auto" isDisabled={dis || !part.config?.scale} aria-label={t('panels.resetDims')} onPress={() => updateConfig(part.id, { scale: undefined })}>
            <Undo2 size={13} />
          </Button>
        </Tooltip>
      </div>
      <span className="text-[11px] text-neutral-500 leading-snug">
        {t('panels.massNote')}{DEFS[part.type].pins?.length ? t('panels.pinsNote') : ''}
      </span>
        </>
      )}
      {mirrorable(part.type) && (
        <div className="flex items-center gap-1">
          <FlipHorizontal2 size={13} className="text-neutral-400" />
          <span className="text-[11px] text-neutral-400 mr-auto">{t('panels.mirrorOn')}</span>
          {['x', 'y', 'z'].map((k) => (
            <Tooltip placement="bottom" key={k} content={t('panels.mirrorTip', { axis: k.toUpperCase() })} delay={400}>
              <Button size="sm" variant={mir[k] ? 'solid' : 'bordered'} color={mir[k] ? 'primary' : 'default'} className="h-7 w-9 min-w-0 font-mono text-xs" isDisabled={dis} aria-pressed={!!mir[k]} onPress={() => toggleMirror(k)}>
                {k.toUpperCase()}
              </Button>
            </Tooltip>
          ))}
        </div>
      )}
    </Section>
  )
}

function Placement3D({ part }) {
  const t = useT()
  const parts = useStore((s) => s.parts)
  const mode = useStore((s) => s.mode)
  const { update3d, move3d, rotate3d, resetRot3d, placeOnTrackStart, updateConfig, notify } = useStore.getState()
  const [rotStep, setRotStep] = useState(90)
  // correia/elástico (def.belt): "fixar" numa polia é passar a correia por ela (config.pulleys),
  // não colar a peça à face da polia — essas entradas do menu ligam/desligam a polia
  const belt = DEFS[part.type]?.belt
  const beltField = belt && DEFS[part.type].fields?.find((f) => f.type === 'parts')
  const onBelt = part.config?.[beltField?.key] || []
  const opts = mountOptions(parts, part).map((o) => {
    const q = beltField && o.id && parts.find((x) => x.id === o.id)
    if (!q || !belt.of.includes(q.type) || (part.parent?.id === o.id && part.parent.mount === o.mount)) return o
    const taken = parts.some((x) => x.id !== part.id && DEFS[x.type]?.belt && (x.config?.pulleys || []).includes(q.id))
    return { ...o, pulley: q, taken, label: t(onBelt.includes(q.id) ? 'tools.belt.takeOff' : 'tools.belt.putOn', { pulley: shortName(q, parts) }) }
  })
  const togglePulley = (q) => {
    const has = onBelt.includes(q.id)
    const set = new Set(has ? onBelt.filter((id) => id !== q.id) : [...onBelt, q.id])
    // a ordem guardada é a do projeto (como no campo do painel)
    updateConfig(part.id, { [beltField.key]: parts.map((x) => x.id).filter((id) => set.has(id)) })
    notify(t(has ? 'tools.belt.removed' : 'tools.belt.added', { belt: shortName(part, parts), pulley: shortName(q, parts) }))
  }
  const cur = opts.findIndex((o) => o.id === (part.parent?.id ?? null) && o.mount === (part.parent?.mount ?? null))
  const parentPart = part.parent && parts.find((p) => p.id === part.parent.id)
  const slot = parentPart && mountsOf(parentPart)[part.parent.mount]?.slot
  const dis = mode !== 'build'
  return (
    <Section title={t('panels.assembly3d')}>
      <BreadboardSeat part={part} />
      <Select
          size="sm"
          variant="bordered"
          label={t('panels.attachTo')}
          isDisabled={dis}
          selectedKeys={[String(cur)]}
          disabledKeys={opts.map((o, i) => (o.taken && !onBelt.includes(o.pulley.id) ? String(i) : null)).filter(Boolean)}
          description={beltField ? t('tools.belt.attachHint', { field: beltField.label }) : undefined}
          onChange={(e) => {
            if (e.target.value === '') return
            const o = opts[+e.target.value]
            if (o.pulley) return togglePulley(o.pulley)
            update3d(part.id, { parent: o.id ? { id: o.id, mount: o.mount } : null, pos: o.id ? [0, 0, 0] : [part.pos[0], 0, part.pos[2]] })
          }}
        >
          {opts.map((o, i) => (
            <SelectItem key={String(i)}>{o.label}</SelectItem>
          ))}
        </Select>
      {!slot && (
        <>
          <div className="grid grid-cols-3 gap-1">
            {['x', 'y', 'z'].map((ax, i) => (
              <NumberInput
                key={ax}
                size="sm"
                variant="bordered"
                aria-label={t('panels.position', { axis: ax })}
                hideStepper
                step={0.25}
                isDisabled={dis}
                formatOptions={{ maximumFractionDigits: 2 }}
                value={+part.pos[i].toFixed(2)}
                onValueChange={(v) => {
                  if (!Number.isFinite(v)) return
                  const pos = [...part.pos]
                  pos[i] = v
                  move3d(part.id, pos)
                }}
                startContent={<span className="text-[11px] text-neutral-500 font-mono">{ax}</span>}
                classNames={{ input: 'text-xs font-mono', inputWrapper: 'h-8 min-h-8 px-2' }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              {t('panels.rotateFixed')}
              <Tooltip placement="bottom" content={t('panels.savedAngles')} delay={400}>
                <Code size="sm" className="ml-auto">{part.rot.map((r) => Math.round(r)).join(' / ')}</Code>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {['X', 'Y', 'Z'].map((ax, i) => (
                <ButtonGroup key={ax} size="sm" variant="bordered" isDisabled={dis} className="w-full">
                  <Tooltip placement="bottom" content={t('panels.rotate', { sign: '−', step: rotStep, axis: ax })} delay={400}>
                    <Button isIconOnly className="h-7 min-w-0 flex-1" aria-label={t('panels.rotate', { sign: '−', step: rotStep, axis: ax })} onPress={() => rotate3d(part.id, i, -rotStep)}>
                      <RotateCcw size={12} />
                    </Button>
                  </Tooltip>
                  <Button className="h-7 min-w-0 px-1 font-mono text-[11px] pointer-events-none" style={{ color: AXIS_COLORS[i] }} tabIndex={-1}>
                    {ax}
                  </Button>
                  <Tooltip placement="bottom" content={t('panels.rotate', { sign: '+', step: rotStep, axis: ax })} delay={400}>
                    <Button isIconOnly className="h-7 min-w-0 flex-1" aria-label={t('panels.rotate', { sign: '+', step: rotStep, axis: ax })} onPress={() => rotate3d(part.id, i, rotStep)}>
                      <RotateCw size={12} />
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Tabs size="sm" aria-label={t('panels.rotStep')} selectedKey={String(rotStep)} onSelectionChange={(k) => setRotStep(+k)} isDisabled={dis} classNames={{ tabList: 'p-0.5', tab: 'h-6 px-2 text-[11px]' }}>
                {[90, 45, 15, 5, 1].map((d) => (
                  <Tab key={String(d)} title={`${d}°`} />
                ))}
              </Tabs>
              <Tooltip placement="bottom" content={t('panels.resetRotTip')} delay={400}>
                <Button size="sm" variant="light" isIconOnly className="h-7 w-7 min-w-0 ml-auto" isDisabled={dis} aria-label={t('panels.resetRot')} onPress={() => resetRot3d(part.id)}>
                  <Undo2 size={13} />
                </Button>
              </Tooltip>
            </div>
          </div>
        </>
      )}
      {!part.parent && (
        <Select
          size="sm"
          variant="bordered"
          label={t('panels.physics')}
          isDisabled={dis || DEFS[part.type]?.vehicle}
          selectedKeys={[part.physics || 'auto']}
          description={DEFS[part.type]?.vehicle ? t('panels.vehiclePose') : t('panels.physicsNow', { mode: physicsLabel(physicsModeOf(part, parts)) })}
          onChange={(e) => e.target.value && update3d(part.id, { physics: e.target.value === 'auto' ? undefined : e.target.value })}
        >
          {PHYSICS_MODES.map(([k, label]) => (
            <SelectItem key={k}>{k === 'auto' ? `${label} (${physicsLabel(autoPhysics(part, parts))})` : label}</SelectItem>
          ))}
        </Select>
      )}
      {DEFS[part.type]?.vehicle && !part.parent && (
        <Button size="sm" variant="flat" isDisabled={dis} onPress={placeOnTrackStart}>
          {t('panels.trackStart')}
        </Button>
      )}
    </Section>
  )
}

function Config({ part }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const tele = useStore((s) => s.telemetry)
  const { updateConfig } = useStore.getState()
  const cfg = part.config || {}
  const dis = mode !== 'build'
  const irT = tele?.irs.find((i) => i.id === part.id)
  switch (part.type) {
    case 'arduino':
      return (
        <Switch size="sm" isDisabled={dis} isSelected={!!cfg.usb} onValueChange={(v) => updateConfig(part.id, { usb: v })}>
          <span className="text-xs">{t('panels.usbPowered')}</span>
        </Switch>
      )
    case 'l298n':
      return (
        <div className="flex flex-col gap-1 text-xs text-neutral-300">
          {[
            ['enaJumper', t('panels.enaJumper')],
            ['enbJumper', t('panels.enbJumper')],
            ['reg5v', t('panels.reg5v')],
          ].map(([k, l]) => (
            <Switch key={k} size="sm" isDisabled={dis} isSelected={cfg[k] ?? k === 'reg5v'} onValueChange={(v) => updateConfig(part.id, { [k]: v })}>
              <span className="text-xs">{l}</span>
            </Switch>
          ))}
        </div>
      )
    case 'ir':
      return (
        <div className="flex flex-col gap-1">
          <SliderField label={t('panels.irThreshold')} min={0.1} max={0.9} step={0.01} value={cfg.threshold} format={(v) => `${(v * 5).toFixed(2)} V`} onChange={(v) => updateConfig(part.id, { threshold: v })} />
          {irT && <Code size="sm" className="text-[11px]">AO = {irT.ao.toFixed(2)} V · DO = {irT.do ? t('panels.irBlack') : t('panels.irWhite')}</Code>}
        </div>
      )
    case 'battery':
      return <SliderField label={t('panels.charge')} min={0} max={100} isDisabled={dis} value={cfg.charge} format={(v) => `${v}% → ${batteryVoltage(v).toFixed(2)} V`} onChange={(v) => updateConfig(part.id, { charge: v })} />
    case 'led':
      return (
        <Field label={t('panels.color')}>
          <Swatches isDisabled={dis} colors={Object.entries(LED_COLORS).map(([k, c]) => ({ value: c.hex, key: k, label: `${c.name} (Vf ${c.vf} V)` }))} value={LED_COLORS[cfg.color]?.hex} onChange={(hex) => updateConfig(part.id, { color: Object.keys(LED_COLORS).find((k) => LED_COLORS[k].hex === hex) })} />
        </Field>
      )
    case 'resistor':
      return (
        <Select size="sm" variant="bordered" label={t('panels.value')} isDisabled={dis} selectedKeys={[String(cfg.ohms)]} onChange={(e) => e.target.value && updateConfig(part.id, { ohms: +e.target.value })}>
          {RESISTOR_VALUES.map((v) => (
            <SelectItem key={String(v)}>{fmtOhms(v)}</SelectItem>
          ))}
        </Select>
      )
    case 'pot':
      return (
        <SliderField
          label={t('panels.wiper')}
          min={0}
          max={1}
          step={0.01}
          value={simRef.inputs[part.id]?.value ?? cfg.value}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => (mode === 'sim' ? setPot(part.id, v) : updateConfig(part.id, { value: v }))}
        />
      )
    case 'button':
      return (
        <Field label={t('panels.buttonColor')}>
          <Swatches isDisabled={dis} cols={10} colors={palette()} value={cfg.color} onChange={(c) => updateConfig(part.id, { color: c })} />
        </Field>
      )
    case 'armLink':
      return <SliderField label={t('panels.length')} min={4} max={20} step={1} isDisabled={dis} value={cfg.length} format={(v) => `${v} cm`} onChange={(v) => updateConfig(part.id, { length: v })} />
    case 'cube':
      return (
        <Field label={t('panels.color')}>
          <Swatches isDisabled={dis} cols={10} colors={palette()} value={cfg.color} onChange={(c) => updateConfig(part.id, { color: c })} />
        </Field>
      )
    default:
      return <PluginFields part={part} />
  }
}

// propriedades declaradas no catálogo (shared/parts: `fields`) + uso da biblioteca
function PluginFields({ part }) {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const { updateConfig } = useStore.getState()
  const def = DEFS[part.type]
  const cfg = part.config || {}
  const dis = mode !== 'build'
  return (
    <div className="flex flex-col gap-3">
      {(def.fields || []).map((f) => {
        const v = cfg[f.key] ?? (f.auto ? f.auto(cfg) : def.config?.[f.key])
        // resets: ex.: ao trocar de material a cor volta à do material
        const set = (val) => updateConfig(part.id, { [f.key]: val, ...Object.fromEntries((f.resets || []).map((k) => [k, undefined])) })
        if (f.type === 'select')
          return (
            <Select key={f.key} size="sm" variant="bordered" label={f.label} isDisabled={dis} selectedKeys={[String(v)]} onChange={(e) => e.target.value !== '' && set(f.options.find((o) => String(o[0]) === e.target.value)[0])}>
              {f.options.map(([val, label]) => (
                <SelectItem key={String(val)}>{label}</SelectItem>
              ))}
            </Select>
          )
        if (f.type === 'color') return <ColorField key={f.key} label={f.label} value={v} isDisabled={dis} onChange={set} />
        if (f.type === 'parts') return <PartsField key={f.key} part={part} f={f} value={v} isDisabled={dis} onChange={set} />
        if (f.type === 'range')
          return <SliderField key={f.key} label={f.label} min={f.min} max={f.max} step={f.step ?? 1} isDisabled={dis} value={v} format={(x) => `${x}${f.unit ? ` ${f.unit}` : ''}`} onChange={set} />
        if (f.type === 'number')
          return (
            <NumberInput
              key={f.key}
              size="sm"
              variant="bordered"
              label={f.label}
              isDisabled={dis}
              minValue={f.min}
              maxValue={f.max}
              step={f.step}
              value={v ?? 0}
              onValueChange={(x) => Number.isFinite(x) && set(x)}
              endContent={f.unit ? <span className="text-xs text-neutral-500">{f.unit}</span> : null}
            />
          )
        return <Input key={f.key} size="sm" variant="bordered" label={f.label} isDisabled={dis} value={v ?? ''} onValueChange={set} />
      })}
      {def.lib && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-neutral-400">{t('panels.library')}</span>
          <Snippet size="sm" variant="bordered" hideSymbol classNames={{ base: 'w-full', pre: 'text-[11px] whitespace-pre-wrap' }}>{`#include <${def.lib.header}>`}</Snippet>
          {def.lib.usage && (
            <Snippet size="sm" variant="flat" hideSymbol classNames={{ base: 'w-full items-start', pre: 'text-[11px] whitespace-pre-wrap font-mono text-neutral-300' }}>
              {def.lib.usage}
            </Snippet>
          )}
        </div>
      )}
      {def.interactive && <span className="text-[11px] text-neutral-500">{t('panels.duringSim', { hint: INTERACT_HINT[def.interactive.kind] ? t(INTERACT_HINT[def.interactive.kind]) : '' })}</span>}
    </div>
  )
}
// chaves de tradução (locales/panels.js), traduzidas ao desenhar
const INTERACT_HINT = {
  slider: 'panels.hint.slider',
  toggle: 'panels.hint.toggle',
  press: 'panels.hint.press',
  joystick: 'panels.hint.joystick',
  keypad: 'panels.hint.keypad',
  fields: 'panels.hint.fields',
  text: 'panels.hint.text',
}

// controlos das peças interativas durante a simulação projetos
export function SimControls() {
  const t = useT()
  const parts = useStore((s) => s.parts)
  useStore((s) => s.inputsTick)
  const list = parts.filter((p) => DEFS[p.type].interactive || p.type === 'pot')
  if (!list.length) return null
  return (
    <Card className="w-72 border border-white/10 bg-black/85 backdrop-blur shrink-0" shadow="lg" radius="lg">
      <CardBody className="p-3 flex flex-col gap-3 overflow-visible">
        <span className="panel-label">{t('panels.controls')}</span>
        {list.map((p) => {
          const ia = DEFS[p.type].interactive || { kind: 'slider', min: 0, max: 1, step: 0.01, label: t('panels.positionLabel') }
          const inp = simRef.inputs[p.id] || {}
          const name = shortName(p, parts)
          if (ia.kind === 'slider') {
            const v = p.type === 'pot' ? inp.value ?? p.config?.value ?? 0.5 : inp.value ?? ia.default ?? 0
            const slider = (
              <SliderField
                key={p.id}
                label={`${name} · ${ia.label}`}
                min={ia.min}
                max={ia.max}
                step={ia.step ?? (ia.max - ia.min) / 100}
                value={v}
                format={(x) => `${Math.round(x * 100) / 100}${ia.unit ? ` ${ia.unit}` : ''}`}
                onChange={(x) => (p.type === 'pot' ? setPot(p.id, x) : setInput(p.id, { value: x }))}
              />
            )
            if (!ia.press) return slider
            // peça com botão próprio (SW do encoder KY-040): manter premido
            return (
              <div key={p.id} className="flex flex-col gap-1">
                {slider}
                <Button size="sm" variant={inp.pressed ? 'solid' : 'bordered'} color={inp.pressed ? 'primary' : 'default'} onPressStart={() => setInput(p.id, { pressed: true })} onPressEnd={() => setInput(p.id, { pressed: false })}>
                  {name} · {ia.press} {t('panels.hold')}
                </Button>
              </div>
            )
          }
          if (ia.kind === 'toggle')
            return (
              <Switch key={p.id} size="sm" isSelected={!!inp.on} onValueChange={(v) => setInput(p.id, { on: v })}>
                <span className="text-xs">
                  {name} · {ia.label || t('panels.on')}
                </span>
              </Switch>
            )
          if (ia.kind === 'press')
            return (
              <Button
                key={p.id}
                size="sm"
                variant={inp.pressed ? 'solid' : 'bordered'}
                color={inp.pressed ? 'primary' : 'default'}
                onPressStart={() => setInput(p.id, { pressed: true })}
                onPressEnd={() => setInput(p.id, { pressed: false })}
              >
                {name} · {ia.label || t('panels.activate')} {t('panels.hold')}
              </Button>
            )
          if (ia.kind === 'joystick') return <JoystickPad key={p.id} part={p} name={name} />
          if (ia.kind === 'fields') return <FieldsControl key={p.id} part={p} name={name} ia={ia} />
          if (ia.kind === 'text') return <TextControl key={p.id} part={p} name={name} ia={ia} />
          if (ia.kind === 'keypad')
            return (
              <div key={p.id} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-300">{name}</span>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ia.keys[0].length}, 1fr)` }}>
                  {ia.keys.flat().map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      radius="sm"
                      variant={inp.key === k ? 'solid' : 'bordered'}
                      color={inp.key === k ? 'primary' : 'default'}
                      className="h-7 min-w-0 px-0 font-mono text-xs"
                      onPressStart={() => setInput(p.id, { key: k })}
                      onPressEnd={() => releaseButtons()}
                    >
                      {k}
                    </Button>
                  ))}
                </div>
              </div>
            )
          return null
        })}
      </CardBody>
    </Card>
  )
}

// o que o MPU6050 está a medir (estado vivo da simulação, 5× por segundo): ângulos, acelerações,
// rotações e a origem (física do robô ou joystick); avisa se está sem alimentação ou a dormir
function MpuReadout({ id }) {
  const t = useT()
  const [L, setL] = useState(null)
  useEffect(() => {
    const iv = setInterval(() => setL({ ...(simRef.engine?.live?.[id] || {}) }), 200)
    return () => clearInterval(iv)
  }, [id])
  if (!L || L.roll == null) return <span className="text-[11px] text-neutral-500">{t('panels.waitingSim')}</span>
  const f = (v, d = 2) => (v ?? 0).toFixed(d)
  return (
    <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
      {!L.powered ? (
        <span className="text-danger">{t('panels.noPower')}</span>
      ) : !L.awake ? (
        <span className="text-warning">{t('panels.asleep')}</span>
      ) : null}
      <span className="text-neutral-400">
        {t('panels.measures', { src: L.src })} {t('panels.roll')} <b className="text-neutral-100">{f(L.roll, 1)}°</b> · {t('panels.pitch')} <b className="text-neutral-100">{f(L.pitch, 1)}°</b>
      </span>
      <Code size="sm" className="text-[10px]">
        a {f(L.acc?.[0])} {f(L.acc?.[1])} {f(L.acc?.[2])} g
      </Code>
      <Code size="sm" className="text-[10px]">
        ω {f(L.gyro?.[0], 1)} {f(L.gyro?.[1], 1)} {f(L.gyro?.[2], 1)} °/s
      </Code>
    </div>
  )
}

// a área do joystick é um controlo próprio (arrasto 2D com captura do ponteiro) — não há equivalente HeroUI
function JoystickPad({ part, name }) {
  const t = useT()
  const inp = simRef.inputs[part.id] || {}
  const x = inp.x ?? 0.5
  const y = inp.y ?? 0.5
  const ref = useRef()
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    setInput(part.id, { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) })
  }
  return (
    <div className="flex items-center gap-3">
      <div
        ref={ref}
        role="slider"
        aria-label={`${name} joystick`}
        aria-valuetext={`x ${x.toFixed(2)} y ${y.toFixed(2)}`}
        className="relative w-24 h-24 rounded-full bg-white/5 border border-white/15 touch-none cursor-grab shrink-0"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={() => setInput(part.id, { x: 0.5, y: 0.5 })}
      >
        <div className="absolute w-8 h-8 rounded-full bg-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
      </div>
      <div className="flex flex-col gap-1 text-xs text-neutral-300">
        <span>{name}</span>
        <Code size="sm" className="text-[11px]">
          {part.type === 'mpu6050' ? 'joystick ' : ''}x {x.toFixed(2)} · y {y.toFixed(2)}
        </Code>
        {part.type === 'mpu6050' && <MpuReadout id={part.id} />}
        <Button
          size="sm"
          variant={inp.pressed ? 'solid' : 'bordered'}
          color={inp.pressed ? 'primary' : 'default'}
          onPressStart={() => setInput(part.id, { pressed: true })}
          onPressEnd={() => setInput(part.id, { pressed: false })}
        >
          {t('panels.swPress')}
        </Button>
      </div>
    </div>
  )
}

export function Inspector() {
  const t = useT()
  const selected = useStore((s) => s.selected)
  const parts = useStore((s) => s.parts)
  const wires = useStore((s) => s.wires)
  const mode = useStore((s) => s.mode)
  const { removeSelected, duplicatePart, rotateSch, set } = useStore.getState()
  if (!selected) return <p className="text-xs text-neutral-400">{t('panels.selectHint')}</p>

  if (selected.kind === 'wire') {
    const w = wires.find((x) => x.id === selected.id)
    if (!w) return null
    const name = (e) => {
      const p = parts.find((x) => x.id === e.part)
      return p ? `${shortName(p, parts)} · ${pinLabel(p.type, e.pin)}` : '?'
    }
    return (
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-neutral-100">{t('panels.wire')}</h3>
        <div className="text-xs text-neutral-300">
          {name(w.a)} <span className="text-neutral-500">→</span> {name(w.b)}
        </div>
        <Field label={t('panels.color')}>
          <Swatches cols={10} colors={WIRE_COLORS.map((c, i) => ({ value: c, label: wireColorLabel(i) }))} value={w.color} onChange={(c) => set({ wires: wires.map((x) => (x.id === w.id ? { ...x, color: c } : x)) })} />
        </Field>
        {w.pts?.length > 0 && (
          <Button size="sm" variant="flat" onPress={() => set({ wires: wires.map((x) => (x.id === w.id ? { ...x, pts: [] } : x)) })}>
            {t('panels.straighten')}
          </Button>
        )}
        <Wire2DPoints wire={w} />
        <Wire3DPoints wire={w} />
        <p className="text-[11px] text-neutral-500 leading-snug">
          {t('panels.wireHintA')} <Kbd>0</Kbd>–<Kbd>9</Kbd> {t('panels.wireHintB')}
        </p>
        <Button size="sm" color="danger" variant="bordered" isDisabled={mode !== 'build'} onPress={removeSelected}>
          {t('panels.removeWire')}
        </Button>
      </div>
    )
  }

  const part = parts.find((p) => p.id === selected.id)
  if (!part) return null
  const def = DEFS[part.type]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-center">
        <Thumb type={part.type} size={56} />
        <div className="min-w-0">
          <h3 className="font-semibold text-neutral-100">{def.name}</h3>
          <PartNameInput part={part} parts={parts} />
        </div>
      </div>
      <p className="text-[11px] text-neutral-400 leading-snug">{def.description}</p>
      <div className="flex gap-2">
        {part.sch && (
          <Button size="sm" variant="flat" className="flex-1" isDisabled={mode !== 'build'} onPress={() => rotateSch(part.id)}>
            {t('panels.rotate2d')}
          </Button>
        )}
        <Tooltip content={t('panels.duplicateTip')} delay={400}>
          <Button size="sm" variant="flat" className="flex-1" isDisabled={mode !== 'build'} startContent={<Copy size={14} />} onPress={() => duplicatePart(part.id)}>
            {t('panels.duplicate')}
          </Button>
        </Tooltip>
        <Button size="sm" color="danger" variant="bordered" className="flex-1" isDisabled={mode !== 'build'} onPress={removeSelected}>
          {t('panels.remove')}
        </Button>
      </div>
      <Config part={part} />
      <PinOrientPick part={part} />
      {genericMaterial(part.type) && <MaterialPick part={part} />}
      {(scalable(part.type) || mirrorable(part.type)) && <Dimensions part={part} />}
      <Placement3D part={part} />
      {def.pins.length > 0 && (
        <Section title={t('panels.pinsSection')}>
          <PinList part={part} />
        </Section>
      )}
    </div>
  )
}

// nome da peça (part.label): vazio = nome automático ("Servo 2"); aparece no 2D, nos fios,
// no diagnóstico, nos menus "Fixar em" e nos controlos da simulação
function PartNameInput({ part, parts }) {
  const t = useT()
  const auto = shortName({ ...part, label: undefined }, parts)
  const [txt, setTxt] = useState(part.label || '')
  useEffect(() => setTxt(part.label || ''), [part.id, part.label])
  const commit = () => txt !== (part.label || '') && useStore.getState().renamePart(part.id, txt)
  return (
    <Input
      size="sm"
      variant="bordered"
      aria-label={t('panels.partName')}
      placeholder={auto}
      value={txt}
      maxLength={40}
      onValueChange={setTxt}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation() // Del/Backspace/R não apagam nem rodam a peça enquanto escreve
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setTxt(part.label || '')
      }}
      startContent={<Pencil size={12} className="text-neutral-500 shrink-0" />}
      description={part.label ? `${auto} · ${DEFS[part.type].short || DEFS[part.type].name}` : t('panels.nameHint')}
      className="mt-1 w-48"
      classNames={{ inputWrapper: 'h-7 min-h-7 px-2', input: 'text-xs', description: 'text-[10px]' }}
    />
  )
}

// ---------------- Diagnóstico ----------------
export function Diagnostics() {
  const t = useT()
  const issues = useIssues()
  const set = useStore((s) => s.set)
  const icon = { error: CircleX, warn: TriangleAlert, info: Info }
  const color = {
    error: 'text-red-300 border-red-500/40 bg-red-500/10 data-[hover=true]:bg-red-500/20',
    warn: 'text-amber-200 border-amber-500/40 bg-amber-500/10 data-[hover=true]:bg-amber-500/20',
    info: 'text-neutral-300 border-white/15 bg-white/[0.03] data-[hover=true]:bg-white/[0.08]',
  }
  if (!issues.length)
    return (
      <Alert hideIconWrapper variant="bordered" icon={<CircleCheck size={15} />} title={t('panels.noIssues')} classNames={{ base: 'border-white/15 bg-white/[0.04] py-2', title: 'text-sm text-neutral-200' }} />
    )
  return (
    <div className="flex flex-col gap-2">
      {issues.map((i, k) => {
        const Icon = icon[i.level] || Info
        return (
          <Card
            key={k}
            isPressable={!!i.parts?.[0]}
            shadow="none"
            radius="md"
            onPress={() => set({ selected: { kind: 'part', id: i.parts[0] }, leftTab: 'props' })}
            className={`border text-left ${color[i.level] || color.info}`}
          >
            <CardBody className="p-2 text-xs leading-snug flex-row gap-1.5 items-start">
              <Icon size={13} className="shrink-0 mt-px" />
              <span>{i.msg}</span>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

// ---------------- Editor de código ----------------
function toCmDiagnostics(doc, diags) {
  return diags
    .filter((d) => d.line >= 1 && d.line <= doc.lines)
    .map((d) => {
      const line = doc.line(d.line)
      const from = Math.min(line.to, line.from + Math.max(0, d.col - 1))
      return { from, to: Math.max(from + 1, line.to), severity: d.severity === 'error' ? 'error' : 'warning', message: d.message }
    })
    .filter((d) => d.to <= doc.length)
}

export function CodePanel({ toolbar = null }) {
  const t = useT()
  const code = useStore((s) => s.code)
  const set = useStore((s) => s.set)
  const simError = useStore((s) => s.simError)
  const result = useStore((s) => s.compileResult)
  const compiling = useStore((s) => s.compiling)
  const netError = useStore((s) => s.compileNetError)
  const snippets = useStore((s) => s.snippets)
  const view = useRef(null)
  const lang = useStore((s) => s.lang) || 'cpp'
  const exts = useMemo(() => [...(lang === 'fogu' ? [foguLanguage, foguAutocomplete] : [cpp()]), lintGutter(), linter(null)], [lang])
  // troca C++ ⇄ Fogu: com o programa de arranque (ou vazio) troca também o programa
  const setLang = (l) => {
    if (l === lang) return
    const st = useStore.getState()
    const fresh = !st.code.trim() || st.code.trim() === CPP_SKETCH.trim() || st.code.trim() === FOGU_SKETCH.trim()
    const patch = { lang: l, compileResult: null }
    // exemplo aberto: troca para a versão do exemplo nessa linguagem (e guarda o que estava,
    // com as alterações, para voltar a ele)
    const alt = st.codeAlt && st.codeAlt.name === st.projectName ? st.codeAlt : null
    if (alt?.[l]) {
      patch.code = alt[l]
      patch.codeAlt = { ...alt, [lang]: st.code }
      st.notify(l === 'fogu' ? t('panels.exFogu') : t('panels.exCpp'))
    } else if (fresh) patch.code = l === 'fogu' ? FOGU_SKETCH : CPP_SKETCH
    else if (alt && l === 'fogu') {
      const libs = [...new Set([...st.code.matchAll(/#include\s*[<"]([^>"]+)[>"]/g)].map((m) => m[1]))]
      const why = libs.length ? t('panels.usesLibs', { libs: libs.join(', ') }) : t('panels.usesMissing')
      // fica em C/C++ (com o código C++ em "Fogu" só haveria erros)
      return st.notify(t('panels.noFoguVersion', { why }))
    } else st.notify(l === 'fogu' ? t('panels.langFogu') : t('panels.langCpp'))
    set(patch)
  }

  // confirmação genérica (substitui window.confirm)
  const [confirmState, setConfirmState] = useState(null) // { title, message, confirmLabel, danger, onConfirm }
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const askConfirm = (opts) => {
    setConfirmState(opts)
    onOpen()
  }

  // Sem compilação automática: o servidor só compila quando é pedido — botão "Verificar",
  // Ctrl/⌘+Enter ou iniciar a simulação. Os erros da última verificação acompanham as edições
  // (o CodeMirror desloca-os) até à próxima.

  // erros do compilador -> sublinhados e marcas na margem
  useEffect(() => {
    const v = view.current
    if (!v) return
    v.dispatch(setDiagnostics(v.state, result && result.at ? toCmDiagnostics(v.state.doc, result.diagnostics || []) : []))
  }, [result])

  const errs = result?.diagnostics?.filter((d) => d.severity === 'error').length ?? 0
  const warns = result?.diagnostics?.filter((d) => d.severity === 'warning').length ?? 0
  const goto = (d) => {
    const v = view.current
    if (!v || !d.line) return
    const pos = v.state.doc.line(Math.min(d.line, v.state.doc.lines)).from + Math.max(0, d.col - 1)
    v.dispatch({ selection: { anchor: pos }, scrollIntoView: true })
    v.focus()
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 px-3 h-11 border-b border-white/10 shrink-0 overflow-hidden">
        <span className="flex items-center gap-1.5 text-sm font-mono text-neutral-200"><Code2 size={15} className="text-neutral-400" />{lang === 'fogu' ? 'programa.fg' : 'sketch.ino'}</span>
        <Tabs size="sm" aria-label={t('panels.programLang')} selectedKey={lang} onSelectionChange={(k) => setLang(String(k))} classNames={{ tabList: 'p-0.5 gap-0.5', tab: 'h-6 px-2 text-xs', cursor: 'rounded-md' }}>
          <Tab key="cpp" title="C/C++" />
          <Tab key="fogu" title="Fogu" />
        </Tabs>
      
        <Tooltip placement="bottom" content={SERVER ? t('panels.verifyDesktop') : t('panels.verifyWeb')}>
          <Button size="sm" variant="bordered" isIconOnly aria-label={t('panels.verify')} isLoading={!!compiling} onPress={() => compileCode(code, { real: true })}>
            <Check size={15} />
          </Button>
        </Tooltip>
        {toolbar}
      </div>
      {simError && <Alert color="danger" variant="flat" radius="none" hideIconWrapper icon={<CircleX size={14} />} title={simError} classNames={{ base: 'py-1.5 px-3 shrink-0 border-b border-red-500/30 items-center', title: 'text-xs', mainWrapper: 'min-h-0 ms-1' }} />}
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeMirror
          value={code}
          theme={vscodeDark}
          extensions={exts}
          onChange={(v) => {
            // programa colado (mudança grande): se for claramente da outra linguagem, troca sozinho
            const st = useStore.getState()
            const prev = st.code || ''
            const pasted = Math.abs(v.length - prev.length) > 40 || (prev.length > 40 && v.length > 40 && !v.startsWith(prev.slice(0, 20)) && !prev.startsWith(v.slice(0, 20)))
            const d = pasted ? detectLang(v) : null
            const cur = st.lang || 'cpp'
            if (d && d !== cur) {
              set({ code: v, lang: d, compileResult: null })
              st.notify(d === 'fogu' ? t('panels.detectedFogu') : t('panels.detectedCpp'))
            } else set({ code: v })
          }}
          onCreateEditor={(v) => {
            view.current = v
          }}
          basicSetup={{ lineNumbers: true, foldGutter: true }}
          style={{ fontSize: 13 }}
          height="100%"
        />
      </div>
      {result?.diagnostics?.length > 0 && (
        <ScrollShadow className="max-h-32 border-t border-white/10 shrink-0" size={16}>
          <Listbox
            aria-label={t('panels.compilerErrors')} data-shortcuts
            onAction={(k) => goto(result.diagnostics[+k])}
            classNames={{ base: 'p-0', list: 'gap-0' }}
            itemClasses={{ base: 'px-3 py-1 rounded-none gap-2 data-[hover=true]:bg-white/5', title: 'font-mono text-[12px] whitespace-normal' }}
          >
            {result.diagnostics.map((d, i) => (
              <ListboxItem
                key={String(i)}
                textValue={d.message}
                startContent={<span className={`shrink-0 flex items-center ${d.severity === 'error' ? 'text-red-400' : 'text-amber-300'}`}>{d.severity === 'error' ? <CircleX size={13} /> : <TriangleAlert size={13} />}</span>}
              >
                <span className="flex gap-2">
                  <span className="text-neutral-500 w-14 shrink-0">{d.line ? `${d.line}:${d.col}` : '—'}</span>
                  <span className="text-neutral-200">{d.message}</span>
                </span>
              </ListboxItem>
            ))}
          </Listbox>
        </ScrollShadow>
      )}
      <Modal
        isOpen={isOpen}
        onOpenChange={(v) => {
          onOpenChange(v)
          if (!v) setConfirmState(null)
        }}
      classNames={{ closeButton: 'cursor-pointer' }}
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-sm">{confirmState?.title || t('common.confirm')}</ModalHeader>
              <ModalBody>
                <p className="text-xs text-neutral-300 whitespace-pre-wrap">{confirmState?.message}</p>
              </ModalBody>
              <ModalFooter>
                <Button size="sm" variant="light" onPress={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  color={confirmState?.danger ? 'danger' : 'primary'}
                  onPress={() => {
                    confirmState?.onConfirm?.()
                    setConfirmState(null)
                    onClose()
                  }}
                >
                  {confirmState?.confirmLabel || t('common.confirm')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

// ---------------- Monitor série confirm ----------------
export function SerialMonitor() {
  const t = useT()
  const serial = useStore((s) => s.serial)
  const running = useStore((s) => s.mode === 'sim')
  const [line, setLine] = useState('')
  const ref = useRef()
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [serial])
  const cls = { warn: 'text-amber-300', error: 'text-red-400', ok: 'text-emerald-300', info: 'text-neutral-400', tx: 'text-neutral-500' }
  const submit = () => {
    if (!line || !running) return
    sendSerial(line)
    setLine('')
  }
  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollShadow ref={ref} size={16} className="flex-1 font-mono text-[12px] px-3 py-1.5 text-neutral-200 bg-black">
        {serial.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap ${cls[l.level] || ''}`}>
            {l.text}
          </div>
        ))}
        {!serial.length && <div className="text-neutral-600">{t('panels.noSerial')}</div>}
      </ScrollShadow>
      <form
        className="flex items-center gap-2 px-2 py-1.5 border-t border-white/10 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input
          size="sm"
          variant="bordered"
          aria-label={t('panels.sendToArduino')}
          placeholder={running ? t('panels.sendPlaceholder') : t('panels.startToSend')}
          isDisabled={!running}
          value={line}
          onValueChange={setLine}
          classNames={{ input: 'font-mono text-xs', inputWrapper: 'h-8 min-h-8' }}
        />
        <Button size="sm" type="submit" variant="bordered" isIconOnly aria-label={t('panels.send')} isDisabled={!running || !line}>
          <SendHorizontal size={14} />
        </Button>
      </form>
    </div>
  )
}

// ---------------- Telemetria ----------------
export function Telemetry() {
  const tr = useT()
  const t = useStore((s) => s.telemetry)
  const parts = useStore((s) => s.parts)
  if (!t) return null
  const name = (id) => {
    const p = parts.find((x) => x.id === id)
    return p ? shortName(p, parts) : id
  }
  const activePins = t.pins.filter((p) => p.mode === 'OUTPUT' || p.mode === 'INPUT_PULLUP')
  const veh = t.vehicles[0]
  return (
    <Card className="w-72 border border-white/10 bg-black/80 backdrop-blur shrink-0" shadow="lg" radius="lg">
      <CardBody className="p-3 text-neutral-100 overflow-visible">
      <div className="flex gap-1.5 text-[11px] text-neutral-300 mb-2 flex-wrap items-center">
        <Chip size="sm" variant="flat" startContent={<Timer size={12} />} classNames={TCHIP}>{(t.t / 1000).toFixed(1)} s</Chip>
        {veh && <Chip size="sm" variant="flat" startContent={<Car size={12} />} classNames={TCHIP}>{Math.abs(veh.v).toFixed(1)} cm/s</Chip>}
        {t.realtime < 0.95 && <Chip size="sm" variant="flat" color="warning" classNames={TCHIP}>CPU: {(t.realtime * 100).toFixed(0)}%</Chip>}
        {veh?.collided && <Chip size="sm" variant="flat" color="danger" classNames={TCHIP}>{tr('panels.collision')}</Chip>}
        {t.arduino === false && <Chip size="sm" variant="flat" color="warning" classNames={TCHIP}>{tr('panels.arduinoOff')}</Chip>}
        {t.halted && <Chip size="sm" variant="flat" color="danger" classNames={TCHIP}>{tr('panels.halted')}</Chip>}
      </div>
      <div className="flex flex-col gap-1">
        {t.motors.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 text-neutral-400 truncate">{name(m.id)}</span>
            <div className="flex-1 h-2 bg-neutral-700 rounded relative overflow-hidden">
              <div className={`absolute top-0 h-2 ${m.rpm >= 0 ? 'bg-white left-1/2' : 'bg-neutral-500 right-1/2'}`} style={{ width: `${Math.min(50, (Math.abs(m.rpm) / 200) * 50)}%` }} />
            </div>
            <span className="w-28 font-mono text-right">
              {m.volts >= 0 ? '+' : ''}
              {m.volts.toFixed(1)}V {(Math.abs(m.amps) * 1000).toFixed(0)}mA
            </span>
          </div>
        ))}
        {t.servos.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 text-neutral-400 truncate">{name(s.id)}</span>
            <Progress size="sm" aria-label={tr('panels.angle', { name: name(s.id) })} value={s.angle} maxValue={180} disableAnimation classNames={PBAR} />
            <span className={`w-28 font-mono text-right ${s.stalled ? 'text-amber-300' : ''}`}>
              {Math.round(s.angle)}°{s.target != null ? ` → ${Math.round(s.target)}°` : tr('panels.noSignal')}
            </span>
          </div>
        ))}
        {t.irs.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-16 text-neutral-400 truncate">{name(s.id)}</span>
            <Progress size="sm" aria-label={`${name(s.id)} AO`} value={s.ao} maxValue={5} disableAnimation classNames={{ ...PBAR, indicator: 'bg-neutral-300' }} />
            <span className={`w-28 font-mono text-right ${s.do ? 'text-white' : 'text-neutral-400'}`}>{s.do ? tr('panels.black') : tr('panels.white')}</span>
          </div>
        ))}
        {t.sonars.map((s) => (
          <div key={s.id} className="text-[11px] font-mono">
            {name(s.id)}: {s.dist ? `${s.dist.toFixed(1)} cm` : '—'}
          </div>
        ))}
        {t.leds.map((l) => (
          <div key={l.id} className="text-[11px] font-mono flex gap-2">
            <span className="text-neutral-400">{name(l.id)}</span>
            {l.burned ? <span className="text-red-400">{tr('panels.burned')}</span> : <span>{(l.i * 1000).toFixed(1)} mA</span>}
          </div>
        ))}
      </div>
      {activePins.length > 0 && (
        <div className="grid grid-cols-7 gap-1 mt-2">
          {activePins.map((p) => (
            <Tooltip placement="bottom" key={p.n} content={`${p.id} ${p.mode}${p.pwm ? ` · PWM ${Math.round(p.duty * 255)}` : ''}`} size="sm" delay={300} closeDelay={0}>
              <Chip
                size="sm"
                radius="sm"
                classNames={{
                  base: `w-full max-w-none h-4 px-0 justify-center ${
                    p.servo != null ? 'bg-neutral-300 text-black' : p.mode === 'OUTPUT' ? (p.pwm ? 'bg-neutral-500 text-black' : p.out ? 'bg-white text-black' : 'bg-neutral-700 text-neutral-300') : 'bg-neutral-900 text-neutral-300 border border-white/10'
                  }`,
                  content: 'px-0 text-[9px] font-mono text-center truncate',
                }}
              >
                {p.id}
                {p.pwm ? ` ${Math.round(p.duty * 255)}` : ''}
              </Chip>
            </Tooltip>
          ))}
        </div>
      )}
      </CardBody>
    </Card>
  )
}
const TCHIP = { base: 'h-5 px-1 bg-white/[0.06]', content: 'text-[11px] px-1' }
const PBAR = { base: 'flex-1', track: 'h-2 bg-neutral-700', indicator: 'bg-white' }