// Sensor de humidade do solo: módulo comparador + sonda de 2 pontas (YL-69).
import { Box } from '../kit.jsx'
import { makeModuleUI } from './_analogModule.jsx'
import def from '@shared/parts/soilMoisture.js'

function Probe() {
  return (
    <group>
      <Box size={[1.0, 0.16, 2.0]} pos={[-0.8, 0.08, 0]} color="#1f6f2a" />
      {[-0.55, 0.55].map((z) => (
        <group key={z}>
          <Box size={[4.6, 0.16, 0.5]} pos={[2.0, 0.08, z]} color="#1f6f2a" />
          <Box size={[4.6, 0.02, 0.3]} pos={[2.0, 0.17, z]} color="#d9d3c4" metal={0.8} rough={0.3} />
          <Box size={[0.4, 0.16, 0.3]} pos={[4.5, 0.08, z]} color="#1f6f2a" />
        </group>
      ))}
    </group>
  )
}

export default makeModuleUI({
  type: 'soilMoisture',
  def,
  board: { x: [-4.6, -1.5], z: [-0.75, 0.75], color: '#1d4ed8' },
  pot: [-3.4, -0.2],
  chip: [-2.4, 0.35],
  leds: { pwr: [-2.1, -0.45], dout: [-1.8, -0.45] },
  Extra: Probe,
})
