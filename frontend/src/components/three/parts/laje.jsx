// Laje / piso: corpo com as arestas da cor do material, piso com textura (mosaico, soalho,
// calçada, betão, relva) e teto pintado por baixo.
import { geo, mat, THREE } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { ACAB_COR } from '@shared/parts/_casa.js'
import { lajeDims } from '@shared/parts/laje.js'
import { faceGeo, finishMat } from './_casaKit.jsx'

function Model({ part }) {
  const c = part.config || {}
  const { l, w, t } = lajeDims(c)
  const kind = c.acabamento || 'mosaico'
  const side = mat(matColor(c, 'madeira'), 0, 0.8)
  const teto = mat(c.corTeto || '#f6f4ee', 0, 0.92)
  const box = geo(`b${l},${t},${w}`, () => new THREE.BoxGeometry(l, t, w))
  return (
    <group>
      <mesh geometry={box} position={[0, t / 2, 0]} material={[side, side, side, teto, side, side]} castShadow receiveShadow />
      <mesh geometry={faceGeo([-l / 2, -w / 2, l / 2, w / 2])} material={finishMat(kind, c.cor || ACAB_COR[kind], matColor(c, 'madeira'))} position={[0, t + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
    </group>
  )
}

export default { type: 'laje', Model }
