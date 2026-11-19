// Módulo de câmara tipo Raspberry Pi Camera v2 (25 × 24 × 1 mm): PCB verde com 4 furos de 2,2 mm
// metalizados, módulo da objetiva (8,5 × 8,5 mm, base preta + barril roscado com o vidro azulado)
// ligado por uma fita flexível dourada ao seu conector, regulador, cristal e passivos SMD, e o
// conector ZIF de 15 vias (bege com a patilha castanha) com a fita plana branca de contactos.
import { Box, RBox, Cyl, mat, geo, THREE } from '../kit.jsx'
import { PcbPlate, Smds, Sot23, SmdCrystal } from './_boardKit.jsx'

const T = 0.1
const HOLES = [[1.05, -1.0, 0.11], [1.05, 1.0, 0.11], [-0.2, -1.0, 0.11], [-0.2, 1.0, 0.11]]
const LENS = [0.35, 0]
const SMDS = [
  [-0.55, 0.75, 1, 'c'], [-0.4, 0.75, 1, 'c'], [-0.25, 0.75, 1, 'r'], [-0.55, -0.75, 1, 'c'], [-0.4, -0.75, 1, 'r'],
  [0.95, 0.55, 0, 'c'], [0.95, -0.55, 0, 'c'], [-0.55, 0.0, 1, 'C'], [-0.2, 0.45, 0, 'c'], [-0.2, -0.45, 0, 'c'],
]
// fita plana de 15 vias: contactos de cobre estanhado à vista na ponta
const ribbonContacts = () =>
  geo('camRibbonC', () => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 32
    const x = c.getContext('2d')
    x.fillStyle = '#f1eee6'
    x.fillRect(0, 0, 256, 32)
    for (let i = 0; i < 15; i++) {
      x.fillStyle = '#b7a37a'
      x.fillRect(10 + i * 16, 0, 9, 32)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 })
  })

function Model() {
  const [lx, lz] = LENS
  return (
    <group>
      <PcbPlate id="camV2" w={2.5} d={2.4} t={T} y={0} r={0.1} holes={HOLES} color="#0f5a2e" ringColor="#d4af37" />
      {/* módulo da objetiva: base preta, barril roscado, anel e vidro com reflexo azulado */}
      <RBox size={[0.85, 0.42, 0.85]} r={0.04} pos={[lx, T + 0.21, lz]} color="#141414" rough={0.55} />
      <Cyl r={0.33} h={0.16} pos={[lx, T + 0.5, lz]} color="#1b1b1b" rough={0.45} seg={28} />
      {[0.44, 0.48, 0.52, 0.56].map((y) => (
        <Cyl key={y} r={0.335} h={0.012} pos={[lx, T + y, lz]} color="#262626" rough={0.6} seg={28} />
      ))}
      <Cyl r={0.27} h={0.02} pos={[lx, T + 0.585, lz]} color="#0c0c0c" rough={0.4} seg={28} />
      <mesh position={[lx, T + 0.597, lz]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('camGlass', () => new THREE.CircleGeometry(0.17, 28))} material={mat('#1d3b78', 0.6, 0.06)} />
      <mesh position={[lx - 0.05, T + 0.598, lz - 0.05]} rotation={[-Math.PI / 2, 0, 0]} geometry={geo('camGlint', () => new THREE.CircleGeometry(0.04, 12))} material={mat('#9fb9e8', 0.4, 0.1)} />
      {/* fita flexível dourada do sensor e o seu conector */}
      <Box size={[0.45, 0.012, 0.42]} pos={[lx + 0.62, T + 0.03, lz]} color="#c8902e" rough={0.4} />
      <Box size={[0.22, 0.1, 0.55]} pos={[lx + 0.78, T + 0.05, lz]} color="#e8dfc9" rough={0.6} />
      {/* regulador, cristal de 25 MHz e passivos */}
      <Sot23 pos={[-0.4, T, 0.4]} n={5} />
      <SmdCrystal pos={[-0.4, T, -0.3]} l={0.25} w={0.2} />
      <Smds id="camV2" y={T} items={SMDS} />
      {/* conector ZIF de 15 vias (bege, patilha castanha) e a fita plana com os contactos */}
      <RBox size={[0.42, 0.2, 1.75]} r={0.02} pos={[-1.0, T + 0.1, 0]} color="#e9dfc6" rough={0.55} />
      <RBox size={[0.18, 0.08, 1.7]} r={0.02} pos={[-1.12, T + 0.24, 0]} color="#5a3a22" rough={0.5} />
      <Box size={[1.6, 0.015, 1.5]} pos={[-2.0, T + 0.02, 0]} color="#f1eee6" rough={0.6} />
      <mesh position={[-1.3, T + 0.029, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} geometry={geo('plane1', () => new THREE.PlaneGeometry(1, 1))} scale={[1.5, 0.2, 1]} material={ribbonContacts()} />
    </group>
  )
}

export default { type: 'cameraModule', Model }
