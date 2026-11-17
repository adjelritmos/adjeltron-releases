// Som do buzzer ativo (~2,3 kHz) via WebAudio
let ctx = null
let osc = null
let gain = null
export function buzzerSound(on) {
  if (!on && !osc) return
  try {
    audioCtx()
    if (on && !osc) {
      osc = ctx.createOscillator()
      gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 2300
      gain.gain.value = 0.04
      osc.connect(gain).connect(ctx.destination)
      osc.start()
    } else if (!on && osc) {
      osc.stop()
      osc.disconnect()
      osc = null
    }
  } catch {
    /* áudio indisponível */
  }
}

// ---------- vozes de tom (buzzer passivo e afins) ----------
// toneVoice(id, freq): mantém um oscilador por peça a tocar `freq` Hz (0 = calar).
// Tem de ser chamado com regularidade (a cada frame/fotografia): uma voz que não
// é atualizada há mais de 350 ms cala-se sozinha (simulação parada ou em pausa).
const voices = new Map()
let watchdog = null
// O navegador cria o áudio "suspenso" quando não nasce de um clique/tecla (o som do buzzer
// liga-se a partir das mensagens da simulação): retoma-se aqui e no primeiro gesto do
// utilizador, senão o buzzer ficava mudo.
function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {})
  return ctx
}
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (ctx && ctx.state !== 'suspended') return
    try {
      audioCtx()
    } catch {
      /* áudio indisponível */
    }
  }
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true, passive: true })
}
function stopVoice(id) {
  const v = voices.get(id)
  if (!v) return
  try {
    v.gain.gain.setTargetAtTime(0, v.ac.currentTime, 0.01)
    v.osc.stop(v.ac.currentTime + 0.05)
  } catch {
    /* já parado */
  }
  voices.delete(id)
}
export function toneVoice(id, freq) {
  const now = performance.now()
  if (!(freq > 0)) return stopVoice(id)
  try {
    let v = voices.get(id)
    if (!v) {
      const ac = audioCtx()
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      g.gain.value = 0.03
      osc.connect(g).connect(ac.destination)
      osc.start()
      v = { ac, osc, gain: g }
      voices.set(id, v)
    }
    if (Math.abs(v.osc.frequency.value - freq) > 0.5) v.osc.frequency.setTargetAtTime(freq, v.ac.currentTime, 0.005)
    v.last = now
    if (!watchdog) {
      watchdog = setInterval(() => {
        const t = performance.now()
        for (const [k, x] of voices) if (t - x.last > 350) stopVoice(k)
        if (!voices.size) {
          clearInterval(watchdog)
          watchdog = null
        }
      }, 150)
    }
  } catch {
    /* áudio indisponível */
  }
}

// ---------- campainha ding-dong ----------
// chime(freq): uma pancada numa lâmina metálica (fundamental + harmónico, decaimento ~1,2 s)
export function chime(freq) {
  try {
    const ac = audioCtx()
    const t = ac.currentTime
    for (const [f, a] of [[freq, 0.12], [freq * 2.76, 0.03]]) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(a, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0005, t + 1.2)
      osc.connect(g).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 1.25)
    }
  } catch {
    /* áudio indisponível */
  }
}
