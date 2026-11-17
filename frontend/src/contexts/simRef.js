// Espelho do motor que corre no Web Worker (sim/worker.js). Os componentes 3D/2D leem daqui
// a cada frame; o estado chega por postMessage (~30 fotografias por segundo).
import * as THREE from 'three'

export const simRef = {
  engine: null, // RemoteEngine enquanto a simulação corre
  inputs: {}, // botões / potenciómetros mexidos no browser
  objects: new Map(), // partId -> THREE.Group
  mountObjects: new Map(), // `${partId}:${mount}` -> THREE.Group
  pick3D: null,
  // física de corpos rígidos (three/physics): chaves (partId ou `${partId}:${mount}`) cujo
  // grupo 3D é movido pelos corpos do Rapier — PartNode/MountGroup não lhes mexem
  physicsOwned: new Set(),
  // pessoas (def.walker) cuja posição é resolvida pela física (colisões): o modelo 3D mostra
  // simRef.inputs[id] sem suavização. physicsWalk = API do PhysicsWorld (walkTo/release)
  walkPhys: new Set(),
  // garras na física: partId → ângulo real das maxilas (graus de servo; param no objeto apertado)
  jawAngles: new Map(),
  physicsWalk: null,
  wantFrame: false, // pede à câmara 3D para enquadrar todas as peças
  // traços das canetas (def.pen): { [penId]: [[x,y,z] | null…] } — acumulados das fotografias
  // (msg.ink), apagados quando começa uma nova simulação; ficam à vista depois de parar
  ink: {},
  inkVer: 0,
}

export function createRemoteEngine(sendProbe) {
  const servoOf = new Map()
  let probeKey = null
  const e = {
    snap: null,
    pins: Array.from({ length: 20 }, () => ({ mode: 'INPUT', out: 0, duty: 0, pwm: false })),
    leds: [], motors: [], servos: [], irs: [], sonars: [], buzzers: [], vehicles: [], cubes: [],
    servoOf,
    circuit: { st: {} },
    trail: [],
    probes: {},
    hasArduino: false,
    timeMs: 0,
    realtime: 1,
    halted: false,
    shortCircuit: null,
    arduinoRunning: () => !!e.snap?.arduino,
    pinVoltage(part, pin) {
      const k = `${part}|${pin}`
      if (k !== probeKey) {
        probeKey = k
        sendProbe(part, pin)
      }
      return e.probes[k]
    },
    apply(s) {
      const tag = (arr) => arr.map((x) => ({ ...x, part: { id: x.id } }))
      e.snap = s
      e.pins = s.pins
      e.leds = tag(s.leds)
      e.motors = tag(s.motors)
      e.servos = tag(s.servos)
      e.irs = tag(s.irs)
      e.sonars = tag(s.sonars)
      e.buzzers = tag(s.buzzers)
      e.vehicles = s.vehicles.map((v) => ({ ...v, part: { id: v.id }, pose: { x: v.x, z: v.z, theta: v.theta } }))
      e.cubes = s.cubes.map((c) => ({ part: { id: c.id }, matrix: new THREE.Matrix4().fromArray(c.m), held: !!c.held, by: c.by || null }))
      servoOf.clear()
      for (const sv of e.servos) servoOf.set(sv.id, sv)
      e.circuit.st = Object.fromEntries(Object.entries(s.powered).map(([id, p]) => [id, { powered: p }]))
      e.hasArduino = s.arduino !== null
      e.timeMs = s.t
      e.realtime = s.realtime
      e.halted = s.halted
      e.shortCircuit = s.shortCircuit
      e.probes = s.probes || {}
      e.live = s.live || {}
      // rasto do veículo (construído aqui a partir das poses)
      const v = e.vehicles[0]
      if (v) {
        const last = e.trail[e.trail.length - 1]
        if (!last || Math.hypot(last[0] - v.pose.x, last[1] - v.pose.z) > 0.6) {
          e.trail.push([v.pose.x, v.pose.z])
          if (e.trail.length > 1500) e.trail.shift()
        }
      }
    },
  }
  return e
}

// depuração (só em desenvolvimento): window.__simRef na consola do browser
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__simRef = simRef
