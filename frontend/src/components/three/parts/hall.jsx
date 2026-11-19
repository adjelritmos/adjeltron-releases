// Sensor de Hall KY-024: sensor linear 49E (TO-92S preto, face chanfrada com a marcação,
// 3 pernas) deitado na ponta +x do módulo, trimpot 3296, LM393 e pinos A0 G + D0.
import { Leg, THREE, geo, mat, SilkText } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/hall.js'

// corpo TO-92S (4,1 × 1,6 × 3 mm) com as arestas da face de cima chanfradas
const bodyGeo = () =>
  geo('hall49e', () => {
    const s = new THREE.Shape()
    const w = 0.21
    const h = 0.16
    const c = 0.05
    s.moveTo(-w, 0)
    s.lineTo(w, 0)
    s.lineTo(w, h - c)
    s.lineTo(w - c, h)
    s.lineTo(-w + c, h)
    s.lineTo(-w, h - c)
    s.closePath()
    // perfil no plano zy, extrudido ao longo de x (0,32)
    return new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.16, 0, 0)
  })

function Hall49E() {
  const y = 0.16
  return (
    <group>
      {[-0.127, 0, 0.127].map((z) => (
        <Leg key={z} from={[1.05, y + 0.02, z]} to={[1.55, y + 0.1, z]} r={0.022} />
      ))}
      <mesh position={[1.7, y + 0.02, 0]} castShadow geometry={bodyGeo()} material={mat('#151515', 0, 0.4)} />
      <SilkText lines={[{ text: '49E', font: 'bold 40px Arial', y: 22 }, { text: '832', font: '30px Arial', y: 54 }]} px={[128, 72]} pos={[1.7, y + 0.182, 0]} w={0.3} d={0.17} rotY={-Math.PI / 2} color="#9a9a9a" />
    </group>
  )
}

export default makeModuleUI({
  type: 'hall',
  def,
  board: { x: [-1.75, 1.9], z: [-0.75, 0.75], color: '#b71c1c' },
  pot: [-0.45, -0.25],
  chip: [0.25, 0.38],
  leds: { pwr: [0.35, -0.5], dout: [0.6, -0.5] },
  passives: [[0.35, -0.27, 'r', Math.PI / 2], [0.6, -0.27, 'r', Math.PI / 2], [-0.6, 0.3, 'c'], [-0.3, 0.3, 'r'], [0.75, 0.3, 'r', Math.PI / 2]],
  silk: [{ text: 'KY-024', pos: [-0.8, 0.57], w: 0.48, d: 0.14 }, { text: 'L1', pos: [0.35, -0.67], w: 0.16, d: 0.09 }, { text: 'L2', pos: [0.6, -0.67], w: 0.16, d: 0.09 }],
  pinLabels: ['A0', 'G', '+', 'D0'],
  Extra: Hall49E,
})
