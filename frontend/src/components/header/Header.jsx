// Cabeçalho: logótipo, projetos (abrir/guardar/apagar), exemplos e definições
import { useEffect, useState } from 'react'
import { Button, Tabs, Tab, Select, SelectItem, Switch, Chip, Tooltip, Popover, PopoverTrigger, PopoverContent, Modal, ModalContent, ModalHeader, ModalBody, Input, Card, CardBody, CardFooter, Link } from '@heroui/react'
import { Cpu, Zap, FolderOpen, Plus, Search, Settings, Scale } from 'lucide-react'
import { DESKTOP, SERVER } from '../../services/platform.js'
import { useStore, projectHash } from '../../contexts/store.js'
import { fixAxleParents } from '@shared/assembly.js'
import { normalizeSeating, withoutUnknownParts } from '@shared/placement.js'
import { api } from '../../services/api.js'
import { TRACKS } from '@shared/tracks.js'
import { Save, Check, Trash2, Upload, Download } from 'lucide-react'
import { exportProjectFile, readProjectFile, pickProjectFile } from '../../functions/projectFile.js'
import { ProjectPreview3D, prefetchPreview, warmPreviews, setPreviewUrgent } from '../panels/ProjectPreview.jsx'
import { ExampleImage } from '../site/ExampleImage.jsx'
import { confirmDialog } from '../common/ConfirmDialog.jsx'
import { ThirdPartyLicensesModal } from '../common/ThirdPartyLicenses.jsx'
import { LanguageSwitch } from '../common/LanguageSwitch.jsx'
import { useT, locale } from '../../i18n/index.js'

// ---------------- cabeçalho ----------------
// "Projetos": modal com a grelha dos projetos guardados e dos exemplos, cada um com a
// fotografia 3D da montagem (ui/ProjectPreview.jsx; cena viva no cartão com o rato por cima)
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '')

function ProjectCard({ title, sub, chip, cacheKey, load, image, current, onOpen, onDelete, onExport }) {
  const t = useT()
  const [hover, setHover] = useState(false)
  return (
    <div className="relative group" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Card isPressable onPress={onOpen} shadow="sm" className={`w-full bg-neutral-900 border ${current ? 'border-primary' : 'border-white/10'} hover:border-white/30`}>
        <CardBody className="p-0 overflow-hidden">
          <div className="aspect-[16/10] w-full bg-gradient-to-br from-neutral-800 to-neutral-950">
            {/* exemplos: imagem .webp pronta (leve); projetos do utilizador: fotografia 3D */}
            {image ? <ExampleImage id={image} alt={title} size="sm" className="w-full h-full transition-transform duration-300 group-hover:scale-105" /> : <ProjectPreview3D cacheKey={cacheKey} load={load} hover={hover} />}
          </div>
        </CardBody>
        <CardFooter className="flex flex-col items-start gap-1 px-3 py-2 text-left">
          <span className="text-xs font-medium text-neutral-100 line-clamp-2 leading-snug">{title}</span>
          <div className="flex items-center gap-1.5 w-full">
            {chip && (
              <Chip size="sm" variant="flat" className="h-4 text-[10px]">
                {chip}
              </Chip>
            )}
            {sub && <span className="text-[10px] text-neutral-500 truncate">{sub}</span>}
            {current && (
              <Chip size="sm" color="primary" variant="flat" className="h-4 text-[10px] ml-auto">
                {t('wb.projects.openBadge')}
              </Chip>
            )}
          </div>
        </CardFooter>
      </Card>
      {onExport && (
        <Tooltip content={t('wb.projects.exportTip')} delay={400}>
          <Button isIconOnly size="sm" variant="flat" aria-label={t('wb.projects.exportAria')} className={`absolute top-2 ${onDelete ? 'right-10' : 'right-2'} z-10 h-7 w-7 min-w-0 opacity-0 group-hover:opacity-100 bg-black/60`} onPress={onExport}>
            <Download size={13} />
          </Button>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip content={t('wb.projects.deleteTip')} delay={400}>
          <Button isIconOnly size="sm" variant="flat" color="danger" aria-label={t('wb.projects.deleteTip')} className="absolute top-2 right-2 z-10 h-7 w-7 min-w-0 opacity-0 group-hover:opacity-100 bg-black/60" onPress={onDelete}>
            <Trash2 size={13} />
          </Button>
        </Tooltip>
      )}
    </div>
  )
}

