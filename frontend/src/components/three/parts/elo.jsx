// Elo de pontas redondas (acrílico, PLA, alumínio…) cortado a laser/fresado: origem no 1.º furo,
// ao longo de +x, furos passantes e as arestas com um chanfro pequeno (apanham a luz como as
// peças reais).
import { THREE } from '../kit.jsx'
import { partMat } from './_matKit.jsx'
import { plateGeo, addHole } from './_mechKit.jsx'
import { eloDims } from '@shared/parts/elo.js'

function eloShape(L, W, holes, hr) {
  const r = W / 2
  const s = new THREE.Shape()
  s.moveTo(0, -r)
  s.lineTo(L, -r)
  s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(0, r)
  s.absarc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  for (const x of holes) addHole(s, x, 0, Math.min(hr, r * 0.7))
  return s
}

function Model({ part }) {
  const c = part.config || {}
  const { L, W, T } = eloDims(c)
  const holes = c.mid ? [0, L / 2, L] : [0, L]
  const hr = Math.min(0.2, W * 0.2)
  return <mesh geometry={plateGeo(`elo${L},${W},${holes.length},${hr}`, T, () => eloShape(L, W, holes, hr), 0.015, 18)} material={partMat(c, 'acrilico')} castShadow receiveShadow />
}

export default { type: 'elo', Model }
