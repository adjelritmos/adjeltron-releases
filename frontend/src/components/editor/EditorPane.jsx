// Painel esquerdo: barra de simulação (como a do Velxio), editor de código e monitor série
import { Button, ButtonGroup, Tabs, Tab, Chip, Kbd, Tooltip } from '@heroui/react'
import { Cpu, Zap, ChevronDown, ChevronRight, Pause, Play, RotateCcw, Square, Terminal } from 'lucide-react'
import { useStore } from '../../contexts/store.js'
import { CodePanel, SerialMonitor } from '../panels/panels.jsx'
import { startSim, stopSim, restartSim, setPaused } from '../../services/simControl.js'
import { SerialPlotter } from '../panels/SerialPlotter.jsx'
import { MqttPanel } from '../panels/MqttPanel.jsx'
import { WebGatewayButton } from '../panels/WebGatewayModal.jsx'
import { Oscilloscope } from '../panels/Oscilloscope.jsx'
import { clearNvm } from '../../services/simControl.js'
import { DatabaseZap, Waves } from 'lucide-react'
import { confirmDialog } from '../common/ConfirmDialog.jsx'
import { LibrariesButton } from './LibrariesButton.jsx'
import { useT } from '../../i18n/index.js'

// ---------------- barra de simulação (como a do Velxio, por cima do editor) ----------------
function SimToolbar() {
  const t = useT()
  const mode = useStore((s) => s.mode)
  const paused = useStore((s) => s.paused)
  const compiling = useStore((s) => s.compiling === true)
  const engineUsed = useStore((s) => s.simEngineUsed)
  const running = mode === 'sim'
  return (
    <div className="flex items-center gap-2">
      {!running ? (
        <Tooltip placement='bottom' content={<span>{t('wb.sim.startTip')}</span>}>
          <Button isIconOnly size="sm" color="primary" className="font-semibold" isLoading={compiling} onPress={startSim}>
            {!compiling && <Play size={14} />}
          </Button>
        </Tooltip>
      ) : (
        <ButtonGroup size="sm">
          <Button isIconOnly color="danger" className="font-semibold" aria-label={t('wb.sim.stop')} onPress={stopSim}>
            {<Square size={13} />}
          </Button>
          <Button variant="bordered" isIconOnly aria-label={paused ? t('wb.sim.resume') : t('wb.sim.pause')} onPress={() => setPaused(!paused)}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </Button>
          <Tooltip placement='bottom' content={t('wb.sim.restartTip')}>
            <Button variant="bordered" isIconOnly aria-label={t('wb.sim.restart')} onPress={restartSim}>
              <RotateCcw size={14} />
            </Button>
          </Tooltip>
        </ButtonGroup>
      )}
      <LibrariesButton />
      {running && engineUsed && (
        <Chip size="sm" variant="flat" color={engineUsed === 'avr' ? 'success' : 'default'} startContent={engineUsed === 'avr' ? <Cpu size={12} /> : <Zap size={12} />} className="hidden md:flex">
          {engineUsed === 'avr' ? t('wb.sim.engineReal') : t('wb.sim.engineTranslator')}
        </Chip>
      )}
    </div>
  )
}

// ---------------- painel esquerdo: editor + monitor série ----------------
export function EditorPane() {
  const t = useT()
  const consoleOpen = useStore((s) => s.consoleOpen)
  const n = useStore((s) => s.serial.length)
  const set = useStore((s) => s.set)
  const consoleTab = useStore((s) => s.consoleTab)
  const scopeOpen = useStore((s) => s.scopeOpen)
  const hasNvm = useStore((s) => !!s.nvm)
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0d0d0d]">
      <div className="flex-1 min-h-0">
        <CodePanel toolbar={<SimToolbar />} />
      </div>
      <div className={`shrink-0 border-t border-white/10 bg-black flex flex-col ${consoleOpen ? 'h-60' : 'h-9'}`}>
        <div className="flex items-center gap-2 px-3 h-9 shrink-0 text-xs">
          <Button
            size="sm"
            variant="light"
            className="h-7 px-1.5 gap-2 text-neutral-300 data-[hover=true]:text-white font-medium text-xs"
            onPress={() => set({ consoleOpen: !consoleOpen })}
            startContent={<span className="text-neutral-500 flex items-center gap-2">{consoleOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<Terminal size={14} className="text-neutral-400" /></span>}
            endContent={n > 0 ? <Chip size="sm" variant="flat" classNames={{ closeButton: 'cursor-pointer', base: 'h-4', content: 'text-[10px] px-1 text-neutral-400' }}>{n}</Chip> : null}
          >
            {t('wb.console.serial')}
          </Button>
          {consoleOpen && (
            <Tabs
              size="sm"
              variant="light"
              aria-label={t('wb.console.tabsAria')}
              selectedKey={consoleTab}
              onSelectionChange={(k) => set({ consoleTab: String(k) })}
              classNames={{ closeButton: 'cursor-pointer', tabList: 'p-0 gap-0.5', tab: 'h-6 px-2', tabContent: 'text-[11px]' }}
            >
              <Tab key="monitor" title="Monitor" />
              <Tab key="plotter" title="Plotter" />
              <Tab key="mqtt" title="MQTT" />
            </Tabs>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            <WebGatewayButton />
            <Tooltip placement='bottom' content={t('wb.console.scopeTip')} size="sm" delay={300} closeDelay={0}>
              <Button size="sm" variant={scopeOpen ? 'flat' : 'light'} isIconOnly aria-label={t('wb.console.scope')} className="h-7 w-7 min-w-7 text-neutral-400 data-[hover=true]:text-white" onPress={() => set({ scopeOpen: !scopeOpen })}>
                <Waves size={14} />
              </Button>
            </Tooltip>
            <Tooltip placement='bottom' content={hasNvm ? t('wb.console.clearNvmTip') : t('wb.console.clearNvmEmpty')} size="sm" delay={300} closeDelay={0}>
              <Button
                size="sm"
                variant="light"
                aria-label={t('wb.console.clearNvm')}
                className="h-7 min-w-0 px-2 text-xs text-neutral-500 data-[hover=true]:text-white"
                startContent={<DatabaseZap size={13} />}
                onPress={async () => {
                  if (
                    await confirmDialog({
                      title: t('wb.console.clearNvm'),
                      message: t('wb.console.clearNvmMsg'),
                      confirmLabel: t('common.delete'),
                      danger: true,
                    })
                  )
                    clearNvm()
                }}
              >
                {t('wb.console.clearNvm')}
              </Button>
            </Tooltip>
            <Button size="sm" variant="light" className="h-7 min-w-0 px-2 text-xs text-neutral-500 data-[hover=true]:text-white" onPress={() => set({ serial: [] })}>
              {t('wb.console.clear')}
            </Button>
          </div>
        </div>
        {consoleOpen && <div className="flex-1 min-h-0">{consoleTab === 'plotter' ? <SerialPlotter /> : consoleTab === 'mqtt' ? <MqttPanel /> : <SerialMonitor />}</div>}
        <Oscilloscope />
      </div>
    </div>
  )
}
