// Chassis triangulares (3WD kiwi e 2WD): placa extrudida do contorno de shared/parts/chassisKiwi.js
// com a furação recortada (vê-se através dos furos, também no acrílico transparente). Alumínio
// escovado (riscas da lixa), acrílico com as faces polidas e as arestas do corte a laser foscas;
// no 2WD, o espaçador impresso do rodízio com as camadas e os parafusos.
import { Box, geo, mat, THREE } from '../kit.jsx'
import { aluMat } from './_caoKit.jsx'
import { ScrewHeads } from './_matKit.jsx'
import { TRI, triOutline, triHoles, triFinish } from '@shared/parts/chassisKiwi.js'

function plateGeo(kind) {
  return geo(`chassisTri:${kind}`, () => {
    // forma no plano (x, s) com s = −z; a extrusão (z de 0 a T) roda −90° em x: z → y, s → −z
    const sh = new THREE.Shape()
    triOutline(kind).forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)))
    sh.closePath()
    for (const [x, z] of triHoles(kind)) {
      const h = new THREE.Path()
      h.absarc(x, -z, 0.17, 0, Math.PI * 2, true)
      sh.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: TRI.T - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 10 })
    g.translate(0, 0, 0.03)
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
}

// [faces, arestas] (grupos da ExtrudeGeometry)
function plateMat(c) {
  const f = triFinish(c)
  if (c?.acabamento === 'transparente') {
    const m = mat(f.color, 0, 0.06, { transparent: true, opacity: 0.45, depthWrite: false })
    return [m, mat(f.color, 0, 0.5, { transparent: true, opacity: 0.7, depthWrite: false })]
  }
  if (c?.acabamento && c.acabamento !== 'alu') return [mat(f.color, 0, 0.1), mat(f.color, 0, 0.45)]
  return [aluMat('#d3d8dc', 0.85, 0.34), mat('#c4c9cd', 0.85, 0.45)]
}

function makeModel(kind) {
  return function Model({ part }) {
    const c = part.config || {}
    return (
      <group>
        <mesh geometry={plateGeo(kind)} material={plateMat(c)} castShadow receiveShadow />
        {/* 2WD: espaçador impresso do rodízio debaixo da ponta */}
        {kind === '2wd' && (
          <group>
            <Box size={[3.4, TRI.spacer, 3.4]} pos={[TRI.xr, -TRI.spacer / 2, 0]} color="#37474f" rough={0.7} />
            <ScrewHeads pts={[[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].map(([dx, dz]) => [TRI.xr + dx, TRI.T, dz])} r={0.25} color="#b0b6ba" metal={0.9} rough={0.3} />
          </group>
        )}
      </group>
    )
  }
}

export const chassisTri2wdUI = { type: 'chassisTri2wd', Model: makeModel('2wd') }
export default { type: 'chassisKiwi', Model: makeModel('kiwi') }
