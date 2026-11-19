// Módulos e-paper: placa preta, painel de vidro branco-acinzentado com a saliência do CI e a
// fita flexível dobrada, fila de 8 pinos. A imagem (live.fb, RLE de índices de paleta) só chega após cada
// atualização; durante a atualização (live.ref) o painel pisca: imagem antiga invertida,
// preto, branco, nova invertida… e a nova aparece. A imagem fica mesmo sem alimentação.
import { Box, Pcb, HeaderPins, geo, mat, THREE } from '../kit.jsx'
import { EPAPER, EPAPER_DEFS, faceDims } from '@shared/parts/epaper.js'
import { rectOf } from './_groupA.jsx'
import { screen, rleRuns, hexRgb, ledgeMat, Flex } from './_gDisplays.jsx'

// cores da tinta: branco (papel), preto, vermelho, verde, azul, amarelo, laranja
const INK = ['#e7e4dc', '#1f1f22', '#b5221b', '#2f6e3a', '#284f9c', '#e2c31a', '#d8701e'].map(hexRgb)
const PAPER = '#e7e4dc'

const scr = screen({
  init(e) {
    const mk = () => Object.assign(document.createElement('canvas'), { width: e.w, height: e.h })
    e.cur = mk()
    e.prev = mk()
    for (const c of [e.cur, e.prev]) {
      const x = c.getContext('2d')
      x.fillStyle = PAPER
      x.fillRect(0, 0, e.w, e.h)
    }
    e.ver = null
    e.sig = null
  },
  key(e, L) {
    if (L?.fb && (L.ver !== e.ver || L.sig !== e.sig)) {
      // guarda a imagem anterior (para o piscar) e descodifica a nova
      e.prev.getContext('2d').drawImage(e.cur, 0, 0)
      const ctx = e.cur.getContext('2d')
      const img = ctx.createImageData(e.w, e.h)
      const d = img.data
      rleRuns(L.fb, (p0, v, n) => {
        const c = INK[v] || INK[1]
        for (let p = p0; p < p0 + n && p < e.w * e.h; p++) {
          const o = p * 4
          d[o] = c[0]
          d[o + 1] = c[1]
          d[o + 2] = c[2]
          d[o + 3] = 255
        }
      })
      ctx.putImageData(img, 0, 0)
      e.ver = L.ver
      e.sig = L.sig
    }
    const r = L?.ref
    // fase do piscar (atualização completa: 8 fases; parcial: 3)
    const ph = r ? (r.full ? Math.min(7, Math.floor(r.p * 8)) : 10 + Math.min(2, Math.floor(r.p * 3))) : -1
    return `${e.ver}|${e.sig}|${ph}`
  },
  draw(e, L) {
    const ctx = e.view.getContext('2d')
    const r = L?.ref
    ctx.filter = 'none'
    ctx.globalAlpha = 1
    const fill = (c) => {
      ctx.fillStyle = c
      ctx.fillRect(0, 0, e.w, e.h)
    }
    if (!r) return ctx.drawImage(e.cur, 0, 0)
    if (r.full) {
      const ph = Math.min(7, Math.floor(r.p * 8))
      if (ph === 0) {
        ctx.filter = 'invert(0.85)'
        ctx.drawImage(e.prev, 0, 0)
      } else if (ph === 1 || ph === 4) fill('#202022')
      else if (ph === 2 || ph === 5) fill(PAPER)
      else if (ph === 3) {
        ctx.filter = 'invert(0.85)'
        ctx.drawImage(e.cur, 0, 0)
      } else {
        // 6–7: a imagem nova a assentar (ainda com um "fantasma" da antiga)
        ctx.drawImage(e.cur, 0, 0)
        ctx.globalAlpha = ph === 6 ? 0.25 : 0.08
        ctx.drawImage(e.prev, 0, 0)
      }
    } else {
      const ph = Math.min(2, Math.floor(r.p * 3))
      ctx.drawImage(ph === 0 ? e.prev : e.cur, 0, 0)
      if (ph < 2) {
        ctx.globalAlpha = ph === 0 ? 0.5 : 0.3
        ctx.drawImage(ph === 0 ? e.cur : e.prev, 0, 0)
      }
    }
    ctx.globalAlpha = 1
    ctx.filter = 'none'
  },
})