function ProjectsMenu() {
  const t = useT()
  const running = useStore((s) => s.mode === 'sim')
  const examples = useStore((s) => s.examples)
  const projectName = useStore((s) => s.projectName)
  const { loadPreset, newProject, set } = useStore.getState()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState([])
  const [exList, setExList] = useState(null) // exemplos com a data da pré-visualização
  const [tab, setTab] = useState('saved')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const refresh = () => {
    // as listas e logo a seguir os dados de cada cartão (para as fotografias 3D saírem depressa)
    api
      .listProjects()
      .then((l) => {
        setSaved(l)
        for (const p of l) prefetchPreview(`p-${p.id}-${p.updated}`, () => api.loadProject(p.id))
      })
      .catch(() => setSaved(null))
    api
      .examples()
      .then((l) => {
        setExList(l)
        // (os exemplos usam imagens .webp prontas: nada a fotografar)
      })
      .catch(() => {})
  }
  const show = () => {
    refresh()
    setOpen(true)
  }
  // a cena 3D principal pára de desenhar enquanto o modal está aberto (fica tudo mais leve)
  useEffect(() => {
    set({ scenePaused: open })
    setPreviewUrgent(open)
    return () => {
      set({ scenePaused: false })
      setPreviewUrgent(false)
    }
  }, [open])
  // pouco depois de a app abrir: prepara as pré-visualizações em segundo plano
  useEffect(() => {
    const tm = setTimeout(warmPreviews, 4000)
    return () => clearTimeout(tm)
  }, [])
  const exs = exList || examples
  // peças de tipos que já não existem (projeto de uma versão anterior): tiram-se e avisa-se
  const semDesconhecidas = (d) => {
    const ok = withoutUnknownParts(d.parts, d.wires)
    if (ok.removed.length) useStore.getState().notify(t('wb.projects.removedParts', { types: ok.removed.join(', ') }))
    return ok
  }
  // só pergunta se houver alterações por guardar
  const okToReplace = async (title) => {
    const st = useStore.getState()
    if (!st.parts.length || projectHash(st) === st.savedHash) return true
    return confirmDialog({ title, message: t('wb.projects.unsavedMsg'), confirmLabel: t('wb.projects.openAnyway'), danger: true })
  }
  const openSaved = async (p) => {
    if (!(await okToReplace(t('wb.projects.openSavedTitle')))) return
    const d = await api.loadProject(p.id)
    const ok = semDesconhecidas(d)
    set({ parts: normalizeSeating(fixAxleParents(ok.parts)), wires: ok.wires, code: d.code, track: d.track || 'mesa', projectName: d.projectName, libs: d.libs || [], lang: d.lang || 'cpp', nvm: d.nvm ?? null, selected: null, pendingPin: null })
    set({ savedHash: projectHash(useStore.getState()) }) // acabado de abrir: nada por guardar
    setOpen(false)
  }
  const openExample = async (e) => {
    if (!(await okToReplace(t('wb.projects.openExampleTitle')))) return
    await loadPreset(e.id)
    setOpen(false)
  }
  // .adjel → abre como projeto atual (fica por guardar: "Guardar" põe-no nos meus projetos)
  const importFile = async () => {
    const file = await pickProjectFile()
    if (!file) return
    let d
    try {
      d = await readProjectFile(file)
    } catch (e) {
      useStore.getState().notify(e.message)
      return
    }
    if (!(await okToReplace(t('wb.projects.importTitle')))) return
    const ok = semDesconhecidas(d)
    set({ parts: normalizeSeating(fixAxleParents(ok.parts)), wires: ok.wires, code: d.code, track: d.track, projectName: d.projectName, libs: d.libs || [], lang: d.lang || 'cpp', nvm: d.nvm, selected: null, pendingPin: null, mode: 'build', savedHash: null })
    useStore.getState().notify(t('wb.projects.imported', { name: d.projectName }))
    setOpen(false)
  }
  // "Guardar como" de um projeto (o atual, ou um guardado sem o abrir)
  const exportFile = async (load) => {
    try {
      const d = await load()
      if (await exportProjectFile(d)) useStore.getState().notify(t('wb.projects.exported', { name: d.projectName }))
    } catch (e) {
      useStore.getState().notify(t('wb.projects.exportFailed', { detail: e?.message ? `: ${e.message}` : '' }))
    }
  }
  const exportSaved = (p) => exportFile(() => api.loadProject(p.id))
  const removeSaved = async (p) => {
    if (!(await confirmDialog({ title: t('wb.projects.deleteTip'), message: t('wb.projects.deleteMsg', { name: p.name }), confirmLabel: t('common.delete'), danger: true }))) return
    await api.deleteProject(p.id).catch(() => {})
    refresh()
  }
  const match = (name) => !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase())
  const cats = [...new Set(exs.map((e) => e.cat || OTHERS))]
  const savedShown = (saved || []).filter((p) => match(p.name))
  const exShown = exs.filter((e) => (cat === 'all' || (e.cat || OTHERS) === cat) && match(e.name))
  return (
    <>
      <Button size="sm" variant="light" isDisabled={running} className="text-neutral-300" startContent={<FolderOpen size={15} />} onPress={show}>
        {t('wb.projects.title')}
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen} size="5xl" backdrop="opaque" classNames={{ base: 'bg-neutral-950 border border-white/10 h-[86vh] max-h-[86vh]' }}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-3 pb-2">
                <div className="flex items-center gap-2 pr-6">
                  <FolderOpen size={18} className="text-neutral-400" />
                  <span className="text-base">{t('wb.projects.title')}</span>
                  <div className="ml-auto flex gap-2">
                    <Tooltip content={t('wb.projects.importTip')} delay={400}>
                      <Button size="sm" variant="flat" startContent={<Upload size={14} />} onPress={importFile}>
                        {t('wb.projects.import')}
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('wb.projects.exportCurrentTip')} delay={400}>
                      <Button size="sm" variant="flat" startContent={<Download size={14} />} onPress={() => exportFile(async () => useStore.getState())}>
                        {t('wb.projects.exportCurrent')}
                      </Button>
                    </Tooltip>
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<Plus size={14} />}
                      onPress={async () => {
                        if (await confirmDialog({ title: t('wb.projects.newTitle'), message: t('wb.projects.newMsg'), confirmLabel: t('wb.projects.start'), danger: true })) {
                          newProject()
                          setOpen(false)
                        }
                      }}
                    >
                      {t('wb.projects.newTitle')}
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      startContent={<Save size={14} />}
                      onPress={async () => {
                        await useStore.getState().saveProject()
                        setTimeout(refresh, 600)
                      }}
                    >
                      {t('wb.projects.saveCurrent')}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Tabs size="sm" selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} aria-label={t('wb.projects.typeAria')}>
                    <Tab key="saved" title={`${t('wb.projects.mine')}${saved ? ` (${saved.length})` : ''}`} />
                    <Tab key="ex" title={`${t('wb.projects.examples')} (${exs.length})`} />
                  </Tabs>
                  <Input size="sm" isClearable value={q} onValueChange={setQ} placeholder={t('wb.projects.search')} startContent={<Search size={14} className="text-neutral-500" />} className="max-w-xs ml-auto" aria-label={t('wb.projects.searchAria')} />
                </div>
                {tab === 'ex' && (
                  <div className="flex flex-wrap gap-1.5">
                    {['all', ...cats].map((c) => (
                      <Chip key={c} size="sm" variant={cat === c ? 'solid' : 'bordered'} color={cat === c ? 'primary' : 'default'} className="cursor-pointer" onClick={() => setCat(c)}>
                        {c === 'all' ? t('wb.projects.all') : c === OTHERS ? t('wb.projects.others') : c}
                      </Chip>
                    ))}
                  </div>
                )}
              </ModalHeader>
              <ModalBody className="relative p-0 flex-1 min-h-0 overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto px-6 pb-6 pt-1">
                {tab === 'saved' ? (
                  saved === null ? (
                    <p className="text-sm text-neutral-500 py-10 text-center">{t('wb.projects.readFailed')}</p>
                  ) : !savedShown.length ? (
                    <p className="text-sm text-neutral-500 py-10 text-center">{saved.length ? t('wb.projects.noMatch') : t('wb.projects.empty')}</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {savedShown.map((p) => (
                        <ProjectCard
                          key={p.id}
                          title={p.name}
                          sub={t('wb.projects.cardSub', { parts: p.parts, wires: p.wires, date: fmtDate(p.updated) })}
                          cacheKey={`p-${p.id}-${p.updated}`}
                          load={() => api.loadProject(p.id)}
                          current={p.name === projectName}
                          onOpen={() => openSaved(p)}
                          onDelete={() => removeSaved(p)}
                          onExport={() => exportSaved(p)}
                        />
                      ))}
                    </div>
                  )
                ) : !exShown.length ? (
                  <p className="text-sm text-neutral-500 py-10 text-center">{t('wb.projects.noExamples')}</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {exShown.map((e) => (
                      <ProjectCard key={e.id} title={e.name} chip={e.cat || t('wb.projects.others')} image={e.id} onOpen={() => openExample(e)} />
                    ))}
                  </div>
                )}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}

