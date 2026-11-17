#!/usr/bin/env node
// Gera o inventário das licenças de terceiros que vão dentro do adjeltron:
//  - pacotes npm de produção (árvore completa a partir de "dependencies" do package.json);
//  - crates Rust da app desktop (../desktop/src-tauri; só dependências normais, via `cargo metadata`);
//  - bibliotecas incluídas em ../desktop/src-tauri/resources (ex.: Pico4Drive).
// Saídas (vão para o dist, por isso seguem com o site e com o instalador desktop):
//  - public/licenses/third-party-licenses.json  → lido pelo ecrã "Licenças de terceiros"
//  - public/licenses/THIRD_PARTY_LICENSES.txt   → versão em texto simples
// Sem cargo (ex.: no Vercel), reaproveita a parte Rust do JSON já gerado.
// Uso: node scripts/gen-licenses.mjs  (ou bun scripts/gen-licenses.mjs)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = path.resolve(ROOT, '..', 'desktop', 'src-tauri') // app desktop (projeto ../desktop)
const OUT_DIR = path.join(ROOT, 'public', 'licenses')
const OUT_JSON = path.join(OUT_DIR, 'third-party-licenses.json')
const OUT_TXT = path.join(OUT_DIR, 'THIRD_PARTY_LICENSES.txt')
const LICENSE_FILE = /^(licen[cs]e|copying|notice|copyright)([-._].*)?$/i

const texts = new Map() // hash → texto (as licenças repetidas guardam-se uma vez)
function addText(t) {
  const norm = t.replace(/\r\n/g, '\n').trim()
  const id = crypto.createHash('sha1').update(norm).digest('hex').slice(0, 12)
  texts.set(id, norm)
  return id
}
function licenseFiles(dir) {
  let names = []
  try {
    names = fs.readdirSync(dir).filter((n) => LICENSE_FILE.test(n) && fs.statSync(path.join(dir, n)).isFile())
  } catch {
    return []
  }
  return names.sort().map((n) => addText(fs.readFileSync(path.join(dir, n), 'utf8')))
}
// pacotes cujo package.json não declara a licença (confirmada no repositório oficial)
const OVERRIDES = {
  '@react-three/rapier': { license: 'MIT', holder: 'Poimandres (pmndrs) e contribuidores' },
}
// licença deduzida da 1.ª linha do ficheiro, quando o manifesto não a declara
function sniffLicense(ids) {
  const head = ids.map((id) => texts.get(id).slice(0, 300)).join('\n')
  if (/MIT License|Permission is hereby granted, free of charge/i.test(head)) return 'MIT'
  if (/Apache License/i.test(head)) return 'Apache-2.0'
  if (/ISC License/i.test(head)) return 'ISC'
  if (/BSD 2-Clause/i.test(head)) return 'BSD-2-Clause'
  if (/BSD 3-Clause/i.test(head)) return 'BSD-3-Clause'
  return 'UNKNOWN'
}
const holderOf = (a) => (Array.isArray(a) ? a.map(holderOf).filter(Boolean).join(', ') : typeof a === 'string' ? a.replace(/\s*[<(].*$/, '') : a?.name || '')
const MIT_TEXT = (h) => `MIT License

Copyright (c) ${h}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
const ISC_TEXT = (h) => `ISC License

Copyright (c) ${h}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`
const BSD3_TEXT = (h) => `BSD 3-Clause License

Copyright (c) ${h}

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`
// textos padrão longos (Apache, MPL): reaproveita uma cópia canónica que já veio noutro pacote
const canonical = (re) => [...texts].filter(([, t]) => re.test(t.slice(0, 400)) && /END OF TERMS|Exhibit B/.test(t)).sort((a, b) => a[1].length - b[1].length)[0]?.[0]
// pacote sem ficheiro de licença: junta o texto padrão da 1.ª licença que se sabe reproduzir
function fallbackText(p) {
  const ids = p.license.replace(/[()]/g, ' ').split(/\s+(?:OR|AND)\s+|\s*\/\s*/).map((s) => s.trim())
  const holder = p.holder || `os autores de ${p.name}`
  const note = (id) => `[O pacote ${p.name} não inclui ficheiro de licença; segue o texto padrão da licença ${id}.]\n\n`
  for (const id of ids) {
    if (id === 'MIT') return [addText(note(id) + MIT_TEXT(holder))]
    if (id === 'ISC') return [addText(note(id) + ISC_TEXT(holder))]
    if (id === 'BSD-3-Clause') return [addText(note(id) + BSD3_TEXT(holder))]
  }
  for (const id of ids) {
    const c = id === 'Apache-2.0' ? canonical(/Apache License\s+Version 2\.0/) : id === 'MPL-2.0' ? canonical(/Mozilla Public License/) : null
    if (c) return [addText(note(id) + `Copyright (c) ${holder}\n\n` + texts.get(c))]
  }
  return []
}
const repoUrl = (r) => {
  const u = typeof r === 'string' ? r : r?.url
  if (!u) return ''
  return u.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://').replace(/^github:/, 'https://github.com/')
}
const npmLicense = (j) => {
  if (typeof j.license === 'string') return j.license
  if (j.license?.type) return j.license.type
  if (Array.isArray(j.licenses)) return j.licenses.map((l) => l.type || l).join(' OR ')
  return 'UNKNOWN'
}

// ── npm: percorre a árvore de produção com a mesma resolução do Node ──────────
function resolvePkg(name, fromDir) {
  let dir = fromDir
  for (;;) {
    const cand = path.join(dir, 'node_modules', name, 'package.json')
    if (fs.existsSync(cand)) return path.dirname(fs.realpathSync(cand))
    if (dir === ROOT || dir === path.dirname(dir)) return null
    dir = path.dirname(dir)
  }
}
function collectNpm() {
  const root = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const seen = new Map()
  const queue = Object.keys(root.dependencies || {}).map((n) => [n, ROOT, true])
  while (queue.length) {
    const [name, from, required] = queue.shift()
    const dir = resolvePkg(name, from)
    if (!dir) {
      if (required) console.warn(`aviso: dependência npm não instalada: ${name}`)
      continue
    }
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    const key = `${j.name}@${j.version}`
    if (seen.has(key)) continue
    const t = licenseFiles(dir)
    const ov = OVERRIDES[j.name] || {}
    let license = ov.license || npmLicense(j)
    if (license === 'UNKNOWN') license = sniffLicense(t)
    seen.set(key, {
      source: 'npm',
      name: j.name,
      version: j.version,
      license,
      repository: repoUrl(j.repository) || j.homepage || `https://www.npmjs.com/package/${j.name}`,
      holder: ov.holder || holderOf(j.author) || holderOf(j.contributors) || holderOf(j.maintainers),
      texts: t,
    })
    for (const d of Object.keys(j.dependencies || {})) queue.push([d, dir, true])
    for (const d of Object.keys({ ...j.optionalDependencies, ...j.peerDependencies })) queue.push([d, dir, false])
  }
  return [...seen.values()]
}

