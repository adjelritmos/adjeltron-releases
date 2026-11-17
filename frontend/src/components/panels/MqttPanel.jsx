// Painel MQTT (o "telemóvel/dashboard"): publica em qualquer tópico e escolhe o filtro (+ e #).
//  - app desktop: vê o broker MQTT do adjeltron (o mesmo onde o Node-RED liga,
//    mqtt://localhost:1883) ou o broker verdadeiro a que o sketch está ligado (broker.hivemq.com…);
//  - web: vê o broker MQTT simulado no browser (o mesmo a que os sketches se ligam).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ButtonGroup, Chip, Input, Popover, PopoverContent, PopoverTrigger, ScrollShadow, Switch, Tooltip } from '@heroui/react'
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Download, Eraser, Globe, Info, Radio, SendHorizontal, Server } from 'lucide-react'
import { useNet } from '../../contexts/netStore.js'
import { mqttPublish, mqttSubscribe, mqttTarget } from '../../services/simControl.js'
import { apiUrl } from '../../services/apiBase.js'
import { DESKTOP } from '../../services/platform.js'
import { useT } from '../../i18n/index.js'

const hhmmss = (t) => new Date(t).toTimeString().slice(0, 8)
const INPUT_CLS = { input: 'font-mono text-xs', inputWrapper: 'h-7 min-h-7' }
const CHIP_CLS = { base: 'h-5 bg-white/[0.06]', content: 'text-[10px] px-1 text-neutral-400' }

// texto com botão de copiar
function CopyLine({ text }) {
  const t = useT()
  const [ok, setOk] = useState(false)
  return (
    <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black px-2 h-7">
      <span className="font-mono text-[11px] text-white flex-1 truncate select-all">{text}</span>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        aria-label={t('tools.mqtt.copy', { text })}
        className="h-6 w-6 min-w-6 text-neutral-400 data-[hover=true]:text-white"
        onPress={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setOk(true)
            setTimeout(() => setOk(false), 1500)
          })
        }}
      >
        {ok ? <Check size={12} /> : <Copy size={12} />}
      </Button>
    </div>
  )
}

// versão web: o broker é simulado no browser (sem rede)
function WebBrokerInfo() {
  const t = useT()
  return (
    <Popover placement="top-end" offset={8}>
      <PopoverTrigger>
        <Button size="sm" variant="light" isIconOnly aria-label={t('tools.mqtt.aboutBroker')} className="h-7 w-7 min-w-7 text-neutral-500 data-[hover=true]:text-white">
          <Info size={13} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-80 items-stretch gap-2 text-[12px] leading-relaxed text-neutral-300">
        <div className="text-white font-medium text-[13px]">{t('tools.mqtt.simTitle')}</div>
        <p>
          {t({
            pt: <>Na versão web a simulação corre no browser, com um broker MQTT próprio. Qualquer endereço em <span className="font-mono">client.setServer(…)</span> (localhost, broker.hivemq.com…) liga o ESP32 simulado a este broker.</>,
            en: <>In the web version the simulation runs in the browser, with its own MQTT broker. Any address in <span className="font-mono">client.setServer(…)</span> (localhost, broker.hivemq.com…) connects the simulated ESP32 to this broker.</>,
          })}
        </p>
        <p>{t('tools.mqtt.simPanel')}</p>
        <p className="text-neutral-500">{t('tools.mqtt.simDesktopOnly')}</p>
      </PopoverContent>
    </Popover>
  )
}

