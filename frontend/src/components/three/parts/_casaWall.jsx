// Parede da maquete (parede lisa, com porta ou com janela): corpo extrudido com o vão, pele
// exterior com a textura do acabamento, tinta interior, rodapé boleado, aros e guarnições
// molduradas de madeira e soleira (porta) ou cantaria, peitoril com pingadeira e caixilho de
// duas folhas com vidro duplo, bites e cremona (janela).
import { Box, RBox, mat } from '../kit.jsx'
import { matColor } from '@shared/parts/_materials.js'
import { wallDims, ACAB_COR } from '@shared/parts/_casa.js'
import { wallBodyGeo, faceGeo, finishMat, GLASS } from './_casaKit.jsx'

const WOOD = '#8f5f36'
const STONE = '#e3ddd0'
const FRAME = '#f3f3f0'

export function Wall({ cfg, hole, kind }) {
  const { L, H, T } = wallDims(cfg)
  const ext = cfg.acabamento || 'reboco'
  const extColor = cfg.corExterior || ACAB_COR[ext] || '#efe6d2'
  const base = matColor(cfg, 'madeira')
  const holes = hole ? [[hole.x - hole.w / 2, hole.y0, hole.x + hole.w / 2, hole.y1]] : []
  const intMat = mat(cfg.corInterior || '#f4f1ea', 0, 0.92)
  const edgeMat = ext === 'material' ? mat(base, 0, 0.75) : mat(ext === 'reboco' ? extColor : '#e7e2d8', 0, 0.92)
  const a = hole ? hole.x - hole.w / 2 : 0
  const b = hole ? hole.x + hole.w / 2 : 0
  const rodape = cfg.rodape !== false
  const skirt = []
  if (rodape) {
    if (kind === 'porta') {
      if (a + L / 2 > 0.05) skirt.push([(-L / 2 + a) / 2, a + L / 2])
      if (L / 2 - b > 0.05) skirt.push([(b + L / 2) / 2, L / 2 - b])
    } else skirt.push([0, L])
  }
  const tw = 0.4 // largura das guarnições
  return (
    <group>
      <mesh geometry={wallBodyGeo(L, H, T, holes)} material={[intMat, edgeMat]} castShadow receiveShadow />
      <mesh geometry={faceGeo([-L / 2, 0, L / 2, H], holes)} material={finishMat(ext, extColor, base)} position={[0, 0, 0.012]} receiveShadow />
      {skirt.map(([x, len], i) => (
        <group key={i}>
          {/* rodapé lacado com o boleado em cima */}
          <Box size={[len, 0.62, 0.1]} pos={[x, 0.31, -T - 0.05]} color="#f7f6f2" rough={0.45} />
          <RBox size={[len, 0.14, 0.14]} r={0.05} pos={[x, 0.63, -T - 0.07]} color="#f7f6f2" rough={0.4} />
        </group>
      ))}
      {kind === 'porta' && hole && (
        <group>
          {/* aro (forra do vão) e guarnições dos dois lados */}
          <Box size={[0.1, hole.y1, T]} pos={[a + 0.05, hole.y1 / 2, -T / 2]} color={WOOD} rough={0.6} />
          <Box size={[0.1, hole.y1, T]} pos={[b - 0.05, hole.y1 / 2, -T / 2]} color={WOOD} rough={0.6} />
          <Box size={[hole.w, 0.1, T]} pos={[hole.x, hole.y1 - 0.05, -T / 2]} color={WOOD} rough={0.6} />
          {[1, -1].map((s, i) => {
            const z = s > 0 ? 0.05 : -T - 0.05
            const zb = z + s * 0.06
            return (
              <group key={i}>
                {/* guarnição moldurada: tábua e meia-cana na aresta de fora */}
                <Box size={[tw, hole.y1 + tw, 0.1]} pos={[a - tw / 2, (hole.y1 + tw) / 2, z]} color={WOOD} rough={0.55} />
                <Box size={[tw, hole.y1 + tw, 0.1]} pos={[b + tw / 2, (hole.y1 + tw) / 2, z]} color={WOOD} rough={0.55} />
                <Box size={[hole.w + 2 * tw, tw, 0.1]} pos={[hole.x, hole.y1 + tw / 2, z]} color={WOOD} rough={0.55} />
                <RBox size={[0.12, hole.y1 + tw, 0.06]} r={0.025} pos={[a - tw + 0.06, (hole.y1 + tw) / 2, zb]} color={WOOD} rough={0.45} />
                <RBox size={[0.12, hole.y1 + tw, 0.06]} r={0.025} pos={[b + tw - 0.06, (hole.y1 + tw) / 2, zb]} color={WOOD} rough={0.45} />
                <RBox size={[hole.w + 2 * tw, 0.12, 0.06]} r={0.025} pos={[hole.x, hole.y1 + tw - 0.06, zb]} color={WOOD} rough={0.45} />
              </group>
            )
          })}
          {/* soleira de pedra */}
          <Box size={[hole.w, 0.06, T + 0.3]} pos={[hole.x, 0.03, -T / 2 + 0.15]} color={STONE} rough={0.5} />
        </group>
      )}
      {kind === 'janela' && hole && (
        <group>
          {/* cantaria por fora, peitoril de pedra saliente e parapeito por dentro */}
          <Box size={[tw, hole.h, 0.1]} pos={[a - tw / 2, (hole.y0 + hole.y1) / 2, 0.05]} color={STONE} rough={0.55} />
          <Box size={[tw, hole.h, 0.1]} pos={[b + tw / 2, (hole.y0 + hole.y1) / 2, 0.05]} color={STONE} rough={0.55} />
          <Box size={[hole.w + 2 * tw, tw, 0.1]} pos={[hole.x, hole.y1 + tw / 2, 0.05]} color={STONE} rough={0.55} />
          <Box size={[hole.w + 1.0, 0.28, 0.9]} pos={[hole.x, hole.y0 - 0.14, 0.25]} color={STONE} rough={0.5} />
          {/* pingadeira (ranhura por baixo do peitoril) */}
          <Box size={[hole.w + 0.8, 0.03, 0.05]} pos={[hole.x, hole.y0 - 0.285, 0.55]} color="#8e877a" rough={0.8} />
          <Box size={[hole.w + 0.6, 0.18, 0.5]} pos={[hole.x, hole.y0 - 0.09, -T - 0.15]} color={FRAME} rough={0.5} />
          {cfg.vidro !== false && (
            <group position={[0, 0, -T / 2]}>
              {/* caixilho de duas folhas com vidro */}
              <Box size={[0.35, hole.h, 0.35]} pos={[a + 0.175, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[0.35, hole.h, 0.35]} pos={[b - 0.175, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[hole.w, 0.35, 0.35]} pos={[hole.x, hole.y1 - 0.175, 0]} color={FRAME} rough={0.4} />
              <Box size={[hole.w, 0.35, 0.35]} pos={[hole.x, hole.y0 + 0.175, 0]} color={FRAME} rough={0.4} />
              {/* montante central (as duas folhas sobrepostas) e puxador de cremona por dentro */}
              <Box size={[0.4, hole.h, 0.4]} pos={[hole.x, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[0.04, hole.h - 0.4, 0.42]} pos={[hole.x, (hole.y0 + hole.y1) / 2, 0]} color="#d8d8d4" rough={0.6} />
              <RBox size={[0.16, 0.42, 0.06]} r={0.025} pos={[hole.x - 0.12, (hole.y0 + hole.y1) / 2, -0.23]} color="#b9bec2" metal={0.85} rough={0.25} />
              <RBox size={[0.1, 0.5, 0.08]} r={0.035} pos={[hole.x - 0.12, (hole.y0 + hole.y1) / 2 - 0.25, -0.32]} color="#b9bec2" metal={0.85} rough={0.25} />
              {/* bites de vidro por dentro e vidro duplo (dois painéis) */}
              {[-1, 1].map((sd) => {
                const cx = hole.x + sd * (hole.w / 4 + 0.05)
                const gw = hole.w / 2 - 0.5
                const gh = hole.h - 0.7
                const yc = (hole.y0 + hole.y1) / 2
                return (
                  <group key={sd}>
                    <Box size={[gw + 0.1, 0.08, 0.08]} pos={[cx, yc + gh / 2, -0.15]} color={FRAME} rough={0.4} />
                    <Box size={[gw + 0.1, 0.08, 0.08]} pos={[cx, yc - gh / 2, -0.15]} color={FRAME} rough={0.4} />
                    <Box size={[0.08, gh, 0.08]} pos={[cx - gw / 2, yc, -0.15]} color={FRAME} rough={0.4} />
                    <Box size={[0.08, gh, 0.08]} pos={[cx + gw / 2, yc, -0.15]} color={FRAME} rough={0.4} />
                  </group>
                )
              })}
              {[-0.06, 0.06].map((z) => (
                <mesh key={z} position={[hole.x, (hole.y0 + hole.y1) / 2, z]} material={GLASS()}>
                  <planeGeometry args={[hole.w - 0.4, hole.h - 0.4]} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      )}
    </group>
  )
}
