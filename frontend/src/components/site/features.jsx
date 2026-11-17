// Funcionalidades do adjeltron (usadas na página inicial e em /funcionalidades).
// Textos em { pt, en }: traduzidos ao desenhar com t(obj) (ver src/i18n).
import { CircuitBoard, Box, Code2, Atom, Wifi, Activity, Cpu, Bot, House, Gauge, Cable, Save } from 'lucide-react'

export const FEATURES = [
  {
    key: 'circuit',
    icon: CircuitBoard,
    title: { pt: 'Circuito 2D', en: '2D circuit' },
    text: {
      pt: 'Ligue fios entre pinos como no Wokwi/Velxio, com breadboards, cores de fios e diagnóstico elétrico em tempo real (curto-circuitos, correntes a mais, pinos soltos).',
      en: 'Wire pins together like in Wokwi/Velxio, with breadboards, wire colors and real-time electrical diagnostics (short circuits, overcurrent, loose pins).',
    },
    details: [
      { pt: 'Solver nodal: tensões e correntes reais', en: 'Nodal solver: real voltages and currents' },
      { pt: 'Avisos de LEDs sem resistência, USB acima de 500 mA, servos sem alimentação', en: 'Warnings for LEDs without a resistor, USB above 500 mA, unpowered servos' },
      { pt: 'Exportação em PNG e SVG', en: 'PNG and SVG export' },
    ],
  },
  {
    key: 'assembly',
    icon: Box,
    title: { pt: 'Montagem 3D', en: '3D assembly' },
    text: {
      pt: 'Monte o mesmo projeto em 3D com peças à escala real: placas, motores, servos, rodas, perfis e materiais. As peças encaixam umas nas outras pelos pontos de fixação.',
      en: 'Build the same project in 3D with true-to-scale parts: boards, motors, servos, wheels, profiles and materials. Parts snap together at their mounting points.',
    },
    details: [
      { pt: 'Fios 3D com fichas Dupont', en: '3D wires with Dupont connectors' },
      { pt: 'Dimensões, espelho e material editáveis', en: 'Editable dimensions, mirroring and material' },
      { pt: 'Exportação em PNG e GLB', en: 'PNG and GLB export' },
    ],
  },
  {
    key: 'code',
    icon: Code2,
    title: { pt: 'Código C/C++ de Arduino', en: 'Arduino C/C++ code' },
    text: {
      pt: 'Escreva o sketch como no Arduino IDE. O código é verificado com um compilador real e corre no simulador, incluindo bibliotecas populares.',
      en: 'Write your sketch just like in the Arduino IDE. The code is checked by a real compiler and runs in the simulator, popular libraries included.',
    },
    details: [
      { pt: 'Servo, Wire, LiquidCrystal, Adafruit SSD1306/NeoPixel, FastLED, DHT, AccelStepper…', en: 'Servo, Wire, LiquidCrystal, Adafruit SSD1306/NeoPixel, FastLED, DHT, AccelStepper…' },
      { pt: 'Emulação AVR real (avr8js) para Uno, Nano e Mega', en: 'Real AVR emulation (avr8js) for Uno, Nano and Mega' },
      { pt: 'Monitor série, plotter e osciloscópio', en: 'Serial monitor, plotter and oscilloscope' },
    ],
  },
  {
    key: 'physics',
    icon: Atom,
    title: { pt: 'Física real', en: 'Real physics' },
    text: {
      pt: 'Corpos rígidos com gravidade, atrito, ressalto e colisões. Servos com binário limitado cedem com cargas pesadas; robôs com patas caem se o passo estiver mal.',
      en: 'Rigid bodies with gravity, friction, bounce and collisions. Torque-limited servos give way under heavy loads; legged robots fall if the gait is wrong.',
    },
    details: [
      { pt: 'Motor de física Rapier', en: 'Rapier physics engine' },
      { pt: 'IMU (MPU6050) lê a aceleração e a rotação reais', en: 'IMU (MPU6050) reads the real acceleration and rotation' },
      { pt: 'Vento de hélices, garras que agarram objetos', en: 'Propeller airflow, grippers that grab objects' },
    ],
  },
  {
    key: 'iot',
    icon: Wifi,
    title: { pt: 'IoT e redes', en: 'IoT and networking' },
    text: {
      pt: 'ESP32 e Pico W ligam-se a um Wi-Fi virtual e falam MQTT, HTTP e WebServer. Um broker MQTT real permite ligar o Node-RED ou o telemóvel.',
      en: 'ESP32 and Pico W join a virtual Wi-Fi and speak MQTT, HTTP and WebServer. A real MQTT broker lets you connect Node-RED or your phone.',
    },
    details: [
      { pt: 'PubSubClient, HTTPClient, ArduinoJson', en: 'PubSubClient, HTTPClient, ArduinoJson' },
      { pt: 'Broker MQTT (TCP 1883 e WebSocket)', en: 'MQTT broker (TCP 1883 and WebSocket)' },
      { pt: 'Páginas web servidas pela placa simulada', en: 'Web pages served by the simulated board' },
    ],
  },
  {
    key: 'robotics',
    icon: Bot,
    title: { pt: 'Robótica', en: 'Robotics' },
    text: {
      pt: 'Seguidores de linha com pistas, carros 2WD/4WD, braços de 6 eixos e meArm em MDF, cão robô de alumínio, humanoide e drone.',
      en: 'Line followers with tracks, 2WD/4WD cars, 6-axis arms and an MDF meArm, an aluminum robot dog, a humanoid and a drone.',
    },
    details: [
      { pt: 'Pistas: linhas, grelhas de ruas, obstáculos', en: 'Tracks: lines, street grids, obstacles' },
      { pt: 'Cinemática inversa nos exemplos de braços', en: 'Inverse kinematics in the arm examples' },
      { pt: 'Rodas omni, mecanum e lagartas', en: 'Omni wheels, mecanum wheels and tracks' },
    ],
  },
  {
    key: 'home',
    icon: House,
    title: { pt: 'Casa inteligente', en: 'Smart home' },
    text: {
      pt: 'Paredes, portas, janelas, telhado, estores, portão de garagem, lâmpadas e sensores para maquetes de domótica.',
      en: 'Walls, doors, windows, roof, blinds, garage door, lamps and sensors for home-automation models.',
    },
    details: [
      { pt: 'Portas e janelas movidas por servos', en: 'Servo-driven doors and windows' },
      { pt: 'Lâmpadas que iluminam a cena', en: 'Lamps that light up the scene' },
      { pt: 'Sensor magnético de porta, PIR, LDR', en: 'Magnetic door sensor, PIR, LDR' },
    ],
  },
  {
    key: 'boards',
    icon: Cpu,
    title: { pt: 'Várias placas', en: 'Many boards' },
    text: {
      pt: 'Arduino Uno, Nano e Mega, ESP32 DevKit e Wemos D1 R32, Raspberry Pi Pico, Pico W, Pico 2 e Pico 2 W.',
      en: 'Arduino Uno, Nano and Mega, ESP32 DevKit and Wemos D1 R32, Raspberry Pi Pico, Pico W, Pico 2 and Pico 2 W.',
    },
    details: [
      { pt: 'GPIO, ADC e PWM próprios de cada placa', en: 'Board-specific GPIO, ADC and PWM' },
      { pt: 'Pinos a 3,3 V ou 5 V com avisos', en: '3.3 V or 5 V pins, with warnings' },
      { pt: 'Placas de expansão com soquetes', en: 'Expansion boards with sockets' },
    ],
  },
]

