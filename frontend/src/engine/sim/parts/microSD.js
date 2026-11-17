// Módulo microSD. O sistema de ficheiros (s.fs: Map caminho → conteúdo) é gerido pela
// biblioteca SD (../libs/SD.js) e mantém-se enquanto a simulação corre.
import { modulePower, powerDiagnose } from './_util.js'
import * as i18n from '../../../../../shared/i18n.js'

export default {
  type: 'microSD',
  stamp({ cond, s }) {
    if (s.damaged) return cond('VCC', 'GND', 1e-9)
    // ~1 mA em repouso, ~50 mA a escrever
    cond('VCC', 'GND', (s.busy ? 0.05 : 0.001) / 5)
  },
  update: (ctx) => modulePower(ctx, 4.5, 5.6, 6.5),
  step({ s, timeUs, invalidate }) {
    const busy = (s.busyUntil ?? 0) > timeUs
    if (busy !== !!s.busy) {
      s.busy = busy
      invalidate()
    }
  },
  output({ s, live }) {
    live.powered = !!s.powered && !s.damaged
    live.busy = !!s.busy
    live.files = s.fs ? [...s.fs].filter(([, v]) => v != null).map(([name, v]) => ({ name, size: v.length })) : []
    live.mounted = !!s.mounted
  },
  diagnose(ctx) {
    const { isC, name, issues, part } = ctx
    powerDiagnose(ctx, { label: i18n.m('VCC → 5V e GND → GND (o módulo tem regulador de 3,3 V)', 'VCC → 5V and GND → GND (the module has a 3.3 V regulator)') })
    const miss = ['CS', 'MOSI', 'MISO', 'SCK'].filter((p) => !isC(p))
    if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (no Uno: MOSI → D11, MISO → D12, SCK → D13, CS → D10 ou outro).`, `${name}: connect ${miss.join(', ')} (on the Uno: MOSI → D11, MISO → D12, SCK → D13, CS → D10 or another).`), parts: [part.id] })
  },
}
