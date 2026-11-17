// Transformações de código das bibliotecas de ecrãs do grupo G (chamadas por compiler-g.js):
//   - U8g2: os tipos de letra são identificadores (u8g2_font_ncenB08_tr) → passam a texto;
//   - Adafruit_GFX getTextBounds(txt, x, y, &x1, &y1, &w, &h): os & passam a objetos { v }
//     com getter/setter para a biblioteca escrever nas variáveis do sketch;
//   - macros com argumentos (#define MAX_HEIGHT(EPD) …) → funções JS.

// índice do ')' que fecha o '(' em `open` (ignora texto entre aspas), ou -1
function closeParen(s, open) {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      i = j
      continue
    }
    if (c === '(') depth++
    else if (c === ')' && --depth === 0) return i
  }
  return -1
}
function splitTop(s) {
  const out = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c) j += s[j] === '\\' ? 2 : 1
      cur += s.slice(i, j + 1)
      i = j
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

export function displayTransforms(s) {
  if (s.includes('u8g2_font_')) s = s.replace(/\bu8g2_font_\w+/g, (m) => `'${m}'`)
  if (s.includes('getTextBounds')) {
    const re = /\.getTextBounds\s*\(/g
    let m
    let out = ''
    let last = 0
    while ((m = re.exec(s))) {
      const open = m.index + m[0].length - 1
      const close = closeParen(s, open)
      if (close < 0) break
      const args = splitTop(s.slice(open + 1, close)).map((a, i) => {
        const t = a.trim()
        if (i < 3 || !t.startsWith('&')) return a
        const v = t.slice(1).trim()
        return ` { get v() { return ${v} }, set v(__v) { ${v} = __v } }`
      })
      out += s.slice(last, open + 1) + args.join(',') + ')'
      last = close + 1
      re.lastIndex = close + 1
    }
    s = out + s.slice(last)
  }
  s = s.replace(/^[ \t]*#[ \t]*define[ \t]+(\w+)\(([^)]*)\)[ \t]+(.+[^\\\s])[ \t]*$/gm, (_, name, params, body) => `const ${name} = (${params}) => (${body});`)
  return s
}
