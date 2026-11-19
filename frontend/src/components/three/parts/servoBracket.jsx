// Suporte em U de alumínio para servo (chapa estampada dos kits de braço robótico): chapa de
// cima numa só peça — disco aparafusado ao braço do servo (na origem, 4 furos do braço redondo
// e o furo do parafuso central), alma ao longo de x com o rasgo de alívio e, na ponta, as
// orelhas da forquilha com o furo do pino — e as abas laterais dobradas para baixo (perfil em
// U) com os cantos boleados.
import { THREE } from '../kit.jsx'
import { plateGeo, wallGeo, addHole, rrectShape, brushedMat } from './_mechKit.jsx'

const ALU = '#cfd8dc'

function topShape(L) {
  const x0 = Math.sqrt(0.95 * 0.95 - 0.9 * 0.9) // onde o disco encontra a alma
  const a = Math.atan2(0.9, x0)
  const xe = L - 0.4
  const xf = L + 0.425
  const s = new THREE.Shape()
  s.moveTo(x0, -0.9)
  s.lineTo(xe, -0.9)
  s.lineTo(xe, -1.28)
  s.lineTo(xf - 0.12, -1.28)
  s.quadraticCurveTo(xf, -1.28, xf, -1.16)
  s.lineTo(xf, 1.16)
  s.quadraticCurveTo(xf, 1.28, xf - 0.12, 1.28)
  s.lineTo(xe, 1.28)
  s.lineTo(xe, 0.9)
  s.lineTo(x0, 0.9)
  s.absarc(0, 0, 0.95, a, Math.PI * 2 - a, false)
  for (let k = 0; k < 4; k++) addHole(s, Math.cos((k * Math.PI) / 2 + Math.PI / 4) * 0.6, Math.sin((k * Math.PI) / 2 + Math.PI / 4) * 0.6, 0.1)
  addHole(s, 0, 0, 0.2)
  addHole(s, L, 0, 0.12)
  if (L > 3) s.holes.push(rrectShape(1.3, -0.35, L - 1.0, 0.35, 0.3, new THREE.Path()))
  return s
}

function ServoBracketModel({ part }) {
  const L = part.config?.length ?? 4.5
  const m = brushedMat(ALU, 0.85, 0.32)
  return (
    <group>
      <mesh geometry={plateGeo(`sbTop${L}`, 0.3, () => topShape(L), 0.03, 20)} material={m} castShadow receiveShadow />
      {/* abas laterais (perfil em U), viradas para baixo: cantos boleados em baixo */}
      {[-1, 1].map((sz) => (
        <mesh key={sz} geometry={wallGeo(`sbFlange${L}`, L - 0.6, 0.7, 0.2)} position={[L / 2, 0.15, sz * 0.9]} rotation={[Math.PI, 0, 0]} material={m} castShadow receiveShadow />
      ))}
    </group>
  )
}

export default { type: 'servoBracket', Model: ServoBracketModel }