// ── Rust: crates que entram no binário da app desktop ─────────────────────────
function collectCargo() {
  const manifest = path.join(DESKTOP, 'Cargo.toml')
  let meta
  try {
    meta = JSON.parse(execFileSync('cargo', ['metadata', '--format-version', '1', '--offline', '--manifest-path', manifest], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString())
  } catch {
    return null
  }
  const pkgs = new Map(meta.packages.map((p) => [p.id, p]))
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]))
  const rootId = meta.resolve.root
  const keep = new Set()
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()
    if (keep.has(id)) continue
    keep.add(id)
    for (const d of nodes.get(id)?.deps || []) {
      // só dependências normais (as de build/dev não vão no binário)
      if (d.dep_kinds.some((k) => k.kind === null)) stack.push(d.pkg)
    }
  }
  keep.delete(rootId)
  return [...keep].map((id) => {
    const p = pkgs.get(id)
    return {
      source: 'cargo',
      name: p.name,
      version: p.version,
      license: p.license || (p.license_file ? 'ver ficheiro' : 'UNKNOWN'),
      repository: p.repository || p.homepage || `https://crates.io/crates/${p.name}`,
      holder: holderOf(p.authors),
      texts: licenseFiles(path.dirname(p.manifest_path)),
    }
  })
}

// ── bibliotecas incluídas no instalador (desktop/src-tauri/resources) ─────────────────
function collectBundled() {
  const libs = path.join(DESKTOP, 'resources', 'arduino-libs')
  const out = []
  for (const n of fs.existsSync(libs) ? fs.readdirSync(libs) : []) {
    const dir = path.join(libs, n)
    const props = path.join(dir, 'library.properties')
    if (!fs.existsSync(props)) continue
    const kv = Object.fromEntries(fs.readFileSync(props, 'utf8').split('\n').map((l) => l.split(/=(.*)/s).map((s) => s?.trim())).filter((a) => a[0]))
    const t = licenseFiles(dir)
    const first = t[0] ? texts.get(t[0]).split('\n')[0] : ''
    out.push({
      source: 'bundled',
      name: kv.name || n,
      version: kv.version || '',
      license: /BSD 2/i.test(first) ? 'BSD-2-Clause' : /BSD 3/i.test(first) ? 'BSD-3-Clause' : /MIT/.test(first) ? 'MIT' : first || 'UNKNOWN',
      repository: kv.url || '',
      texts: t,
    })
  }
  return out
}

