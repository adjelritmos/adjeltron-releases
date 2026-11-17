// Desenho de uma montagem inteira (projeto/exemplo) com os mesmos modelos 3D da cena, na pose de
// construção (buildMatrices), sem física nem simulação. Partilhado pelas pré-visualizações dos
// projetos e pela montra da página inicial (ficheiro leve: não puxa o Studio).
import { Component, useMemo } from 'react'
import * as THREE from 'three'
import { MODELS } from './models.jsx'
import { buildMatrices } from './physics/assembly.js'
import { DEFS, partScale, partBoxes, vehicleLift } from '@shared/components.js'
import { groundParts } from '../../functions/ground.js'

// pose como na cena: nada abaixo do chão e veículos levantados pelas rodas maiores
export function onFloor(parts) {
  const g = groundParts(parts)
  return g.map((p) => (!p.parent && DEFS[p.type]?.vehicle ? { ...p, pos: [p.pos[0], p.pos[1] + vehicleLift(p, g), p.pos[2]] } : p))
}

// um modelo que falhe não deita abaixo a montagem inteira
class Guard extends Component {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  componentDidCatch() {}
  render() {
    return this.state.err ? null : this.props.children
  }
}

export function Parts({ parts }) {
  const M = useMemo(() => buildMatrices(parts), [parts])
  return parts.map((p) => {
    const Model = MODELS[p.type]
    const m = M.get(p.id)
    if (!Model || !m) return null
    return (
      <group key={p.id} matrixAutoUpdate={false} matrix={m}>
        <group scale={partScale(p) || [1, 1, 1]}>
          <Guard>
            <Model part={p} />
          </Guard>
        </group>
      </group>
    )
  })
}

// caixa da montagem pelas caixas de colisão das peças (não pelos modelos desenhados: alguns
// têm objetos auxiliares grandes ou invisíveis que estragariam o enquadramento)
export function assemblyBox(parts) {
  const M = buildMatrices(parts)
  const box = new THREE.Box3()
  const v = new THREE.Vector3()
  for (const p of parts) {
    const m = M.get(p.id)
    if (!m) continue
    let boxes = partBoxes(p)
    if (!boxes.length) {
      const s = DEFS[p.type]?.size
      if (!s) continue
      boxes = [{ size: s, pos: [0, s[1] / 2, 0] }]
    }
    for (const b of boxes) {
      const h = b.radius ? [b.radius, b.radius, b.radius] : b.size.map((x) => x / 2)
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) box.expandByPoint(v.set(b.pos[0] + sx * h[0], b.pos[1] + sy * h[1], b.pos[2] + sz * h[2]).applyMatrix4(m))
    }
  }
  return box
}
