// Ligação ao motor de simulação: corre sempre num Web Worker do browser (sim/worker.js) —
// no site e na app desktop. Na app desktop o worker liga-se também ao servidor Rust do Tauri
// (compilação real, broker MQTT na rede, TCP/HTTP do ESP32): ver sim/desktop/net.js.
import { compileFogu } from '../engine/fogu/fogu.js'
import { useStore } from '../contexts/store.js'
import { simRef, createRemoteEngine } from '../contexts/simRef.js'
import { buzzerSound } from '../functions/audio.js'
import { DEFS } from '@shared/components.js'
import { feedPlotter } from '../components/panels/SerialPlotter.jsx'
import { feedScope } from '../components/panels/Oscilloscope.jsx'
import { useNet, netMessage } from '../contexts/netStore.js'
import { apiUrl } from './apiBase.js'
import { gatewayReply, initGateway } from './gateway.js'
import { DESKTOP, SERVER, SERVER_API } from './platform.js'
import { t, useLang } from '../i18n/index.js'

let worker = null
function connectWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../sim/worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (m) => onMessage(m.data)
  worker.onerror = (e) => {
    log(t('wb.sim.workerError', { msg: e.message || t('wb.sim.failed') }), 'error')
    useStore.getState().set({ compiling: false })
    pendingStart?.(false)
  }
  // com servidor (app desktop ou backend do site): compilação real e rede pelo servidor
  if (SERVER) worker.postMessage({ type: 'desktop', api: SERVER_API })
  // idioma das mensagens do motor e do catálogo dentro do worker
  worker.postMessage({ type: 'lang', lang: useLang.getState().lang })
  desktopLang(useLang.getState().lang)
  return worker
}
// site com backend no Render: acorda o servidor logo que a bancada abre (no plano grátis adormece
// e demora ~1 min a arrancar); a simulação não espera por ele
if (SERVER && !DESKTOP) fetch(`${SERVER_API}/api/health`).catch(() => {})
// app desktop: o servidor Rust também gera mensagens (erros de compilação…) no idioma escolhido
const desktopLang = (lang) => DESKTOP && post('/api/lang', { lang }).catch(() => {})
useLang.subscribe((s, prev) => {
  if (s.lang === prev.lang) return
  if (worker) worker.postMessage({ type: 'lang', lang: s.lang })
  desktopLang(s.lang)
})

// motor pronto a receber mensagens
const ready = () => (connectWorker(), Promise.resolve())

// Fogu → C++ antes de compilar (engine/fogu/fogu.js). Os erros do C++ gerado não têm a linha
// do programa Fogu: aparecem sem linha, com a indicação de que vêm do C++ gerado.
function sketchOf(st) {
  if (st.lang !== 'fogu') return { ok: true, code: st.code }
  // os nomes dos pinos (e o LED, o botão, o PWM) dependem da placa do projeto
  const board = st.parts.find((p) => DEFS[p.type]?.board)?.type || 'arduino'
  const r = compileFogu(st.code, { board })
  return r.ok ? { ok: true, code: r.cpp, fogu: true } : { ok: false, result: { ok: false, js: null, diagnostics: r.diagnostics, compiler: 'Fogu' } }
}
const foguDiags = (r) => (r && useStore.getState().lang === 'fogu' ? { ...r, diagnostics: (r.diagnostics || []).map((d) => (d.message?.startsWith('Fogu:') ? d : { ...d, line: 0, col: 0, message: t('wb.sim.generatedCpp', { line: d.line ? t('wb.sim.lineN', { n: d.line }) : '', msg: d.message }) })) } : r)
const send = (msg) => {
  connectWorker().postMessage(msg)
  return true
}
let pendingStart = null
const log = (text, level) => {
  const st = useStore.getState()
  st.set({ serial: [...st.serial, { text: text.replace(/\n$/, ''), level }].slice(-400) })
}

