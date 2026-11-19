// Fogu no editor: realce de sintaxe (CodeMirror), autocompletar da biblioteca mcu, deteção
// automática da linguagem de um código colado e o programa inicial para as placas.
import { StreamLanguage } from '@codemirror/language'
import { m as L } from '../../../../shared/i18n.js' // L(pt, en): textos no idioma da interface
import { DRIVERS } from './drivers.js'

// ---------------------------------------------------------------- realce
// os nomes dos tokens são etiquetas do Lezer (keyword, controlKeyword, variableName.function…)
const CONTROL = /^(if|else|while|for|in|loop|break|continue|return)\b/
const DEFINE = /^(let|const|fn)\b/
const MODULE = /^(import|from|export)\b/
const NOT_MCU = /^(match|struct|interface|embed|fg|select|case|new|this|nil)\b/ // existem no Fogu mas não na mcu
const TYPES = /^(int|int8|int16|int32|uint|uint8|uint16|uint32|byte|rune|bool|duration|str|char|bytes|pin|adc|pwm|i2c|spi)\b/
const BUILTINS = /^(print|len|str|int|char|bool|typeof|panic|int8|int16|int32|uint8|uint16|uint32|byte)\b(?=\s*\()/

export const foguLanguage = StreamLanguage.define({
  name: 'fogu',
  startState: () => ({ comment: false, tmpl: [], afterDot: false, afterColon: false, depth: 0 }),
  copyState: (s) => ({ ...s, tmpl: [...s.tmpl] }),
  token(stream, st) {
    // comentário de várias linhas
    if (st.comment) {
      if (stream.skipTo('*/')) {
        stream.match('*/')
        st.comment = false
      } else stream.skipToEnd()
      return 'comment'
    }
    // dentro de um modelo `…${expr}…`: o texto é string, ${ } é código normal
    const inTmplText = st.tmpl.length && st.tmpl[st.tmpl.length - 1] === -1
    if (inTmplText) {
      if (stream.match('`')) {
        st.tmpl.pop()
        return 'string.special'
      }
      if (stream.match('${')) {
        st.tmpl[st.tmpl.length - 1] = st.depth
        st.depth++
        return 'punctuation'
      }
      while (!stream.eol() && !stream.match('`', false) && !stream.match('${', false)) stream.next()
      return 'string.special'
    }
    if (stream.eatSpace()) return null
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'lineComment'
    }
    if (stream.match('/*')) {
      st.comment = true
      return 'blockComment'
    }
    if (stream.match('`')) {
      st.tmpl.push(-1)
      return 'string.special'
    }
    const dot = st.afterDot
    const colon = st.afterColon
    st.afterDot = false
    st.afterColon = false
    if (stream.match(/^"([^"\\]|\\.)*"?/) || stream.match(/^'([^'\\]|\\.)*'?/)) return 'string'
    // duração (500ms, 2s) e números (0xFF, 0b1010, 1_000)
    if (stream.match(/^\d[\d_]*(ns|us|ms|s|m|h|d)\b/)) return 'number unit'
    if (stream.match(/^(0x[\da-fA-F_]+|0b[01_]+|\d[\d_]*(\.\d+)?)/)) return 'number'
    if (stream.match('{')) {
      st.depth++
      return 'brace'
    }
    if (stream.match('}')) {
      st.depth--
      const top = st.tmpl.length - 1
      if (top >= 0 && st.tmpl[top] === st.depth) {
        st.tmpl[top] = -1 // volta ao texto do modelo
        return 'punctuation'
      }
      return 'brace'
    }
    if (stream.match('.') && !stream.match('.', false)) {
      st.afterDot = true
      return 'punctuation'
    }
    if (stream.match(':') && !stream.match(':', false)) {
      st.afterColon = true
      return 'punctuation'
    }
    // depois do ponto: método (com parênteses) ou propriedade (mcu.serial)
    if (dot) {
      if (stream.match(/^[A-Za-z_]\w*(?=\s*\()/)) return 'propertyName.function'
      if (stream.match(/^[A-Za-z_]\w*/)) return 'propertyName'
    }
    if (colon && stream.match(TYPES)) return 'typeName'
    if (stream.match(CONTROL)) return 'controlKeyword'
    if (stream.match(DEFINE)) return 'definitionKeyword'
    if (stream.match(MODULE)) return 'moduleKeyword'
    if (stream.match(/^(true|false)\b/)) return 'bool'
    if (stream.match(NOT_MCU)) return 'invalid'
    if (stream.match(/^mcu\b/)) return 'namespace'
    if (stream.match(BUILTINS)) return 'variableName.standard'
    if (stream.match(/^[A-Za-z_]\w*(?=\s*\()/)) return 'variableName.function'
    if (stream.match(/^[A-Z][A-Z0-9_]+\b/)) return 'variableName.constant'
    if (stream.match(/^[A-Za-z_]\w*/)) return 'variableName'
    if (stream.match(/^(=>|\*\*|==|!=|<=|>=|&&|\|\||\.\.|<<|>>|[+\-*/%<>=!|&^~])/)) return 'operator'
    if (stream.match(/^[()[\],;]/)) return 'punctuation'
    stream.next()
    return null
  },
  languageData: { commentTokens: { line: '//', block: { open: '/*', close: '*/' } }, closeBrackets: { brackets: ['(', '[', '{', '"', '`'] } },
})

// ---------------------------------------------------------------- autocompletar
const fn = (label, detail, info, apply) => ({ label, type: 'function', detail, info, apply: apply ?? `${label}()` })
const MCU_API = () => [
  fn('pin', '("D7") → pin', L('Um pino pelo nome (verificado na compilação): "D7"/"A0"/"PB5" no Uno, "GP15" no Pico, "GPIO4" no ESP32, "PA5" no Blue Pill.', 'A pin by name (checked at compile time): "D7"/"A0"/"PB5" on the Uno, "GP15" on the Pico, "GPIO4" on the ESP32, "PA5" on the Blue Pill.'), 'pin("")'),
  fn('led', '() → pin', L('O LED da placa (D13 no Uno, GP25 no Pico, GPIO2 no ESP32, PC13 no Blue Pill).', 'The onboard LED (D13 on the Uno, GP25 on the Pico, GPIO2 on the ESP32, PC13 on the Blue Pill).')),
  fn('button', '() → pin', L('O botão da placa (D2 no Uno — ligue um botão ao GND —, GP15 no Pico, BOOT no ESP32, PA0 no Blue Pill).', 'The board button (D2 on the Uno — wire a button to GND —, GP15 on the Pico, BOOT on the ESP32, PA0 on the Blue Pill).')),
  fn('delay', '(500ms)', L('Espera; os handlers correm entretanto.', 'Waits; handlers run in the meantime.'), 'delay(ms)'),
  fn('delayMs', '(n)', L('Espera n milissegundos (um int).', 'Waits n milliseconds (an int).'), 'delayMs()'),
  fn('delayUs', '(n)', L('Espera n microssegundos.', 'Waits n microseconds.'), 'delayUs()'),
  fn('millis', '() → int', L('Milissegundos desde o arranque.', 'Milliseconds since boot.')),
  fn('micros', '() → int', L('Microssegundos desde o arranque.', 'Microseconds since boot.')),
  fn('elapsed', L('(desde) → int', '(since) → int'), L('Milissegundos desde um valor de mcu.millis().', 'Milliseconds since a value from mcu.millis().'), 'elapsed()'),
  fn('poll', '()', L('Corre os handlers dos eventos que já aconteceram.', 'Runs the handlers of events that have already happened.')),
  fn('every', '(1s, handler)', L('Corre o handler a cada período.', 'Runs the handler every period.'), 'every(1s, () => {\n    \n})'),
  fn('adc', L('(pino) → adc', '(pin) → adc'), L('Entrada analógica: .read() (bruto) e .millivolts().', 'Analog input: .read() (raw) and .millivolts().'), 'adc()'),
  fn('pwm', L('(pino, { freq }) → pwm', '(pin, { freq }) → pwm'), L('PWM por hardware: .duty(0..100), .dutyFine(0..10000), .off().', 'Hardware PWM: .duty(0..100), .dutyFine(0..10000), .off().'), 'pwm(, { freq: 1000 })'),
  fn('i2c', '() → i2c', L('Barramento I2C: .probe(end), .write(end, bytes), .read(end, n), .writeRead(end, bytes, n).', 'I2C bus: .probe(addr), .write(addr, bytes), .read(addr, n), .writeRead(addr, bytes, n).')),
  fn('bytes', '(n) → bytes', L('n bytes a zero.', 'n zeroed bytes.'), 'bytes()'),
  fn('crc16', '(bytes) → int', L('CRC do Modbus RTU.', 'Modbus RTU CRC.'), 'crc16()'),
  fn('temperature', '() → int', L('Temperatura interna do chip (°C).', 'Internal chip temperature (°C).')),
  fn('resetReason', '() → str', L('Porque é que o chip arrancou.', 'Why the chip booted.')),
  { label: 'serial', type: 'namespace', detail: L('consola', 'console'), info: 'mcu.serial.print / write / read / available / readLine / readBytes / onReceive' },
]
const SERIAL_API = () => [
  fn('print', '(…)', L('Escreve na consola, com fim de linha.', 'Writes to the console, with a line ending.')),
  fn('write', '(…)', L('Escreve na consola, sem fim de linha.', 'Writes to the console, without a line ending.')),
  fn('read', '() → int', L('Próximo byte recebido, ou -1.', 'Next received byte, or -1.')),
  fn('available', '() → bool', L('Há bytes por ler?', 'Are there bytes to read?')),
  fn('readLine', '() → str', L('Espera por uma linha.', 'Waits for a line.')),
  fn('readBytes', '() → bytes', L('Tudo o que já chegou.', 'Everything received so far.')),
  fn('flush', '()', L('Espera que tudo seja enviado.', 'Waits until everything is sent.')),
  fn('onReceive', '(handler)', L('Corre o handler quando chegam bytes.', 'Runs the handler when bytes arrive.'), 'onReceive(() => {\n    \n})'),
]
const handlerApply = (name) => `${name}(() => {\n    \n})`
const METHODS = () => ({
  pin: [
    fn('output', '() → pin', L('Configura como saída.', 'Configures it as an output.')),
    fn('input', '() → pin', L('Configura como entrada.', 'Configures it as an input.')),
    fn('inputPullUp', '() → pin', L('Entrada com pull-up (botão ao GND).', 'Input with pull-up (button to GND).')),
    fn('inputPullDown', '() → pin', L('Entrada com pull-down (não no Uno/Nano).', 'Input with pull-down (not on the Uno/Nano).')),
    fn('high', '()', L('Põe a saída a HIGH.', 'Sets the output HIGH.')),
    fn('low', '()', L('Põe a saída a LOW.', 'Sets the output LOW.')),
    fn('toggle', '()', L('Inverte a saída.', 'Toggles the output.')),
    fn('write', '(bool)', L('Escreve true (HIGH) ou false (LOW).', 'Writes true (HIGH) or false (LOW).'), 'write()'),
    fn('read', '() → bool', L('Nível do pino.', 'Pin level.')),
    fn('onPress', '(handler)', L('Botão premido (com pull-up e anti-ressalto de 30 ms).', 'Button pressed (with pull-up and 30 ms debounce).'), handlerApply('onPress')),
    fn('onRelease', '(handler)', L('Botão largado.', 'Button released.'), handlerApply('onRelease')),
    fn('onClick', '(handler)', L('Clique (premir e largar).', 'Click (press and release).'), handlerApply('onClick')),
    fn('onDblClick', '(handler)', L('Duplo clique (janela de 400 ms).', 'Double click (400 ms window).'), handlerApply('onDblClick')),
    fn('onChange', '(handler)', L('O nível mudou.', 'The level changed.'), handlerApply('onChange')),
    fn('onEdge', '("rising", handler)', L('Flanco: "rising", "falling" ou "both".', 'Edge: "rising", "falling" or "both".'), 'onEdge("rising", () => {\n    \n})'),
  ],
  adc: [fn('read', '() → int', L('Leitura bruta (10 bits no Uno, 12 nos outros).', 'Raw reading (10 bits on the Uno, 12 on the others).')), fn('millivolts', '() → int', L('Leitura em milivolts.', 'Reading in millivolts.')), fn('bits', '() → int', L('Resolução.', 'Resolution.'))],
  pwm: [fn('duty', '(0..100)', L('Ciclo de trabalho em percentagem.', 'Duty cycle in percent.'), 'duty()'), fn('dutyFine', '(0..10000)', L('Em centésimas de percentagem.', 'In hundredths of a percent.'), 'dutyFine()'), fn('off', '()', L('Desliga.', 'Turns it off.'))],
  i2c: [fn('probe', '(end) → bool', L('Há um dispositivo nesse endereço?', 'Is there a device at that address?'), 'probe()'), fn('write', '(end, bytes) → bool', '', 'write()'), fn('read', '(end, n) → bytes', '', 'read()'), fn('writeRead', '(end, bytes, n) → bytes', '', 'writeRead()')],
  bytes: [fn('len', '() → int', ''), fn('push', '(x)', '', 'push()'), fn('text', '() → str', '')],
  str: [fn('len', '() → int', ''), fn('isEmpty', '() → bool', ''), fn('startsWith', '(s) → bool', '', 'startsWith()'), fn('endsWith', '(s) → bool', '', 'endsWith()'), fn('contains', '(s) → bool', '', 'contains()'), fn('indexOf', '(s) → int', '', 'indexOf()'), fn('slice', '(a, b) → str', '', 'slice()'), fn('trim', '() → str', ''), fn('toUpperCase', '() → str', ''), fn('toLowerCase', '() → str', '')],
})
const KEYWORDS = ['let', 'const', 'fn', 'if', 'else', 'while', 'for', 'in', 'loop', 'break', 'continue', 'return', 'true', 'false', 'import'].map((k) => ({ label: k, type: 'keyword' }))
const SNIPPETS = () => [
  { label: 'import mcu', type: 'text', detail: L('biblioteca', 'library'), apply: 'import mcu from "mcu"\n' },
  ...Object.keys(DRIVERS).map((d) => ({ label: `import ${d}`, type: 'text', detail: L('driver da mcu', 'mcu driver'), apply: `import ${d} from "mcu/drivers/${d}"\n` })),
  { label: 'loop', type: 'text', detail: L('ciclo infinito', 'infinite loop'), apply: 'loop {\n    \n}' },
  { label: 'fn', type: 'text', detail: L('função', 'function'), apply: 'fn nome() {\n    \n}' },
  { label: 'for', type: 'text', detail: 'for i in 0..10', apply: 'for i in 0..10 {\n    \n}' },
]
const GLOBALS = ['print', 'len', 'str', 'int', 'char', 'typeof'].map((n) => fn(n, '', '', `${n}()`))

// tipo de uma variável declarada no texto (let/const x = mcu.pin(…)…, x: tipo)
function varType(doc, name) {
  const re = new RegExp(`\\b(?:let|const)\\s+${name}\\s*(?::\\s*(\\w+))?\\s*=\\s*([^\\n]*)`)
  const m = doc.match(re)
  if (!m) return null
  if (m[1]) return { pin: 'pin', adc: 'adc', pwm: 'pwm', i2c: 'i2c', bytes: 'bytes', str: 'str' }[m[1]] || null
  const v = m[2]
  if (/mcu\.(pin|led|button)\s*\(/.test(v) && !/mcu\.(adc|pwm|analog)\s*\(/.test(v)) return 'pin'
  if (/mcu\.(adc|analog)\s*\(/.test(v)) return 'adc'
  if (/mcu\.pwm\s*\(/.test(v)) return 'pwm'
  if (/mcu\.i2c\s*\(/.test(v)) return 'i2c'
  if (/^\[|mcu\.bytes\s*\(/.test(v)) return 'bytes'
  if (/^["`]/.test(v)) return 'str'
  return null
}

export function foguCompletions(ctx) {
  const doc = ctx.state.doc.toString()
  // depois de um ponto: mcu.  mcu.serial.  ou  variável.
  const member = ctx.matchBefore(/[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*\.\w*/)
  if (member) {
    const parts = member.text.split('.')
    const word = parts.pop()
    const from = member.to - word.length
    const obj = parts.join('.')
    if (obj === 'mcu') return { from, options: MCU_API(), validFor: /^\w*$/ }
    if (obj === 'mcu.serial') return { from, options: SERIAL_API(), validFor: /^\w*$/ }
    // mcu.led().out…  (cadeia sobre um pino)
    if (/^mcu$/.test(parts[0]) && parts.length === 1) return { from, options: MCU_API(), validFor: /^\w*$/ }
      // driver importado: import dht from "mcu/drivers/dht" → dht.read(), dht.DHT22…
    if (parts.length === 1) {
      const dm = doc.match(new RegExp(`\\bimport\\s+${parts[0]}\\s+from\\s+["']mcu/drivers/(\\w+)["']`))
      const D = dm && DRIVERS[dm[1]]
      if (D) {
        const sig = (f) => `(${f.p.join(', ')})${f.r !== 'void' ? ` → ${f.r}` : ''}`
        const options = [...Object.entries(D.fns).map(([n, f]) => fn(n, sig(f), '', f.p.length ? `${n}()` : undefined)), ...Object.entries(D.consts).map(([n, v]) => ({ label: n, type: 'constant', detail: `= ${v}` }))]
        return { from, options, validFor: /^\w*$/ }
      }
    }
    const t = parts.length === 1 ? varType(doc, parts[0]) : null
    const methods = METHODS()
    if (t && methods[t]) return { from, options: methods[t], validFor: /^\w*$/ }
  }
  // mcu.led().|  mcu.pin("D7").|  (depois de uma chamada)
  const chain = ctx.matchBefore(/mcu\.(pin|led|button)\([^)]*\)\.\w*/)
  if (chain) {
    const word = chain.text.split('.').pop()
    return { from: chain.to - word.length, options: METHODS().pin, validFor: /^\w*$/ }
  }
  const w = ctx.matchBefore(/\w+/)
  if (!w && !ctx.explicit) return null
  // nomes declarados no programa
  const names = [...new Set([...doc.matchAll(/\b(?:let|const|fn)\s+([A-Za-z_]\w*)/g)].map((m) => m[1]))].map((n) => ({ label: n, type: 'variable' }))
  return { from: w ? w.from : ctx.pos, options: [...SNIPPETS(), ...KEYWORDS, ...GLOBALS, { label: 'mcu', type: 'namespace', detail: L('biblioteca', 'library') }, ...names], validFor: /^\w*$/ }
}
export const foguAutocomplete = foguLanguage.data.of({ autocomplete: foguCompletions })

// ---------------------------------------------------------------- deteção da linguagem
// 'fogu' | 'cpp' | null (não dá para saber) — para trocar sozinho quando se cola um programa
export function detectLang(code) {
  const t = String(code || '')
  if (!t.trim()) return null
  let fogu = 0
  let cpp = 0
  if (/^\s*import\s+mcu\s+from\s+["']mcu["']/m.test(t)) fogu += 5
  if (/^\s*(let|const)\s+\w+\s*(:\s*\w+\s*)?=/m.test(t)) fogu += 1
  if (/^\s*fn\s+\w+\s*\(/m.test(t)) fogu += 3
  if (/^\s*loop\s*\{/m.test(t)) fogu += 3
  if (/\bmcu\.\w+\(/.test(t)) fogu += 2
  if (/\b\d+(ms|s)\b/.test(t)) fogu += 1
  if (/`[^`]*\$\{/.test(t)) fogu += 1
  if (/^\s*#\s*(include|define)\b/m.test(t)) cpp += 5
  if (/\bvoid\s+(setup|loop)\s*\(\s*\)/.test(t)) cpp += 5
  if (/^\s*(int|float|long|bool|byte|char|unsigned|double|String|const\s+int)\s+\w+[^;\n]*;/m.test(t)) cpp += 3
  if (/\b(pinMode|digitalWrite|Serial\.begin)\s*\(/.test(t) && !/\bmcu\./.test(t)) cpp += 2
  if (/;\s*$/m.test(t)) cpp += 1
  if (fogu >= 4 && fogu > cpp) return 'fogu'
  if (cpp >= 5 && cpp > fogu) return 'cpp'
  return null
}

// ---------------------------------------------------------------- programa inicial
export const FOGU_SKETCH = `// Programa em Fogu com a biblioteca mcu (https://fogulang.microaitec.com/libs/mcu):
// o mesmo ficheiro corre aqui e numa placa verdadeira com "fogu mcu run programa.fg".
// O código corre de cima para baixo; o loop { } repete-se para sempre.
import mcu from "mcu"

const led = mcu.led().output()      // o LED da placa (D13 no Uno, GP25 no Pico…)
let vezes = 0

print("Ola do Fogu!")
loop {
    led.toggle()
    vezes += 1
    print(\`piscou \${vezes} vezes\`)
    mcu.delay(500ms)
}
`
