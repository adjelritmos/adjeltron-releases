// English for the parts catalog, block 2 (types gateNand3 … paredePorta).
// Applied over the Portuguese definitions by shared/i18n.js (registerOverlay).
import { registerOverlay } from '../../i18n.js'
import { DEFS } from '../../components.js'

// ---------- pin labels: phrase-by-phrase (they repeat a lot: "1A (pino 1)", "Y (saída)"…) ----------
const PIN_PHRASES = [
  ['entrada analógica', 'analog input'],
  ['dados, entrada', 'data, input'],
  ['dados, saída', 'data, output'],
  ['massa analógica', 'analog ground'],
  ['massa digital', 'digital ground'],
  ['tensão de referência', 'reference voltage'],
  ['seleção, ativo LOW', 'select, active LOW'],
  ['reset, ativo LOW', 'reset, active LOW'],
  ['ativo LOW', 'active LOW'],
  ['não inversora', 'non-inverting'],
  ['inversora', 'inverting'],
  ['normalmente fechado', 'normally closed'],
  ['normalmente aberto', 'normally open'],
  ['sem ligação', 'no connection'],
  ['não simulado', 'not simulated'],
  ['só analógico, ', 'analog only, '],
  ['só analógico', 'analog only'],
  ['ânodo da retroiluminação', 'backlight anode'],
  ['cátodo da retroiluminação', 'backlight cathode'],
  ['ânodo do LED', 'LED anode'],
  ['cátodo do LED', 'LED cathode'],
  ['registo: 0 comando, 1 dados', 'register: 0 command, 1 data'],
  ['0 = escrever → GND', '0 = write → GND'],
  ['lógica 5 V', '5 V logic'],
  ['5 V da USB', '5 V from USB'],
  ['entrada até 40 V', 'input up to 40 V'],
  ['entrada −7 a −35 V', 'input −7 to −35 V'],
  ['entrada ', 'input '],
  ['contraste', 'contrast'],
  ['comum ', 'common '],
  ['ajuste', 'adjust'],
  ['motores', 'motors'],
  ['bobina', 'coil'],
  ['coletor', 'collector'],
  ['emissor', 'emitter'],
  ['dreno', 'drain'],
  ['porta', 'gate'],
  ['fonte', 'source'],
  ['relógio', 'clock'],
  ['dados', 'data'],
  ['série', 'serial'],
  ['entrada', 'input'],
  ['saída', 'output'],
  ['vermelho', 'red'],
  ['branco', 'white'],
  ['preto', 'black'],
  ['pino', 'pin'],
  ['Borne', 'Terminal'],
]
const PIN_WORDS = { nó: 'node', 'terminal 1': 'terminal 1', 'terminal 2': 'terminal 2' }
const pinEn = (s) => {
  if (PIN_WORDS[s]) return PIN_WORDS[s]
  let out = s
  for (const [pt, en] of PIN_PHRASES) out = out.split(pt).join(en)
  return out
}

// ---------- logic gates (gates.js): same tail in every description ----------
const GATE_TAIL =
  'Abstract logic module with implicit power (no VCC/GND: it uses the Arduino’s voltage and GND). Inputs: HIGH above half the logic voltage (with hysteresis); floating inputs read LOW (1 MΩ to GND). Output: up to ~20 mA (50 Ω).'
const NAND = `NAND gate (NOT-AND). Y = NOT(A·B…): LOW only when all inputs are HIGH ("universal" gate: any other gate can be built from NANDs). ${GATE_TAIL}`
const NOR = `NOR gate (NOT-OR). Y = NOT(A+B…): HIGH only when all inputs are LOW. ${GATE_TAIL}`
const OR = `OR gate. Y = A+B…: HIGH when AT LEAST one input is HIGH. ${GATE_TAIL}`

// ---------- 74HC logic ICs: same tail ----------
const DIP14 =
  'CMOS integrated circuit in DIP-14 (seat it across the breadboard’s center channel, notch to the left): VCC (pin 14) → 5V and GND (pin 7) → GND. Inputs: HIGH above ~3.5 V, LOW below ~1.5 V — never leave them floating (tie unused ones to GND). Each output gives ~4 mA at 5 V (max. 25 mA): an LED needs 220 Ω… or more.'
const PINS_ABY = 'Pins: 1 1A, 2 1B, 3 1Y, 4 2A, 5 2B, 6 2Y, 7 GND, 8 3Y, 9 3A, 10 3B, 11 4Y, 12 4A, 13 4B, 14 VCC.'
const PINS_INV = 'Pins: 1 1A, 2 1Y, 3 2A, 4 2Y, 5 3A, 6 3Y, 7 GND, 8 4Y, 9 4A, 10 5Y, 11 5A, 12 6Y, 13 6A, 14 VCC.'

const blades = (ns) => Object.fromEntries(ns.map((n) => [n, `${n} blades`]))

