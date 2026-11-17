// Idiomas da interface (português e inglês), sem bibliotecas externas.
//
// Textos: um ficheiro por área em ./locales/<área>.js, carregados todos aqui:
//   export default { pt: { 'site.nav.home': 'Início', … }, en: { 'site.nav.home': 'Home', … } }
// Um valor pode ser texto (com {variáveis}) ou uma função (vars) => texto, para plurais.
//
// Uso nos componentes:
//   const t = useT()
//   t('site.nav.home')                       → "Início" / "Home"
//   t('projects.count', { n: 3 })            → interpola {n}
//   t({ pt: 'Olá', en: 'Hello' })            → texto inline (listas de dados, frases longas)
// Fora do React (notificações, mensagens do simulador): import { t } from '…/i18n/index.js'
// Catálogo/exemplos/motor: shared/i18n.js (m(pt, en) e overlays), sincronizado com este idioma.
import { useCallback } from 'react'
import { create } from 'zustand'
import { setSharedLang } from '@shared/i18n.js'

export const LANGS = [
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'en', label: 'English', short: 'EN' },
]
const CODES = LANGS.map((l) => l.code)
const STORAGE = 'adjeltron:lang'

const messages = { pt: {}, en: {} }
const files = import.meta.glob('./locales/*.js', { eager: true, import: 'default' })
for (const dict of Object.values(files)) for (const code of CODES) Object.assign(messages[code], dict?.[code] || {})

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE)
    if (CODES.includes(saved)) return saved
  } catch {
    /* sem localStorage */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []
  for (const l of nav) {
    const c = String(l || '').slice(0, 2).toLowerCase()
    if (CODES.includes(c)) return c
  }
  return 'en' // quem não fala português nem inglês percebe melhor inglês
}

const applyDocument = (lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'pt' ? 'pt-PT' : 'en'
}

// Catálogo de peças, exemplos e pistas em inglês (shared/i18n/en, engine/i18n/en.js): só se
// carregam quando o inglês é escolhido; ficam aplicados por cima dos textos em português.
export const loadContentEn = () => Promise.all([import('@shared/i18n/en/index.js'), import('@engine/i18n/en.js')])

export const useLang = create((set, get) => ({
  lang: detect(),
  ver: 0, // muda quando o catálogo troca de idioma (para quem lê DEFS voltar a desenhar)
  setLang: async (lang) => {
    if (!CODES.includes(lang)) return
    try {
      localStorage.setItem(STORAGE, lang)
    } catch {
      /* ignora */
    }
    if (lang === 'en') await loadContentEn().catch(() => {})
    setSharedLang(lang)
    applyDocument(lang)
    set({ lang, ver: get().ver + 1 })
  },
}))
applyDocument(useLang.getState().lang)
if (useLang.getState().lang === 'en')
  loadContentEn()
    .then(() => {
      setSharedLang('en')
      useLang.setState((s) => ({ ver: s.ver + 1 }))
    })
    .catch(() => {})

const missing = new Set()
export function translate(lang, key, vars) {
  if (key && typeof key === 'object') return key[lang] ?? key.pt ?? ''
  let v = messages[lang]?.[key]
  if (v === undefined) {
    v = messages.pt[key]
    if (import.meta.env?.DEV && !missing.has(`${lang}:${key}`)) {
      missing.add(`${lang}:${key}`)
      console.warn(`[i18n] falta "${key}" em ${lang}`)
    }
  }
  if (v === undefined) return key
  if (typeof v === 'function') return v(vars || {})
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : v
}

// fora do React: usa o idioma atual
export const t = (key, vars) => translate(useLang.getState().lang, key, vars)
export const getLang = () => useLang.getState().lang

// nos componentes: volta a desenhar quando o idioma muda
export function useT() {
  const lang = useLang((s) => s.lang)
  const ver = useLang((s) => s.ver)
  return useCallback((key, vars) => translate(lang, key, vars), [lang, ver]) // eslint-disable-line react-hooks/exhaustive-deps
}

// datas e números no formato do idioma
export const locale = () => (getLang() === 'pt' ? 'pt-PT' : 'en-GB')