let lastTele = 0
function onMessage(msg) {
  if (msg.type === 'gw-res') return gatewayReply(msg) // página do WebServer do ESP32
  if (netMessage(msg)) return // sessão / MQTT (netStore.js)
  const st = useStore.getState()
  switch (msg.type) {
    case 'compile':
      msg = { ...msg, result: foguDiags(msg.result) }
      st.set({ compileResult: { ...msg.result, at: Date.now() } })
      for (const d of msg.result.diagnostics) log(`${d.severity === 'error' ? '✖' : '⚠'} sketch.ino${d.line ? `:${d.line}:${d.col}` : ''} ${d.message}`, d.severity === 'error' ? 'error' : 'warn')
      return
    case 'error':
      st.set({ simError: msg.msg, compiling: false, ...(msg.tab === 'diag' ? { diagOpen: true } : {}), ...(msg.tab === 'code' ? { editorOpen: true } : {}) })
      log(`✖ ${msg.msg}`, 'error')
      pendingStart?.(false)
      return
    case 'started':
      st.set({ simEngineUsed: msg.engine || null })
      simRef.engine = createRemoteEngine((part, pin) => send({ type: 'probe', part, pin }))
      simRef.ink = {} // desenho novo a cada simulação
      simRef.inkVer++
      simRef.wantFrame = true // mostra o robô ao arrancar (a câmara depois segue-o)
      st.set({ mode: 'sim', selected: null, pendingPin: null, compiling: false })
      send({ type: 'speed', value: st.simSpeed })
      if (scopePins.length) send({ type: 'scope', pins: scopePins }) // osciloscópio já aberto
      pendingStart?.(true)
      return
    case 'nvm':
      // EEPROM / Preferences gravadas pelo sketch: ficam no projeto (localStorage)
      st.set({ nvm: msg.data })
      return
    case 'snap': {
      const e = simRef.engine
      if (!e) return
      e.apply(msg)
      if (msg.ink) {
        for (const [id, pts] of Object.entries(msg.ink)) (simRef.ink[id] ||= []).push(...pts)
        simRef.inkVer++
      }
      const patch = {}
      if (msg.serial) patch.serial = [...st.serial, ...msg.serial].slice(-400)
      if (msg.serial) feedPlotter(msg.serial)
      if (msg.scope) feedScope(msg.scope)
      // som do buzzer em todas as fotografias (não só a cada 100 ms): os bips curtos não se perdem
      buzzerSound(msg.buzzers.some((b) => b.on) && !st.paused && !msg.paused)
      const now = performance.now()
      if (now - lastTele > 100) {
        lastTele = now
        if (msg.shortCircuit && !st.simError) Object.assign(patch, { simError: msg.shortCircuit, paused: true })
        patch.telemetry = { ...msg, vehicles: msg.vehicles }
      }
      if (Object.keys(patch).length) st.set(patch)
      return
    }
  }
}

// Verificação do código enquanto se escreve (erros no editor), por pedidos HTTP:
//  1) rápida (site: /api/compile; desktop: tradutor aqui + clang++ no servidor Rust);
//  2) só no desktop: real (/api/compile/real no servidor Rust: arduino-cli da placa), que
//     substitui a anterior quando chega. Uno/Nano/Mega: automática; ESP32/Pico: só no "Verificar".
let compileSeq = 0
const AVR_BOARDS = (type) => ['arduino', 'nano', 'mega'].includes(type) || DEFS[type]?.board === true || DEFS[type]?.board?.profile === 'mega'
const desktopCompile = () => import('../sim/desktop/compile.js')
const post = (path, body) => fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
export async function compileCode(code, { real = 'auto' } = {}) {
  const st = useStore.getState()
  const sk = sketchOf({ ...st, code })
  if (!sk.ok) {
    st.set({ compileResult: { ...sk.result, at: Date.now() }, compiling: false, compileNetError: null })
    return sk.result
  }
  code = sk.code
  const board = st.parts.find((p) => DEFS[p.type]?.board)?.type
  const libs = st.libs || []
  st.set({ compiling: true })
  const seq = ++compileSeq
  let r = null
  try {
    if (SERVER) r = await (await desktopCompile()).compileSketch(code, { board, libs })
    else {
      // sem servidor: o tradutor corre aqui (nada vai à rede)
      r = (await import('@engine/compile-fast.js')).compileFast(code, { board, libs })
    }
    r = foguDiags(r)
    if (seq === compileSeq) st.set({ compileResult: { ...r, at: Date.now() }, compileNetError: null })
  } catch (e) {
    if (seq === compileSeq) st.set({ compileNetError: e.message || t('wb.sim.noNetwork'), compiling: false })
    return null
  }
  const wantReal = SERVER && st.simEngine !== 'fast' && (real === true || (real === 'auto' && AVR_BOARDS(board || 'arduino')))
  if (!wantReal) {
    if (seq === compileSeq) st.set({ compiling: false })
    return r
  }
  try {
    st.set({ compiling: 'real' })
    const rr = await (await desktopCompile()).compileReal(code, { board, libs })
    // só se o código não mudou entretanto
    if (rr?.available && seq === compileSeq && sketchOf(useStore.getState()).code === code) {
      st.set({ compileResult: { ...foguDiags(rr), at: Date.now() } })
      return rr
    }
  } catch {
    /* fica a verificação rápida */
  } finally {
    if (seq === compileSeq) st.set({ compiling: false })
  }
  return r
}

export async function startSim() {
  const st = useStore.getState()
  st.set({ serial: [], simError: null, paused: false, compiling: true })
  simRef.inputs = {}
  for (const p of st.parts) {
    if (p.type === 'pot') simRef.inputs[p.id] = { value: p.config?.value ?? 0.5 }
    const ia = DEFS[p.type]?.interactive
    if (ia) simRef.inputs[p.id] = { value: p.config?.value ?? ia.default ?? 0, on: !!p.config?.on, x: 0.5, y: 0.5 }
  }
  try {
    await ready()
  } catch {
    st.set({ compiling: false, simError: t('wb.sim.engineUnavailable') })
    log(t('wb.sim.engineDidNotStart'), 'error')
    return false
  }
  const { parts, wires, track, realism, nvm, projectName, simEngine, libs } = useStore.getState()
  const sk = sketchOf(useStore.getState())
  if (!sk.ok) {
    const d = sk.result.diagnostics[0]
    st.set({ compileResult: { ...sk.result, at: Date.now() }, compiling: false, simError: t('wb.sim.foguError', { line: d?.line ? t('wb.sim.foguErrorLine', { n: d.line }) : '' }), editorOpen: true })
    log(`✖ ${d?.message || t('wb.sim.foguErrorLower')}`, 'error')
    return false
  }
  const code = sk.code
  return new Promise((resolve) => {
    pendingStart = (ok) => {
      pendingStart = null
      resolve(ok)
    }
    send({ type: 'start', parts, wires, code, track, realism, nvm, project: projectName, engine: simEngine, libs })
  })
}

