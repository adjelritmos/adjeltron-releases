// Peças impressas em PLA do humanoide Microban (ver shared/parts/microbanPeca.js): cada peça é
// desenhada com as caixas do modelo (as mesmas dos colisores), em coordenadas do robô (lado
// direito) e espelhada para a esquerda. Mais os pormenores: sola de TPU nos pés, rosto na cabeça e
// os 4 parafusos M2 no sítio onde a peça aparafusa no disco do servo.
import { RBox, Cyl } from '../kit.jsx'
import { MB_PECAS, MB_EIXOS, MB_SOLA, mbPonto } from '@shared/parts/_microban.js'
import { mbCaixaLocal } from '@shared/parts/microbanPeca.js'

const WHITE = '#f1f1ee'
const DARK = '#25272b'

// rotação que leva +y para a direção d (eixo do disco)
const rotTo = ([x, y, z]) => (Math.abs(y) > 0.5 ? [y > 0 ? 0 : Math.PI, 0, 0] : Math.abs(x) > 0.5 ? [0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2] : [z > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0])

function MicrobanPecaModel({ part }) {
  const c = part.config || {}
  const k = MB_PECAS[c.peca] ? c.peca : 'femur'
  const s = Number(c.s ?? 1) < 0 ? -1 : 1
  const cfg = { peca: k, s }
  const pc = MB_PECAS[k]
  const o = mbPonto(pc.eixo, s)
  const P = ([x, y, z]) => [x - o[0], y - o[1], s * z - o[2]]
  const d = MB_EIXOS[pc.eixo].disco(s)
  return (
    <group>
      {pc.caixas.map((b, i) => {
        const { size, pos } = mbCaixaLocal(cfg, b)
        return <RBox key={i} size={size} r={Math.min(0.15, Math.min(...size) * 0.4)} pos={pos} color={WHITE} rough={0.5} />
      })}
      {/* parafusos M2 no disco do servo (origem da peça), ao longo do eixo do disco */}
      <group rotation={rotTo(d)}>
        {[0, 1, 2, 3].map((i) => (
          <Cyl key={i} r={0.07} h={0.06} pos={[0.4 * Math.cos((i * Math.PI) / 2), 0.03, 0.4 * Math.sin((i * Math.PI) / 2)]} color="#9aa0a6" metal={0.9} rough={0.35} seg={10} />
        ))}
      </group>
      {k === 'pe' && (
        // sola de TPU (antiderrapante), por baixo do pé
        <RBox size={[9.1, 0.08, 4.3]} r={0.03} pos={P([1.75, MB_SOLA + 0.04, 3.6])} color={DARK} rough={0.9} />
      )}
      {k === 'cabeca' && (
        <>
          {/* viseira escura e os dois olhos (câmara e LED no robô real) */}
          <RBox size={[0.06, 2.0, 4.6]} r={0.02} pos={P([2.6, 14.7, 0])} color={DARK} rough={0.35} />
          {[-1.1, 1.1].map((z) => (
            <group key={z} position={P([2.64, 14.9, z])} rotation={[0, 0, -Math.PI / 2]}>
              <Cyl r={0.45} h={0.04} color="#e8eef2" rough={0.3} seg={24} />
              <Cyl r={0.22} h={0.05} color="#0b0b0c" rough={0.2} seg={20} />
            </group>
          ))}
        </>
      )}
    </group>
  )
}

export default { type: 'microbanPeca', Model: MicrobanPecaModel }