// ── main ──────────────────────────────────────────────────────────────────────
let previous = null
try {
  previous = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'))
} catch {}

const npm = collectNpm()
let cargo = collectCargo()
if (!cargo) {
  cargo = previous?.packages.filter((p) => p.source === 'cargo') || []
  for (const p of cargo) for (const id of p.texts) if (previous.texts[id]) texts.set(id, previous.texts[id])
  console.warn(`aviso: cargo indisponível — reaproveitadas ${cargo.length} crates do inventário anterior`)
}
const bundled = collectBundled()
for (const p of [...npm, ...cargo, ...bundled]) if (!p.texts.length) p.texts = fallbackText(p)
const packages = [...bundled, ...npm, ...cargo].map(({ holder, ...p }) => p).sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

const used = new Set(packages.flatMap((p) => p.texts))
const textObj = Object.fromEntries([...texts].filter(([id]) => used.has(id)).sort(([a], [b]) => a.localeCompare(b)))

// Copyleft forte (GPL/AGPL/SSPL…) obrigaria a abrir o código da app → o build falha.
// Copyleft fraco (MPL/LGPL/EPL) só obriga a publicar alterações aos ficheiros DESSA biblioteca → aviso.
const STRONG = /\b(?<!L)(A?GPL|SSPL|EUPL|OSL|CC-BY-SA)/i
const WEAK = /\b(LGPL|MPL|EPL|CDDL)/i
const alternatives = (l) => l.replace(/[()]/g, '').split(/\s+OR\s+|\s*\/\s*/)
const onlyCopyleft = (re) => (p) => alternatives(p.license).every((a) => re.test(a) || STRONG.test(a) || WEAK.test(a)) && re.test(p.license)
const strong = packages.filter(onlyCopyleft(STRONG))
const weak = packages.filter((p) => !strong.includes(p) && onlyCopyleft(WEAK)(p))
const unknown = packages.filter((p) => p.license === 'UNKNOWN')
const noText = packages.filter((p) => !p.texts.length)

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify({ product: 'adjeltron', packages, texts: textObj }) + '\n')

const SRC = { bundled: 'Incluída no instalador', npm: 'npm', cargo: 'Rust (crates.io)' }
let txt = `adjeltron — Licenças de software de terceiros
${'='.repeat(60)}

O adjeltron inclui os componentes de código aberto listados abaixo.
Cada um é distribuído nos termos da respetiva licença, reproduzida
a seguir. Os direitos de autor pertencem aos respetivos titulares.

Ferramentas externas (não incluídas): o arduino-cli e os compiladores
avr-gcc / arm-none-eabi-gcc / xtensa-gcc (GPL) são instalados pelo
utilizador e executados como programas separados.
`
const ref = Object.fromEntries(Object.keys(textObj).map((id, i) => [id, `T${i + 1}`]))
txt += `\nCOMPONENTES (${packages.length})\n${'='.repeat(60)}\n`
for (const p of packages) {
  txt += `\n${p.name}${p.version ? ' ' + p.version : ''}  [${SRC[p.source]}]\n  Licença: ${p.license}\n${p.repository ? '  Fonte: ' + p.repository + '\n' : ''}  Texto: ${p.texts.map((id) => ref[id]).join(', ') || 'https://spdx.org/licenses/'}\n`
}
txt += `\n\nTEXTOS DAS LICENÇAS\n${'='.repeat(60)}\n`
for (const [id, t] of Object.entries(textObj)) txt += `\n${'-'.repeat(60)}\n[${ref[id]}] usado por: ${packages.filter((p) => p.texts.includes(id)).map((p) => p.name).join(', ')}\n${'-'.repeat(60)}\n\n${t}\n`
fs.writeFileSync(OUT_TXT, txt)

console.log(`licenças: ${bundled.length} incluídas + ${npm.length} npm + ${cargo.length} crates → ${path.relative(ROOT, OUT_DIR)}/ (${Object.keys(textObj).length} textos distintos)`)
if (weak.length) console.log(`copyleft fraco (ok se não forem alterados): ${weak.map((p) => `${p.name}@${p.version} (${p.license})`).join(', ')}`)
for (const p of unknown) console.warn(`aviso: licença desconhecida: ${p.name}@${p.version} [${p.source}] — confirme e acrescente a OVERRIDES`)
for (const p of noText) console.warn(`aviso: sem texto de licença: ${p.name}@${p.version} (${p.license}) [${p.source}]`)
if (strong.length) {
  for (const p of strong) console.error(`ERRO copyleft forte: ${p.name}@${p.version} (${p.license}) [${p.source}] — obrigaria a abrir o código do adjeltron`)
  process.exit(1)
}
