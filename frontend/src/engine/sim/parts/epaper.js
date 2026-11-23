// Módulos e-paper (ver shared/parts/epaper.js). A imagem (s.img: 1 índice de paleta por ponto,
// já na orientação da face) é escrita pela biblioteca GxEPD2 e fica no ecrã mesmo sem
// alimentação. Durante uma atualização (s.ref = { t0, dur, full }) o pino BUSY fica ativo (HIGH; LOW nos UC81xx)
// e o browser mostra o piscar (live.ref = { p: progresso 0..1, full }).
// Para o browser: live.fb = RLE de pares Uint16 [n.º de pontos, índice] (base64), enviado só
// durante ~1 s após cada mudança (o browser guarda a última imagem por live.ver).
import { modulePower, powerDiagnose, boardPinsOnNet } from './_util.js'
import { EPAPER, faceDims } from '../../../../../shared/parts/epaper.js'
import { rle16 } from '../libs/_gfxG.js'
import * as i18n from '../../../../../shared/i18n.js'

function make(type) {
  const g = EPAPER[type]
  const [fw, fh] = faceDims(g)
  return {
    type,
    stamp({ cond, src, s, vd }) {
      if (s.damaged) return cond('VCC', 'GND', 1e-9)
      // ~5 µA em repouso; ~8 mA durante a atualização (bombas de carga do painel)
      cond('VCC', 'GND', (s.ref ? 0.008 : 0.0002) / 5)
      if (s.powered) {
        const v = Math.min(3.3, vd('VCC', 'GND'))
        // SSD16xx: BUSY a HIGH enquanto atualiza; UC8179/UC8159 (7,5" e 5,65"): ativo a LOW
        src('BUSY', 'GND', !!s.ref !== !!g.busyLow ? v : 0, 1000)
      }
    },
    update: (ctx) => modulePower(ctx, 2.3, 5.5, 6.5),
    step(ctx) {
      const { s, timeUs, invalidate, log } = ctx
      if (s.damaged && !s._dmg) {
        s._dmg = true
        log(i18n.m(`💥 E-paper ${g.inch}" danificado: tensão a mais no VCC (máx. 5,5 V).`, `💥 ${g.inch}" e-paper damaged: too much voltage on VCC (max 5.5 V).`), 'error')
      }
      if (!s.ref) return
      if (!s.powered) {
        // sem alimentação a meio: a atualização pára e fica o que já estava
        s.ref = null
        invalidate()
      } else if (timeUs >= s.ref.t0 + s.ref.dur) {
        s.ref = null
        s.refreshes = (s.refreshes || 0) + 1
        invalidate()
      }
    },
    output({ s, live, timeUs }) {
      live.powered = !!s.powered && !s.damaged
      live.w = fw
      live.h = fh
      if (s.img && s.ver !== s._sent) {
        s._sent = s.ver
        live.fb = rle16(s.img)
        live.ver = s.ver
        let ink = 0
        let red = 0
        let h = 0
        for (let i = 0; i < s.img.length; i++) {
          const v = s.img[i]
          if (v) {
            ink++
            if (v === 2) red++
            h = (h * 31 + i * (v + 1)) >>> 0
          }
        }
        live.ink = Math.round((ink / s.img.length) * 1000) / 1000
        live.red = red
        live.sig = h
        s.keep = 30
      } else if (s.keep > 0 && --s.keep === 0) live.fb = undefined
      live.ref = s.ref ? { p: Math.max(0, Math.min(1, Math.round(((timeUs - s.ref.t0) / s.ref.dur) * 100) / 100)), full: !!s.ref.full } : null
      live.refreshes = s.refreshes || 0
      live.sleep = !!s.sleep
    },
    diagnose(ctx) {
      const { isC, name, issues, part, nets, parts, vd } = ctx
      powerDiagnose(ctx, { vmax: 5.5, label: i18n.m('VCC → 3,3 V ou 5V e GND → GND', 'VCC → 3.3 V or 5V and GND → GND') })
      const miss = ['DIN', 'CLK', 'CS', 'DC'].filter((p) => !isC(p))
      if (miss.length) issues.push({ level: 'info', msg: i18n.m(`${name}: ligue ${miss.join(', ')} (SPI no Uno: DIN → D11, CLK → D13; CS e DC a pinos à escolha).`, `${name}: connect ${miss.join(', ')} (SPI on the Uno: DIN → D11, CLK → D13; CS and DC to any pins).`), parts: [part.id] })
      if (!isC('BUSY')) issues.push({ level: 'warn', msg: i18n.m(`${name}: BUSY não está ligado. A biblioteca precisa dele para saber quando o painel acabou de atualizar (senão espera sempre o tempo máximo ou envia dados a meio).`, `${name}: BUSY is not connected. The library needs it to know when the panel has finished refreshing (otherwise it always waits the maximum time or sends data midway).`), parts: [part.id] })
      else if (boardPinsOnNet(nets, parts, part.id, 'BUSY').some((x) => /^A[67]$/.test(x))) issues.push({ level: 'warn', msg: i18n.m(`${name}: BUSY está num pino só analógico.`, `${name}: BUSY is on an analog-only pin.`), parts: [part.id] })
      if (!isC('RST')) issues.push({ level: 'info', msg: i18n.m(`${name}: RST desligado — funciona, mas depois de hibernate() o painel não acorda. Ligue RST a um pino (ex.: D8).`, `${name}: RST disconnected — it works, but after hibernate() the panel does not wake up. Connect RST to a pin (e.g. D8).`), parts: [part.id] })
      const din = boardPinsOnNet(nets, parts, part.id, 'DIN')
      const clk = boardPinsOnNet(nets, parts, part.id, 'CLK')
      if (din.includes('D13') && clk.includes('D11')) issues.push({ level: 'warn', msg: i18n.m(`${name}: DIN e CLK trocados — DIN vai ao MOSI (D11) e CLK ao SCK (D13).`, `${name}: DIN and CLK swapped — DIN goes to MOSI (D11) and CLK to SCK (D13).`), parts: [part.id] })
      void vd
    },
  }
}

export const EPAPER_BEHAVIORS = Object.keys(EPAPER).map(make)
