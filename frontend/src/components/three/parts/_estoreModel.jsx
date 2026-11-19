// Portão de garagem / estore de enrolar: caixa exterior de alumínio lacado com o chanfro de
// 45° em baixo e as tampas laterais de plástico (y de 0 a box), guias laterais em U com as
// escovas de vedação e cortina de lâminas perfiladas (o estore: lâmina de face abaulada; o
// portão: lâmina de alumínio de duas ondas) que sobe para dentro da caixa (live.pos: 0 =
// fechado, 1 = aberto). Por cima, a régua de bornes de 5 vias (motor tubular e fins de curso).
// Referencial: x = para fora da parede, y = cima, z = ao longo da parede (ver shared/parts/_estore.js).
import { Box, Cyl, geo, mat, mergedGeo, liveOf, useFrame, useRef, THREE } from '../kit.jsx'
import { DEFS } from '@shared/components.js'
import { estoreDims } from '@shared/parts/_estore.js'
import { roundShape, ScrewHead } from './_casaKit.jsx'

const ALU = '#cfd4d8'
const P = 0.254

// perfil (forma no plano xy) extrudido segundo z, centrado (de −len/2 a len/2)
function prismZ(key, makeShape, len, curveSegments = 6) {
  return geo(`estZ${key}|${len}`, () => {
    const g = new THREE.ExtrudeGeometry(makeShape(), { depth: len, bevelEnabled: false, curveSegments })
    g.translate(0, 0, -len / 2)
    g.computeVertexNormals()
    return g
  })
}
// perfil de uma lâmina de altura sh (centrada; x = para fora): costas planas e face abaulada
// (uma onda no estore, duas no portão), com o encaixe (gancho) em cima
function slatShape(sh, garage) {
  const s = new THREE.Shape()
  const b = -sh * 0.48
  const t = sh * 0.48
  const th = garage ? 0.06 : 0.05
  s.moveTo(-0.045, b)
  s.lineTo(0.0, b)
  if (garage) {
    s.quadraticCurveTo(th * 2, b / 2, 0.0, 0)
    s.quadraticCurveTo(th * 2, t / 2, 0.0, t)
  } else s.quadraticCurveTo(th * 2, 0, 0.0, t)
  s.lineTo(-0.02, t)
  s.lineTo(-0.02, t - sh * 0.06)
  s.lineTo(-0.045, t - sh * 0.06)
  s.closePath()
  return s
}

