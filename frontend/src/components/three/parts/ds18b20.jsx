// DS18B20 em TO-92: corpo de epóxi preto em "D" (Ø 4,8 mm, 4,5 mm de altura) com a face
// plana (marcação DALLAS 18B20) virada para a frente (+x) e 3 pernas com o joelho de
// conformação (1,27 mm no corpo → 2,54 mm na placa).
import { Leg, THREE, geo, mat, useLabel } from '../kit.jsx'
import def from '@shared/parts/ds18b20.js'

const R = 0.24 // raio do corpo
const F = 0.13 // distância do centro à face plana
const H = 0.48 // altura do corpo
const Y0 = 0.5 // base do corpo
const CX = 0.04 // centro do círculo em x

// perfil em "D" (plano xy da forma = x, −z do mundo) extrudido para cima, com arestas suaves
const bodyGeo = () =>
  geo('to92', () => {
    const a = Math.acos(F / R)
    const s = new THREE.Shape()
    s.absarc(0, 0, R, a, Math.PI * 2 - a, false)
    // a face plana fecha o contorno (de volta ao início do arco)
    const g = new THREE.ExtrudeGeometry(s, { depth: H - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 20 })
    return g.rotateX(-Math.PI / 2).translate(0, 0.02, 0)
  })

function Model() {
  const label = useLabel(
    [
      { text: 'DALLAS', font: 'bold 44px Arial', y: 40, color: '#cfcfcf' },
      { text: '18B20', font: 'bold 56px Arial', y: 98, color: '#cfcfcf' },
      { text: '1838C4', font: '36px Arial', y: 150, color: '#bdbdbd' },
      { text: '+786AB', font: '36px Arial', y: 196, color: '#bdbdbd' },
    ],
    256,
    224,
  )
  return (
    <group>
      {def.pins.map((p) => (
        <group key={p.id}>
          <Leg from={p.pos} to={[p.pos[0], 0.28, p.pos[2]]} r={0.023} />
          <Leg from={[p.pos[0], 0.28, p.pos[2]]} to={[CX - 0.02, 0.4, p.pos[2] * 0.5]} r={0.023} />
          <Leg from={[CX - 0.02, 0.4, p.pos[2] * 0.5]} to={[CX - 0.02, Y0 + 0.02, p.pos[2] * 0.5]} r={0.023} />
        </group>
      ))}
      <mesh position={[CX, Y0, 0]} castShadow geometry={bodyGeo()} material={mat('#232323', 0, 0.42)} />
      <mesh position={[CX + F + 0.016, Y0 + H * 0.52, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.36, 0.33]} />
        <meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

export default { type: 'ds18b20', Model }
