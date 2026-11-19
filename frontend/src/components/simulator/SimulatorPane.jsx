// Painel direito: separadores Circuito / Montagem 3D, catálogo de componentes, propriedades,
// diagnóstico, pistas, exportação de imagens
import { useRef, useState } from 'react'
import { Button, Tabs, Tab, Select, SelectItem, Chip, Kbd, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Popover, PopoverTrigger, PopoverContent, Modal, ModalContent, ModalHeader, ModalBody, Input, Badge, Card, CardHeader, CardBody, Divider } from '@heroui/react'
import { Activity, CircuitBoard, Box, Cable, LocateFixed, PanelLeftClose, PanelLeftOpen, Plus, Scan, Search, X } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { Scene3D } from '../three/Scene3D.jsx'
import { Circuit2D } from '../circuit/Circuit2D.jsx'
import { Thumb, Swatches, Inspector, Diagnostics, Telemetry, useIssues, SimControls } from '../panels/panels.jsx'
import { TRACKS } from '@shared/tracks.js'
import { WIRE_COLORS, wireColorLabel, DEFS, pinLabel, mountsOf } from '@shared/components.js'
import { CATALOG } from '@shared/catalog.js'
import { simRef } from '../../contexts/simRef.js'
import { PhysicsControls } from '../three/physics/PhysicsControls.jsx'
import { CameraPanel, CameraToggle } from '../panels/CameraPanel.jsx'
import { Download, FileImage, FileCode2, Boxes, Route } from 'lucide-react'
import { exportCircuitPng, exportCircuitSvg, export3dPng, export3dGlb } from '../../functions/exportImage.js'
import { Toast } from '../common/Toast.jsx'
import { useT } from '../../i18n/index.js'