function SettingsMenu() {
  const t = useT()
  const running = useStore((s) => s.mode === 'sim')
  const track = useStore((s) => s.track)
  const realism = useStore((s) => s.realism)
  const simEngine = useStore((s) => s.simEngine)
  const followCam = useStore((s) => s.followCam)
  const show3dWires = useStore((s) => s.show3dWires)
  const set = useStore((s) => s.set)
  const [licensesOpen, setLicensesOpen] = useState(false)
  return (
    <>
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button size="sm" variant="light" isIconOnly aria-label={t('common.settings')} className="text-neutral-400">
          <Settings size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-72 items-stretch gap-3">
        <Select size="sm" label={t('wb.settings.scene')} variant="bordered" isDisabled={running} selectedKeys={[track]} onChange={(e) => e.target.value && set({ track: e.target.value })}>
          {Object.entries(TRACKS).map(([k, trk]) => (
            <SelectItem key={k}>{trk.name}</SelectItem>
          ))}
        </Select>
        {/* motor de simulação: só a app desktop tem o arduino-cli (emulação real) */}
        {SERVER && (
          <Select
            size="sm"
            label={t('wb.settings.engine')}
            variant="bordered"
            isDisabled={running}
            selectedKeys={[simEngine]}
            onChange={(e) => e.target.value && set({ simEngine: e.target.value })}
            description={
              simEngine === 'fast'
                ? t('wb.settings.engineFastDesc')
                : t('wb.settings.engineRealDesc')
            }
          >
            <SelectItem key="auto" startContent={<Cpu size={14} />} description={t('wb.settings.autoDesc')}>
              {t('wb.settings.auto')}
            </SelectItem>
            <SelectItem key="real" startContent={<Cpu size={14} />} description="arduino-cli + avr8js">
              {t('wb.settings.real')}
            </SelectItem>
            <SelectItem key="fast" startContent={<Zap size={14} />} description={t('wb.settings.fastDesc')}>
              {t('wb.settings.fast')}
            </SelectItem>
          </Select>
        )}
        <Switch size="sm" isSelected={realism} isDisabled={running} onValueChange={(v) => set({ realism: v })}>
          <span className="text-sm">{t('wb.settings.realism')}</span>
          <span className="block text-[11px] text-default-500">{t('wb.settings.realismDesc')}</span>
        </Switch>
        <Switch size="sm" isSelected={followCam} onValueChange={(v) => set({ followCam: v })}>
          <span className="text-sm">{t('wb.settings.followCam')}</span>
        </Switch>
        <Switch size="sm" isSelected={show3dWires} onValueChange={(v) => set({ show3dWires: v })}>
          <span className="text-sm">{t('wb.settings.show3dWires')}</span>
        </Switch>
        <Button size="sm" variant="light" startContent={<Scale size={14} />} onPress={() => setLicensesOpen(true)} className="justify-start text-neutral-400 -mx-1">
          {t('common.thirdPartyLicenses')}
        </Button>
      </PopoverContent>
    </Popover>
    <ThirdPartyLicensesModal isOpen={licensesOpen} onOpenChange={setLicensesOpen} />
    </>
  )
}

