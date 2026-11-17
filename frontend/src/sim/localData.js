// Dados que antes vinham do backend (exemplos, trechos de código, diagnóstico elétrico),
// agora calculados no próprio browser. Carregado só quando é preciso (import dinâmico).
import { PRESETS, CODE_SNIPPETS, CODE_BLINK } from '@engine/sim/examples.js'
import { exampleGroup } from '@shared/exampleGroups.js'
import { trackInfo } from '@shared/tracks.js'
import { m } from '@shared/i18n.js'
import { DEFS } from '@shared/components.js'
import { diagnose as diagnoseCircuit } from '@engine/sim/electrical.js'

// exemplos extra (um ficheiro por tema em src/engine/sim/examples/), como o examples/index.js do Bun
const FILES = import.meta.glob(['../engine/sim/examples/*.js', '!../engine/sim/examples/index.js'], { eager: true })
for (const k of Object.keys(FILES).sort()) {
  Object.assign(PRESETS, FILES[k].PRESETS || {})
  Object.assign(CODE_SNIPPETS, FILES[k].SNIPPETS || {})
}
// versões em Fogu dos exemplos em C++ (export FOGU = { chave: código })
for (const m of Object.values(FILES)) for (const [k, code] of Object.entries(m.FOGU || {})) if (PRESETS[k]) PRESETS[k].fogu = code

export function examples() {
  return Object.entries(PRESETS)
    .map(([id, p]) => {
      const g = exampleGroup(id, p.cat)
      return { id, name: p.name, track: p.track, cat: g.label, order: g.order }
    })
    .sort((a, b) => a.order - b.order)
}

export function example(id) {
  const p = PRESETS[id]
  if (!p) throw new Error(m('exemplo desconhecido', 'unknown example'))
  const { parts, wires } = p.build()
  // coloca o veículo na partida da pista
  const st = trackInfo(p.track).start
  for (const q of parts) if (DEFS[q.type]?.vehicle && !q.parent) Object.assign(q, { pos: [st.x, 0, st.z], rot: [0, (st.theta * 180) / Math.PI, 0] })
  // as duas versões do programa (C/C++ e Fogu com a biblioteca mcu), para o seletor de linguagem
  // do editor trocar o código do exemplo; sem versão em Fogu, fica null (o editor explica porquê)
  const alt = { cpp: p.lang === 'fogu' ? p.cpp || null : p.code, fogu: p.lang === 'fogu' ? p.code : p.fogu || null }
  return { id, projectName: p.name, track: p.track, code: p.code, lang: p.lang || 'cpp', alt, parts, wires }
}

export const snippets = () => ({ default: CODE_BLINK, snippets: CODE_SNIPPETS })
export const diagnose = (parts, wires) => diagnoseCircuit(parts, wires).issues
