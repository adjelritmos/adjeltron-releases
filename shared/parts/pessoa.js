// Pessoa (boneco) para a maquete da casa: serve para testar sensores de presença. Origem entre
// os pés, no chão; a pessoa olha para +x. Na construção arrasta-se como qualquer peça; durante
// a simulação arrasta-se com o rato e anda (pernas e braços a balançar) para onde se levar.
// O deslocamento durante a simulação vai para o simulador em inputs[id] = { px, py, pz, yaw }
// (cm e radianos, no referencial da peça; colisões e degraus resolvidos na física do browser): o PIR vê-a a mexer-se e os sensores de distância
// (HC-SR04) veem-na como obstáculo.
import { num } from './_casa.js'

// altura por omissão: 14,5 cm ≈ 1,74 m à escala 1:12 (paredes de 20 cm ≈ 2,4 m, portas de 15 cm ≈ 1,8 m)
export const PESSOA_H = 14.5
export const pessoaK = (c = {}) => num(c.altura, PESSOA_H) / PESSOA_H

export default {
  type: 'pessoa',
  name: 'Pessoa (boneco que anda)',
  short: 'Pessoa',
  cat: 'casa',
  walker: true,
  description:
    'Boneco de uma pessoa à escala da maquete (14,5 cm ≈ 1,74 m à escala 1:12), para testar a casa inteligente. Durante a simulação ARRASTE-A com o rato: anda para onde a levar (vira-se para a frente e mexe pernas e braços). Não atravessa paredes, portas fechadas, móveis nem eletrodomésticos (escorrega ao longo deles), sobe degraus baixos como a laje da casa, empurra peças soltas e portas na dobradiça livre, e os carros param à frente dela. Um sensor PIR deteta-a quando ela se mexe dentro do seu cone (±55°) até ~60 cm (≈7 m reais) e sem paredes pelo meio; os sensores ultrassónicos (HC-SR04) veem-na como obstáculo. Ao parar a simulação volta ao sítio onde foi posta na construção.',
  size: [2.2, PESSOA_H, 3.4],
  pins: [],
  config: { altura: PESSOA_H, pele: '#e2b48d', cabelo: '#3a2618', camisola: '#2f6fb5', calcas: '#2b3240', sapatos: '#1f1f1f' },
  fields: [
    { key: 'altura', label: 'Altura', type: 'range', min: 6, max: 24, step: 0.5, unit: 'cm' },
    { key: 'pele', label: 'Cor da pele', type: 'color' },
    { key: 'cabelo', label: 'Cor do cabelo', type: 'color' },
    { key: 'camisola', label: 'Cor da camisola', type: 'color' },
    { key: 'calcas', label: 'Cor das calças', type: 'color' },
    { key: 'sapatos', label: 'Cor dos sapatos', type: 'color' },
  ],
  mass: 120,
  // pernas, tronco (com os braços) e cabeça
  collider: (c) => {
    const k = pessoaK(c)
    return [
      { size: [1.3 * k, 7.0 * k, 1.8 * k], pos: [0.1 * k, 3.5 * k, 0] },
      { size: [1.4 * k, 5.0 * k, 3.0 * k], pos: [0, 9.6 * k, 0] },
      { size: [1.7 * k, 2.3 * k, 1.7 * k], pos: [0, 13.3 * k, 0] },
    ]
  },
}
