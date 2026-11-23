// Inglês das tabelas partilhadas que não são definições de peças: famílias e grupos do catálogo,
// pistas, grupos de exemplos, materiais, rodas, cores, categorias, orientação dos pinos e física.
import { registerOverlay } from '../../i18n.js'
import { CATALOG } from '../../catalog.js'
import { TRACKS } from '../../tracks.js'
import { EXAMPLE_GROUPS } from '../../exampleGroups.js'
import { MATERIALS, MATERIAL_OPTS } from '../../parts/_materials.js'
import { MOTOR_WHEELS, MOTOR_WHEEL_OPTS, LED_COLORS, COLOR_PALETTE, CATEGORIES, PALETTE } from '../../components.js'
import { PIN_DIR_LABEL } from '../../pinOrient.js'
import { SONAR_LABELS } from '../../sonar.js'
import { PHYSICS_MODES } from '../../physics.js'

// famílias (separadores) e grupos do catálogo "Adicionar componente"; grupos pela chave = rótulo PT
registerOverlay('catalog', () => CATALOG, {
  placas: {
    label: 'Boards',
    groups: { 'ATtiny, STM32 e outras': { label: 'ATtiny, STM32 and others' }, 'Placas de expansão e outras': { label: 'Expansion boards and others' }, outros: { label: 'Other' } },
  },
  eletronica: {
    label: 'Electronics',
    groups: {
      'Breadboards e ligações': { label: 'Breadboards and connections' },
      'Resistências, condensadores e bobinas': { label: 'Resistors, capacitors and inductors' },
      Díodos: { label: 'Diodes' },
      Transístores: { label: 'Transistors' },
      'Amplificadores operacionais': { label: 'Operational amplifiers' },
      Optoacopladores: { label: 'Optocouplers' },
      'Portas lógicas': { label: 'Logic gates' },
      'Flip-flops': { label: 'Flip-flops' },
      'Circuitos integrados 74HC e expansores': { label: '74HC ICs and expanders' },
      'Memórias, conversores e registos': { label: 'Memories, converters and registers' },
      outros: { label: 'Other' },
    },
  },
  sensores: {
    label: 'Sensors',
    groups: {
      'Distância e obstáculos': { label: 'Distance and obstacles' },
      'Seguidores de linha': { label: 'Line followers' },
      'Movimento, orientação e posição': { label: 'Motion, orientation and position' },
      'Temperatura e humidade': { label: 'Temperature and humidity' },
      'Luz e cor': { label: 'Light and color' },
      Som: { label: 'Sound' },
      'Gás, água e solo': { label: 'Gas, water and soil' },
      'Corrente, tensão, peso e corpo': { label: 'Current, voltage, weight and body' },
      outros: { label: 'Other' },
    },
  },
  entradas: {
    label: 'Inputs and modules',
    groups: {
      'Botões e interruptores': { label: 'Buttons and switches' },
      'Potenciómetros, joystick e encoder': { label: 'Potentiometers, joystick and encoder' },
      Teclados: { label: 'Keypads' },
      'Comando IR e comunicação': { label: 'IR remote and communication' },
      'Relógio e memória': { label: 'Clock and memory' },
      outros: { label: 'Other' },
    },
  },
  saidas: {
    label: 'Light, sound and displays',
    groups: {
      LEDs: { label: 'LEDs' },
      'Fitas e matrizes RGB (NeoPixel)': { label: 'RGB strips and matrices (NeoPixel)' },
      'Displays LCD e 7 segmentos': { label: 'LCD and 7-segment displays' },
      'Ecrãs OLED e TFT': { label: 'OLED and TFT screens' },
      'E-paper': { label: 'E-paper' },
      Som: { label: 'Sound' },
      Relés: { label: 'Relays' },
      outros: { label: 'Other' },
    },
  },
  motores: {
    label: 'Motors and drivers',
    groups: {
      Servos: { label: 'Servos' },
      'Motores DC': { label: 'DC motors' },
      'Motores com encoder': { label: 'Motors with encoder' },
      'Motores de passo': { label: 'Stepper motors' },
      Brushless: { label: 'Brushless' },
      'Drivers de motor': { label: 'Motor drivers' },
      Solenoides: { label: 'Solenoids' },
      outros: { label: 'Other' },
    },
  },
  energia: {
    label: 'Power',
    groups: {
      'Baterias e pilhas': { label: 'Batteries and cells' },
      'Reguladores e conversores': { label: 'Regulators and converters' },
      Solar: { label: 'Solar' },
      'Instrumentos de bancada e medida': { label: 'Bench and measuring instruments' },
      outros: { label: 'Other' },
    },
  },
  mecanica: {
    label: 'Mechanics',
    groups: {
      'Chassis e veículos': { label: 'Chassis and vehicles' },
      Rodas: { label: 'Wheels' },
      Engrenagens: { label: 'Gears' },
      Transmissão: { label: 'Transmission' },
      'Hélices e ventoinhas': { label: 'Propellers and fans' },
      'Estrutura e fixação': { label: 'Structure and fastening' },
      'Materiais (blocos, placas, tubos)': { label: 'Materials (blocks, plates, tubes)' },
      outros: { label: 'Other' },
    },
  },
  robotica: {
    label: 'Robotics',
    groups: {
      'Braços e garras': { label: 'Arms and grippers' },
      'Braço meArm em MDF': { label: 'meArm MDF arm' },
      'Kit MDF / acrílico cortado a laser': { label: 'Laser-cut MDF / acrylic kit' },
      'Cão robô de alumínio': { label: 'Aluminum robot dog' },
      'Pato robô bípede (tipo XGO-Duck)': { label: 'Biped robot duck (XGO-Duck style)' },
      'Humanoide Microban (Rhoban)': { label: 'Microban humanoid (Rhoban)' },
      'Quadrúpede, humanoide e drone': { label: 'Quadruped, humanoid and drone' },
      outros: { label: 'Other' },
    },
  },
  casa: {
    label: 'Smart home',
    groups: {
      Estrutura: { label: 'Structure' },
      'Portas, janelas e estores': { label: 'Doors, windows and blinds' },
      'Iluminação, interruptores e sensores': { label: 'Lighting, switches and sensors' },
      Eletrodomésticos: { label: 'Appliances' },
      'Pessoas e mobiliário': { label: 'People and furniture' },
      outros: { label: 'Other' },
    },
  },
})