// guia rápido: ligar o Node-RED (ou outro cliente MQTT) ao broker do adjeltron
function NodeRedGuide({ stats }) {
  const t = useT()
  if (!DESKTOP) return <WebBrokerInfo />
  const port = stats?.tcpPort || 1883
  const lan = stats?.ips?.[0]
  return (
    <Popover placement="top-end" offset={8}>
      <PopoverTrigger>
        <Button size="sm" variant="light" isIconOnly aria-label={t('tools.mqtt.howNodeRed')} className="h-7 w-7 min-w-7 text-neutral-500 data-[hover=true]:text-white">
          <Info size={13} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-80 items-stretch gap-2 text-[12px] leading-relaxed text-neutral-300">
        <div className="text-white font-medium text-[13px]">{t('tools.mqtt.guideTitle')}</div>
        <p>{t('tools.mqtt.guideIntro')}</p>
        <CopyLine text={`mqtt://localhost:${port}`} />
        {stats?.wsPort && <CopyLine text={`ws://localhost:${stats.wsPort}/mqtt`} />}
        {lan && (
          <p className="text-neutral-500">
            {t('tools.mqtt.otherComputer')} <span className="font-mono text-neutral-300">{lan}:{port}</span>
          </p>
        )}
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>
            {t({
              pt: <>No Node-RED, num nó <b>mqtt in</b> / <b>mqtt out</b>, crie o servidor <span className="font-mono">localhost</span>, porta <span className="font-mono">{port}</span> (MQTT 3.1.1 ou 5).</>,
              en: <>In Node-RED, in an <b>mqtt in</b> / <b>mqtt out</b> node, create the server <span className="font-mono">localhost</span>, port <span className="font-mono">{port}</span> (MQTT 3.1.1 or 5).</>,
            })}
          </li>
          <li>
            {t({
              pt: <>No sketch use <span className="font-mono">client.setServer("localhost", {port})</span> — é este broker.</>,
              en: <>In the sketch use <span className="font-mono">client.setServer("localhost", {port})</span> — that is this broker.</>,
            })}
          </li>
          <li>
            {t({
              pt: <>Ex.: <span className="font-mono">robolab/esp32/pot</span> (mqtt in) e <span className="font-mono">robolab/esp32/led</span> com 1/0 (mqtt out), exemplo «ESP32 MQTT: LED e potenciómetro».</>,
              en: <>E.g. <span className="font-mono">robolab/esp32/pot</span> (mqtt in) and <span className="font-mono">robolab/esp32/led</span> with 1/0 (mqtt out), example «ESP32 MQTT: LED e potenciómetro».</>,
            })}
          </li>
        </ol>
        <p className="text-neutral-500">
          {t({
            pt: <>Com <span className="font-mono">"broker.hivemq.com"</span> (ou outro broker público) o ESP32 simulado liga-se mesmo pela Internet: ponha o mesmo broker no Node-RED.</>,
            en: <>With <span className="font-mono">"broker.hivemq.com"</span> (or another public broker) the simulated ESP32 really connects over the Internet: use the same broker in Node-RED.</>,
          })}
        </p>
        <Button as="a" href={apiUrl('/api/node-red-flow')} download="node-red-robolab.json" size="sm" variant="flat" startContent={<Download size={13} />} className="h-7 text-xs">
          {t('tools.mqtt.downloadFlow')}
        </Button>
        <p className="text-neutral-500 text-[11px]">{t('tools.mqtt.importHelp')}</p>
      </PopoverContent>
    </Popover>
  )
}

