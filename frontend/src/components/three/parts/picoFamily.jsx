// Raspberry Pi Pico W, Pico 2 e Pico 2 W: a mesma placa verde de 21 × 51 mm da Pico (PicoBoard em
// pico.jsx: 40 furos + acastelados, 4 furos de fixação, micro-USB à esquerda (−x), BOOTSEL, cristal,
// regulador com bobina e LED junto à USB).
//  - Pico 2: RP2350 (QFN-60, 7 × 7 mm) ao centro e os 3 pinos de depuração na ponta direita.
//  - Pico W / Pico 2 W: chip Wi‑Fi CYW43439 dentro de uma blindagem metálica junto à ponta
//    direita e a antena impressa (zona sem cobre) na ponta; os 3 pinos de depuração passam
//    para o meio da placa. O LED está ligado ao CYW43 (WL_GPIO0 → pino 64 no código).
import { eng } from '../kit.jsx'
import { PicoBoard } from './pico.jsx'
import { Glow2D } from './group-c-ui.jsx'

const TOP = 0.35
const LED = [-1.75, TOP + 0.03, -0.55]

const ledLevel = (pin) => () => {
  const e = eng()
  if (!e || !e.arduinoRunning()) return 0
  const p = e.pins?.[pin]
  return p?.mode === 'OUTPUT' ? (p.pwm ? p.duty : p.out) : 0
}

function makeModel({ title, chip, wireless, year }) {
  const ledPin = wireless ? 64 : 25
  const read = ledLevel(ledPin)
  function Model() {
    return <PicoBoard title={title} chip={chip} wireless={wireless} year={year} read={read} />
  }
  function Overlay2D({ info }) {
    const running = !!eng()?.arduinoRunning()
    return (
      <g pointerEvents="none">
        <Glow2D info={info} pos={LED} color="#33ff66" on={running && read() > 0.05} r={6} />
      </g>
    )
  }
  return { Model, Overlay2D }
}

export const UI_PICO_FAMILY = [
  { type: 'picow', ...makeModel({ title: 'Raspberry Pi Pico W', chip: 'RP2040', wireless: true, year: 2022 }) },
  { type: 'pico2', ...makeModel({ title: 'Raspberry Pi Pico 2', chip: 'RP2350', wireless: false, year: 2024 }) },
  { type: 'pico2w', ...makeModel({ title: 'Raspberry Pi Pico 2 W', chip: 'RP2350', wireless: true, year: 2024 }) },
]