function stopLocal() {
  simRef.engine = null
  simRef.inputs = {}
  buzzerSound(false)
  useStore.getState().set({ mode: 'build', paused: false, telemetry: null })
}

export function stopSim() {
  send({ type: 'stop' })
  stopLocal()
}

export function restartSim() {
  stopSim()
  return startSim()
}

// estado da física de corpos rígidos do browser para o backend (ver three/physics)
export function sendWorld(bodies, imu, joints, jaws, drop) {
  if (simRef.engine) send({ type: 'world', bodies, imu, joints, jaws, drop })
}

export function setPaused(paused) {
  send({ type: 'pause', paused })
  useStore.getState().set({ paused })
}
export function setSpeed(value) {
  send({ type: 'speed', value })
  useStore.getState().set({ simSpeed: value })
}

// instante do último clique: um clique rápido fica premido pelo menos MIN_PRESS ms (senão o
// programa — ex.: a biblioteca Keypad, que varre a matriz — podia não o chegar a ver)
const MIN_PRESS = 120
let pressedAt = 0
export function pressButton(id) {
  setInput(id, { pressed: true })
}
// controlo interativo de uma peça (slider de sensor, interruptor, joystick, tecla…)
export function setInput(id, data) {
  if (data.pressed || data.key) pressedAt = performance.now()
  simRef.inputs[id] = { ...(simRef.inputs[id] || {}), ...data }
  send({ type: 'input', id, data })
  useStore.getState().set({ inputsTick: Date.now() })
}
export function releaseButtons() {
  const held = performance.now() - pressedAt
  if (held < MIN_PRESS) return void setTimeout(releaseButtons, MIN_PRESS - held)
  let any = false
  for (const [id, v] of Object.entries(simRef.inputs)) {
    if (v.pressed || v.key) {
      simRef.inputs[id] = { ...v, pressed: false, key: null }
      any = true
    }
  }
  if (any) send({ type: 'input', release: true })
}
export function setPot(id, value) {
  simRef.inputs[id] = { value }
  send({ type: 'input', id, value })
  useStore.getState().updateConfig(id, { value })
}
// monitor série: envia uma linha para o Arduino (Serial.read/readString no sketch)
export function sendSerial(text) {
  const data = text.endsWith('\n') ? text : `${text}\n`
  send({ type: 'serial', data })
  log(`→ ${text}`, 'tx')
}

// osciloscópio: pinos a registar (até 4; [] desliga)
let scopePins = []
export function setScopePins(list) {
  scopePins = list
  send({ type: 'scope', pins: list })
}

// botão "Apagar EEPROM": EEPROM e Preferences do projeto voltam ao estado de fábrica
export function clearNvm() {
  const st = useStore.getState()
  st.set({ nvm: null })
  if (simRef.engine) send({ type: 'nvmClear' })
  else log(t({ pt: 'ℹ EEPROM / Preferences do projeto apagadas.', en: 'ℹ Project EEPROM / Preferences erased.' }), 'info')
}

// ---------- rede: painel MQTT ----------
// web: broker simulado no worker; desktop: o mesmo broker, aberto na rede pelo servidor Rust (Node-RED…) ou o
// broker verdadeiro a que o sketch está ligado
async function sendNow(msg) {
  try {
    await ready()
  } catch {
    return false
  }
  return send(msg)
}
export function mqttSubscribe(filter = '#') {
  useNet.getState().set({ subscribed: true, filter })
  return sendNow({ type: 'mqtt-sub', filter })
}
// painel MQTT: ver o broker do adjeltron ('local') ou o broker a que o sketch está ligado ('sketch')
export function mqttTarget(target) {
  useNet.getState().set({ target, log: [] })
  return sendNow({ type: 'mqtt-target', target })
}
export function mqttPublish(topic, payload, retain = false) {
  return sendNow({ type: 'mqtt-pub', topic, payload, retain })
}

// web: pedidos da página do WebServer do ESP32 (service worker → aqui → worker do simulador).
// No desktop a página é servida pelo servidor Rust (/api/gw/…), que fala diretamente com o worker.
if (!DESKTOP) initGateway((msg) => send({ ...msg, type: 'gw' }))
// desktop: o worker arranca já, para o broker MQTT (Node-RED) estar disponível antes da simulação
else connectWorker()