const PATCH = {
  gateNand3: { name: '3-input NAND gate', description: NAND },
  gateNand4: { name: '4-input NAND gate', description: NAND },
  gateNor2: { name: '2-input NOR gate', description: NOR },
  gateNor3: { name: '3-input NOR gate', description: NOR },
  gateNor4: { name: '4-input NOR gate', description: NOR },
  gateNot: { name: 'NOT gate (inverter)', description: `NOT gate (inverter). Y = NOT A: inverts the signal. ${GATE_TAIL}` },
  gateOr2: { name: '2-input OR gate', description: OR },
  gateOr3: { name: '3-input OR gate', description: OR },
  gateOr4: { name: '4-input OR gate', description: OR },
  gateXnor2: { name: '2-input XNOR gate', description: `XNOR gate (NOT-exclusive-OR). Y = NOT(A⊕B): HIGH when the inputs are EQUAL. ${GATE_TAIL}` },
  gateXor2: { name: '2-input XOR gate', description: `XOR gate (exclusive-OR). Y = A⊕B: HIGH when the inputs are DIFFERENT (1-bit adder, comparator). ${GATE_TAIL}` },

  gearRack: {
    name: 'Gear rack with guide (module 1)',
    short: 'Gear rack',
    description:
      'Module 1 toothed bar that slides in a fixed guide: turns rotation into linear motion. Put a spur gear (the pinion) on a motor or servo above it, with its shaft horizontal and perpendicular to the bar, at the right height: pinion center = top of the bar + pitch radius (20 teeth → 10 mm). Each turn of the pinion moves π × diameter (20 teeth → 62.8 mm). Attach the load to the end of the bar. It stops at the end stops.',
    fields: { length: { label: 'Length' } },
    mounts: { bar: { label: 'end of the bar (slides)' }, base: { label: 'guide (underneath)' } },
  },
  gpsNeo6m: {
    description:
      'GPS receiver that sends NMEA text sentences ($GPRMC, $GPGGA, $GPGSV…) once per second over the serial port at 9600 baud. VCC → 5V (it has a 3.3 V regulator), GND → GND, GPS TX → Arduino RX pin, GPS RX → Arduino TX (only needed for configuration). On the Uno use SoftwareSerial (e.g. SoftwareSerial gps(4, 3) with the module’s TX on D4) — pins 0/1 belong to USB; on the Mega use Serial1 (RX1 = 19), on the ESP32 Serial2 (RX2 = 16). Decode with TinyGPS++: gps.encode(c) for each character, then gps.location.lat(). At power-up it takes a few seconds to find satellites (the LED blinks once it has a fix). Position, speed and satellites can be adjusted in the "Controls" panel.',
    fields: { fixTime: { label: 'Time to first fix (startup)' }, lat: { label: 'Initial latitude' }, lon: { label: 'Initial longitude' } },
    interactive: { items: { lat: { label: 'Latitude' }, lon: { label: 'Longitude' }, speed: { label: 'Speed' }, course: { label: 'Course' }, sats: { label: 'Satellites' }, alt: { label: 'Altitude' } } },
  },
  gripper: {
    name: 'Servo gripper',
    description: 'Gripper with a micro servo: 0° closed, 180° open (~4 cm). Picks up cubes.',
    mounts: { grip: { label: 'between the fingers' } },
  },
  gt2Pulley: {
    name: 'GT2 pulley + belt',
    short: 'GT2 pulley',
    description:
      'Aluminum pulley for a 6 mm GT2 timing belt (2 mm pitch), as in 3D printers. Mount it on a shaft. Pulleys with the same belt letter are connected by a closed belt (drawn around them): they turn in the same direction, with a speed ratio of z1/z2. They must be in the same plane (belt at the same height) with parallel shafts.',
    fields: {
      teeth: { label: 'Teeth', options: { 16: '16 teeth (Ø 10 mm)', 20: '20 teeth (Ø 12.7 mm)', 40: '40 teeth (Ø 25.5 mm)', 60: '60 teeth (Ø 38 mm)' } },
      belt: { label: 'Belt', options: { A: 'Belt A', B: 'Belt B', C: 'Belt C', D: 'Belt D', '-': 'No belt' } },
    },
  },
  hall: {
    name: 'KY-024 Hall sensor',
    description:
      'Detects magnetic fields (magnets). AO → A0, G → GND, + → 5V, DO → digital pin. AO sits at ~VCC/2 (≈512) with no magnet and rises or falls depending on the pole (north/south) and the distance to the magnet. DO: HIGH when the field crosses the trimpot threshold (lights the LED). Used in tachometers, door sensors and position sensing.',
    fields: { threshold: { label: 'Comparator threshold (trimpot, fraction of VCC)' } },
    interactive: { label: 'Magnetic field (− south / + north)' },
  },
  hc00: {
    name: '74HC00 logic gate (4× NAND)',
    description: `Y = NOT (A AND B): the output only goes LOW when both inputs are HIGH. Any other gate can be built with NANDs (it is "universal"). ${DIP14} ${PINS_ABY}`,
  },
  hc02: {
    name: '74HC02 logic gate (4× NOR)',
    description: `Y = NOT (A OR B): the output is only HIGH with both inputs LOW. Note: the pinout differs from the 74HC00 (the output comes first: 1Y, 1A, 1B…). ${DIP14} Pins: 1 1Y, 2 1A, 3 1B, 4 2Y, 5 2A, 6 2B, 7 GND, 8 3A, 9 3B, 10 3Y, 11 4A, 12 4B, 13 4Y, 14 VCC.`,
  },
  hc04: { name: '74HC04 logic gate (6× NOT)', description: `Six inverters: Y = NOT A. ${DIP14} ${PINS_INV}` },
  hc05: {
    description:
      'Wireless serial port: what the phone sends comes out of the module’s TXD, and what the Arduino writes to RXD reaches the phone. VCC → 5V, GND → GND, TXD → Arduino RX pin (e.g. SoftwareSerial bt(10, 11) with TXD on D10), RXD ← Arduino TX through a voltage divider (1 kΩ + 2 kΩ: RXD is 3.3 V). In data mode it runs at 9600 baud. STATE is HIGH while a phone is connected; the LED blinks fast while waiting for a connection and slowly when connected. During the simulation, type the text to send in the "Controls" panel (what the Arduino sends shows up there too).',
    fields: {
      baud: { label: 'Baud (data mode)', options: { 9600: '9600 (default)' } },
      eol: { label: 'Line ending sent by the phone' },
    },
    interactive: { label: 'Send from the phone', placeholder: 'e.g. ON' },
  },
  hc08: { name: '74HC08 logic gate (4× AND)', description: `Y = A AND B: the output only goes HIGH with both inputs HIGH. ${DIP14} ${PINS_ABY}` },
  hc14: {
    name: '74HC14 logic gate (6× Schmitt NOT)',
    description: `Six Schmitt-trigger inverters (hysteresis: switches up at ~3.0 V and down at ~1.8 V with 5 V) — they clean up slow or noisy signals (RC-debounced buttons, sensors) and make oscillators with one resistor and one capacitor. ${DIP14} ${PINS_INV}`,
  },
  hc32: { name: '74HC32 logic gate (4× OR)', description: `Y = A OR B: the output goes HIGH if at least one input is HIGH. ${DIP14} ${PINS_ABY}` },
  hc595: {
    name: '74HC595 shift register',
    description:
      'Turns 3 Arduino pins into 8 outputs (and more, when chained). Seat it across the center channel. VCC → 5V, GND → GND, MR → 5V, OE → GND, DS (data) → e.g. D11, SHCP (clock) → D12, STCP (latch) → D8. Send a byte with digitalWrite(latch, LOW); shiftOut(data, clock, MSBFIRST, value); digitalWrite(latch, HIGH). Q0–Q7 give ~5 V/up to 6 mA each (LED with 220 Ω… or more). Q7S connects to the DS of the next 74HC595 to chain them.',
  },
  hc86: {
    name: '74HC86 logic gate (4× XOR)',
    description: `Y = A exclusive-OR B: HIGH when the inputs are different (1-bit sum, comparison). ${DIP14} ${PINS_ABY}`,
  },
  hcsr04: {
    name: 'HC-SR04 ultrasonic sensor',
    description: 'Distance 2–400 cm: 10 µs pulse on Trig and pulseIn(Echo, HIGH).',
    pinOrient: { labels: { baixo: 'Pointing down', tras: 'Pointing back (right angle)', tras45: 'Pointing back at 45°' } },
  },
  heartbeat: {
    name: 'Heart rate sensor',
    short: 'Pulse',
    description:
      'Pulse Sensor: a green LED lights the finger and a photodiode measures the reflected light, which changes with each heartbeat. OUT → A0, VCC → 5V, GND → GND. With no finger OUT sits at ~VCC/2 (≈512); with a finger it gives a wave with one peak (~+150) per beat. To measure BPM, detect the peaks above a threshold (e.g. 600) and time the gap between them.',
    interactive: { label: 'Heart rate (0 = no finger)' },
  },
  heliceMesa: {
    name: 'Desk fan propeller (translucent)',
    short: 'Desk fan prop',
    description:
      'Translucent plastic propeller like the ones on desk fans: ribbed cup hub and 3 to 6 wide, curved blades. Mount it on a motor shaft (130 motor, RS-775, TT motor): it turns with it and blows air forward, pushing whatever is in front (in the 3D physics) — for example a deflector plate hanging from an angle sensor.',
    fields: { blades: { label: 'Blades', options: blades([3, 4, 5, 6]) }, diameter: { label: 'Diameter' }, pitch: { label: 'Blade pitch' }, color: { label: 'Color' } },
    mounts: { face: { label: 'front of the hub' } },
  },
  heliceVentoinha: {
    name: 'Fan propeller (3 to 8 blades)',
    short: 'Propeller',
    description:
      'Plastic propeller for fans and toys, with 3 to 8 blades and selectable diameter and blade pitch. Mount it on a motor shaft (toy-car 130 motor, TT motor, 12 V motor): it turns with it and blows air forward (toward the hub side). More blades and more pitch move more air but demand more torque from the motor.',
    fields: { blades: { label: 'Blades', options: blades([3, 4, 5, 6, 7, 8]) }, diameter: { label: 'Diameter' }, pitch: { label: 'Blade pitch' }, color: { label: 'Color' } },
    mounts: { face: { label: 'front of the hub' } },
  },
  hinge: {
    name: 'Hinge',
    short: 'Hinge',
    description:
      '30 mm steel hinge: the fixed leaf screws onto a plate/bar and the part attached to the pin turns freely around it (door, lid, leg, pendulum). With physics it swings freely (falls under its own weight); in the view without physics it stays as assembled. The pin axis is the y of the mount point: for a leaf lying over the pin, rotate the attached part −90° in x.',
    mounts: { pin: { label: 'pin (moving leaf)' } },
  },
  hmc5883l: {
    name: 'HMC5883L compass (GY-271)',
    description:
      '3-axis magnetometer (Earth’s field ≈ 0.25–0.65 gauss) over I2C, address 0x1E. VCC → 5V or 3.3V, GND → GND, SCL → A5, SDA → A4 (DRDY is not needed). With the module flat, heading = atan2(Y, X) in degrees (0° = magnetic north, with X pointing there); add the local declination (Portugal ≈ −1°). Magnets, motors and nearby iron skew the reading (calibrate). Adafruit_HMC5883_U library (values in µT). Note: many recent GY-271 boards ship the QMC5883L clone (0x0D), which needs a different library. In the simulation the heading is adjusted in the "Controls" panel.',
    fields: { incl: { label: 'Local magnetic inclination' } },
    interactive: { label: 'Heading (where X points)' },
  },
  humanoidTorso: {
    name: 'Humanoid robot torso',
    short: 'Torso',
    description:
      '9 × 8 × 5 cm (PLA) chest for a micro-servo humanoid (~34 cm tall, 14 servos), ~60 g (hollow PLA box). It has real physics: it balances on its feet and falls if the center of mass leaves the foot area. Mount points: 2 hips under the pelvis (the lateral servo, an MG996R, hangs by its tabs, shaft forward: tilts the leg sideways), 2 shoulders under the shoulder plates (servo hanging outside the chest, shaft forward: the arm swings out sideways), the back and the chest (flat areas for the Arduino, PCA9685, battery), the top (MPU6050) and the neck (ultrasonic sensor = eyes). To walk: tilt the legs sideways with the hips and ankles (the weight shifts onto one foot with the torso upright), lift the other leg, move it forward and set it down; then the other side.',
    mounts: {
      neck: { label: 'neck' },
      top: { label: 'top' },
      hipL: { label: 'left hip (underneath)' },
      hipR: { label: 'right hip (underneath)' },
      shoulderL: { label: 'left shoulder (under the shoulder plate)' },
      shoulderR: { label: 'right shoulder (under the shoulder plate)' },
    },
  },
  hx711: {
    name: '5 kg load cell + HX711',
    short: 'Scale',
    description:
      'Scale: the load cell flexes under the weight and the HX711 measures the change (mV) with a 24-bit ADC at 10 readings per second. VCC → 5V, GND → GND, DT → digital pin (e.g. 3), SCK → digital pin (e.g. 2). HX711 library: scale.begin(3, 2); scale.set_scale(factor); scale.tare(); scale.get_units(5). The calibration factor (~420 counts per gram) is found with a known weight. Each reading takes 100 ms.',
    interactive: { label: 'Mass on the scale' },
  },
  ili9341: {
    name: '2.8" ILI9341 TFT 240×320 (SPI)',
    description:
      'Color display with 240×320 pixels (65,536 colors, RGB565) over SPI. On the Uno: SCK → D13, MOSI → D11, MISO → D12 (optional), CS and D/C to any two pins (e.g. 10 and 9), RST → 8 (or 5V), VCC and LED → 5V, GND → GND. Adafruit_ILI9341 library (with Adafruit_GFX): whatever you draw appears right away, no display() needed. A full fillScreen() takes ~0.2 s on the Uno.',
  },
  imanPorta: {
    name: 'Door sensor magnet',
    short: 'Magnet',
    description:
      'The wireless half of the MC-38 magnetic sensor: a magnet in a plastic case. Stick it on the door or window leaf (inner face), near the edge that opens, so that it sits less than ~2 cm from the sensor body when the leaf is closed.',
  },
  inductor: {
    name: 'Coil (inductor)',
    description:
      'Wire wound on a ferrite core: stores energy in the magnetic field and opposes changes in CURRENT (the "opposite" of a capacitor). At DC it is just wire (a few Ω); with a resistor it makes an L/R delay (1 mH with 10 Ω: τ = 0.1 ms; 100 mH with 100 Ω: 1 ms). Cutting the current suddenly produces a voltage spike (that is how motors and relays kill transistors) — add a flyback diode. Above the saturation current the core saturates and the inductance drops. Simulated in 1 ms steps: only time constants ≥ ~1 ms are accurate.',
    fields: { uH: { label: 'Inductance', options: { 1000: '1 mH (1.6 Ω, 0.35 A)', 10000: '10 mH (18 Ω, 0.11 A)', 100000: '100 mH (160 Ω, 0.035 A)' } } },
  },
  interruptorParede: {
    name: 'Wall switch',
    short: 'Switch',
    description:
      'Rocker light switch with a white cover plate, to stick on a wall face. Connects terminal L to L1 when it is on (toggle it during the simulation). It can cut a lamp’s power directly (5V → L, L1 → lamp) or be read by the Arduino: L to GND and L1 to a pin with INPUT_PULLUP (LOW = on).',
    fields: { cor: { label: 'Cover plate color' } },
    interactive: { label: 'On' },
  },
  ir: {
    name: 'TCRT5000 IR sensor',
    description: 'IR reflection: DO = HIGH over black, LOW over white. AO is analog. Mount it under the chassis.',
  },
  irf540: {
    name: 'IRF540N N-MOSFET (power)',
    description:
      'N-channel power MOSFET (100 V, 33 A, 44 mΩ) — but it is NOT logic-level: the 44 mΩ is with 10 V on the gate. With the 5 V of an Arduino pin (Vth 2–4 V) it is only half on: Rds of tenths of an ohm, current limited to a few amps, and it heats up. For 5 V use the IRLZ44N (logic-level N-MOSFET) or drive the gate with 10–12 V (driver or NPN + pull-up). Low side: S → GND, load between + and D. Front view: G, D, S.',
    fields: { heatsink: { label: 'Heatsink', options: { false: 'no heatsink (≈ 62 °C/W)', true: 'with heatsink (≈ 4 °C/W)' } } },
  },
}

