// FC-51: placa azul com o LED IR (transparente) e o fotodíodo (preto) virados para a frente.
import { Cyl, Leg } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/irObstacle.js'

function Eyes() {
  return (
    <group>
      {[
        [-0.32, '#dfe9ff', 0.5],
        [0.32, '#0d0d0d', 0.2],
      ].map(([z, color, op]) => (
        <group key={z}>
          <Leg from={[1.25, 0.17, z - 0.08]} to={[1.45, 0.35, z - 0.05]} />
          <Leg from={[1.25, 0.17, z + 0.08]} to={[1.45, 0.35, z + 0.05]} />
          <Cyl r={0.26} h={0.08} pos={[1.45, 0.35, z]} rot={[0, 0, -Math.PI / 2]} color={color} opacity={op === 0.5 ? 0.85 : undefined} />
          <Cyl r={0.23} h={0.36} pos={[1.65, 0.35, z]} rot={[0, 0, -Math.PI / 2]} color={color} rough={0.15} opacity={op === 0.5 ? 0.8 : undefined} />
        </group>
      ))}
    </group>
  )
}

export default makeModuleUI({
  type: 'irObstacle',
  def,
  board: { x: [-1.55, 1.3], z: [-0.7, 0.7], color: '#1d4ed8' },
  pot: [-0.45, -0.25],
  chip: [0.35, 0.25],
  leds: { pwr: [-0.6, 0.45], dout: [-0.3, 0.45] },
  Extra: Eyes,
})
