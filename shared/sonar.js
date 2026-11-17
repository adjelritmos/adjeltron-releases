// Geometria do HC-SR04 (partilhada: catálogo, modelo 3D e simulação).
// Referencial local (cm): +x frente (transdutores), +y cima, +z direita; placa de pé no plano y-z.
// A barra de 4 pinos fica no bordo de baixo, a meio, com o plástico preto atrás da placa.
// Orientação dos pinos (config.pinosDir), como nos outros módulos:
//   baixo  (original) pinos direitos para baixo; o módulo assenta nas pontas (encaixa na breadboard)
//   tras   barra em ângulo reto, pinos na horizontal para trás; a placa assenta na mesa
//   tras45 pinos dobrados a 45° para trás e para cima; a placa assenta na mesa

export const SONAR_ZS = [0.381, 0.127, -0.127, -0.381] // VCC, Trig, Echo, GND (VCC à esquerda, vista de frente)
export const SONAR_MODES = ['baixo', 'tras', 'tras45']
export const SONAR_LABELS = { baixo: 'Para baixo', tras: 'Para trás (ângulo reto)', tras45: 'Para trás a 45°' }
const HX = -0.2 // x do plástico e dos pinos (atrás da placa)
const S = Math.SQRT1_2

export const sonarMode = (cfg) => (SONAR_MODES.includes(cfg?.pinosDir) ? cfg.pinosDir : 'baixo')
// y do bordo de baixo da placa
export const sonarPcbY = (cfg) => (sonarMode(cfg) === 'baixo' ? 0.6 : 0.01) // nas outras: plástico da barra e placa assentes na mesa
// centro dos transdutores (origem do feixe na simulação)
export const sonarEyeY = (cfg) => sonarPcbY(cfg) + 1.05

// pino `i` numa orientação: { pos (onde o fio liga), dir (para onde sai), bend (onde dobra) }
export function sonarPin(i, mode) {
  const z = SONAR_ZS[i]
  if (mode === 'baixo') return { pos: [HX, 0, z], dir: [0, -1, 0] }
  const B = [HX, sonarPcbY({ pinosDir: mode }) + 0.12, z] // dentro do plástico
  const dir = mode === 'tras' ? [-1, 0, 0] : [-S, S, 0]
  return { pos: B.map((v, k) => v + 0.4 * dir[k]), dir, bend: B }
}

export function sonarColliders(cfg) {
  const pb = sonarPcbY(cfg)
  return [
    { size: [0.73, 2.0, 4.5], pos: [-0.285, pb + 1.0, 0] },
    ...[-1, 1].map((sz) => ({ size: [1.25, 1.6, 1.64], pos: [0.705, pb + 0.95, sz * 1.3] })),
    // barra de pinos: para baixo vai até às pontas (assenta nelas); nas outras só o plástico
    sonarMode(cfg) === 'baixo' ? { size: [0.3, pb, 1.1], pos: [HX, pb / 2, 0] } : { size: [0.3, 0.25, 1.1], pos: [HX, pb + 0.12, 0] },
  ]
}