export function MqttPanel() {
  const t = useT()
  const log = useNet((s) => s.log)
  const stats = useNet((s) => s.stats)
  const subscribed = useNet((s) => s.subscribed)
  const curFilter = useNet((s) => s.filter)
  const error = useNet((s) => s.error)
  const target = useNet((s) => s.target)
  const setNet = useNet((s) => s.set)
  const [filter, setFilter] = useState(curFilter)
  const [topic, setTopic] = useState('robolab/esp32/led')
  const [payload, setPayload] = useState('1')
  const [retain, setRetain] = useState(false)
  const ref = useRef()

  // subscreve ao abrir o painel
  useEffect(() => {
    if (!subscribed) mqttSubscribe(curFilter || '#')
  }, [])
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [log])

  // tópicos vistos recentemente (para escolher com um clique)
  const recent = useMemo(() => [...new Set(log.slice(-80).map((m) => m.topic).reverse())].slice(0, 6), [log])
  const publish = (p = payload) => {
    if (!topic.trim()) return
    mqttPublish(topic.trim(), p, retain)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <form
        className="flex flex-wrap items-center gap-1.5 gap-y-1 px-2 py-1 border-b border-white/10 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          mqttSubscribe(filter.trim() || '#')
        }}
      >
        <Input size="sm" variant="bordered" aria-label={t('tools.mqtt.filterLabel')} placeholder={t('tools.mqtt.filterPh')} value={filter} onValueChange={setFilter} classNames={{ ...INPUT_CLS, base: 'w-36 shrink-0' }} startContent={<Radio size={12} className="text-neutral-500 shrink-0" />} />
        <Button size="sm" type="submit" variant="flat" className="h-7 min-w-0 px-2 text-xs">
          {t('tools.mqtt.subscribe')}
        </Button>
        {subscribed && (
          <Chip size="sm" variant="flat" classNames={{ base: 'h-5 bg-white/[0.06]', content: 'text-[10px] px-1 text-neutral-400 font-mono' }}>
            {curFilter}
          </Chip>
        )}
        <div className="ml-auto flex items-center gap-1">
          <BrokerPicker stats={stats} target={target} />
          {stats && (
            <Tooltip
              content={!DESKTOP ? t('tools.mqtt.simInBrowser') : stats.external ? t('tools.mqtt.externalClients', { ids: stats.externalIds.join(', ') }) : t('tools.mqtt.noExternal', { port: stats.tcpPort || 1883 })}
              size="sm"
              delay={300}
              closeDelay={0}
            >
              <Chip size="sm" variant="flat" classNames={CHIP_CLS}>
                {t('tools.mqtt.stats', { sketches: stats.sketches, external: stats.external, retained: stats.retained })}
              </Chip>
            </Tooltip>
          )}
          <NodeRedGuide stats={stats} />
          <Tooltip content={t('tools.mqtt.clear')} size="sm" delay={300} closeDelay={0}>
            <Button size="sm" variant="light" isIconOnly aria-label={t('tools.mqtt.clearAria')} className="h-7 w-7 min-w-7 text-neutral-500 data-[hover=true]:text-white" onPress={() => setNet({ log: [] })}>
              <Eraser size={13} />
            </Button>
          </Tooltip>
        </div>
      </form>
      <ScrollShadow ref={ref} size={16} className="flex-1 font-mono text-[12px] px-3 py-1 bg-black">
        {log.map((m) => (
          <div key={m.id} className="flex gap-2 items-baseline whitespace-pre-wrap leading-5 cursor-pointer hover:bg-white/[0.04]" onClick={() => setTopic(m.topic)} title={t('tools.mqtt.clickTopic')}>
            <span className="text-neutral-600 shrink-0">{hhmmss(m.at)}</span>
            {m.dir === 'out' ? <ArrowUpRight size={12} className="text-neutral-500 shrink-0 self-center" /> : <ArrowDownLeft size={12} className="text-white shrink-0 self-center" />}
            <span className="text-white shrink-0">{m.topic}</span>
            <span className="text-neutral-300 break-all">{m.payload}</span>
            {m.retain && <span className="text-[10px] text-neutral-500 shrink-0">{t('tools.mqtt.retained')}</span>}
          </div>
        ))}
        {!log.length && (
          <div className="text-neutral-600 py-1">
            {t('tools.mqtt.empty')} <span className="text-neutral-400">client.setServer("localhost", {stats?.tcpPort || 1883})</span>{!DESKTOP ? <> + <span className="text-neutral-400">client.publish(…)</span> {t('tools.mqtt.emptyWeb')}</> : <> + <span className="text-neutral-400">client.publish(…)</span> {t('tools.mqtt.emptyDesktop')} (<span className="text-neutral-400">mqtt://localhost:{stats?.tcpPort || 1883}</span>).</>}
          </div>
        )}
      </ScrollShadow>
      {error && <div className="px-3 py-0.5 text-[11px] text-red-400 border-t border-white/10">{error}</div>}
      {target === 'sketch' && stats?.watching?.remote && stats.watching.state !== 'ligado' && (
        <div className="px-3 py-0.5 text-[11px] text-neutral-400 border-t border-white/10">
          {stats.watching.label}: {stats.watching.state}
        </div>
      )}
      <form
        className="flex items-center gap-1.5 px-2 py-1.5 border-t border-white/10 shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          publish()
        }}
      >
        <Input size="sm" variant="bordered" aria-label={t('tools.mqtt.topicLabel')} placeholder={t('tools.mqtt.topicPh')} value={topic} onValueChange={setTopic} classNames={{ ...INPUT_CLS, base: 'flex-1 min-w-24' }} list="mqtt-topics" />
        <datalist id="mqtt-topics">
          {recent.map((tp) => (
            <option key={tp} value={tp} />
          ))}
        </datalist>
        <Input size="sm" variant="bordered" aria-label={t('tools.mqtt.messageLabel')} placeholder={t('tools.mqtt.messagePh')} value={payload} onValueChange={setPayload} classNames={{ ...INPUT_CLS, base: 'flex-1 min-w-16' }} />
        <ButtonGroup size="sm" variant="flat">
          <Tooltip content={t('tools.mqtt.publishValue', { v: '1', topic: topic || '…' })} size="sm" delay={300} closeDelay={0}>
            <Button className="h-7 min-w-0 px-2 text-xs font-mono" onPress={() => publish('1')} aria-label={t('tools.mqtt.publishN', { v: 1 })}>
              1
            </Button>
          </Tooltip>
          <Tooltip content={t('tools.mqtt.publishValue', { v: '0', topic: topic || '…' })} size="sm" delay={300} closeDelay={0}>
            <Button className="h-7 min-w-0 px-2 text-xs font-mono" onPress={() => publish('0')} aria-label={t('tools.mqtt.publishN', { v: 0 })}>
              0
            </Button>
          </Tooltip>
        </ButtonGroup>
        <Tooltip content={t('tools.mqtt.retainTip')} size="sm" delay={300} closeDelay={0}>
          <div className="flex items-center">
            <Switch size="sm" isSelected={retain} onValueChange={setRetain} aria-label={t('tools.mqtt.retainLabel')} classNames={{ label: 'text-[11px] text-neutral-400' }}>
              {t('tools.mqtt.retained')}
            </Switch>
          </div>
        </Tooltip>
        <Button size="sm" type="submit" variant="bordered" isIconOnly aria-label={t('tools.mqtt.publish')} isDisabled={!topic.trim()} className="h-7 w-7 min-w-7">
          <SendHorizontal size={14} />
        </Button>
      </form>
    </div>
  )
}

