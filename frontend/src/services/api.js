// Dados da aplicação — tudo no browser (sem backend sempre ligado):
//  - exemplos, trechos de código e diagnóstico elétrico: calculados localmente (sim/localData.js);
//  - projetos guardados: localStorage deste browser (+ os projetos de src/data/projects, só de leitura,
//    até serem guardados por cima ou escondidos);
//  - miniaturas dos componentes: IndexedDB (podem ter vários MB).
// A única coisa que vai à rede é a compilação (POST /api/compile, ver simControl.js).

import { t, t as tr } from '../i18n/index.js'

const local = () => import('../sim/localData.js')

// ---------- projetos ----------
const PKEY = 'adjeltron:projects' // { [id]: { ...projeto, updated } }
const HIDDEN = 'adjeltron:projects-hidden' // ids de projetos de src/data/projects apagados aqui
const BUNDLED = import.meta.glob('../data/projects/*.json', { import: 'default' })
const bundledId = (path) => path.split('/').pop().replace(/\.json$/, '')
const bundledById = Object.fromEntries(Object.entries(BUNDLED).map(([p, load]) => [bundledId(p), load]))

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'projeto'
const readJson = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def
  } catch {
    return def
  }
}
const writeJson = (k, v) => localStorage.setItem(k, JSON.stringify(v))

async function listProjects() {
  const mine = readJson(PKEY, {})
  const hidden = new Set(readJson(HIDDEN, []))
  const out = Object.entries(mine).map(([id, p]) => ({ id, name: p.projectName, parts: p.parts?.length ?? 0, wires: p.wires?.length ?? 0, updated: p.updated || 0 }))
  for (const [id, load] of Object.entries(bundledById)) {
    if (mine[id] || hidden.has(id)) continue
    const p = await load()
    out.push({ id, name: p.projectName, parts: p.parts?.length ?? 0, wires: p.wires?.length ?? 0, updated: 0 })
  }
  return out.filter((p) => p.name).sort((a, b) => b.updated - a.updated)
}

async function loadProject(id) {
  const key = slug(id)
  const mine = readJson(PKEY, {})[key]
  if (mine) {
    const { updated: _, ...p } = mine
    return p
  }
  if (bundledById[key]) return structuredClone(await bundledById[key]())
  throw new Error(t({ pt: 'não encontrado', en: 'not found' }))
}

async function saveProject({ projectName, parts, wires, code, track, nvm, libs, lang }) {
  const id = slug(projectName)
  const all = readJson(PKEY, {})
  all[id] = { projectName, parts, wires, code, track, nvm, libs: libs?.length ? libs : undefined, lang: lang && lang !== 'cpp' ? lang : undefined, updated: Date.now() }
  try {
    writeJson(PKEY, all)
  } catch {
    throw new Error(t({ pt: 'O armazenamento do browser está cheio', en: 'The browser storage is full' }))
  }
  return { ok: true, id }
}

async function deleteProject(id) {
  const key = slug(id)
  const all = readJson(PKEY, {})
  delete all[key]
  writeJson(PKEY, all)
  if (bundledById[key]) writeJson(HIDDEN, [...new Set([...readJson(HIDDEN, []), key])])
  return { ok: true }
}

// ---------- miniaturas (IndexedDB) ----------
let dbp = null
function db() {
  dbp ||= new Promise((resolve, reject) => {
    const r = indexedDB.open('adjeltron', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('thumbs')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return dbp
}
async function idb(mode, fn) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const tx = d.transaction('thumbs', mode)
    const r = fn(tx.objectStore('thumbs'))
    tx.oncomplete = () => resolve(r?.result)
    tx.onerror = () => reject(tx.error)
  })
}
async function getThumbs(v) {
  const t = await idb('readonly', (s) => s.get(String(v)))
  if (!t) throw new Error(tr({ pt: 'sem miniaturas', en: 'no thumbnails' }))
  return t
}
async function putThumbs(v, thumbs) {
  // só a versão atual fica guardada
  await idb('readwrite', (s) => {
    s.clear()
    s.put(thumbs, String(v))
  })
  return { ok: true }
}

export const api = {
  examples: async () => (await local()).examples(),
  example: async (id) => (await local()).example(id),
  snippets: async () => (await local()).snippets(),
  diagnose: async (parts, wires) => (await local()).diagnose(parts, wires),
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  getThumbs,
  putThumbs,
}
