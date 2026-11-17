// Sensor de chama: fototransístor IR (parece um LED preto) virado para a frente.
import { Cyl, Leg } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/flame.js'

function Receiver() {
  return (
    <group>
      <Leg from={[1.35, 0.17, -0.127]} to={[1.6, 0.4, -0.08]} />
      <Leg from={[1.35, 0.17, 0.127]} to={[1.6, 0.4, 0.08]} />
      <Cyl r={0.29} h={0.1} pos={[1.62, 0.4, 0]} rot={[0, 0, -Math.PI / 2]} color="#0b0b0b" />
      <Cyl r={0.25} h={0.42} pos={[1.86, 0.4, 0]} rot={[0, 0, -Math.PI / 2]} color="#0b0b0b" rough={0.2} />
      <mesh position={[2.07, 0.4, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <sphereGeometry args={[0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.15} />
      </mesh>
    </group>
  )
}

export default makeModuleUI({
  type: 'flame',
  def,
  board: { x: [-1.6, 1.4], z: [-0.7, 0.7], color: '#1d4ed8' },
  pot: [-0.4, -0.25],
  chip: [0.55, 0.3],
  leds: { pwr: [0.75, -0.45], dout: [1.05, -0.45] },
  Extra: Receiver,
})
