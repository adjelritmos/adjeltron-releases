// Eletrodomésticos da maquete (grupo Casa inteligente): ar condicionado, ventoinha de pé,
// televisão, aquecedor e campainha. São cargas elétricas a sério (resistência equivalente
// V²/P ou motor DC) comandadas pelo Arduino através de um relé, transístor ou MOSFET.
// Tabela de alimentações de cada aparelho: { chave: { v, w, name } } (w = potência nominal).
export const eletroTipo = (TIPOS, c = {}) => TIPOS[c.tipo] || TIPOS[Object.keys(TIPOS)[0]]
export const tipoOptions = (TIPOS) => Object.entries(TIPOS).map(([k, t]) => [k, t.name])
// corrente nominal em mA (texto das descrições e avisos)
export const mA = (t) => Math.round((t.w / t.v) * 1000)

// bornes de parafuso atrás (−x), como no candeeiro: 1 e 2 sem polaridade
export const bornes = (x, y, z = 0.35, ids = ['1', '2'], labels = ['Borne 1', 'Borne 2'], kind = 'pass') => [
  { id: ids[0], label: labels[0], pos: [x, y, -z], kind, conn: 'screw', dir: [-1, 0, 0] },
  { id: ids[1], label: labels[1], pos: [x, y, z], kind, conn: 'screw', dir: [-1, 0, 0] },
]