// ---------------- Abrir exemplo exemplos catálogo de componentes (modal, como o "Add component" do Velxio) ----------------
export function ComponentPicker() {
  const t = useT()
  const open = useStore((s) => s.pickerOpen)
  const parts = useStore((s) => s.parts)
  const set = useStore((s) => s.set)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const match = (ty) => !q || `${DEFS[ty].name} ${DEFS[ty].description}`.toLowerCase().includes(q.toLowerCase())
  const add = (type) => {
    useStore.getState().addPart(type)
    set({ pickerOpen: false })
  }
  return (
    <Modal isOpen={open} onOpenChange={(o) => set({ pickerOpen: o })} size="4xl" scrollBehavior="inside" backdrop="blur" classNames={{ closeButton: 'cursor-pointer', base: 'bg-[#0f0f0f] border border-white/10' }}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-3">
          <span>{t('wb.picker.title')}</span>
          <Input autoFocus size="sm" variant="bordered" placeholder={t('wb.picker.search')} value={q} onValueChange={setQ} startContent={<Search size={14} className="text-neutral-500" />} isClearable onClear={() => setQ('')} />
          <Tabs
            aria-label={t('wb.picker.categories')}
            size="sm"
            variant="bordered"
            selectedKey={cat}
            onSelectionChange={(k) => setCat(String(k))}
            classNames={{ closeButton: 'cursor-pointer', base: 'max-w-full', tabList: 'border-1 border-white/10 max-w-full', tab: 'px-2.5 w-auto', cursor: '!bg-white', tabContent: 'group-data-[selected=true]:!text-black text-neutral-400 text-xs font-medium' }}
          >
            {[{ key: 'all', label: t('wb.projects.all') }, ...CATALOG].map((f) => (
              <Tab key={f.key} title={f.label} />
            ))}
          </Tabs>
        </ModalHeader>
        <ModalBody className="pb-6">
          {CATALOG.filter((f) => cat === 'all' || f.key === cat).flatMap((f) =>
            f.groups
              .map((g) => ({ ...g, types: g.types.filter(match) }))
              .filter((g) => g.types.length)
              .map((g, gi) => {
            const types = g.types
            return (
              <div key={`${f.key}:${g.label}`}>
                {cat === 'all' && gi === 0 && <div className="text-sm font-semibold text-neutral-200 mt-2 mb-1">{f.label}</div>}
                <div className="panel-label mb-2">{g.label}</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {types.map((type) => {
                    const n = parts.filter((p) => p.type === type).length
                    return (
                      <Card
                        key={type}
                        isPressable
                        shadow="none"
                        radius="md"
                        onPress={() => add(type)}
                        aria-label={DEFS[type].name}
                        className="bg-white/[0.03] data-[hover=true]:bg-white/[0.08] border border-white/10 data-[hover=true]:border-white/40"
                      >
                        <CardBody className="flex flex-col items-center gap-1.5 p-2 overflow-visible">
                          <Thumb type={type} size={84} />
                          <span className="text-xs text-neutral-100 font-medium text-center leading-tight">{DEFS[type].name}</span>
                          <span className="text-[10px] text-neutral-500 line-clamp-2 text-center leading-snug">{DEFS[type].description}</span>
                          {n > 0 && (
                            <Chip size="sm" variant="flat" classNames={{ closeButton: 'cursor-pointer', base: 'h-4', content: 'text-[10px] px-1' }}>
                              {t({ pt: `no projeto: ${n}`, en: `in project: ${n}` })}
                            </Chip>
                          )}
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
              }),
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

function DiagnosticsButton() {
  const t = useT()
  const issues = useIssues()
  const open = useStore((s) => s.diagOpen)
  const set = useStore((s) => s.set)
  const errs = issues.filter((i) => i.level === 'error').length
  const warns = issues.filter((i) => i.level === 'warn').length
  return (
    // o Button tem de ser o próprio trigger: o HeroUI Button consome o "press" e um
    // wrapper (span) à volta dele nunca recebe o clique
    <Badge content={errs || warns || null} color={errs ? 'danger' : 'warning'} size="sm" isInvisible={!errs && !warns}>
      <Popover placement="bottom-end" isOpen={!!open} onOpenChange={(o) => set({ diagOpen: o })}>
        <PopoverTrigger>
          <Button size="sm" variant="bordered" startContent={<Activity size={14} />}>
            {t('wb.diag.button')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-96 max-h-[60vh] overflow-auto items-stretch">
          <div className="panel-label mb-2">{t('wb.diag.title')}</div>
          <Diagnostics />
        </PopoverContent>
      </Popover>
    </Badge>
  )
}

// Pista (linha do chão) à vista na barra 3D quando o projeto tem um robô ou sensores de linha:
// ao trocar, o robô vai para a partida da pista nova
const LINE_PARTS = ['chassis', 'chassis4wd', 'chassis4wd1', 'tankChassis', 'ir', 'lineTracker']
function TrackSelect() {
  const t = useT()
  const track = useStore((s) => s.track)
  const show = useStore((s) => s.parts.some((p) => LINE_PARTS.includes(p.type)))
  const running = useStore((s) => s.mode === 'sim')
  if (!show) return null
  return (
    <Tooltip content={running ? t('wb.track.stopToChange') : t('wb.track.tip')}>
      <div className="flex items-center h-8 rounded-small bg-black/70 border border-white/10">
        <Select
          size="sm"
          aria-label={t('wb.track.aria')}
          className="w-60"
          isDisabled={running}
          classNames={{ trigger: 'h-8 min-h-8 bg-transparent shadow-none', value: 'text-xs' }}
          startContent={<Route size={14} className="text-neutral-400 shrink-0" />}
          selectedKeys={[track]}
          onChange={(e) => {
            if (!e.target.value) return
            useStore.getState().set({ track: e.target.value })
            useStore.getState().placeOnTrackStart()
          }}
        >
          {Object.entries(TRACKS).map(([k, trk]) => (
            <SelectItem key={k}>{trk.name}</SelectItem>
          ))}
        </Select>
      </div>
    </Tooltip>
  )
}

function FollowToggle() {
  const t = useT()
  const follow = useStore((s) => s.followCam)
  const set = useStore((s) => s.set)
  return (
    <Button size="sm" variant="flat" className={`border border-white/10 ${follow ? 'bg-white text-black' : 'bg-black/70'}`} onPress={() => set({ followCam: !follow })} startContent={<LocateFixed size={14} />}>
      {t('wb.toolbar.follow')}
    </Button>
  )
}

// mostra/esconde os fios na montagem 3D (o mesmo interruptor do menu do cabeçalho)
function WiresToggle() {
  const t = useT()
  const show = useStore((s) => s.show3dWires)
  const set = useStore((s) => s.set)
  return (
    <Tooltip content={show ? t('wb.toolbar.hideWires3d') : t('wb.toolbar.showWires3d')}>
      <Button size="sm" variant="flat" aria-pressed={show} className={`border border-white/10 ${show ? 'bg-white text-black' : 'bg-black/70'}`} onPress={() => set({ show3dWires: !show })} startContent={<Cable size={14} />}>
        {t('wb.toolbar.wires')}
      </Button>
    </Tooltip>
  )
}

// cartão flutuante com as propriedades da peça/fio selecionado
function PropertiesCard() {
  const t = useT()
  const selected = useStore((s) => s.selected)
  const mode = useStore((s) => s.mode)
  const set = useStore((s) => s.set)
  if (!selected || mode !== 'build') return null
  return (
    <Card className="absolute top-3 right-3 z-20 w-80 max-h-[calc(100%-24px)] border border-white/10 bg-[#0f0f0f]/95 backdrop-blur" shadow="lg" radius="lg">
      <CardHeader className="flex items-center justify-between px-3 py-0 h-9 shrink-0">
        <span className="panel-label">{t('wb.props.title')}</span>
        <Button size="sm" variant="light" isIconOnly radius="full" className="text-neutral-500 data-[hover=true]:text-white w-7 h-7 min-w-7" onPress={() => set({ selected: null })} aria-label={t('common.close')}>
          <X size={15} />
        </Button>
      </CardHeader>
      <Divider />
      <CardBody className="p-3">
        <Inspector />
      </CardBody>
    </Card>
  )
}

function WireBar() {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const pending = useStore((s) => s.pendingPin)
  const parts = useStore((s) => s.parts)
  const wireColor = useStore((s) => s.wireColor)
  const set = useStore((s) => s.set)
  if (mode !== 'build') return null
  const pp = pending && parts.find((p) => p.id === pending.part)
  return (
    <Card shadow="lg" radius="lg" className="absolute bottom-3 left-1/2 -translate-x-1/2 flex-row items-center gap-3 bg-black/90 border border-white/10 px-3 py-2 text-xs text-neutral-400 z-10 max-w-[calc(100%-120px)] overflow-visible">
      {pp ? (
        <span className="text-white truncate">
          {t('wb.wirebar.from')} <b>{DEFS[pp.type].name} · {pinLabel(pp.type, pending.pin)}</b> — {t('wb.wirebar.pendingHint')} · <Kbd>Esc</Kbd> {t('wb.wirebar.cancels')}
        </span>
      ) : (
        <span className="truncate">{t('wb.wirebar.idle')} · <Kbd>R</Kbd> {t('wb.wirebar.rotates')} · <Kbd>Del</Kbd> {t('wb.wirebar.deletes')} · <Kbd>Ctrl+D</Kbd> {t('wb.wirebar.duplicates')}</span>
      )}
      <Divider orientation="vertical" className="h-5" />
      <div className="shrink-0">
        <Swatches size="sm" cols={20} colors={WIRE_COLORS.map((c, i) => ({ value: c, label: wireColorLabel(i) }))} value={wireColor} onChange={(c) => set({ wireColor: c })} />
      </div>
    </Card>
  )
}

// largar peças no mundo 3D
function useDrop3D(ref) {
  return (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/x-part')
    const st = useStore.getState()
    if (!type || st.mode !== 'build' || !simRef.pick3D) return
    const r = ref.current.getBoundingClientRect()
    const hit = simRef.pick3D(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (!hit) return st.addPart(type)
    const target = hit.partId && st.parts.find((p) => p.id === hit.partId)
    if (target) {
      const mounts = mountsOf(target)
      const localOf = (m) => {
        const o = simRef.mountObjects.get(`${target.id}:${m}`)
        if (!o) return [0, 0, 0]
        const l = o.worldToLocal(hit.point.clone())
        return [Math.round(l.x * 4) / 4, 0, Math.round(l.z * 4) / 4]
      }
      let mount = null
      if (type === 'motor') mount = ['motorL', 'motorR', 'motorL2', 'motorR2'].find((m) => mounts[m] && !st.parts.some((p) => p.parent?.id === target.id && p.parent.mount === m))
      else if (type === 'ir' && mounts.bottom) mount = 'bottom'
      else if (mounts.top) mount = 'top'
      else if (mounts.horn) mount = 'horn'
      else if (mounts.end) mount = 'end'
      if (mount) {
        const pos = mounts[mount].plane ? localOf(mount) : [0, 0, 0]
        if (type === 'ir' && mount === 'bottom') pos[0] = Math.max(pos[0], 9)
        return st.addPart(type, { mount: { parent: { id: target.id, mount }, pos } })
      }
    }
    st.addPart(type, { pos: [Math.round(hit.point.x), 0, Math.round(hit.point.z)] })
  }
}

// ---------------- painel direito: simulador ----------------
export function SimulatorPane() {
  const t = useT()
  const tab = useStore((s) => s.tab)
  const mode = useStore((s) => s.mode)
  const editorOpen = useStore((s) => s.editorOpen)
  const set = useStore((s) => s.set)
  const ref3d = useRef()
  const onDrop3D = useDrop3D(ref3d)
  // os dois painéis ficam montados; o inativo só fica invisível
  const hidden = 'invisible pointer-events-none'
  const view = tab === '3d' ? '3d' : 'circuit'
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 h-11 px-2 border-b border-white/10 bg-[#0d0d0d] shrink-0">
        <Tooltip content={editorOpen ? t('wb.pane.hideEditor') : t('wb.pane.showEditor')}>
          <Button size="sm" variant="light" isIconOnly aria-label={editorOpen ? t('wb.pane.hideEditor') : t('wb.pane.showEditor')} className="text-neutral-400" onPress={() => set({ editorOpen: !editorOpen })}>
            {editorOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </Button>
        </Tooltip>
        <Tabs
          aria-label={t('wb.pane.viewAria')}
          variant="light"
          size="sm"
          selectedKey={view}
          onSelectionChange={(k) => {
            // ao abrir a vista 3D, enquadra o que foi montado
            if (k === '3d' && useStore.getState().mode === 'build') simRef.wantFrame = true
            set({ tab: k })
          }}
          classNames={{ closeButton: 'cursor-pointer', tabList: 'bg-transparent', cursor: '!bg-white', tabContent: 'group-data-[selected=true]:!text-black text-neutral-400 font-medium' }}
        >
          <Tab key="circuit" title={<span className="flex items-center gap-1.5"><CircuitBoard size={14} />{t('wb.pane.circuit')}</span>} />
          <Tab key="3d" title={<span className="flex items-center gap-1.5"><Box size={14} />{t('wb.pane.assembly')}</span>} />
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" color="primary" variant="flat" className="bg-white/10 text-white" isDisabled={mode !== 'build'} onPress={() => set({ pickerOpen: true })} startContent={<Plus size={14} />}>
            {t('wb.pane.component')}
          </Button>
          <ExportMenu view={view} />
          <DiagnosticsButton />
        </div>
      </div>
      <main className="relative flex-1 min-h-0">
        <div className={`absolute inset-0 ${view === 'circuit' ? '' : hidden}`}>
          <Circuit2D />
          
        </div>
        <div ref={ref3d} className={`absolute inset-0 ${view === '3d' ? '' : hidden}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop3D}>
          <Scene3D />
          <div className="absolute left-3 bottom-3 flex gap-2 z-10">
            <Tooltip content={t('wb.pane.frameTip')}>
              <Button size="sm" variant="flat" className="bg-black/70 border border-white/10" onPress={() => (simRef.wantFrame = true)} startContent={<Scan size={14} />}>
                {t('wb.pane.frame')}
              </Button>
            </Tooltip>
            <TrackSelect />
            <FollowToggle />
            <WiresToggle />
            <CameraToggle />
            <PhysicsControls />
          </div>
        </div>
        <PropertiesCard />
        <CameraPanel />
        {mode === 'sim' && (
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end max-h-[calc(100%-24px)] overflow-auto">
            <Telemetry />
            <SimControls />
          </div>
        )}
        <Toast />
      </main>
    </div>
  )
}

// divisória arrastável entre editor e simulador

// ---------- Exportar imagem do circuito / da montagem 3D ----------
function ExportMenu({ view }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const run = async (fn) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
    } catch (e) {
      setErr(e.message || String(e))
      setTimeout(() => setErr(null), 4000)
    } finally {
      setBusy(false)
    }
  }
  const items =
    view === 'circuit'
      ? [
        { key: 'png2d', label: t('wb.export.png'), desc: t('wb.export.png2dDesc'), icon: <FileImage size={16} />, fn: () => exportCircuitPng() },
        { key: 'svg2d', label: t('wb.export.svg'), desc: t('wb.export.svgDesc'), icon: <FileCode2 size={16} />, fn: exportCircuitSvg },
      ]
      : [
        { key: 'png3d', label: t('wb.export.png'), desc: t('wb.export.png3dDesc'), icon: <FileImage size={16} />, fn: () => export3dPng() },
        { key: 'glb3d', label: t('wb.export.glb'), desc: t('wb.export.glbDesc'), icon: <Boxes size={16} />, fn: export3dGlb },
      ]
  return (
    <Tooltip content={err || (view === 'circuit' ? t('wb.export.circuitTip') : t('wb.export.assemblyTip'))} isOpen={err ? true : undefined} color={err ? 'danger' : 'default'}>
      <div>
        <Dropdown>
          <DropdownTrigger>
            <Button size="sm" variant="flat" className="bg-white/10 text-white" isLoading={busy} startContent={busy ? null : <Download size={14} />}>
              {t('wb.export.button')}
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={t('wb.export.button')} onAction={(k) => run(items.find((i) => i.key === k).fn)}>
            {items.map((i) => (
              <DropdownItem key={i.key} description={i.desc} startContent={i.icon}>
                {i.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      </div>
    </Tooltip>
  )
}
