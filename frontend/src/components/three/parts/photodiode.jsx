// Fotodíodo de 5 mm (tipo PD333/BPV10NF): epóxi preto com filtro de luz visível, translúcido
// ao contraluz, no formato de um LED — aba de base com o lado plano no cátodo (+x), corpo
// cilíndrico e cúpula; lá dentro vêem-se a taça do cátodo e o cristal de silício.
import { THREE, geo, mat } from '../kit.jsx'
import { Wires } from './_dip.jsx'
import def from '@shared/parts/photodiode.js'

const Y0 = 0.35

// corpo de revolução: aba de base, cilindro e cúpula (eixo y)
const bodyGeo = () =>
  geo('pdBody', () => {
    const p = [[0.001, 0.1], [0.25, 0.1], [0.25, 0.52]]
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2)
      p.push([0.25 * Math.cos(a) + (i === 8 ? 0.001 : 0), 0.52 + 0.25 * Math.sin(a)])
    }
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 32)
    g.computeVertexNormals()
    return g
  })

// aba de Ø 5,8 mm com o corte plano do lado +x (cátodo)
const rimGeo = () =>
  geo('pdRim', () => {
    const s = new THREE.Shape()
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2
      const x = Math.min(0.255, 0.275 * Math.cos(a))
      if (i) s.lineTo(x, 0.275 * Math.sin(a))
      else s.moveTo(x, 0)
    }
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 1 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0.01, 0)
    g.computeVertexNormals()
    return g
  })

function Model() {
  return (
    <group>
      <Wires id="pdLegs" r={0.022} lines={def.pins.map((p) => [p.pos, [p.pos[0], Y0 + 0.3, 0]])} />
      {/* taça refletora do cátodo e cristal (vistos através do epóxi) */}
      <mesh position={[0.127, Y0 + 0.33, 0]} geometry={geo('pdCup', () => new THREE.CylinderGeometry(0.09, 0.05, 0.08, 14))} material={mat('#9ea3a8', 1, 0.3)} />
      <mesh position={[0.127, Y0 + 0.375, 0]} geometry={geo('pdDie', () => new THREE.BoxGeometry(0.1, 0.012, 0.1))} material={mat('#2c2840', 0.5, 0.25)} />
      <group position={[0, Y0, 0]}>
        <mesh geometry={bodyGeo()} material={mat('#141217', 0.05, 0.12, { transparent: true, opacity: 0.88 })} castShadow />
        {/* aba da base com o lado plano no cátodo */}
        <mesh geometry={rimGeo()} material={mat('#141217', 0.05, 0.12, { transparent: true, opacity: 0.88 })} castShadow />
      </group>
    </group>
  )
}

export default { type: 'photodiode', Model }
