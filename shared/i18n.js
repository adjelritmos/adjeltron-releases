// Idioma do catálogo, dos exemplos e das mensagens do motor (português / inglês).
// Corre em todo o lado: browser, Web Worker da simulação, Bun/Node (scripts e testes).
// O texto em português é a fonte e fica onde sempre esteve; o inglês vem de duas formas:
//
//  1) Mensagens geradas em código → m(pt, en), avaliado no momento:
//       issues.push({ msg: m(`${name} queimado`, `${name} burned out`) })
//
//  2) Dados (definições das peças, catálogo, pistas, exemplos…) → "overlays" em shared/i18n/en/*.js
//     com a mesma forma do objeto, só com os textos:
//       registerOverlay('parts', () => DEFS, { a4988: { name: 'A4988 stepper driver', fields: { freq: { label: 'Frequency' } } } })
//     Ao mudar de idioma, os textos são trocados no próprio objeto (e repostos ao voltar ao
//     português). Arrays: o patch é um objeto cujas chaves são o `key`/`id`/`value` do elemento
//     ou o índice; arrays de pares [valor, rótulo] usam o valor como chave.
let LANG = 'pt'
const listeners = new Set()
const overlays = [] // { name, target: () => obj, patch }
const originals = new WeakMap() // obj → { prop: textoPT }

export const getSharedLang = () => LANG
export const m = (pt, en) => (LANG === 'en' && en != null ? en : pt)
export const onSharedLang = (fn) => (listeners.add(fn), () => listeners.delete(fn))

function remember(obj, prop) {
  let o = originals.get(obj)
  if (!o) originals.set(obj, (o = {}))
  if (!(prop in o)) o[prop] = obj[prop]
  return o[prop]
}

function findIn(arr, k) {
  // por ordem de prioridade: um campo { key: 'cor', type: 'color' } não pode ser apanhado pela chave 'color'
  const isObj = (el) => el && typeof el === 'object' && !Array.isArray(el)
  for (const prop of ['key', 'id', 'value', 'type']) {
    const byProp = arr.find((el) => isObj(el) && el[prop] === k)
    if (byProp) return byProp
  }
  const pair = arr.find((el) => Array.isArray(el) && String(el[0]) === k)
  if (pair) return pair
  return /^\d+$/.test(k) ? arr[+k] : undefined
}

// aplica (lang = 'en') ou repõe (lang = 'pt') os textos de patch em target
function apply(target, patch, lang) {
  if (!target || typeof target !== 'object' || !patch || typeof patch !== 'object') return
  for (const [k, v] of Object.entries(patch)) {
    if (Array.isArray(target)) {
      const el = findIn(target, k)
      if (el === undefined) continue
      // par [valor, rótulo]: o patch é o rótulo
      if (Array.isArray(el) && typeof v === 'string') {
        const pt = remember(el, 1)
        el[1] = lang === 'en' ? v : pt
      } else apply(el, v, lang)
      continue
    }
    if (!(k in target)) continue
    if (typeof v === 'string') {
      if (typeof target[k] !== 'string') continue // só troca texto por texto (nunca valores/funções)
      const pt = remember(target, k)
      target[k] = lang === 'en' ? v : pt
    } else apply(target[k], v, lang)
  }
}

export function registerOverlay(name, target, patch) {
  const o = { name, target, patch }
  overlays.push(o)
  if (LANG !== 'pt') apply(target(), patch, LANG)
}

export function setSharedLang(lang) {
  lang = lang === 'en' ? 'en' : 'pt'
  if (lang === LANG) return
  LANG = lang
  for (const o of overlays) apply(o.target(), o.patch, lang)
  for (const fn of listeners) fn(lang)
}
