// Portas lógicas e flip-flops abstratos: módulo branco com o símbolo impresso (como no Velxio).
import GATES_FF from '@shared/parts/gates.js'
import { LogicModule } from './_groupF.jsx'

const FF_TITLE = { d: 'D', jk: 'JK', t: 'T' }

function make(def) {
  const kind = def.gate ? 'gate' : 'ff'
  function Model({ part }) {
    return <LogicModule part={part} def={def} kind={kind} fn={def.gate?.fn} title={def.gate ? def.short : `FF ${FF_TITLE[def.ff]}`} />
  }
  return { type: def.type, Model }
}

export default GATES_FF.map(make)
