// Traços das canetas (def.pen, ver src/engine/sim/engine.js "canetas"): fitas planas da cor e
// espessura de cada caneta, pousadas na superfície onde a ponta escreveu. Os pontos chegam
// das fotografias (simRef.ink); a geometria é refeita no máximo ~10 vezes por segundo.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { simRef } from '../../contexts/simRef.js'
import { useStore } from '../../contexts/store.js'

function ribbon(pts, w) {
  const pos = []
  const h = w / 2
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (!a || !b) continue
    const dx = b[0] - a[0]
    const dz = b[2] - a[2]
    const L = Math.hypot(dx, dz) || 1
    const nx = (-dz / L) * h
    const nz = (dx / L) * h
    const A1 = [a[0] + nx, a[1], a[2] + nz]
    const A2 = [a[0] - nx, a[1], a[2] - nz]
    const B1 = [b[0] + nx, b[1], b[2] + nz]
    const B2 = [b[0] - nx, b[1], b[2] - nz]
    pos.push(...A1, ...B1, ...A2, ...A2, ...B1, ...B2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return g
}

function PenTrace({ id }) {
  const part = useStore((s) => s.parts.find((p) => p.id === id))
  const mesh = useRef()
  const seen = useRef({ ver: -1, t: 0 })
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: part?.config?.color || '#1565c0', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), [part?.config?.color])
  useFrame(() => {
    const now = performance.now()
    if (seen.current.ver === simRef.inkVer || now - seen.current.t < 100 || !mesh.current) return
    seen.current = { ver: simRef.inkVer, t: now }
    const old = mesh.current.geometry
    mesh.current.geometry = ribbon(simRef.ink[id] || [], part?.config?.stroke ?? 0.15)
    old?.dispose()
  })
  return <mesh ref={mesh} material={mat} renderOrder={2} />
}

export function InkTraces() {
  const pens = useStore((s) => s.parts.filter((p) => p.type === 'caneta').map((p) => p.id).join(','))
  if (!pens) return null
  return (
    <group>
      {pens.split(',').map((id) => (
        <PenTrace key={id} id={id} />
      ))}
    </group>
  )
}