const HEATSINK = { label: 'Heatsink', options: { false: 'no heatsink (≈ 62 °C/W)', true: 'with heatsink (≈ 4 °C/W)' } }
const BL_R = { label: 'Backlight resistor', options: { 100: '100 Ω on the board (common)', 0: 'no resistor (add 220 Ω)' } }
const TRACKER = (pins) =>
  `Bar with ${pins.n} TCRT5000 IR reflection sensors (each with its own comparator and LED). GND → GND, VCC → 5V, ${pins.outs} → digital pins. Each output is HIGH over the black line (little reflection) and LOW over the white background — read them all and decide: only the middle one = straight ahead; the left one = turn left… Mount it under the robot 3–10 mm above the floor. In the simulation: line position (cm, 0 = center, negative = left) in the "Controls" panel; 1.8 cm black tape.`
const INVERT = { label: 'Output', options: { false: 'HIGH over black', true: 'LOW over black (inverted modules)' } }

Object.assign(PATCH, {
  irf9540: {
    name: 'IRF9540 P-MOSFET (power)',
    description:
      'P-channel power MOSFET (−100 V, −19 A, 0.2 Ω at Vgs = −10 V; Vth −2 to −4 V). P-channel = HIGH-side switch: S → supply +, D → load → GND. It turns on when the gate goes below the source (negative Vgs, ~−10 V for minimum Rds) and turns off with G at the level of S. Put a 10 kΩ resistor between G and S (off by default) and an NPN/2N7000 pulling G to GND to turn it on. If S is at 5 V, an Arduino pin can drive G directly (LOW = on); at 12 V it can NOT — the pin never reaches 12 V and the MOSFET never turns off. Front view: G, D, S.',
    fields: { heatsink: HEATSINK },
  },
  irObstacle: {
    name: 'FC-51 IR obstacle sensor',
    short: 'IR obstacle',
    description:
      'Emits infrared and detects the reflection from an obstacle in front (2–30 cm, adjustable with the trimpot). OUT → digital pin, GND → GND, VCC → 5V (or 3.3V). OUT = LOW with an obstacle (the green LED lights up) and HIGH with nothing in front — an active-LOW output with a pull-up already on the module. Black/matte surfaces reflect little and are only seen up close; strong sunlight can fool it. In the simulation: obstacle distance in the "Controls" panel, range in the properties.',
    fields: { range: { label: 'Range (trimpot)' } },
    interactive: { label: 'Obstacle at' },
  },
  irReceiver: {
    name: '38 kHz IR receiver (VS1838B)',
    short: 'IR receiver',
    description:
      'Receives the signals from an IR remote (NEC protocol, 38 kHz carrier). DAT → digital pin (e.g. 2), VCC → 5V, GND → GND. The output idles HIGH and gives LOW pulses while a signal arrives. Use the IRremote library: IrReceiver.begin(2); if (IrReceiver.decode()) { … IrReceiver.decodedIRData.command … IrReceiver.resume(); }. Add an "IR remote" to the project to press its keys.',
  },
  irRemote: {
    name: 'IR remote (NEC)',
    short: 'Remote',
    description:
      '21-key remote control (NEC protocol, address 0x00): POWER = 0x45, MENU = 0x47, 0 = 0x16, 1 = 0x0C, 2 = 0x18… It is not wired — the project just needs an IR receiver. In the simulation, click the keys — in the 2D circuit, in the 3D view or in the "Controls" panel (holding a key sends repeat codes every 108 ms).',
  },
  janela: {
    name: 'Window sash',
    short: 'Window',
    description:
      'Casement window sash: frame (wood, PVC or aluminum) with glass and a handle. By default it covers the 8 × 7 cm opening of the "Wall with window" (choose "No fixed glass" there). On the wall hinge it turns by hand; on the horn of a servo attached at the "window servo" point it opens with the Arduino (write(90) closes, write(0) opens inward) — for example to air out the house when the gas or temperature sensor calls for it.',
    fields: {
      largura: { label: 'Width' },
      altura: { label: 'Height' },
      espessura: { label: 'Thickness' },
      caixilho: { label: 'Frame width' },
      travessa: { label: 'Muntins (divided glass)', options: { true: 'With muntins', false: 'Single pane' } },
      material: { label: 'Material' },
      color: { label: 'Color' },
    },
    mounts: { dentro: { label: 'frame +z (inside the house, hanging)' } },
  },
  joystick: {
    name: 'KY-023 joystick',
    description:
      'Two 10 kΩ potentiometers: GND → GND, +5V → 5V, VRx → A0 and VRy → A1 (analogRead gives ~512 at center, 0–1023 at the ends; up/left → 0). SW is a button that connects to GND when you press the stick and FLOATS when released (the module has no pull-up resistor): use pinMode(SW, INPUT_PULLUP) and LOW = pressed.',
  },
  jsnSr04t: {
    name: 'JSN-SR04T waterproof ultrasonic sensor',
    description:
      'Same protocol as the HC-SR04 (10 µs pulse on Trig, pulseIn(Echo, HIGH) → distance = µs × 0.0343 / 2), but with a single sealed probe (transmits and receives) on a long cable: ideal for water tanks, parking, outdoors. 5V → 5V, Trig and Echo to digital pins, GND → GND. Range 25–450 cm: below ~20–25 cm (blind zone) the echo arrives before the transmission ends and the reading gets stuck at ~23 cm. Take readings at least 60 ms apart. In the simulation the distance is adjusted in the "Controls" panel.',
    interactive: { label: 'Distance to target' },
  },
  junction: {
    name: 'Junction (wire node)',
    short: 'Node',
    description:
      'A connection point for several wires — like a solder blob on a board: lets you make a GND or 5 V "rail" with branches without routing everything through the breadboard. All wires connected to the node are at the same electrical point.',
  },
  keypad3x4: {
    name: '3×4 membrane keypad',
    short: '3×4 keypad',
    description:
      '12-key numeric keypad: each key connects its row (R1–R4) to its column (C1–C3). Connect the 7 wires to 7 digital pins (e.g. R1–R4 → D9–D6, C1–C3 → D5–D3) and use the Keypad library with ROWS = 4, COLS = 3.',
  },
  keypad4x4: {
    name: '4×4 membrane keypad',
    short: 'Keypad',
    description:
      '16-key matrix: pressing a key connects its row (R1–R4) to its column (C1–C4). Connect the 8 wires to 8 digital pins (e.g. R1–R4 → D9–D6, C1–C4 → D5–D2) and use the Keypad library, which scans the matrix: it drives one column LOW at a time and reads the rows with pull-ups. It needs no power or resistors.',
  },
  ks2eRelay: {
    name: 'KS2E-M-DC5 relay (DPDT, 5 V)',
    description:
      'Signal relay with a 5 V coil (~125 Ω, 40 mA) and two independent changeover contacts: at rest P1–NC1 and P2–NC2 are connected; with 5 V on the coil (COIL1–COIL2, no polarity) they switch to P1–NO1 and P2–NO2. Contacts up to 2 A. The coil draws 40 mA — at the limit of a pin: drive it with a transistor (2N2222 + 1 kΩ on the base) and put a 1N4007 diode across the coil (cathode to +) to absorb the spike at turn-off. With 2 contacts you can reverse a motor’s direction (H-bridge).',
  },
  l293d: {
    name: 'L293D motor driver (DIP-16)',
    description:
      'Two H-bridges in one chip: two DC motors with direction and speed (or one bipolar stepper motor). Seat it across the breadboard’s center channel. VCC1 (pin 16) → 5V (logic), VCC2 (pin 8) → motor batteries (4.5–36 V), the 4 middle GND pins → common GND (they also dissipate heat). Motor 1 between 1Y (3) and 2Y (6), controlled by 1A (2) and 2A (7); speed is the PWM on EN1,2 (1). Motor 2: 3Y/4Y, 3A/4A, EN3,4 (9). 1A=HIGH/2A=LOW → one direction, swapped → the other, equal → brake. Up to 600 mA per channel (1.2 A peak); drops ~1.4 V per side (a 6 V motor fed from 6 V gets ~4 V). The protection diodes are inside the chip.',
  },
  l298n: { name: 'L298N driver', description: 'Dual H-bridge for 2 DC motors. ~1.8 V drop. 5 V regulator with ≥7 V.' },
  l9110s: {
    name: 'L9110S motor driver (2 channels)',
    description:
      'Small, cheap dual H-bridge for 2 DC motors (or 1 stepper motor): 2.5–12 V, 800 mA continuous per channel. VCC → motor batteries (it also powers the chip), GND → GND shared with the Arduino. Motor A on the MOTOR A terminals, motor B on MOTOR B. Per motor: IA=HIGH, IB=LOW → forward; IA=LOW, IB=HIGH → reverse; both LOW → stop (brake). Speed: PWM (analogWrite) on IA with IB=LOW (forward) — for reverse set IA=LOW and PWM on IB. It has no ENABLE pin.',
  },
  laje: {
    name: 'Slab / floor',
    short: 'Slab',
    description:
      'Base of the house model (or the ceiling/upper floor, resting on top of the walls). The top has a finish of your choice: tiles, wooden floorboards, Portuguese pavement, concrete or grass (garden). Attach the walls at the edges: each wall sits with its outer face flush with the edge and its thickness inward. Ceiling lamps and fans hang underneath. It is fixed to the table: it is the root part of the house.',
    fields: {
      l: { label: 'Length (x)' },
      w: { label: 'Width (z)' },
      t: { label: 'Thickness' },
      acabamento: {
        label: 'Floor finish',
        options: { mosaico: 'Ceramic tiles', soalho: 'Wooden floorboards', calcada: 'Portuguese pavement', betao: 'Concrete', relva: 'Grass (garden)', material: 'Material only' },
      },
      cor: { label: 'Floor color' },
      corTeto: { label: 'Underside color (ceiling)' },
      material: { label: 'Material' },
      color: { label: 'Color' },
    },
    mounts: {
      topo: { label: 'on top (floor)' },
      bordaFrente: { label: 'front edge (+x): wall' },
      bordaTras: { label: 'back edge (−x): wall' },
      bordaDireita: { label: 'right edge (+z): wall' },
      bordaEsquerda: { label: 'left edge (−z): wall' },
      teto: { label: 'underneath (ceiling: lamps, fan)' },
    },
  },
  lampadaCasa: {
    name: 'Lamp / light bulb (house)',
    short: 'Lamp',
    description:
      'Lighting for the model: pendant lamp with a shade, ceiling light, wall sconce or bulb with a socket. It is a resistive load with two terminals (no polarity): 5 V · 1 W draws 200 mA, more than an Arduino pin can supply (40 mA) — connect it through a relay (COM to 5V, NO to the lamp, the other terminal to GND) or through a transistor/MOSFET (PWM dims it). Brightness follows power: at half the voltage it gives ~¼ of the light. Above 1.5× the rated voltage it burns out. Attach the base under a slab (ceiling), on a wall face or on top of a piece of furniture.',
    fields: {
      estilo: { label: 'Model', options: { pendente: 'Pendant lamp (shade)', plafon: 'Ceiling light', aplique: 'Wall sconce', lampada: 'Bulb with socket' } },
      tipo: { label: 'Bulb', options: { 6: '6 V · 0.3 A (incandescent)' } },
      luz: { label: 'Light color', options: { quente: 'Warm white (2700 K)', neutra: 'Neutral white (4000 K)', fria: 'Cool white (6500 K)' } },
      fio: { label: 'Cord length (pendant)' },
      abajur: { label: 'Shade color' },
    },
  },
  lcd1602: {
    description: '2-line × 16-character display with an I2C backpack: only 4 wires (GND, VCC 5 V, SDA → A4, SCL → A5). Address 0x27.',
    fields: { addr: { label: 'I2C address' } },
  },
  lcd1602p: {
    name: 'LCD 16×2 (parallel, 16 pins)',
    description:
      'The classic HD44780 LCD without the I2C backpack, used with the LiquidCrystal.h library. In 4-bit mode 6 pins are enough: RS, E and D4–D7 (D0–D3 stay unconnected). Wiring: VSS → GND, VDD → 5V, V0 → wiper of a 10 kΩ potentiometer between 5V and GND (contrast: with V0 near 5 V nothing is visible; ~0.5–1 V is ideal; V0 straight to GND also works, with the background dots slightly visible), RW → GND (write), A → 5V and K → GND (backlight; the module has 100 Ω on the board — choose "no resistor" if yours doesn’t and add 220 Ω). Example: LiquidCrystal lcd(12, 11, 5, 4, 3, 2) = RS, E, D4, D5, D6, D7. Without lcd.begin(16, 2) the first line shows only dark blocks.',
    fields: { blR: BL_R },
  },
  lcd2004: {
    description:
      '4-line × 20-character display (HD44780 controller) with an I2C backpack on the back: only 4 wires (GND, VCC 5 V, SDA → A4, SCL → A5). Address 0x27 (some modules 0x3F). Use lcd.setCursor(column, row) with row 0–3.',
    fields: { addr: { label: 'I2C address' } },
  },
  lcd2004p: {
    name: 'LCD 20×4 (parallel, 16 pins)',
    description:
      'The 4-line × 20-column LCD (HD44780) without the I2C backpack, used with the LiquidCrystal.h library — same wiring as the parallel 16×2 LCD. In 4-bit mode: RS, E and D4–D7 to Arduino pins; VSS → GND, VDD → 5V, V0 → wiper of a 10 kΩ potentiometer (or GND), RW → GND, A → 5V and K → GND (backlight). Example: LiquidCrystal lcd(12, 11, 5, 4, 3, 2); lcd.begin(20, 4); Lines 3 and 4 continue lines 1 and 2 in the controller’s memory: a long text on line 1 spills into line 3.',
    fields: { blR: BL_R },
  },
  ldr: {
    name: 'LDR photoresistor',
    description:
      'Light-dependent resistor: ~1 MΩ in the dark, ~10 kΩ at 10 lux (dim room), under 1 kΩ in bright light. On its own it gives no voltage: make a divider — one leg to 5V, the other to A0 and a 10 kΩ resistor from A0 to GND (more light → higher value). It has no polarity.',
    fields: { model: { label: 'Model', options: { GL5516: 'GL5516 (7.5 kΩ at 10 lux)', GL5528: 'GL5528 (10 kΩ at 10 lux)', GL5539: 'GL5539 (60 kΩ at 10 lux)' } } },
    interactive: { label: 'Light' },
  },
  leadScrew: {
    name: 'Linear axis with T8 lead screw (NEMA 17)',
    short: 'T8 lead screw',
    description:
      '3D-printer/CNC linear stage: T8 trapezoidal lead screw between two blocks, two 8 mm rails and a carriage with a brass nut. Mount a NEMA 17 stepper motor at the "motor" point (it lines up with the screw): each motor turn advances the carriage by the screw lead (8 mm on the T8×8; 2 mm on the T8×2, slower but with more force and resolution: 0.01 mm per step). With the T8×8 screw and 200 steps/turn that is 25 steps per mm. Attach whatever you want to move to the carriage (another linear axis for an XY plotter, a pen, a gripper). The carriage stops at the end stops (with a warning).',
    fields: {
      length: { label: 'Length', options: { 20: '20 cm (8 cm travel)', 30: '30 cm (18 cm travel)', 40: '40 cm (28 cm travel)' } },
      lead: { label: 'Lead screw', options: { 0.8: 'T8×8 (8 mm per turn)', 0.2: 'T8×2 (2 mm per turn)' } },
    },
    mounts: { carriage: { label: 'carriage (slides)' }, base: { label: 'underneath' } },
  },
  led: { description: 'Anode (A, long leg) to +, cathode (K) to −. Always use a resistor!' },
  lineTracker3: {
    name: '3-channel line tracker (TCRT5000)',
    short: 'Line 3',
    description: TRACKER({ n: 3, outs: 'L, C, R' }),
    fields: { invert: INVERT },
    interactive: { label: 'Line position' },
  },
  lineTracker5: {
    name: '5-channel line tracker (TCRT5000)',
    short: 'Line 5',
    description: TRACKER({ n: 5, outs: 'OUT1, OUT2, OUT3, OUT4, OUT5' }),
    fields: { invert: INVERT },
    interactive: { label: 'Line position' },
  },
})

