// Exemplo de ensaio (e prova de que a bancada funciona): 74HC08, porta AND
import { bench, part, wire, test, near, DEFS } from '../part-bench.js'

test('74HC08: tabela de verdade da porta 1', async () => {
  const pins = DEFS.hc08.pins.map((p) => p.id)
  const [A, B, Y] = [pins[0], pins[1], pins[2]]
  const b = await bench({
    parts: [part('uno', 'arduino'), part('u1', 'hc08')],
    wires: [wire('uno.5V', 'u1.VCC'), wire('uno.GND.1', 'u1.GND'), wire('uno.D2', `u1.${A}`), wire('uno.D3', `u1.${B}`)],
    code: 'int n = 0;\nvoid setup(){ pinMode(2, OUTPUT); pinMode(3, OUTPUT); }\nvoid loop(){ digitalWrite(2, n & 1); digitalWrite(3, (n >> 1) & 1); delay(100); n++; }',
  })
  for (const want of [0, 0, 0, 5]) {
    b.advance(0.05)
    near(b.v(`u1.${Y}`, 'uno.GND.1'), want, 0.4, `saída ${Y}`)
    b.advance(0.05)
  }
})
