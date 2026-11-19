// Botões das placas de microcontrolador (clicáveis no 2D e no 3D durante a simulação), com a
// função de cada um na placa real:
//   reset    RESET / EN: premido segura o microcontrolador em reset; ao largar o programa recomeça
//   boot     BOOT do ESP32: liga o GPIO0 ao GND (o programa lê LOW enquanto está premido)
//   bootsel  BOOTSEL do Pico: o programa lê-o com BOOTSEL (arduino-pico)
//   on / off botões ON e OFF da Pico4Drive (o ATtiny412 liga / corta a bateria)
// pos = [x, z] no referencial da peça (cm, o mesmo do modelo 3D), r = raio da zona de clique.
const RESET = (x, z, r) => ({ id: 'RESET', role: 'reset', pos: [x, z], r })
const BOOTSEL = { id: 'BOOTSEL', role: 'bootsel', pos: [-1.45, 0.22], r: 0.36 }

export const BOARD_BUTTONS = {
  arduino: [RESET(-2.85, -2.25, 0.5)],
  mega: [RESET(-4.0, -2.0, 0.5)],
  nano: [RESET(-0.35, 0.35, 0.3)],
  nanoKeyestudio: [RESET(-0.35, 0.35, 0.3)],
  esp32: [
    { id: 'EN', role: 'reset', pos: [-2.05, 0.85], r: 0.38 },
    { id: 'BOOT', role: 'boot', pos: [-2.05, -0.85], r: 0.38 },
  ],
  esp32Uno: [RESET(-2.4, -0.2, 0.5)],
  pico: [BOOTSEL],
  picow: [BOOTSEL],
  pico2: [BOOTSEL],
  pico2w: [BOOTSEL],
  nanorp2040: [RESET(-1.45, -0.45, 0.28)],
  bluepill: [RESET(-1.75, 0.45, 0.32)],
  pico4drive: [
    { id: 'ON', role: 'on', pos: [-1.35, 2.25], r: 0.4 },
    { id: 'OFF', role: 'off', pos: [-0.55, 2.25], r: 0.4 },
  ],
}

// botão da placa no ponto (x, z) do referencial da peça, ou null
export function boardButtonAt(type, x, z) {
  return (BOARD_BUTTONS[type] || []).find((b) => Math.hypot(x - b.pos[0], z - b.pos[1]) <= b.r) || null
}
// o que um clique nesse botão envia ao motor (simControl.setInput)
export const boardButtonInput = (b) => (b.role === 'reset' ? { reset: true } : b.role === 'boot' ? { boot: true } : b.role === 'off' ? { off: true } : { pressed: true })