const HEATSINK_REG = { label: 'Heatsink', options: { false: 'no heatsink (≈ 50 °C/W)', true: 'with heatsink (≈ 12 °C/W)' } }
const WHEELS = {
  tt: '65 mm × 26 mm (standard)',
  estreita: '65 mm × 12 mm (narrow)',
  grande: '85 mm × 38 mm (large)',
  grandeEstreita: '90 mm × 12 mm (large and narrow)',
  gigante: '130 mm × 30 mm (all-terrain)',
  disco: '120 mm 3D-printed (disc with holes)',
  discoGrande: '150 mm 3D-printed (disc with holes)',
}

Object.assign(PATCH, {
  lipo3s: {
    name: 'LiPo 3S 1500 mAh battery (XT60)',
    description:
      '3 lithium-polymer cells in series: 11.1 V nominal, 12.6 V full, ~9.9 V empty (3.3 V per cell). 1500 mAh, 75C: handles peaks of ~100 A with an internal resistance of only ~25 mΩ — that is why drones use it. XT60 plug (+ red, − black) to the ESCs. CAREFUL: a short circuit melts wires and can set the battery on fire; never discharge it below 3.3 V per cell (it ruins it) and charge it only with a balance charger. ~125 g.',
    fields: { charge: { label: 'Charge' } },
  },
  lm317: {
    name: 'LM317 adjustable regulator',
    description:
      '1.25–37 V regulator (up to 1.5 A) set by two resistors. With the lettering facing you: ADJ (1), OUT (2), IN (3) — different from the 7805! It always keeps 1.25 V between OUT and ADJ: R1 from OUT to ADJ (240 Ω) and R2 from ADJ to GND give Vout = 1.25 × (1 + R2/R1) (R2 = 680 Ω → ~4.8 V; 1 kΩ → ~6.5 V; a potentiometer makes it variable). With nothing on ADJ it sits at 1.25 V… or runs out of control. It needs ~1.5–2 V of headroom on the input and dissipates P = (Vin − Vout) × I.',
    fields: { heatsink: HEATSINK_REG },
  },
  lm324: {
    name: 'LM324 operational amplifier (4×)',
    description:
      'Four op-amps of the same type as the LM358 in a DIP-14, single supply (3–32 V): inputs and output reach GND, the output only rises to VCC − 1.5 V. Good for 4 comparators (threshold sensors), filters and sensor amplifiers at 5 V. VCC on pin 4 and GND on pin 11 (the opposite of the 74HC chips!). Pins: 1 OUT1, 2 IN1−, 3 IN1+, 4 VCC, 5 IN2+, 6 IN2−, 7 OUT2, 8 OUT3, 9 IN3−, 10 IN3+, 11 GND, 12 IN4+, 13 IN4−, 14 OUT4.',
  },
  lm35: {
    name: 'LM35 temperature sensor',
    description:
      'With the flat face toward you, left to right: +Vs → 5V, Vout → A0, GND → GND. Vout = 10 mV per °C (25 °C → 0.25 V → analogRead ≈ 51). Temperature = reading × 500.0 / 1023. It needs at least 4 V and, with a positive supply only, measures 2 to 150 °C (below 2 °C the output stays near 0 V). Reversed, it heats up and burns out!',
    interactive: { label: 'Temperature' },
  },
  lm358: {
    name: 'LM358 operational amplifier (2×)',
    description:
      'Two single-supply operational amplifiers (3–32 V). Without feedback it is a comparator: OUT goes HIGH when IN+ > IN− (e.g. a sensor on one side, a reference potentiometer on the other). With negative feedback it amplifies: non-inverting with gain 1 + Rf/Rg (Rf from OUT to IN−, Rg from IN− to GND), voltage follower (OUT tied to IN−). The output swings from ~0 V to VCC − 1.5 V (with 5 V, at most ~3.5 V) and supplies up to ~40 mA; the inputs only work well up to VCC − 1.5 V. Pins: 1 OUT1, 2 IN1−, 3 IN1+, 4 GND, 5 IN2+, 6 IN2−, 7 OUT2, 8 VCC.',
  },
  lm741: {
    name: 'LM741 operational amplifier',
    description:
      'The classic op-amp (1968), for a SPLIT supply of ±5 to ±18 V (e.g. ±12 V with a 7812/7912 pair or two 9 V batteries). It is not rail-to-rail: the output stays ~2 V away from each rail (±13 V with ±15 V) and the inputs must be ~3 V inside the rails. With only 5 V and GND it does NOT work (the output gets stuck between ~2 and ~3 V) — for 5 V use the LM358. Pins: 1 and 5 offset null, 2 IN−, 3 IN+, 4 V−, 6 OUT, 7 V+, 8 no connection.',
  },
  lm7805: {
    name: '7805 voltage regulator (5 V)',
    description:
      'Turns 7–25 V (9 V battery, 12 V transformer…) into a fixed 5 V, up to ~1.5 A. With the lettering facing you: IN (1), GND (2), OUT (3). It needs at least ~2 V of headroom on the input (dropout): with 6 V in it only gives ~4 V. Everything "left over" becomes heat: P = (Vin − 5 V) × I — with 12 V and 0.5 A that is 3.5 W, too much without a heatsink (it shuts itself down at ~150 °C). Add 0.33 µF capacitors on the input and 0.1 µF on the output (in real life they prevent oscillation).',
    fields: { heatsink: HEATSINK_REG },
  },
  lm7812: {
    name: '7812 voltage regulator (12 V)',
    description:
      'Gives a fixed 12 V (up to ~1.5 A) from 14.5–35 V: LED strips, fans, 12 V relays, or the first stage of a 24 V → 12 V → 5 V (7805) supply. With the lettering facing you: IN (1), GND (2), OUT (3), same as the 7805. It needs ~2.5 V of headroom on the input (dropout): from a 12 V battery it only gives ~9.5 V! It dissipates P = (Vin − 12 V) × I: with 24 V and 0.3 A that is 3.6 W — use a heatsink.',
    fields: { heatsink: HEATSINK_REG },
  },
  lm7905: {
    name: '7905 negative voltage regulator (−5 V)',
    description:
      'NEGATIVE regulator: gives −5 V (relative to GND) from −7 to −35 V, for ±5 V split supplies for op-amps (LM741, TL072) and analog circuits. Note: the pin order differs from the 7805 — with the lettering facing you: GND (1), IN (2), OUT (3), and the metal tab is connected to IN (negative), not GND. Connect the battery’s + to the circuit GND and its − to IN. Dropout ~1.5 V, up to ~1.5 A.',
    fields: { heatsink: HEATSINK_REG },
  },
  loadBlock: {
    name: 'Load block / counterweight',
    short: 'Load',
    description:
      'Solid steel block of known mass. Hang it on the end of an arm to test a servo/motor’s torque, use it as a crane counterweight (balances the boom’s moment) or as ballast to lower a robot’s center of mass. Loose on the table it falls and can be pushed.',
    fields: { grams: { label: 'Mass' } },
    mounts: { top: { label: 'on top' } },
  },
  max7219: {
    name: 'MAX7219 8×8 matrix',
    short: 'Matrix',
    description:
      '64-LED matrix driven by 3 wires: VCC → 5V, GND → GND, DIN, CS and CLK to 3 digital pins (e.g. 12, 10, 11). It starts in "shutdown": call lc.shutdown(0, false). The output (right side) connects to a second matrix.',
    fields: { color: { label: 'Color', options: { red: 'Red', green: 'Green', blue: 'Blue', white: 'White' } } },
  },
  mcp3008: {
    name: 'MCP3008 A/D converter (8 channels, SPI)',
    description:
      'Eight 10-bit analog inputs (0–1023) over SPI. Seat it across the breadboard’s center channel. VDD and VREF → 5V (VREF is the value that reads 1023), AGND and DGND → GND, CLK → D13 (SCK), DOUT → D12 (MISO), DIN → D11 (MOSI), CS → D10 (or another pin). With the Adafruit_MCP3008 library: adc.begin(10) and adc.readADC(channel). It also answers raw SPI.transfer() (3 bytes: 0x01, 0x80 | channel << 4, 0x00). Differential mode: readADCDifference(0) = CH0 − CH1.',
  },
  mecanumWheel: {
    name: 'Mecanum wheel',
    description:
      'Wheel with free rollers at 45°: the force on the ground comes out at an angle. On a 4-wheel chassis ("L" at front-left and rear-right, "R" on the other two — the top rollers form an X seen from above) the robot drives forward, sideways (the wheels on each side turning in opposite directions) or diagonally without rotating. In the physics: traction only perpendicular to the rollers (ideal rollers).',
    fields: { diameter: { label: 'Diameter' }, hand: { label: 'Version', options: { L: 'Left (L)', R: 'Right (R)' } } },
    mounts: { face: { label: 'outer face (hub)' } },
  },
  mechPlate: {
    name: 'Perforated plate (aluminum)',
    short: 'Plate',
    description:
      '3 mm aluminum plate with a grid of holes every 8 mm. Base for chassis, arms and mechanisms: attach motors, bearings, caster wheels, sensors and circuit boards on top or underneath, and bars/angle brackets on the faces. Like the "Structure" it has real physics: it falls, rests on the floor and is pushed by the wheels mounted on it.',
    fields: {
      size: {
        label: 'Size',
        options: { '5x5': '5 × 5 holes (4.4 × 4.4 cm)', '7x9': '7 × 9 holes (6 × 7.6 cm)', '9x15': '9 × 15 holes (7.6 × 12.4 cm)', '15x21': '15 × 21 holes (12.4 × 17.2 cm)' },
      },
    },
    mounts: { top: { label: 'on top' }, bottom: { label: 'underneath' }, front: { label: 'front face' }, back: { label: 'back face' }, left: { label: 'left side' }, right: { label: 'right side' } },
  },
  mega: {
    description:
      'ATmega2560 at 16 MHz with 54 digital pins (D0–D53) and 16 analog pins (A0–A15 = 54–69). PWM on 2–13 and 44–46, I2C on 20 (SDA) and 21 (SCL), serial ports Serial1–3 on 14–19. 5 V logic, powered like the Uno (USB, VIN 7–12 V or 5V). L LED on pin 13.',
    fields: { usb: { label: 'Power', options: { true: 'USB (computer)', false: 'External (VIN 7–12 V or 5V)' } } },
  },
  mesa: {
    name: 'Table',
    short: 'Table',
    description:
      'Wooden table to furnish the model (10 × 6.5 cm and 6.3 cm tall ≈ 1.2 × 0.8 m at 1:12 scale). Set it on a slab floor; you can put a lamp, a sensor or the board on top.',
    fields: { l: { label: 'Length' }, w: { label: 'Width' }, h: { label: 'Height' }, material: { label: 'Material' }, color: { label: 'Color' } },
  },
  microSD: {
    name: 'microSD card module (SPI)',
    description:
      'Stores files on a microSD card (FAT16/FAT32, 8.3 names). On the Uno: CS → D10 (or another), MOSI → D11, MISO → D12, SCK → D13, VCC → 5V, GND → GND. SD library: SD.begin(10); File f = SD.open("data.txt", FILE_WRITE); f.println(…); f.close();. The card’s contents appear in the simulation and persist while it runs.',
  },
  molduraDentada: {
    name: 'Toothed frame (U-shaped internal rack)',
    short: 'Toothed frame',
    description:
      'Rectangle open on one side, with teeth on the inside of one long side: with a spur gear on a servo horn inside it, it turns the servo’s rotation into linear motion (up and down with the servo lying flat, or back and forth). Attach it to the "shaft (fixed)" point of the servo that carries the gear and choose the same tooth count as the gear: they mesh on their own. Each servo degree moves radius × angle (20 teeth → 0.17 mm/degree, ~3 cm over 180°). Attach the load to the closed end.',
    fields: {
      teeth: {
        label: 'Pinion teeth (gear)',
        options: { 12: '12 teeth (Ø 12 mm)', 16: '16 teeth (Ø 16 mm)', 20: '20 teeth (Ø 20 mm)', 30: '30 teeth (Ø 30 mm)', 40: '40 teeth (Ø 40 mm)' },
      },
      length: { label: 'Length (x)' },
      width: { label: 'Width (z)' },
      thick: { label: 'Height / thickness (y)' },
      material: { label: 'Material' },
      color: { label: 'Color' },
    },
    mounts: { frame: { label: 'closed end (slides)' } },
  },
  molduraServoMdf: {
    name: 'Servo frame (MDF / acrylic)',
    short: 'Servo frame',
    description:
      'Laser-cut plate with a servo cutout (SG90/MG90S or MG996R) and the holes for its tabs, like the frames in robotic arm and hand kits: the servo slides into the cutout and screws on by its tabs. Attach the frame to other plates by its sides ("sideways") or on top/underneath to build the arm’s skeleton.',
    fields: { margem: { label: 'Margin around' }, thick: { label: 'Thickness' }, material: { label: 'Material' }, color: { label: 'Color' } },
    mounts: {
      servo: { label: 'servo (in the cutout)' },
      top: { label: 'on top' },
      bottom: { label: 'underneath' },
      side: { label: 'edge (+z)' },
      sideL: { label: 'edge (−z)' },
      front: { label: 'edge (+x)' },
      back: { label: 'edge (−x)' },
    },
  },
  mosfet: {
    name: 'IRLZ44N N-MOSFET',
    description:
      'Voltage-controlled, logic-level switch: with 5 V on the gate (G) it connects D to S with only 0.025 Ω (handles several amps); below ~1.5 V it is off. The gate draws no current. Low side: S → GND, load between the battery + and D, G to an Arduino pin (220 Ω in series and 10 kΩ from G to GND so it doesn’t float). Accepts PWM (analogWrite) to control a motor’s speed. Front view: G, D, S from left to right.',
  },
  motor: {
    name: 'DC motor + wheel',
    description:
      'TT 1:48 motor (~200 RPM at 6 V) with a wheel of your choice: 65 mm standard or narrow, 85 mm, 90 mm narrow or 130 mm all-terrain. There are also 3D-printed disc wheels with holes (120 and 150 mm), in a color of your choice. It fits on the sides of the chassis; with bigger wheels the chassis rises and the robot goes faster (speed = rpm × π × diameter).',
    fields: { wheel: { label: 'Wheel', options: WHEELS }, wheelColor: { label: 'Wheel color' } },
  },
  motor12v: {
    name: '12 V geared DC motor (JGA25-370)',
    short: '12 V motor',
    description:
      '12 V DC motor with a 25 mm metal gearbox and a 4 mm D-shaft, no encoder. Stronger than the TT motor (up to ~6 kg·cm): for bigger robots, heavy arms, winches and conveyors. Drive it with an H-bridge (L298N at 12 V) on M+ and M−. Attach wheels, gears or pulleys to the shaft.',
    fields: { ratio: { label: 'Gear ratio', options: { 9.6: '1:9.6 (≈ 680 rpm at 12 V)', 21.3: '1:21 (≈ 300 rpm)', 34: '1:34 (≈ 190 rpm)' } } },
  },
})

