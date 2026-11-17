// Suportes de PLA do pato robô (ver shared/parts/suportePato.js): cada peça é desenhada com as
// medidas do modelo oficial, em coordenadas do robô (lado direito), e espelhada para a esquerda.
import { RBox, Cyl, geo, mat, THREE } from '../kit.jsx'
import { SUPORTES, origemPato } from '@shared/parts/_pato.js'

const WHITE = '#f4f4f2'
const BLACK = '#232323'
const RX = [Math.PI / 2, 0, 0]
const RZ = [0, 0, Math.PI / 2]

function Pecas({ peca, s }) {
  const o = origemPato(SUPORTES[peca].mount, s)
  // caixa (coordenadas do robô, z do lado direito) → local
  const B = ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], r = 0.2, color = WHITE }) => (
    <RBox size={[x1 - x0, y1 - y0, z1 - z0]} pos={[(x0 + x1) / 2 - o[0], (y0 + y1) / 2 - o[1], (s * (z0 + z1)) / 2 - o[2]]} r={r} color={color} rough={0.45} />
  )
  const P = ([x, y, z]) => [x - o[0], y - o[1], s * z - o[2]]
  // disco branco de 4 furos (face da saída de um servo), eixo segundo `rot`
  const Disco = ({ at, rot, r = 0.9, h = 0.25, color = WHITE }) => (
    <group position={P(at)} rotation={rot}>
      <Cyl r={r} h={h} color={color} rough={0.45} seg={32} />
      {[0, 1, 2, 3].map((i) => (
        <Cyl key={i} r={0.1} h={h + 0.02} pos={[0.5 * Math.cos(i * Math.PI / 2 + Math.PI / 4), 0, 0.5 * Math.sin(i * Math.PI / 2 + Math.PI / 4)]} color="#555" seg={10} />
      ))}
      <Cyl r={0.14} h={h + 0.03} color="#888" metal={0.6} seg={12} />
    </group>
  )
  switch (peca) {
    case 'anca':
      return (
        <>
          <B x={[-0.86, 1.72]} y={[9.6, 10.33]} z={[0.4, 3.1]} color={BLACK} />
          <B x={[-0.86, 1.0]} y={[7.9, 9.7]} z={[0.4, 0.6]} r={0.08} color={BLACK} />
          <B x={[-0.86, 1.0]} y={[7.9, 9.7]} z={[2.9, 3.1]} r={0.08} color={BLACK} />
          <Cyl r={0.7} h={0.12} pos={P([0.43, 10.37, 1.75])} color="#2b2b2b" seg={24} />
        </>
      )
    case 'quadril':
      return (
        <>
          <B x={[1.95, 2.3]} y={[7.4, 9.8]} z={[0.6, 3.9]} />
          <B x={[-1.6, 2.3]} y={[7.4, 9.8]} z={[3.55, 3.85]} />
          <B x={[-1.6, 2.3]} y={[7.15, 7.45]} z={[0.6, 3.85]} />
          <Disco at={[2.42, 8.6, 1.75]} rot={RZ} />
        </>
      )
    case 'coxa':
      return (
        <>
          <mesh geometry={coxaGeo()} material={mat(WHITE, 0, 0.45)} position={[-o[0], -o[1], s > 0 ? 6.24 - o[2] : -6.54 - o[2]]} castShadow receiveShadow />
          {/* faixa de cima, a fechar a concha por cima dos servos */}
          <B x={[-3.6, 1.6]} y={[9.75, 10.05]} z={[3.7, 6.3]} r={0.12} />
          <Disco at={[0.6, 8.6, 6.6]} rot={RX} r={0.75} h={0.12} />
        </>
      )
    case 'canela':
      return (
        <>
          <B x={[-4.18, -2.18]} y={[1.73, 7.53]} z={[3.6, 3.9]} r={0.12} />
          <Disco at={[-3.18, 6.88, 3.48]} rot={RX} r={0.75} h={0.12} />
        </>
      )
    case 'pescoco':
      return (
        <>
          <B x={[1.7, 3.7]} y={[14.3, 17.6]} z={[1.24, 1.54]} r={0.12} />
          <B x={[1.7, 3.7]} y={[14.3, 17.6]} z={[-1.54, -1.24]} r={0.12} />
          <Disco at={[2.7, 14.9, 1.6]} rot={RX} r={0.7} h={0.1} />
        </>
      )
    case 'suporteCabeca':
      return (
        <>
          <B x={[1.8, 3.6]} y={[18.4, 20.7]} z={[1.3, 1.75]} r={0.1} />
          <B x={[1.8, 3.6]} y={[18.4, 20.7]} z={[-1.75, -1.3]} r={0.1} />
          {[1, -1].map((k) => (
            <Cyl key={k} r={0.9} h={0.45} pos={P([2.7, 18.6, k * 1.525])} rot={RX} color={WHITE} rough={0.45} seg={28} />
          ))}
          <B x={[1.8, 3.6]} y={[20.45, 20.7]} z={[-1.75, 1.75]} r={0.08} />
        </>
      )
    case 'rolaCabeca':
      return (
        <>
          <B x={[1.6, 4.8]} y={[22.94, 23.1]} z={[-1.45, 1.45]} r={0.05} color={BLACK} />
          <B x={[2.3, 4.7]} y={[23.1, 25.2]} z={[1.2, 1.45]} r={0.08} color={BLACK} />
          <B x={[2.3, 4.7]} y={[23.1, 25.2]} z={[-1.45, -1.2]} r={0.08} color={BLACK} />
          <Cyl r={0.75} h={0.2} pos={P([2.4, 24.5, 0])} rot={RZ} color="#c3c7cb" metal={0.8} rough={0.3} seg={24} />
        </>
      )
    default:
      return null
  }
}

// concha da coxa: pentágono boleado (plano x-y, espessura 0,3 para +z)
function coxaGeo() {
  return geo('coxaPatoV2', () => {
    const pts = [[2.2, 10.0], [2.2, 7.3], [-2.6, 5.1], [-4.9, 5.3], [-5.0, 8.0], [-3.4, 8.9], [-0.8, 10.4]]
    const sh = new THREE.Shape()
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)))
    sh.closePath()
    return new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.25, bevelSegments: 3, curveSegments: 6 })
  })
}

function SuportePatoModel({ part }) {
  const c = part.config || {}
  return <Pecas peca={c.peca || 'coxa'} s={+(c.s ?? 1)} />
}

export default { type: 'suportePato', Model: SuportePatoModel }