// escolher o broker que o painel vê: o do adjeltron ou o broker verdadeiro do sketch
function BrokerPicker({ stats, target }) {
  const t = useT()
  if (!DESKTOP)
    return (
      <Tooltip content={t('tools.mqtt.simBrokerTip')} size="sm" delay={300} closeDelay={0}>
        <Chip size="sm" variant="flat" startContent={<Server size={12} />} classNames={{ base: 'h-7 bg-white/[0.06]', content: 'text-[11px] text-neutral-300' }}>
          {t('tools.mqtt.simBroker')}
        </Chip>
      </Tooltip>
    )
  const sk = stats?.sketch
  const remote = sk?.remote ? `${sk.host}:${sk.port}` : null
  const w = stats?.watching
  const bad = w && w.state !== 'ligado'
  return (
    <ButtonGroup size="sm" variant="flat">
      <Tooltip content={t('tools.mqtt.localTip', { port: stats?.tcpPort || 1883 })} size="sm" delay={300} closeDelay={0}>
        <Button className={`h-7 min-w-0 px-2 text-[11px] ${target === 'local' ? 'bg-white/20 text-white' : 'text-neutral-400'}`} startContent={<Server size={12} />} onPress={() => mqttTarget('local')} aria-label={t('tools.mqtt.viewLocal')}>
          localhost:{stats?.tcpPort || 1883}
        </Button>
      </Tooltip>
      <Tooltip
        content={remote ? `${t('tools.mqtt.viewRemote', { remote })}${target === 'sketch' && w ? ` — ${w.state}` : ''}` : sk ? t('tools.mqtt.sketchOnLocal') : t('tools.mqtt.sketchNoBroker')}
        size="sm"
        delay={300}
        closeDelay={0}
      >
        <Button
          className={`h-7 min-w-0 px-2 text-[11px] max-w-48 ${target === 'sketch' ? 'bg-white/20 text-white' : 'text-neutral-400'} ${target === 'sketch' && remote && bad ? 'text-red-400' : ''}`}
          startContent={<Globe size={12} className="shrink-0" />}
          onPress={() => mqttTarget('sketch')}
          aria-label={t('tools.mqtt.viewSketch')}
        >
          <span className="truncate">{remote || t('tools.mqtt.sketchBroker')}</span>
        </Button>
      </Tooltip>
    </ButtonGroup>
  )
}