const LOAD = { label: 'Shaft load' }
const ENC_DIR =
  'With M+ more positive than M− the shaft turns counterclockwise (seen from the shaft tip) and channel B leads A by 90°: Encoder enc(A, B) counts up; in an ISR on RISING of A, digitalRead(B) == HIGH means "forward".'
const TT_FIELDS = {
  ratio: { label: 'Gear ratio', options: { 48: '1:48 (≈ 200 rpm at 6 V)', 120: '1:120 (≈ 80 rpm, more torque)' } },
  suporte: { label: 'Motor bracket', options: { transparente: 'With transparent bracket (as in the kits)', nenhum: 'No bracket' } },
}
const TT_MOUNTS = { shaft: { label: 'shaft — left side (−z)' }, shaft2: { label: 'shaft — right side (+z)' }, top: { label: 'on top' } }
const LAYOUT = { label: 'LED order', options: { progressive: 'Row by row (all left to right)', serpentine: 'Serpentine (zigzag)' } }
const USB_OPT = (ext) => ({ label: 'Power', options: { true: 'USB (computer)', false: ext } })

Object.assign(PATCH, {
  motor12v: {
    ...PATCH.motor12v,
    fields: { ratio: { label: 'Gear ratio', options: { ...PATCH.motor12v.fields.ratio.options, 78: '1:78 (≈ 83 rpm, high torque)' } } },
    interactive: LOAD,
    mounts: { shaft: { label: 'output shaft' } },
  },
  motor130: {
    name: 'Toy-car DC motor (130, no gearbox)',
    short: '130 motor',
    description:
      'The motor from toy cars: 3–6 V, very fast (~9000 rpm at 3 V) with little torque, no gearbox. Put a fan propeller, a pinion (small gear) to reduce speed, a pulley or a small wheel on the shaft. It draws up to ~1.2 A: drive it with an H-bridge (L298N, L293D) or with a transistor/MOSFET and a diode across it — never directly from an Arduino pin.',
    interactive: LOAD,
    mounts: { shaft: { label: 'shaft (2 mm)' } },
  },
  motor775: {
    name: '12 V DC motor, no gearbox (RS-775)',
    short: '775 motor',
    description:
      'Large 12 V DC motor without a gearbox (~12,000 rpm unloaded): for fans, pumps, tools, fast cars or to use with gears/pulleys that reduce the speed. It draws ~0.6 A unloaded and up to ~18 A stalled — the L298N (2 A) is not enough: use a BTS7960 driver or an IRLZ44N MOSFET (with a diode across the motor) and a 12 V supply that can handle the current.',
    interactive: LOAD,
    mounts: { shaft: { label: 'shaft (5 mm)' } },
  },
  motorEnc: {
    name: 'JGA25-370 motor with encoder',
    short: 'Encoder motor',
    description: `12 V DC motor with a metal gearbox (25 mm) and a Hall-effect magnetic encoder with 2 quadrature channels (C1/A and C2/B), 11 pulses per rotor turn. Counts per output-shaft turn = 11 × 4 × ratio (1:34 → 1496 with Encoder.h, which counts all 4 edges). Drive the motor (M+/M−) with an H-bridge (L298N, L293D) and power the encoder with 5 V (VCC/GND). Connect A and B to interrupt pins (on the Uno: D2 and D3). ${ENC_DIR} Attach wheels, gears, pulleys or bars to the shaft. The "Shaft load" control brakes the shaft (to test a PID).`,
    fields: { ratio: { label: 'Gear ratio', options: { 21.3: '1:21 (≈ 300 rpm at 12 V)', 34: '1:34 (≈ 190 rpm at 12 V)', 78: '1:78 (≈ 83 rpm at 12 V)' } } },
    interactive: LOAD,
    mounts: { shaft: { label: 'output shaft' } },
  },
  motorRedondoEnc: {
    name: 'Round DC motor with encoder (Ø24 mm)',
    short: 'Round enc. motor',
    description: `Toy-car motor with a round can (24 mm, 3–9 V, ~8000 rpm at 6 V, no gearbox) with a Hall-effect magnetic encoder on the back: 12 pulses per turn on each channel (48 counts per turn with Encoder.h). M+/M− → H-bridge (L298N, L9110S, TB6612); encoder VCC/GND → 5 V; A and B → interrupt pins (on the Uno D2 and D3). ${ENC_DIR} It fits the "Motor cradle" (Ø24 mm). Put a propeller, a pinion, a pulley or a small wheel on the shaft.`,
    interactive: LOAD,
    mounts: { shaft: { label: 'shaft (2 mm)' } },
  },
  motorTT: {
    name: 'TT 1:48 motor (no wheel)',
    short: 'TT motor',
    description:
      'Yellow DC motor with a 1:48 gearbox (3–6 V, ~200 rpm at 6 V, ~0.8 kg·cm), without a wheel. The D-shaft is double and comes out of both sides of the gearbox: attach a wheel (tired or printed), a gear, a GT2 pulley or a bar on either side (they turn together, in the same direction). Drive it with an H-bridge (L298N, L293D, TB6612) connected to M+ and M−; more voltage makes it turn faster. It is the motor of cheap 2WD/4WD robots.',
    fields: TT_FIELDS,
    interactive: LOAD,
    mounts: TT_MOUNTS,
  },
  motorTTEnc: {
    name: 'TT 1:48 motor with encoder',
    short: 'TT encoder motor',
    description: `Yellow TT motor (1:48 gearbox, 3–6 V, ~200 rpm at 6 V) with a Hall-effect magnetic encoder behind the motor: an 11-pulse-per-rotor-turn disc and 2 quadrature channels (A and B). Per output-shaft turn: 11 × 48 = 528 pulses on each channel — 528 with RISING on A, 1056 with CHANGE on A, 2112 with Encoder.h (4 edges). 6-way connector: M+ · GND · A · B · VCC · M−. Drive the motor (M+/M−) with an H-bridge and power the encoder with 5 V; connect A and B to interrupt pins (on the Uno D2 and D3). ${ENC_DIR} The shaft is double: attach a wheel, gear or pulley on either side (they turn together).`,
    fields: TT_FIELDS,
    interactive: LOAD,
    mounts: TT_MOUNTS,
  },
  mpu6050: {
    name: 'MPU6050 accelerometer/gyroscope (GY-521)',
    description:
      '6-axis IMU over I2C: accelerometer (±2/4/8/16 g) and gyroscope (±250/500/1000/2000 °/s), plus a thermometer. VCC → 5V or 3.3V (the module has a 3.3 V regulator), GND → GND, SDA → A4, SCL → A5 (ESP32: 21/22). Address 0x68 (AD0 floating or to GND) or 0x69 (AD0 to VCC). NOTE: it starts asleep — write 0 to the PWR_MGMT_1 register (0x6B) or all readings are 0. Chip axes (arrows on the board): X forward, Y to the left, Z up; lying still it measures +1 g on Z. The gyroscope has a small offset that is calibrated with the sensor still; an angle from the gyroscope alone drifts, from the accelerometer alone it is noisy and fooled by accelerations — combine both (complementary filter). XDA/XCL (auxiliary magnetometer) and INT are not simulated. On a robot with physics the sensor measures the real motion; without physics, tilt it with the joystick in the "Controls" panel.',
  },
  mq2: {
    name: 'MQ-2 gas sensor',
    description:
      'Detects combustible gas and smoke (200–10000 ppm). VCC → 5V, GND → GND, AO → A0 (more gas → higher value; clean air ≈ 100), DO → digital pin: LOW when the concentration crosses the trimpot threshold (lights the LED), HIGH with no gas. Note: the internal heater draws ~150 mA — power it from the 5V pin (never from a digital pin, which only gives 40 mA). At power-up the readings are high for a few seconds until the heater stabilizes.',
    fields: { threshold: { label: 'Comparator threshold (trimpot, fraction of VCC)' } },
    interactive: { label: 'Gas (LPG)' },
  },
  n20Enc: {
    name: 'N20 micro motor with encoder',
    description: `6 V micro motor (12 × 10 mm) with a metal gearbox and a magnetic encoder with 7 pulses per rotor turn, two quadrature channels (C1/A, C2/B). Counts per shaft turn = 7 × 4 × ratio (1:100 → 2800). Widely used in small robots, line followers and light arms. Drive it with an H-bridge (L298N, L293D) and power the encoder with 3.3–5 V. ${ENC_DIR}`,
    fields: { ratio: { label: 'Gear ratio', options: { 30: '1:30 (≈ 1000 rpm at 6 V)', 100: '1:100 (≈ 300 rpm at 6 V)', 298: '1:298 (≈ 100 rpm at 6 V)' } } },
    interactive: LOAD,
    mounts: { shaft: { label: 'output shaft' } },
  },
  nano: {
    description:
      'The same ATmega328P as the Uno (16 MHz, same pins D0–D13 and A0–A5, PWM on 3, 5, 6, 9, 10, 11) on a small 30-pin board that fits on the breadboard across the center channel. Powered via USB, 5V (regulated 5 V) or VIN (7–12 V). The L LED is on pin 13.',
    fields: { usb: USB_OPT('External (VIN or 5V)') },
  },
  nanorp2040: {
    description:
      'The RP2040 (2 × Cortex-M0+ at 133 MHz) in the Nano form factor, with Wi‑Fi and Bluetooth (u-blox NINA-W102 module, WiFiNINA library), IMU and microphone. 3.3 V pins (they do not accept 5 V!): D0–D13 and A0–A7 (A6/A7 analog only), I2C on A4 (SDA) / A5 (SCL), Serial1 on D0/D1. LED on D13. Powered via USB (VUSB sits at 5 V) or VIN (5–21 V). It fits on the breadboard across the center channel.',
    fields: { usb: USB_OPT('External (VIN)') },
  },
  nema17: {
    name: 'NEMA 17 stepper motor',
    description:
      '42 mm bipolar stepper motor used in 3D printers and CNCs: 200 steps per turn (1.8°), ~1.5 A per phase, ~0.4 N·m torque. It has 2 coils: A+/A− and B+/B−. It needs a driver (A4988): A+ → 1A, A− → 1B, B+ → 2A, B− → 2B. Swapping the wires of just one coil reverses the direction. Whatever is attached to the shaft turns with it.',
  },
  neopixelLed: {
    name: '5 mm NeoPixel LED (WS2812B)',
    description:
      '5 mm RGB LED with the WS2812B controller inside: 4 legs (left to right, with the flat side on the right) DIN, VDD (+5 V), GND and DOUT. A single Arduino pin picks the color out of 16 million; DOUT connects to the next LED’s DIN to make a chain. Put a 100 nF capacitor between VDD and GND near each LED and a ~330 Ω resistor in series with DIN. Draws up to 60 mA at full white.',
  },
  neopixelMatrix16: {
    name: '16×16 flexible NeoPixel panel (WS2812B)',
    short: '16×16 matrix',
    description:
      'Flexible panel with 256 WS2812B LEDs (160 × 160 mm) wired in serpentine: row 0 runs left to right, row 1 back right to left, and so on (compute the index with an XY() function). VCC/GND need a strong 5 V supply — at full white it is ~15 A! — and GND shared with the Arduino. Use FastLED.setMaxPowerInVoltsAndMilliamps(5, 2000) to limit the current draw.',
    fields: { layout: LAYOUT },
  },
  neopixelMatrix8: {
    name: '8×8 NeoPixel matrix (WS2812B)',
    short: '8×8 matrix',
    description:
      'Board with 64 WS2812B RGB LEDs (65 × 65 mm) driven by a single pin: VCC → 5V, GND → GND, DIN → digital pin (with 330 Ω in series). LED 0 is in the top-left corner and the count goes row by row, always left to right (switch to "serpentine" if your board is zigzag). At full white it draws ~3.8 A: on USB use a low setBrightness() (≤ 40) or an external 5 V supply. Works with FastLED and Adafruit_NeoPixel.',
    fields: { layout: LAYOUT },
  },
  neopixelModule: {
    name: 'NeoPixel module (1 × WS2812B)',
    description:
      'Small board with a single WS2812B 5050 LED and its decoupling capacitor already soldered. Input: GND, VCC (+5 V), DIN → digital pin. Output: DOUT (to the next module’s DIN). Ideal for colored status indicators. Draws up to 60 mA at full white.',
  },
  neopixelRing: {
    name: 'NeoPixel ring (16 LEDs)',
    short: 'Ring',
    description: 'Ring of 16 WS2812B RGB LEDs: VCC → 5V, GND → GND, DIN → digital pin. LED 0 is at the top and the count goes clockwise. At full white it draws ~1 A — more than USB can handle!',
  },
  neopixelStrip: {
    name: 'NeoPixel strip (8 LEDs)',
    description:
      '8 WS2812B RGB LEDs driven by a single pin: VCC → 5V, GND → GND, DIN → digital pin (e.g. 6). Each LED draws up to 60 mA at full white: with many LEDs use an external 5 V supply. DOUT connects to the next strip’s DIN.',
  },
  npn: {
    name: '2N2222 NPN transistor',
    description:
      'Current-controlled switch/amplifier: a small current into the base (B) lets up to ~150× more flow between collector (C) and emitter (E). As a low-side switch: E → GND, load between + and C, and the base to an Arduino pin ALWAYS through a ~1 kΩ resistor (≈4 mA into the base is enough for ~500 mA). Max. 600 mA / 0.5 W. Front view (flat face): E, B, C from left to right.',
  },
  ntc: {
    name: '10 kΩ NTC thermistor',
    description:
      'Resistor that decreases with temperature: 10 kΩ at 25 °C (≈33 kΩ at 0 °C, ≈680 Ω at 100 °C). Make a divider: 5V → 10 kΩ resistor → A0 → NTC → GND. Convert with the Beta equation: R = 10000 / (1023.0 / reading − 1); T = 1 / (log(R / 10000) / 3950 + 1 / 298.15) − 273.15. It responds to temperature with some lag (thermal mass). No polarity.',
    fields: { beta: { label: 'B constant (K)' } },
    interactive: { label: 'Temperature' },
  },
  omniWheel: {
    name: 'Omnidirectional wheel',
    description:
      'Wheel with free rollers around the rim, with the roller axes in the wheel’s plane: it pushes in the direction it rolls and slides freely sideways. Three wheels at 120° (or four at 90°) make a holonomic robot that moves in any direction without rotating. In the physics: traction only in the rolling direction (ideal-roller approximation).',
    fields: { diameter: { label: 'Diameter' } },
    mounts: { face: { label: 'outer face (hub)' } },
  },
  opampIdeal: {
    name: 'Ideal operational amplifier',
    description:
      'The "textbook" op-amp: infinite gain (10⁶), inputs draw no current, output with no limits or resistance — it does not saturate at the supply rails. Implicit power (as in Velxio): the output is measured relative to the Arduino’s GND. Great for learning the classic circuits: follower (OUT tied to IN−), non-inverting (gain 1 + Rf/Rg), inverting (−Rf/Rin), summing amplifier, comparator. In a real circuit use an LM358 (5 V) or a TL072/LM741 (±V). Pins (left to right): IN−, IN+, OUT.',
  },
  opto4n25: {
    name: '4N25 optocoupler',
    description:
      'Classic optocoupler in DIP-6 (5000 V isolation): same use as the PC817 — isolating the Arduino from 12 V/24 V circuits, relays, motors or mains — but with a lower CTR (20 % minimum, ~50 % typical: with 10 mA in the LED the transistor sinks only ~5 mA) and the phototransistor’s base on pin 6 (leave it floating or put 1 MΩ to E to make it less sensitive). Pins: 1 A (anode, dot), 2 K, 3 no connection, 4 E (emitter), 5 C (collector), 6 B (base). LED: 1.2 V, 10–60 mA with 220–330 Ω; C with a pull-up (4.7–10 kΩ) to the other circuit’s voltage, E to that circuit’s GND.',
    fields: { ctr: { label: 'CTR (current transfer ratio)', options: { 0.2: '20 % (minimum)', 0.5: '50 % (typical)' } } },
  },
  painelSolar: {
    name: 'Solar panel',
    short: 'Solar panel',
    description:
      'Converts light into electricity. The current is proportional to the light (short circuit: Isc) and the voltage rises up to the open-circuit voltage (Voc) — on a sunny day (1000 W/m²) a 6 V 1 W panel gives ~6 V and ~170 mA at the maximum power point. The useful light depends on the angle between the panel and the sun (elevation and azimuth on the panel): tilt it toward the sun, or mount it on a servo to track the sun. To charge a battery put a diode (1N5819) in series, or a charger module (TP4056); connected directly to the Arduino (VIN) it only works in bright light. Use the slider during the simulation to change the light (clouds, night…).',
    fields: {
      model: { label: 'Model', options: { m05: '5 V 0.5 W (80 × 60 mm)' } },
      sunElev: { label: 'Sun elevation' },
      sunAz: { label: 'Sun azimuth (0° = +x, 90° = +z)' },
    },
    interactive: { label: 'Sunlight' },
    mounts: { back: { label: 'back (center)' }, top: { label: 'on top' } },
  },
  panTilt: {
    name: 'Pan-tilt bracket (2 × SG90)',
    description:
      'Plastic bracket to build a 2-axis head with two SG90 micro servos: screw the base to the horn of the bottom servo (pan, turns left/right) and fit the 2nd servo into the cradle (tilt, tilts up/down: its shaft is horizontal and passes above the pan shaft). Attach the camera, the ultrasonic sensor or a laser to the tilt servo’s horn.',
    mounts: { tilt: { label: 'tilt servo cradle (SG90)' } },
  },
  parallelGripper: {
    name: 'Parallel servo gripper',
    short: 'Parallel gripper',
    description:
      'Parallel-finger gripper driven by an MG90S micro servo through a pinion and two racks: the fingers always stay parallel (they grip boxes and cylinders well). 0° = closed, 180° = open (4 cm between fingers). Servo.h: gripper.write(degrees). The base attaches by its back face to the end of an arm (bar, U bracket, servo horn).',
    mounts: { grip: { label: 'between the fingers' }, top: { label: 'on top (camera, sensor)' } },
  },
})

