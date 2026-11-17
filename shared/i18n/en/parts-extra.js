// Inglês de peças acrescentadas depois dos blocos parts-1/2/3 (ver shared/i18n.js).
import { registerOverlay } from '../../i18n.js'
import { DEFS } from '../../components.js'

const digital = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
const pins = {}
for (const d of digital) Object.assign(pins, { [`D${d}.G`]: { label: `GND (D${d} column)` }, [`D${d}.V`]: { label: `5V (D${d} column)` } })
for (let k = 0; k < 8; k++) Object.assign(pins, { [`A${k}.G`]: { label: `GND (A${k} column)` }, [`A${k}.V`]: { label: `5V (A${k} column)` } })
for (const k of [6, 7]) pins[`A${k}.S`] = { label: `A${k} (analog only)` }
Object.assign(pins, {
  TX: { label: 'Serial · TX (D1)' }, RX: { label: 'Serial · RX (D0)' }, 'U.GND': { label: 'Serial · GND' }, 'U.5V': { label: 'Serial · 5V' },
  SCL: { label: 'I2C · SCL (A5)' }, SDA: { label: 'I2C · SDA (A4)' }, 'I.5V': { label: 'I2C · 5V' }, 'I.GND': { label: 'I2C · GND' },
  '3V3.1': { label: '3V3 (AMS1117 regulator)' }, '3V3.2': { label: '3V3 (AMS1117 regulator)' }, '3V3.3': { label: '3V3 (AMS1117 regulator)' },
  'DC+': { label: 'DC jack + (7–12 V)' }, 'DC-': { label: 'DC jack − (GND)' },
})
for (const p of DEFS.nanoShield?.pins || []) if (p.id.startsWith('S.')) pins[p.id] = { label: `Nano socket · ${p.id.slice(2).replace(/\.\d$/, '')}` }

registerOverlay('parts-extra', () => DEFS, {
  nanoShield: {
    name: 'Arduino Nano expansion board (I/O shield)',
    short: 'Nano shield',
    description:
      'Expansion board with a socket for the Arduino Nano: drag the Nano onto the socket and the pins connect by themselves. G/V/S headers (GND, 5 V, signal) for D2–D13 and A0–A7 — servos and sensors plug in directly —, serial header (TX RX GND 5V), I2C (SCL SDA 5V GND), 3V3 and GND pins. 7–12 V DC jack with a power switch: the 5 V regulator powers the V rails and the Nano (the AMS1117 gives 3.3 V). Without a supply on the jack, the rails get the Nano’s own 5 V (USB, ~500 mA max).',
    fields: { on: { label: 'Power switch', options: { true: 'On', false: 'Off' } }, sinal: { label: 'Signal row color (S)', options: { azul: 'Blue', amarelo: 'Yellow (Keyestudio)' } } },
    interactive: { label: 'Power_Switch' },
    mounts: { socket: { label: 'Arduino Nano socket' } },
    pins,
  },
  nanoKeyestudio: {
    name: 'Keyestudio Nano CH340',
    short: 'Keyestudio Nano',
    description:
      'Keyestudio Arduino Nano compatible: ATmega328P at 16 MHz with the same 30 pins as the Nano (D0–D13, A0–A7, PWM on 3, 5, 6, 9, 10, 11), CH340 USB-serial converter (your computer may need the CH340 driver) and mini-USB. Fits the breadboard or the Nano expansion board socket. Powered by USB, 5V or VIN (7–12 V). L LED on pin 13.',
    fields: { usb: { label: 'Power', options: { true: 'USB (computer)', false: 'External (VIN or 5V)' } } },
  },
  aaBox4: {
    name: '4×AA battery case, 2 layers (6 V)',
    short: '4×AA 2×2',
    description:
      'Black case for four AA batteries stacked 2 × 2 (two on top, two below), wired in series: ~6 V, ~0.4 Ω total internal resistance, with red (+) and black (−) leads. More compact than the flat holder. Good for small motors and servos (6 V is the SG90/MG90S maximum). With alkaline cells, the Arduino needs the VIN of a board with a regulator (7–12 V); with rechargeable NiMH cells (4 × 1.2 V ≈ 4.8–5.5 V, as in the Otto DIY) it goes straight to 5V. Always connect − to the common GND.',
    fields: { charge: { label: 'Charge' }, pilhas: { label: 'Batteries', options: { alcalinas: 'Alkaline (1.5 V: ~6 V)', nimh: 'Rechargeable NiMH (1.2 V: ~4.8–5.5 V)' } } },
    pins: { '+': { label: '+ (red)' }, '-': { label: '− (black)' } },
  },
})
