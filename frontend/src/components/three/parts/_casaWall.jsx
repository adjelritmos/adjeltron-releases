// Parede da maquete (parede lisa, com porta ou com janela): corpo extrudido com o vão, pele
// exterior com a textura do acabamento, tinta interior, rodapé, aros e guarnições de madeira
// (porta) ou cantaria, peitoril e caixilho com vidro (janela).
import { Box, mat } from '../kit.jsx'
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
        <Box key={i} size={[len, 0.7, 0.12]} pos={[x, 0.35, -T - 0.06]} color="#f7f6f2" rough={0.5} />
      ))}
      {kind === 'porta' && hole && (
        <group>
          {/* aro (forra do vão) e guarnições dos dois lados */}
          <Box size={[0.1, hole.y1, T]} pos={[a + 0.05, hole.y1 / 2, -T / 2]} color={WOOD} rough={0.6} />
          <Box size={[0.1, hole.y1, T]} pos={[b - 0.05, hole.y1 / 2, -T / 2]} color={WOOD} rough={0.6} />
          <Box size={[hole.w, 0.1, T]} pos={[hole.x, hole.y1 - 0.05, -T / 2]} color={WOOD} rough={0.6} />
          {[0.05, -T - 0.05].map((z, i) => (
            <group key={i}>
              <Box size={[tw, hole.y1 + tw, 0.1]} pos={[a - tw / 2, (hole.y1 + tw) / 2, z]} color={WOOD} rough={0.6} />
              <Box size={[tw, hole.y1 + tw, 0.1]} pos={[b + tw / 2, (hole.y1 + tw) / 2, z]} color={WOOD} rough={0.6} />
              <Box size={[hole.w + 2 * tw, tw, 0.1]} pos={[hole.x, hole.y1 + tw / 2, z]} color={WOOD} rough={0.6} />
            </group>
          ))}
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
          <Box size={[hole.w + 0.6, 0.18, 0.5]} pos={[hole.x, hole.y0 - 0.09, -T - 0.15]} color={FRAME} rough={0.5} />
          {cfg.vidro !== false && (
            <group position={[0, 0, -T / 2]}>
              {/* caixilho de duas folhas com vidro */}
              <Box size={[0.35, hole.h, 0.35]} pos={[a + 0.175, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[0.35, hole.h, 0.35]} pos={[b - 0.175, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[hole.w, 0.35, 0.35]} pos={[hole.x, hole.y1 - 0.175, 0]} color={FRAME} rough={0.4} />
              <Box size={[hole.w, 0.35, 0.35]} pos={[hole.x, hole.y0 + 0.175, 0]} color={FRAME} rough={0.4} />
              <Box size={[0.4, hole.h, 0.4]} pos={[hole.x, (hole.y0 + hole.y1) / 2, 0]} color={FRAME} rough={0.4} />
              <Box size={[0.08, 0.6, 0.12]} pos={[hole.x - 0.3, (hole.y0 + hole.y1) / 2, -0.25]} color="#b9bec2" metal={0.8} rough={0.3} />
              <mesh position={[hole.x, (hole.y0 + hole.y1) / 2, 0]} material={GLASS()}>
                <planeGeometry args={[hole.w - 0.4, hole.h - 0.4]} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  )
}