const WALL_FIELDS = {
  length: { label: 'Length' },
  height: { label: 'Height' },
  thickness: { label: 'Thickness' },
  acabamento: {
    label: 'Exterior finish',
    options: { reboco: 'Painted render', tijolo: 'Exposed brick', pedra: 'Stone (schist/granite)', azulejo: 'Glazed tiles (azulejo)', madeira: 'Wood (slatted)', material: 'Material only (MDF, acrylic…)' },
  },
  corExterior: { label: 'Exterior color' },
  corInterior: { label: 'Interior color (paint)' },
  rodape: { label: 'Interior baseboard', options: { true: 'With baseboard', false: 'No baseboard' } },
  material: { label: 'Material' },
  color: { label: 'Color' },
}
const WALL_MOUNTS = { topo: { label: 'on top (slab, roof)' }, exterior: { label: 'exterior face' }, interior: { label: 'interior face' }, base: { label: 'underneath' } }
const OPENING = { vaoL: { label: 'Opening width' }, vaoA: { label: 'Opening height' }, vaoX: { label: 'Opening position (x)' } }

Object.assign(PATCH, {
  parede: {
    name: 'Wall (house model)',
    short: 'Wall',
    description:
      'Wall for a smart-home model (scale ~1:12: 20 cm tall ≈ 2.4 m). Attach it to an edge of a slab: its outer face sits flush with the edge and its thickness goes into the house. Choose the exterior finish (painted render, exposed brick, stone, tiles or wooden slats) and the interior paint color. Lamps, switches and sensors attach to the faces (they stay upright); another slab or the roof rests on top. It is fixed (it does not fall).',
    fields: WALL_FIELDS,
    mounts: WALL_MOUNTS,
  },
  paredeJanela: {
    name: 'Wall with window',
    short: 'Wall w/ window',
    description:
      'Wall with a window opening (editable width, height, sill height and position), a stone sill outside and a frame with fixed glass. For a window that opens: choose "No fixed glass" and attach a "Window sash" to the hinge (swings freely) or to the horn of a servo attached at the "window servo" point (90° = closed, 0° = open inward). An electric roller shutter fits at the "opening, outside" point.',
    fields: {
      ...WALL_FIELDS,
      ...OPENING,
      peitoril: { label: 'Sill height' },
      vidro: { label: 'Fixed glass', options: { true: 'With fixed glass', false: 'No glass (opening sash)' } },
      servoTipo: { label: 'Window servo' },
    },
    mounts: {
      ...WALL_MOUNTS,
      dobradica: { label: 'window hinge (swings freely)' },
      servo: { label: 'window servo (upside down, horn on the axis)' },
      vao: { label: 'opening, outside, at the top (gate / shutter)' },
    },
  },
  paredePorta: {
    name: 'Wall with door',
    short: 'Wall w/ door',
    description:
      'Wall with a door opening (editable width, height and position) and wooden frames. To make the door open: attach a "Door leaf" to the hinge (swings freely) or, to open it with the Arduino, attach a servo at the "door servo" point (it hangs upside down above the opening, with its horn on the door axis; choose SG90 or MG996R) and the leaf to the servo horn: 90° = closed, 0° = open inward. A motorized garage door fits at the "opening, outside" point.',
    fields: { ...WALL_FIELDS, ...OPENING, servoTipo: { label: 'Door servo' } },
    mounts: {
      ...WALL_MOUNTS,
      dobradica: { label: 'door hinge (swings freely)' },
      servo: { label: 'door servo (upside down, horn on the axis)' },
      vao: { label: 'opening, outside, at the top (gate / shutter)' },
    },
  },
})

