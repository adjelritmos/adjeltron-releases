// Transformações de código das bibliotecas do grupo G (aplicadas no início do transpile):
//   - templates C++ que o transpilador por expressões regulares não entende:
//       FastLED.addLeds<WS2812B, 6, GRB>(leds, 64)  ->  FastLED.addLeds([WS2812B, 6, GRB], leds, 64)
//       GxEPD2_BW<GxEPD2_154_D67, GxEPD2_154_D67::HEIGHT> display(...)  ->  GxEPD2_BW display(...)
//   - macros do FastLED: EVERY_N_MILLISECONDS(20) { … }  ->  if (__everyN(k, 20)) { … }
//                        FastLED.delay(10)  ->  FastLED.show(), delay(10)

import { displayTransforms } from './compiler-g-displays.js'

// classes-template cujos argumentos se descartam numa declaração (o objeto JS não precisa deles)
const TEMPLATE_DECLS = ['GxEPD2_BW', 'GxEPD2_3C', 'GxEPD2_4C', 'GxEPD2_7C']

// índice do '>' que fecha o '<' em `open` (com < > e ( ) aninhados), ou -1
function closeAngle(s, open) {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (c === '<' || c === '(') depth++
    else if (c === '>' || c === ')') {
      depth--
      if (depth === 0) return c === '>' ? i : -1
    } else if (c === ';' || c === '{' || c === '}') return -1
  }
  return -1
}

function stripTemplateArgs(s, names, replace) {
  const re = new RegExp(`\\b(${names.join('|')})\\s*<`, 'g')
  let m
  let out = ''
  let last = 0
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1
    const close = closeAngle(s, open)
    if (close < 0) continue
    out += s.slice(last, m.index) + replace(m[1], s.slice(open + 1, close))
    last = close + 1
    re.lastIndex = close + 1
  }
  return out + s.slice(last)
}

export function groupGTransforms(s) {
  s = displayTransforms(s) // ecrãs: tipos de letra U8g2, getTextBounds(&…), macros com argumentos
  if (s.includes('addLeds')) {
    // FastLED.addLeds<CHIPSET, PIN, ORDER>(leds, n)  /  addLeds<CHIPSET, DATA, CLOCK, ORDER>(…)
    s = s.replace(/\.addLeds\s*<([^<>;{}]*)>\s*\(/g, (_, args) => `.addLeds([${args}], `)
  }
  if (/EVERY_N_/.test(s)) {
    let k = 0
    const mult = { MILLISECONDS: 1, MILLIS: 1, SECONDS: 1000, SECS: 1000, MINUTES: 60000, HOURS: 3600000 }
    s = s.replace(/\bEVERY_N_(MILLISECONDS|MILLIS|SECONDS|SECS|MINUTES|HOURS)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, u, n) => `if (__everyN(${k++}, (${n}) * ${mult[u]}))`)
  }
  s = s.replace(/\bFastLED\.delay\s*\(/g, 'FastLED.show(), delay(')
  if (/\bCRGB\b|\bCHSV\b/.test(s)) s = fastledTypes(s)
  if (TEMPLATE_DECLS.some((n) => s.includes(n))) s = stripTemplateArgs(s, TEMPLATE_DECLS, (name) => name)
  return s
}

// FastLED: tipos CRGB/CHSV que o transpilador geral não conhece
//   CRGB leds[ROWS * COLS];  /  CRGBArray<64> leds;  ->  vetor de CRGB novos
//   CRGB roda(byte p) { … }  ->  função (o tipo de retorno só interessa ao clang)
//   leds[i] += CRGB(…);  c |= x;  ->  leds[i] = __crgbOp('+', leds[i], CRGB(…));  (somas com saturação)
function fastledTypes(s) {
  s = s.replace(/\bCRGBArray\s*<([^<>;]+)>\s+(\w+)\s*;/g, 'let $2 = Array.from({ length: ($1) }, () => new CRGB());')
  s = s.replace(/\b(?:static\s+)?CRGB\s+(\w+)\s*\[([^\]\[;]+)\]\s*;/g, 'let $1 = Array.from({ length: ($2) }, () => new CRGB());')
  s = s.replace(/^(\s*)(?:static\s+|inline\s+)*(?:const\s+)?(?:CRGB|CHSV|CRGBPalette16)\s*&?\s+(\w+)\s*\(([^()]*)\)\s*(?=\{)/gm, '$1long $2($3) ')
  const names = new Set()
  for (const m of s.matchAll(/\bCRGB\s*[*&]?\s+(\w+)/g)) names.add(m[1])
  for (const m of s.matchAll(/\blet (\w+) = Array\.from\(\{ length: [^}]*\}, \(\) => new CRGB\(\)\)/g)) names.add(m[1])
  for (const m of s.matchAll(/\bCRGB\s*\*\s*(\w+)/g)) names.add(m[1])
  if (!names.size) return s
  const re = new RegExp(`\\b(${[...names].join('|')})((?:\\s*\\[[^\\]]*\\])?)\\s*([-+*/%|&])=\\s*([^;]+);`, 'g')
  return s.replace(re, (_, n, idx, op, rhs) => `${n}${idx} = __crgbOp('${op}', ${n}${idx}, ${rhs});`)
}