// pistas e cenários (seletor "Pista" na vista 3D e nas definições)
registerOverlay('tracks', () => TRACKS, {
  mesa: { name: 'Workbench (no track)' },
  oval: { name: 'Oval' },
  sinuosa: { name: 'Winding circuit' },
  oito: { name: 'Figure-8 track' },
  desafio: { name: 'Challenge (90° turns)' },
  circulo: { name: 'Line: circle' },
  quadrado: { name: 'Line: square (90° corners)' },
  zigue: { name: 'Line: zigzag' },
  ondas: { name: 'Line: waves' },
  fina: { name: 'Line: thin (10 mm)' },
  larga: { name: 'Line: wide (30 mm)' },
  tracejada: { name: 'Line: dashed (3 cm gaps)' },
  invertida: { name: 'Line: white on black' },
  grelha: { name: 'Street grid (Dijkstra)' },
  obstaculos: { name: 'Obstacle arena' },
})

// grupos dos projetos de exemplo (página Exemplos e menu Projetos)
registerOverlay('exampleGroups', () => EXAMPLE_GROUPS, {
  basicos: { label: 'First steps' },
  luzes: { label: 'Lights and displays' },
  jogos: { label: 'Games' },
  sensores: { label: 'Sensors and measurement' },
  moveis: { label: 'Mobile robots' },
  bracos: { label: 'Robotic arms' },
  robos: { label: 'Legged robots and drones' },
  otto: { label: 'Otto DIY robot' },
  motores: { label: 'Motors and control' },
  mecanismos: { label: 'Mechanisms and machines' },
  casa: { label: 'Smart home and security' },
  iot: { label: 'IoT, Wi-Fi and ESP32' },
  fogu: { label: 'Programming in Fogu' },
  velxio: { label: 'Boards and chips: ATtiny, STM32, EEPROM, ADC' },
  eletronica: { label: 'Analog and digital electronics' },
})

