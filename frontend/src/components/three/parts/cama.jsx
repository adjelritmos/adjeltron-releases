// Cama (estrutura de madeira com cabeceira estofada em capitonê): pés afunilados, estrado com
// as travessas laterais, colchão com os vivos em cima e em baixo, lençol dobrado sobre o
// edredão, edredão a cobrir 2/3 da cama e a cair aos pés, almofadas e a cabeceira estofada com
// os botões e as costuras (−x).
import { RBox, Box, Cyl, geo, mat, mergedGeo, THREE } from '../kit.jsx'
import { camaDims } from '@shared/parts/cama.js'

const shadeHex = (hex, k) => {
  const c = new THREE.Color(hex)
  c.lerp(new THREE.Color(k >= 0 ? '#ffffff' : '#000000'), Math.abs(k))
  return `#${c.getHexString()}`
}

function Model({ part }) {
  const c = part.config || {}
  const { l, w, n } = camaDims(c)
  const wood = c.estrutura || '#6d4c35'
  const duvet = c.edredao || '#e8edf2'
  const head = c.cabeceira || '#8d8f93'
  const pw = (w - 1.0) / n
  // botões do capitonê na face da frente da cabeceira (em quincôncio)
  const buttons = mergedGeo(`camaBtn${l},${w}`, () => {
    const s = geo('camaBtnS', () => new THREE.SphereGeometry(0.07, 8, 6))
    const out = []
    const cols = Math.max(2, Math.round((w - 0.6) / 0.95))
    for (let r = 0; r < 3; r++) {
      const off = r % 2 ? 0.5 : 0
      for (let i = 0; i < cols - (r % 2); i++) out.push([s, [-l / 2 - 0.005, 4.7 + r * 0.85, -w / 2 + 0.5 + ((i + off) * (w - 1.0)) / (cols - 1)]])
    }
    return out
  })
  const legs = [[l / 2 - 0.5, w / 2 - 0.5], [l / 2 - 0.5, -w / 2 + 0.5], [-l / 2 + 0.5, w / 2 - 0.5], [-l / 2 + 0.5, -w / 2 + 0.5]]
  return (
    <group>
      {/* pés afunilados */}
      {legs.map(([x, z], i) => (
        <Cyl key={i} r={0.28} r2={0.2} h={1.0} pos={[x, 0.5, z]} color={wood} rough={0.45} seg={12} />
      ))}
      {/* estrado: caixa com as travessas laterais salientes */}
      <RBox size={[l, 1.2, w]} r={0.15} pos={[0, 1.6, 0]} color={wood} rough={0.45} />
      <Box size={[l + 0.04, 0.06, w + 0.04]} pos={[0, 1.95, 0]} color={shadeHex(wood, -0.3)} rough={0.6} />
      {/* colchão com os vivos em cima e em baixo */}
      <RBox size={[l - 0.4, 1.6, w - 0.4]} r={0.35} pos={[0, 2.95, 0]} color="#f5f3ee" rough={0.9} />
      {[2.25, 3.62].map((y) => (
        <RBox key={y} size={[l - 0.34, 0.06, w - 0.34]} r={0.03} pos={[0, y, 0]} color="#dcd8cf" rough={0.85} />
      ))}
      {/* edredão: cobre 2/3 da cama e dobra no fundo; lençol branco dobrado por cima à cabeceira */}
      <RBox size={[l * 0.68, 0.35, w + 0.1]} r={0.15} pos={[l * 0.16, 3.82, 0]} color={duvet} rough={0.95} />
      <RBox size={[0.35, 1.9, w + 0.1]} r={0.15} pos={[l / 2 + 0.02, 2.95, 0]} color={duvet} rough={0.95} />
      <RBox size={[2.2, 0.5, w + 0.12]} r={0.2} pos={[l * 0.16 - l * 0.34 + 1.1, 4.05, 0]} color={duvet} rough={0.95} />
      <RBox size={[1.1, 0.12, w + 0.14]} r={0.05} pos={[l * 0.16 - l * 0.34 + 0.55, 4.28, 0]} color="#fbfbf8" rough={0.9} />
      {/* almofadas (fronhas brancas) e almofada decorativa da cor da cabeceira */}
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <RBox size={[2.4, 0.9, pw - 0.3]} r={0.4} pos={[-l / 2 + 1.8, 4.1, -w / 2 + 0.5 + (i + 0.5) * pw]} rot={[0, 0, 0.25]} color="#ffffff" rough={0.95} />
          <RBox size={[0.6, 1.4, Math.min(2.2, pw * 0.45)]} r={0.28} pos={[-l / 2 + 3.2, 4.25, -w / 2 + 0.5 + (i + 0.5) * pw]} rot={[0, 0, 0.3]} color={shadeHex(head, 0.15)} rough={0.95} />
        </group>
      ))}
      {/* cabeceira estofada: corpo, moldura de madeira em baixo, botões do capitonê */}
      <RBox size={[0.6, 7.5, w + 0.4]} r={0.25} pos={[-l / 2 - 0.3, 3.75, 0]} color={head} rough={0.95} />
      <Box size={[0.64, 0.5, w + 0.44]} pos={[-l / 2 - 0.3, 0.6, 0]} color={wood} rough={0.45} />
      <mesh geometry={buttons} material={mat(shadeHex(head, -0.3), 0, 0.7)} />
    </group>
  )
}

export default { type: 'cama', Model }
