// Díodo 1N4007 (DO-41: corpo de epóxi preto de 2,7 × 5,2 mm com pontas boleadas, risco
// prateado no cátodo K = +x, referência impressa ao longo do corpo, pernas de 0,8 mm).
// AxialDiode serve também os díodos de vidro (DO-35 / DO-41G): vidro tingido transparente com
// os dois êmbolos metálicos e o cristal de silício à vista por dentro.
import { THREE, geo, mat } from '../kit.jsx'
import { Wires } from './_dip.jsx'
import { Boom } from './group-c-ui.jsx'

const PX = 0.508 // pinos a 0,4"

// corpo de revolução (eixo ao longo de x) com as pontas boleadas
const bodyGeo = (r, len, lr) =>
  geo(`axBody${r},${len},${lr}`, () => {
    const h = len / 2
    const p = [[lr, -h - 0.01], [r * 0.62, -h], [r * 0.9, -h + r * 0.12], [r, -h + r * 0.38], [r, h - r * 0.38], [r * 0.9, h - r * 0.12], [r * 0.62, h], [lr, h + 0.01]]
    const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a, b)), 20)
    g.rotateZ(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  })
// faixa cilíndrica (risco do cátodo, texto) à volta do eixo x, entre a e b
const ringGeo = (r, a, b, t0 = 0, tl = Math.PI * 2) =>
  geo(`axRing${r},${a},${b},${t0},${tl}`, () => {
    const g = new THREE.CylinderGeometry(r, r, b - a, 20, 1, true, t0, tl)
    g.rotateZ(-Math.PI / 2)
    g.translate((a + b) / 2, 0, 0)
    return g
  })
// texto impresso ao longo do corpo (tela rodada: lê-se do ânodo para o cátodo, virado para cima)
const TXT = new Map()
// arc × axial = tamanho da faixa (cm): a tela segue essa proporção para as letras não deformarem
function textMat(text, color, arc, axial) {
  const cw = Math.max(32, Math.round((256 * arc) / axial))
  const k = `${text}|${color}|${cw}`
  let m = TXT.get(k)
  if (!m) {
    const c = document.createElement('canvas')
    c.width = cw
    c.height = 256
    const x = c.getContext('2d')
    x.translate(cw / 2, 128)
    x.rotate(-Math.PI / 2)
    x.fillStyle = color
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = `bold ${Math.round(Math.min(cw * 0.6, 70))}px Arial`
    x.fillText(text, 0, 2, 244)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    TXT.set(k, (m = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })))
  }
  return m
}

export function AxialDiode({ body, band, r, len, y = 0.2, glass = false, text, ink }) {
  const lr = r >= 0.12 ? 0.04 : 0.026 // perna de 0,8 mm (DO-41) ou 0,5 mm (DO-35)
  const h = len / 2
  // risco do cátodo dentro do troço cilíndrico, junto à ponta +x
  const b1 = h - r * 0.42
  const b0 = b1 - len * 0.16
  const span = 1.5 // largura angular do texto (rad), virado para cima
  const t0 = -h + r * 0.4
  const t1 = b0 - 0.02
  return (
    <group>
      <Wires
        id={`ax${lr},${y},${h}`}
        r={lr}
        lines={[
          [[-PX, 0, 0], [-PX, y - 0.05, 0], [-PX + 0.05, y, 0], [-h, y, 0]],
          [[PX, 0, 0], [PX, y - 0.05, 0], [PX - 0.05, y, 0], [h, y, 0]],
        ]}
      />
      <group position={[0, y, 0]}>
        {glass ? (
          <>
            {/* êmbolos de dumet (cobre-níquel) e cristal de silício entre eles */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * len * 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={geo(`axSlug${r},${len}`, () => new THREE.CylinderGeometry(r * 0.5, r * 0.5, len * 0.36, 12))} material={mat('#b88458', 1, 0.35)} />
            ))}
            <mesh geometry={geo(`axDie${r}`, () => new THREE.BoxGeometry(0.02, r * 0.55, r * 0.55))} material={mat('#3b3f4a', 0.6, 0.3)} />
            <mesh geometry={bodyGeo(r, len, lr)} material={mat(body, 0, 0.06, { transparent: true, opacity: 0.5, depthWrite: false })} />
          </>
        ) : (
          <mesh geometry={bodyGeo(r, len, lr)} material={mat(body, 0, 0.55)} castShadow />
        )}
        <mesh geometry={ringGeo(r + 0.003, b0, b1)} material={mat(band, glass ? 0 : 0.2, 0.45)} />
        {text && <mesh geometry={ringGeo(r + 0.004, t0, t1, (3 * Math.PI) / 2 - span / 2, span)} material={textMat(text, ink || (glass ? '#151515' : '#c9cdd2'), r * span, t1 - t0)} />}
      </group>
    </group>
  )
}

function Model() {
  return <AxialDiode body="#1a1a1a" band="#cfd3d8" r={0.135} len={0.52} text="1N4007" />
}

function Overlay2D({ info, live }) {
  return live?.burned ? <Boom info={info} /> : null
}

export default { type: 'diode', Model, Overlay2D }