// materiais das peças de construção (e o seletor de material, partilhado pelas `fields`)
const MAT_EN = {
  alu: 'Aluminum',
  aluPreto: 'Black anodized aluminum',
  aco: 'Steel',
  latao: 'Brass',
  acrilico: 'Acrylic (PMMA)',
  acrilicoT: 'Clear acrylic',
  acrilicoPapel: 'Acrylic with protective paper (kraft)',
  pla: 'Printed PLA (30% infill)',
  petg: 'Printed PETG',
  plaSolido: 'Solid PLA (100%)',
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
registerOverlay('materials', () => MATERIALS, Object.fromEntries(Object.entries(MAT_EN).map(([k, name]) => [k, { name }])))
registerOverlay('materialOpts', () => MATERIAL_OPTS, MAT_EN)

// rodas do motor TT (tabela e opções do seletor "Roda")
const WHEELS_EN = {
  tt: '65 mm × 26 mm (standard)',
  estreita: '65 mm × 12 mm (narrow)',
  grande: '85 mm × 38 mm (large)',
  grandeEstreita: '90 mm × 12 mm (large and narrow)',
  gigante: '130 mm × 30 mm (all-terrain)',
  disco: '120 mm 3D-printed (disc with holes)',
  discoGrande: '150 mm 3D-printed (disc with holes)',
}
registerOverlay('motorWheels', () => MOTOR_WHEELS, Object.fromEntries(Object.entries(WHEELS_EN).map(([k, name]) => [k, { name }])))
registerOverlay('motorWheelOpts', () => MOTOR_WHEEL_OPTS, WHEELS_EN)

// cores dos LEDs
registerOverlay('ledColors', () => LED_COLORS, {
  red: { name: 'Red' },
  green: { name: 'Green' },
  yellow: { name: 'Yellow' },
  blue: { name: 'Blue' },
  white: { name: 'White' },
})

// paleta de cores (fios, peças, materiais) — pela ordem de COLOR_PALETTE
const PALETTE_EN = [
  'Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Gray', 'White',
  'Pure white', 'Light gray', 'Dark gray', 'Graphite', 'Burgundy', 'Coral', 'Amber', 'Light yellow',
  'Lime', 'Light green', 'Dark green', 'Turquoise', 'Cyan', 'Light blue', 'Dark blue', 'Navy blue',
  'Indigo', 'Magenta', 'Pink', 'Light pink', 'Aluminum', 'Steel', 'Brass', 'Copper',
  'Black anodized', 'Slate', 'Wood', 'MDF', 'Beige', 'Chocolate',
]
registerOverlay('colorPalette', () => COLOR_PALETTE, Object.fromEntries(PALETTE_EN.map((name, i) => [i, { name }])))

// categorias antigas (def.cat) e a paleta por categoria
const CAT_EN = {
  mcu: 'Boards',
  proto: 'Prototyping',
  output: 'Outputs and displays',
  input: 'Inputs',
  sensor: 'Sensors',
  discrete: 'Semiconductors',
  logic: 'Digital logic',
  power: 'Power',
  motion: 'Motion',
  mech: 'Mechanics',
  build: 'Construction',
  robot: 'Robotics',
  casa: 'Smart home',
}
registerOverlay('categories', () => CATEGORIES, CAT_EN)
registerOverlay('palette', () => PALETTE, Object.fromEntries(CATEGORIES.map(([cat], i) => [i, { label: CAT_EN[cat] }]).filter(([, v]) => v.label)))

// orientação dos pinos e do sonar (painel de propriedades)
registerOverlay('pinDirs', () => PIN_DIR_LABEL, {
  cima: 'Up',
  baixo: 'Down',
  frente: 'Forward (right angle)',
  tras: 'Backward (right angle)',
  direita: 'Right (right angle)',
  esquerda: 'Left (right angle)',
})
registerOverlay('sonarDirs', () => SONAR_LABELS, { baixo: 'Down', tras: 'Backward (right angle)', tras45: 'Backward at 45°' })

// modos de física
registerOverlay('physicsModes', () => PHYSICS_MODES, {
  auto: 'Automatic',
  dynamic: 'Free: falls, tips over and collides',
  anchored: 'Fixed to the table: joints with gravity',
  static: 'No physics (ideal motion)',
})
