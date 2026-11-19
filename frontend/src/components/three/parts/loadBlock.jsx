// Bloco de aço de massa conhecida (massa de calibração maquinada): aço retificado com as
// arestas chanfradas, 4 furos roscados M4 no topo e a massa gravada a laser.
import { useLabel, geo, mergedGeo, mat, THREE } from '../kit.jsx'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { brushedMat } from './_mechKit.jsx'
import { blockDims } from '@shared/parts/loadBlock.js'

function Model({ part }) {
  const c = part.config || {}
  const [x, y, z] = blockDims(c)
  const g = c.grams ?? 100
  // gravação a laser no aço: texto escuro (óxido) e a classe da massa por baixo
  const tex = useLabel(
    [
      { text: g >= 1000 ? `${g / 1000} kg` : `${g} g`, font: 'bold 120px Arial', y: 110, color: '#1d2023' },
      { text: 'M1 · STEEL', font: 'bold 34px Arial', y: 200, color: '#3a3f44' },
    ],
    512,
    256,
  )
  const body = geo(`loadBody${x},${y},${z}`, () => new RoundedBoxGeometry(x, y, z, 2, 0.06))
  // furos roscados: escuro com o chanfro claro à volta
  const holes = mergedGeo(`loadHoles${x},${z}`, () => {
    const h = geo('loadHole', () => new THREE.CircleGeometry(0.17, 16).rotateX(-Math.PI / 2))
    return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [h, [sx * (x / 2 - 0.45), 0, sz * (z / 2 - 0.45)]])
  })
  const rims = mergedGeo(`loadRims${x},${z}`, () => {
    const h = geo('loadRim', () => new THREE.RingGeometry(0.17, 0.23, 16).rotateX(-Math.PI / 2))
    return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [h, [sx * (x / 2 - 0.45), 0, sz * (z / 2 - 0.45)]])
  })
  return (
    <group>
      <mesh geometry={body} position={[0, y / 2, 0]} material={brushedMat('#7d878e', 0.85, 0.36)} castShadow receiveShadow />
      <mesh geometry={rims} position={[0, y + 0.001, 0]} material={mat('#b9c1c7', 0.9, 0.25)} />
      <mesh geometry={holes} position={[0, y + 0.002, 0]} material={mat('#121416', 0, 0.85)} />
      <mesh position={[0, y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[x * 0.8, x * 0.4]} />
        <meshStandardMaterial map={tex} transparent depthWrite={false} roughness={0.7} metalness={0.3} />
      </mesh>
    </group>
  )
}

export default { type: 'loadBlock', Model }