export function makeEstoreModel(type) {
  const garage = type === 'portaoGaragem'
  function Model({ part }) {
    const c = part.config || {}
    const def = DEFS[type].estore
    const { w, h, box, slat } = estoreDims(c, def)
    const n = Math.max(2, Math.ceil(h / slat))
    const sh = h / n
    const curtain = useRef()
    const slats = useRef([])
    const pos = useRef(+(c.inicio ?? 0))
    useFrame((_, dt) => {
      const l = liveOf(part.id)
      const target = l?.pos ?? +(c.inicio ?? 0)
      pos.current += (target - pos.current) * Math.min(1, dt * 12)
      const off = pos.current * h
      if (curtain.current) curtain.current.position.y = off
      slats.current.forEach((m, i) => {
        if (m) m.visible = -h + (i + 1) * sh + off <= 0.02 + sh * 0.5
      })
    })
    const col = c.cor || '#d7dbde'
    const slatGeo = prismZ(`slat${garage ? 'g' : 'e'}${sh}`, () => slatShape(sh, garage), w - 0.1)
    const slatMat = mat(col, garage ? 0.45 : 0, garage ? 0.38 : 0.42)
    // caixa: perfil quadrado com o chanfro de 45° em baixo, à frente (por onde sai a cortina)
    const boxShape = () => roundShape([[0, 0, 0], [box * 0.5, 0, 0.03], [box, box * 0.5, 0.03], [box, box, 0.06], [0, box, 0]])
    const L = w + 0.4
    const shell = prismZ(`box${box}`, boxShape, L - 0.12, 8)
    const cap = prismZ(`cap${box}`, boxShape, 0.06, 8)
    // régua de bornes (5 vias, passo 2,54 mm): poços dos parafusos e bocas dos fios (+x)
    const tb = mergedGeo(`estTB${box}`, () => {
      const u = geo('estUnit', () => new THREE.BoxGeometry(1, 1, 1))
      const out = []
      for (let k = -2; k <= 2; k++) {
        out.push([u, [box / 2, box + 0.026, k * P], [0, 0, 0], [0.2, 0.004, 0.2]])
        out.push([u, [box / 2 + 0.351, box - 0.08, k * P], [0, 0, 0], [0.004, 0.12, 0.16]])
      }
      return out
    })
    return (
      <group>
        {/* caixa do estore e tampas laterais */}
        <mesh geometry={shell} material={mat(col, garage ? 0.3 : 0, 0.42)} castShadow receiveShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={cap} material={mat('#e9e9e6', 0, 0.5)} position={[0, 0, s * (L / 2 - 0.03)]} castShadow />
        ))}
        {/* tampa do motor tubular (lado +z) */}
        <Cyl r={box * 0.3} h={0.03} pos={[box * 0.45, box * 0.55, L / 2 + 0.01]} rot={[Math.PI / 2, 0, 0]} color="#3a3f44" rough={0.5} seg={20} />
        {/* guias laterais em U com as escovas de vedação */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Box size={[0.5, h, 0.12]} pos={[0.25, -h / 2, s * (w / 2 + 0.05)]} color={ALU} metal={0.7} rough={0.35} />
            <Box size={[0.08, h, 0.3]} pos={[0.04, -h / 2, s * (w / 2 - 0.05)]} color={ALU} metal={0.7} rough={0.35} />
            <Box size={[0.08, h, 0.3]} pos={[0.46, -h / 2, s * (w / 2 - 0.05)]} color={ALU} metal={0.7} rough={0.35} />
            <Box size={[0.03, h, 0.2]} pos={[0.095, -h / 2, s * (w / 2 - 0.06)]} color="#1c1c1c" rough={1} />
            <Box size={[0.03, h, 0.2]} pos={[0.405, -h / 2, s * (w / 2 - 0.06)]} color="#1c1c1c" rough={1} />
            <Box size={[0.52, 0.04, 0.42]} pos={[0.25, -h + 0.02, s * (w / 2)]} color="#2a2a2a" rough={0.7} />
          </group>
        ))}
        {/* cortina de lâminas (sobe com live.pos) */}
        <group ref={curtain}>
          {Array.from({ length: n }, (_, i) => (
            <mesh key={i} ref={(m) => (slats.current[i] = m)} geometry={slatGeo} material={slatMat} position={[0.25, -h + (i + 0.5) * sh, 0]} castShadow receiveShadow />
          ))}
          {/* perfil de remate em baixo com borracha */}
          <Box size={[0.3, 0.18, w - 0.1]} pos={[0.25, -h + 0.09, 0]} color={ALU} metal={0.75} rough={0.3} />
          <Box size={[0.2, 0.06, w - 0.12]} pos={[0.25, -h + 0.0, 0]} color="#1c1c1c" rough={0.9} />
          {garage && (
            <group>
              {/* puxador e fechadura de cilindro */}
              <Box size={[0.12, 0.25, 1.2]} pos={[0.4, -h + 0.5, 0]} color="#222" rough={0.5} />
              <Cyl r={0.09} h={0.06} pos={[0.43, -h + 0.85, 0]} rot={[0, 0, Math.PI / 2]} color="#c9a24a" metal={0.9} rough={0.3} seg={12} />
              <Box size={[0.02, 0.1, 0.02]} pos={[0.465, -h + 0.85, 0]} color="#151515" />
            </group>
          )}
        </group>
        {/* régua de bornes por cima (verde, 5 vias): M+, M−, COM, ABERTO, FECHADO */}
        <Box size={[0.7, 0.3, 5 * P + 0.08]} pos={[box / 2, box - 0.125, 0]} color="#1f7a3a" rough={0.55} />
        <mesh geometry={tb} material={mat('#0e2a16', 0, 0.8)} />
        {[-2, -1, 0, 1, 2].map((k) => (
          <ScrewHead key={k} pos={[box / 2, box + 0.02, k * P]} r={0.075} rotY={0.3 * k} color="#c0c6cc" cross={false} />
        ))}
      </group>
    )
  }
  return Model
}
