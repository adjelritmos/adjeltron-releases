// Portão de garagem / estore de enrolar: caixa por cima do vão (y de 0 a box), guias laterais
// e cortina de lâminas que sobe para dentro da caixa (live.pos: 0 = fechado, 1 = aberto).
// Referencial: x = para fora da parede, y = cima, z = ao longo da parede (ver shared/parts/_estore.js).
import { Box, RBox, Cyl, liveOf, useFrame, useRef } from '../kit.jsx'
import { DEFS } from '@shared/components.js'
import { estoreDims } from '@shared/parts/_estore.js'
import { texMat } from './_casaKit.jsx'
import { geo, THREE } from '../kit.jsx'

const ALU = '#cfd4d8'
const P = 0.254

export function makeEstoreModel(type) {
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
    // lâmina: face com UV em cm (friso horizontal)
    const slatGeo = geo(`slat${w},${sh}`, () => {
      const g = new THREE.BoxGeometry(0.16, sh * 0.96, w - 0.1)
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 0.25, uv.getY(i))
      return g
    })
    const slatMat = texMat('lamina', c.cor || '#d7dbde', 0.45, { metalness: type === 'portaoGaragem' ? 0.35 : 0 })
    return (
      <group>
        {/* caixa do estore */}
        <RBox size={[box, box, w + 0.5]} r={0.08} pos={[box / 2, box / 2, 0]} color={c.cor || '#d7dbde'} rough={0.45} metal={type === 'portaoGaragem' ? 0.3 : 0} />
        {/* guias laterais */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Box size={[0.5, h, 0.12]} pos={[0.25, -h / 2, s * (w / 2 + 0.05)]} color={ALU} metal={0.7} rough={0.35} />
            <Box size={[0.08, h, 0.3]} pos={[0.04, -h / 2, s * (w / 2 - 0.05)]} color={ALU} metal={0.7} rough={0.35} />
            <Box size={[0.08, h, 0.3]} pos={[0.46, -h / 2, s * (w / 2 - 0.05)]} color={ALU} metal={0.7} rough={0.35} />
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
          {type === 'portaoGaragem' && <Box size={[0.12, 0.25, 1.2]} pos={[0.4, -h + 0.5, 0]} color="#222" rough={0.5} />}
        </group>
        {/* motor tubular (tampa lateral) e régua de bornes por cima */}
        <Cyl r={box * 0.32} h={0.25} pos={[box / 2, box / 2, w / 2 + 0.37]} rot={[Math.PI / 2, 0, 0]} color="#3a3f44" rough={0.5} seg={20} />
        <Box size={[0.75, 0.45, 1.45]} pos={[box / 2, box - 0.2, 0]} color="#1f7a3a" rough={0.55} />
        {[-2, -1, 0, 1, 2].map((k) => (
          <Cyl key={k} r={0.08} h={0.06} pos={[box / 2, box + 0.03, k * P]} color="#c0c6cc" metal={0.85} rough={0.3} seg={10} />
        ))}
      </group>
    )
  }
  return Model
}
