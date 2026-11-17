// Materiais das peças de construção genéricas (bloco, cilindro, placa, elo…): densidade
// (massa = volume × densidade), atrito na física e aspeto 3D. A cor pode ser trocada pelo
// utilizador (config.color); ao mudar de material a cor volta à do material.
//   dens   g/cm³ (peças impressas: densidade efetiva com ~30 % de enchimento)
//   friction coeficiente de atrito no Rapier (o chão da mesa tem 0,9)
//   metal, rough, opacity  aspeto (MeshStandardMaterial)
export const MATERIALS = {
  alu: { name: 'Alumínio', dens: 2.7, color: '#cfd8dc', metal: 0.85, rough: 0.3, friction: 0.6 },
  aluPreto: { name: 'Alumínio anodizado preto', dens: 2.7, color: '#2b2f33', metal: 0.7, rough: 0.35, friction: 0.6 },
  aco: { name: 'Aço', dens: 7.85, color: '#9aa5ad', metal: 0.9, rough: 0.38, friction: 0.55 },
  latao: { name: 'Latão', dens: 8.5, color: '#c9a227', metal: 0.9, rough: 0.3, friction: 0.5 },
  acrilico: { name: 'Acrílico (PMMA)', dens: 1.18, color: '#141414', metal: 0, rough: 0.12, friction: 0.5 },
  acrilicoT: { name: 'Acrílico transparente', dens: 1.18, color: '#bfe3ff', metal: 0, rough: 0.05, friction: 0.5, opacity: 0.45 },
  acrilicoPapel: { name: 'Acrílico com papel de proteção (kraft)', dens: 1.18, color: '#b8976a', metal: 0, rough: 0.9, friction: 0.6 },
  pla: { name: 'PLA impresso (30 % enchimento)', dens: 0.62, color: '#ff6d00', metal: 0, rough: 0.55, friction: 0.6 },
  petg: { name: 'PETG impresso', dens: 0.66, color: '#455a64', metal: 0, rough: 0.35, friction: 0.55 },
  plaSolido: { name: 'PLA maciço (100 %)', dens: 1.24, color: '#e0e0e0', metal: 0, rough: 0.55, friction: 0.6 },
  madeira: { name: 'Madeira / MDF', dens: 0.75, color: '#c8a165', metal: 0, rough: 0.8, friction: 0.7 },
  mdf: { name: 'MDF 3 mm (cortado a laser)', dens: 0.75, color: '#b98a55', metal: 0, rough: 0.85, friction: 0.7 },
  papel: { name: 'Papel (folha para desenhar)', dens: 0.8, color: '#fafafa', metal: 0, rough: 0.95, friction: 0.6 },
  cartao: { name: 'Cartão', dens: 0.7, color: '#b9926b', metal: 0, rough: 0.95, friction: 0.7 },
  abs: { name: 'ABS (plástico injetado)', dens: 1.05, color: '#f5f5f5', metal: 0, rough: 0.45, friction: 0.55 },
  nylon: { name: 'Nylon (POM/PA)', dens: 1.15, color: '#f1ede4', metal: 0, rough: 0.5, friction: 0.35 },
  carbono: { name: 'Fibra de carbono', dens: 1.6, color: '#1b1b1d', metal: 0.25, rough: 0.35, friction: 0.5 },
  borracha: { name: 'Borracha', dens: 1.1, color: '#1e1e1e', metal: 0, rough: 0.9, friction: 1.2 },
  espuma: { name: 'Espuma EVA', dens: 0.1, color: '#4fc3f7', metal: 0, rough: 0.95, friction: 0.9 },
  betao: { name: 'Betão (contrapeso)', dens: 2.4, color: '#9e9e9e', metal: 0, rough: 0.95, friction: 0.8 },
}

export const MATERIAL_OPTS = Object.entries(MATERIALS).map(([k, m]) => [k, m.name])

export const matOf = (cfg, fallback = 'alu') => MATERIALS[cfg?.material] || MATERIALS[fallback]
export const matColor = (cfg, fallback) => cfg?.color || matOf(cfg, fallback).color

// campos de material e cor para as `fields` das peças (a cor volta à do material ao trocar)
export const materialFields = () => [
  { key: 'material', label: 'Material', type: 'select', options: MATERIAL_OPTS, resets: ['color'] },
  { key: 'color', label: 'Cor', type: 'color', auto: (c) => matOf(c).color },
]

// massa (g) e atrito a partir do material
export const massOf = (cfg, volume, fallback) => Math.max(0.5, volume * matOf(cfg, fallback).dens)
export const frictionOf = (fallback) => (cfg) => matOf(cfg, fallback).friction

// ---------------- material das outras peças mecânicas (escolha genérica) ----------------
// Peças de Construção, Mecânica e Robótica sem campo de material próprio: o material de que
// são feitas de origem. Escolher outro (config.material) troca o aspeto da parte principal do
// modelo 3D, multiplica a massa pela razão das densidades e muda o atrito.
export const BASE_MATERIAL = {
  chassis: 'acrilico', armBase: 'pla', armLink: 'alu', cube: 'pla', frame: 'acrilico',
  droneFrame: 'carbono', quadrupedBody: 'pla', spiderChassis: 'acrilico', humanoidTorso: 'pla', servoBracket: 'alu', robotFoot: 'pla', robotPaw: 'borracha',
  heliceVentoinha: 'abs', heliceMesa: 'acrilicoT', propeller: 'abs',
  beam: 'alu', angleBracket: 'alu', uBracket: 'alu', mechPlate: 'alu', extrusion2020: 'alu', standoff: 'latao', loadBlock: 'aco',
  axle: 'aco', shaftCoupler: 'alu', pillowBlock: 'aco', spurGear: 'pla', gt2Pulley: 'alu',
  rubberWheel: 'pla', omniWheel: 'pla', mecanumWheel: 'pla', casterBall: 'aco', rodizio: 'aco', correiaGt2: 'borracha', tankChassis: 'alu',
  hinge: 'aco', leadScrew: 'aco', gearRack: 'pla', shockAbsorber: 'alu', turntable: 'alu', panTilt: 'pla', caneta: 'abs',
  gripper: 'acrilico', garraMetal: 'aluPreto', parallelGripper: 'pla',
}