// botão Guardar sempre à vista (também Ctrl/⌘+S): destaca-se quando há alterações por guardar
const OTHERS = 'Outros' // grupo dos exemplos sem categoria (valor interno; mostrado traduzido)
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
function SaveButton() {
  const t = useT()
  const dirty = useStore((s) => s.savedHash !== projectHash(s))
  const saving = useStore((s) => s.saving)
  return (
    <Tooltip content={t('wb.header.saveTip', { keys: isMac ? '⌘' : 'Ctrl+' })}>
      <Button
        size="sm"
        color={dirty ? 'primary' : 'default'}
        variant={dirty ? 'solid' : 'flat'}
        isLoading={saving}
        onPress={() => useStore.getState().saveProject()}
        startContent={saving ? null : dirty ? <Save size={15} /> : <Check size={15} />}
        className={dirty ? 'font-medium' : 'text-neutral-400'}
      >
        {dirty ? t('common.save') : t('common.saved')}
      </Button>
    </Tooltip>
  )
}

export function Header() {
  const t = useT()
  const projectName = useStore((s) => s.projectName)
  const set = useStore((s) => s.set)
  const brand = (
    <>
      <img src="/logo.webp" alt="adjeltron" draggable={false} className="h-7 w-auto object-contain" />
      <span className="font-semibold text-white text-sm tracking-tight">adjeltron</span>
    </>
  )
  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-white/10 bg-black shrink-0">
      {/* na app desktop não há páginas do site: o logótipo não é um link */}
      {DESKTOP ? (
        <span className="flex items-center gap-2.5">{brand}</span>
      ) : (
        <Tooltip content={t('common.homePage')}>
          <Link href="/" className="flex items-center gap-2.5" aria-label={t('wb.header.homeAria')}>
            {brand}
          </Link>
        </Tooltip>
      )}
      <span className="text-neutral-700">/</span>
      <Input
        size="sm"
        variant="flat"
        aria-label={t('wb.header.projectName')}
        value={projectName}
        onValueChange={(v) => set({ projectName: v })}
        className="w-56"
        classNames={{ closeButton: 'cursor-pointer', inputWrapper: 'bg-transparent shadow-none data-[hover=true]:bg-white/5 group-data-[focus=true]:bg-white/5 h-8 min-h-8 px-2', input: 'text-sm text-neutral-300 group-data-[focus=true]:text-white' }}
      />
      <SaveButton />
      <ProjectsMenu />
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitch />
        <SettingsMenu />
      </div>
    </header>
  )
}