// ---------- generic option labels shared by many parts (materials, servo kinds) ----------
const MAT = {
  alu: 'Aluminum',
  aluPreto: 'Black anodized aluminum',
  aco: 'Steel',
  latao: 'Brass',
  acrilico: 'Acrylic (PMMA)',
  acrilicoT: 'Clear acrylic',
  acrilicoPapel: 'Acrylic with protective paper (kraft)',
  pla: 'Printed PLA (30 % infill)',
  petg: 'Printed PETG',
  plaSolido: 'Solid PLA (100 %)',
  madeira: 'Wood / MDF',
  mdf: '3 mm MDF (laser-cut)',
  papel: 'Paper (drawing sheet)',
  cartao: 'Cardboard',
  abs: 'ABS (injection-molded plastic)',
  nylon: 'Nylon (POM/PA)',
  carbono: 'Carbon fiber',
  borracha: 'Rubber',
  espuma: 'EVA foam',
  betao: 'Concrete (counterweight)',
}
const SERVO_KIND = { servo: 'SG90 (micro servo)' }

// ---------- pin labels for every type of this block ----------
const TYPES = Object.keys(DEFS)
  .sort((a, b) => a.localeCompare(b))
  .filter((t) => t.localeCompare('gateNand3') >= 0 && t.localeCompare('paredePorta') <= 0)
for (const t of TYPES) {
  const pins = {}
  for (const p of DEFS[t].pins || []) {
    if (typeof p.label !== 'string') continue
    const en = pinEn(p.label)
    if (en !== p.label) pins[p.id] = { label: en }
  }
  if (Object.keys(pins).length) (PATCH[t] ??= {}).pins = { ...pins, ...(PATCH[t].pins || {}) }
  // material and servo-kind options: same labels everywhere
  for (const f of DEFS[t].fields || []) {
    if (!Array.isArray(f.options) || !f.key) continue
    const dict = f.key === 'material' ? MAT : f.key === 'servoTipo' ? SERVO_KIND : null
    if (!dict) continue
    const opts = {}
    for (const o of f.options) if (Array.isArray(o) && dict[o[0]]) opts[o[0]] = dict[o[0]]
    const P = (PATCH[t] ??= {})
    P.fields ??= {}
    P.fields[f.key] = { ...(P.fields[f.key] || {}), options: { ...opts, ...(P.fields[f.key]?.options || {}) } }
  }
}

export const PARTS_2 = PATCH
registerOverlay('parts-2', () => DEFS, PATCH)
