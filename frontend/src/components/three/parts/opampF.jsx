// Amplificadores operacionais do grupo F: ideal (módulo com o símbolo), LM324, LM741, TL072 (DIP).
import OPAMP_DEFS from '@shared/parts/opampF.js'
import { Dip } from './_dip.jsx'
import { LogicModule } from './_groupF.jsx'
import { Badge, fmt } from './group-c-ui.jsx'

function make(def) {
  function Model({ part }) {
    if (def.amp.ideal) return <LogicModule part={part} def={def} kind="opamp" title="AMP-OP IDEAL" />
    return <Dip pins={def.pins} len={def.size[0]} text={def.short} sub={def.type === 'tl072' ? 'JFET OP-AMP' : 'OP-AMP'} />
  }
  function Overlay2D({ info, live }) {
    if (!live?.powered || !live.out) return null
    return <Badge info={info} text={`OUT ${live.out.map((v) => fmt(v, 2)).join(' / ')} V`} />
  }
  return { type: def.type, Model, Overlay2D }
}

export default OPAMP_DEFS.map(make)