function make(def) {
  const g = EPAPER[def.type]
  const [fw, fh] = faceDims(g)
  const T = 0.16
  const GT = 0.12 // espessura do vidro
  const gx = (g.glass.x[0] + g.glass.x[1]) / 2
  const gz = (g.glass.z[0] + g.glass.z[1]) / 2
  const ax = (g.act.x[0] + g.act.x[1]) / 2
  const az = (g.act.z[0] + g.act.z[1]) / 2
  const aw = g.act.x[1] - g.act.x[0]
  const ad = g.act.z[1] - g.act.z[0]
  const gw = g.glass.x[1] - g.glass.x[0]
  const gd = g.glass.z[1] - g.glass.z[0]
  const big = g.L > 9
  function Model({ part }) {
    const tex = scr.useTex(part.id, fw, fh)
    const red = part.config?.color === 'bwr'
    return (
      <group>
        <Pcb size={[g.L, T, g.D]} color="#202124" holes={big} />
        {/* painel: vidro com a tinta (bordo branco-acinzentado) assente na placa */}
        <Box size={[gw, GT, gd]} pos={[gx, T + GT / 2, gz]} color="#d9d6cd" rough={0.35} />
        {/* saliência do vidro do lado da fita: CI do controlador (COG) e pistas */}
        <mesh position={[(g.glass.x[0] + g.act.x[0]) / 2 - 0.02, T + GT + 0.003, gz]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} scale={[gd * 0.9, Math.max(0.2, g.act.x[0] - g.glass.x[0] - 0.12), 1]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} material={ledgeMat()} />
        {/* moldura branca da área ativa (a tinta fora da área de pontos) e a imagem */}
        <mesh position={[ax, T + GT + 0.003, az]} rotation={[-Math.PI / 2, 0, 0]} scale={[aw + 0.12, ad + 0.12, 1]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} material={mat('#e4e1d8', 0, 0.85)} />
        <mesh position={[ax, T + GT + 0.005, az]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[aw, ad]} />
          <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
        </mesh>
        {/* fita flexível dobrada para trás no bordo do vidro (o conector PH2.0 e o circuito do
            controlador ficam na face de trás da placa) */}
        <group position={[g.glass.x[0], 0, gz]} rotation={[0, -Math.PI / 2, 0]}>
          <Flex z0={-0.05} z1={0.0} w={Math.min(1.6, gd * 0.5)} y={T + 0.008} rb={0.085} />
        </group>
        {/* marca da versão de 3 cores */}
        {red && <Box size={[0.16, 0.012, 0.16]} pos={[-g.L / 2 + 0.3, T + 0.006, -g.D / 2 + 0.2]} color="#b5221b" />}
        <HeaderPins pins={def.pins} base={0} />
      </group>
    )
  }
  function Overlay2D({ part, info, live }) {
    const url = scr.useUrl(part.id, fw, fh, live)
    const r = rectOf(info, g.act.x[0], g.act.z[0], g.act.x[1], g.act.z[1])
    return (
      <g pointerEvents="none">
        <image href={url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" />
        {live?.ref && (
          <g transform={`translate(${r.x + r.w / 2}, ${r.y - 10})`}>
            <rect x={-38} y={-9} width={76} height={16} rx={8} fill="#f59e0b" opacity={0.95} />
            <text textAnchor="middle" y={3} fontSize={10} fontWeight="700" fill="#000">
              BUSY {Math.round(live.ref.p * 100)}%
            </text>
          </g>
        )}
      </g>
    )
  }
  return { type: def.type, Model, Overlay2D }
}

export default EPAPER_DEFS.map(make)