export const EXTRAS = [
  { key: 'instruments', icon: Activity, title: { pt: 'Instrumentos', en: 'Instruments' }, text: { pt: 'Osciloscópio, plotter série, fonte de bancada e gerador de sinais.', en: 'Oscilloscope, serial plotter, bench power supply and signal generator.' } },
  { key: 'diagnostics', icon: Gauge, title: { pt: 'Diagnóstico', en: 'Diagnostics' }, text: { pt: 'Explica porque é que o circuito não funciona antes de simular.', en: 'Explains why the circuit won’t work before you simulate.' } },
  { key: 'analog', icon: Cable, title: { pt: 'Eletrónica analógica', en: 'Analog electronics' }, text: { pt: 'Transístores, amp-ops, reguladores, díodos, portas lógicas e flip-flops.', en: 'Transistors, op-amps, regulators, diodes, logic gates and flip-flops.' } },
  { key: 'projects', icon: Save, title: { pt: 'Projetos', en: 'Projects' }, text: { pt: 'Guarde, abra e partilhe projetos; dezenas de exemplos prontos.', en: 'Save, open and share projects; dozens of ready-made examples.' } },
]

export const STEPS = [
  { n: '1', title: { pt: 'Escolha as peças', en: 'Pick the parts' }, text: { pt: 'Abra o catálogo e junte placas, sensores, motores e materiais.', en: 'Open the catalog and gather boards, sensors, motors and materials.' } },
  { n: '2', title: { pt: 'Ligue o circuito', en: 'Wire the circuit' }, text: { pt: 'Desenhe os fios no circuito 2D; o diagnóstico avisa logo dos erros.', en: 'Draw the wires in the 2D circuit; diagnostics flag mistakes right away.' } },
  { n: '3', title: { pt: 'Monte em 3D', en: 'Build it in 3D' }, text: { pt: 'Encaixe as peças no chassi, braço ou casa — à escala real.', en: 'Fit the parts onto the chassis, arm or house — true to scale.' } },
  { n: '4', title: { pt: 'Programe e simule', en: 'Code and simulate' }, text: { pt: 'Escreva o código, carregue em ▶ e veja o robô mexer-se com física real.', en: 'Write the code, press ▶ and watch the robot move with real physics.' } },
]
