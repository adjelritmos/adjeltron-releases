// Díodo 1N4007 (axial, corpo preto, risco prateado no cátodo K = +x).
import { Leg, Cyl } from '../kit.jsx'
import { Boom } from './group-c-ui.jsx'

export function AxialDiode({ body, band, r, len, y = 0.2 }) {
  return (
    <group>
      <Leg from={[-0.508, 0, 0]} to={[-0.508, y, 0]} />
      <Leg from={[0.508, 0, 0]} to={[0.508, y, 0]} />
      <Leg from={[-0.508, y, 0]} to={[0.508, y, 0]} />
      <Cyl r={r} h={len} pos={[0, y, 0]} rot={[0, 0, Math.PI / 2]} color={body} rough={0.4} />
      <Cyl r={r + 0.004} h={len * 0.16} pos={[len / 2 - len * 0.14, y, 0]} rot={[0, 0, Math.PI / 2]} color={band} metal={0.4} rough={0.4} />
    </group>
  )
}

function Model() {
  return <AxialDiode body="#1a1a1a" band="#cfd3d8" r={0.135} len={0.52} />
}

function Overlay2D({ info, live }) {
  return live?.burned ? <Boom info={info} /> : null
}

export default { type: 'diode', Model, Overlay2D }
