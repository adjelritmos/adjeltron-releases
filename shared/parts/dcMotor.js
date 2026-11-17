// Pequeno motor DC "130" (3–6 V) com hélice de ventoinha.
export default {
  type: 'dcMotor',
  name: 'Motor DC 130 + hélice',
  short: 'Motor 130',
  cat: 'motion',
  description:
    'Motor DC pequeno (3–6 V, ~10 000 rpm sem carga a 3 V, ~1 A com o veio bloqueado). Gasta muito mais do que os 40 mA de um pino do Arduino: comande-o com um transístor (2N2222 + 1 kΩ na base) ou um MOSFET (IRLZ44N), alimentado por pilhas, e ponha um díodo 1N4007 em paralelo (cátodo/riscado no +) para absorver o pico ao desligar. Trocar + e − inverte o sentido.',
  size: [4.6, 6.0, 6.0],
  mass: 82.8, // a mesma de antes (caixa de `size` × 0,5 g/cm³): colisores justos não mudam a massa
  // suporte, motor e a ventoinha (roda: caixa de lado ≈ 0,85 × diâmetro no plano das pás)
  collider: [
    { size: [1.8, 0.2, 2.2], pos: [-0.1, 0.1, 0] },
    { size: [0.5, 1.9, 1.0], pos: [-0.1, 1.05, 0] },
    { size: [2.8, 2.16, 2.16], pos: [-0.2, 3.0, 0] },
    { size: [0.35, 4.76, 4.76], pos: [1.75, 3.0, 0] },
  ],
  pins: [
    { id: '+', label: '+ (vermelho)', pos: [-1.55, 3.0, -0.45], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
    { id: '-', label: '− (preto)', pos: [-1.55, 3.0, 0.45], kind: 'motor', conn: 'solder', dir: [-1, 0, 0] },
  ],
  view2d: { view: 'top', x: [-1.85, 2.05], z: [-3.05, 3.05] },
}
