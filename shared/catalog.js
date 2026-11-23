// Organização do catálogo "Adicionar componente": famílias (separadores) e, dentro de cada uma,
// grupos de peças parecidas (todas as placas juntas, todos os servos juntos…).
// Só muda a apresentação: def.cat continua a ser usado pela física/escala/material.
// Uma peça nova que não esteja aqui vai para o grupo "Outros" da família do seu def.cat.
import { DEFS } from './components.js'

export const CATALOG_SPEC = [
  {
    key: 'placas',
    label: 'Placas',
    groups: [
      ['Arduino', ['arduino', 'nano', 'nanoKeyestudio', 'mega']],
      ['ESP32', ['esp32', 'esp32Uno']],
      ['Raspberry Pi Pico', ['pico', 'picow', 'pico2', 'pico2w']],
      ['ATtiny, STM32 e outras', ['attiny85', 'franzininho', 'nanorp2040', 'bluepill']],
      ['Placas de expansão e outras', ['nanoShield', 'pico4drive', 'raspberryPi']],
    ],
  },
  {
    key: 'eletronica',
    label: 'Eletrónica',
    groups: [
      ['Breadboards e ligações', ['breadboard', 'breadboardMini', 'breadboardFull', 'junction']],
      ['Resistências, condensadores e bobinas', ['resistor', 'capacitor', 'ceramicCap', 'inductor']],
      ['Díodos', ['diode', 'd1n4148', 'd1n5817', 'd1n5819', 'zener', 'zener3v3', 'zener12']],
      ['Transístores', ['npn', 'bc547', 'bc557', 'pnp2n3906', 'pwr2n3055', 'mosfet', 'fet2n7000', 'irf540', 'irf3205', 'irfz44n', 'irf520n', 'irl540n', 'irlb8721', 'irf9540', 'fqp27p06', 'irf4905']],
      ['Amplificadores operacionais', ['lm358', 'lm324', 'lm741', 'tl072', 'opampIdeal']],
      ['Optoacopladores', ['pc817', 'opto4n25']],
      ['Portas lógicas', ['gateAnd2', 'gateAnd3', 'gateAnd4', 'gateOr2', 'gateOr3', 'gateOr4', 'gateNand2', 'gateNand3', 'gateNand4', 'gateNor2', 'gateNor3', 'gateNor4', 'gateXor2', 'gateXnor2', 'gateNot']],
      ['Flip-flops', ['ffD', 'ffJK', 'ffT']],
      ['Circuitos integrados 74HC e expansores', ['hc00', 'hc02', 'hc04', 'hc08', 'hc14', 'hc32', 'hc86', 'hc595', 'pcf8574']],
      ['Memórias, conversores e registos', ['eeprom24', 'mcp3008', 'cd4094']],
    ],
  },
  {
    key: 'sensores',
    label: 'Sensores',
    groups: [
      ['Distância e obstáculos', ['hcsr04', 'jsnSr04t', 'vl53l0x', 'irObstacle', 'apds9960']],
      ['Seguidores de linha', ['ir', 'lineTracker3', 'lineTracker5']],
      ['Movimento, orientação e posição', ['mpu6050', 'adxl345', 'hmc5883l', 'qmc5883l', 'tilt', 'hall', 'sensorAngulo', 'gpsNeo6m', 'pir']],
      ['Temperatura e humidade', ['dht11', 'dht22', 'lm35', 'ntc', 'ds18b20', 'bmp280']],
      ['Luz e cor', ['ldr', 'photodiode', 'bh1750', 'tcs3200', 'tcs34725', 'flame']],
      ['Som', ['soundSensor', 'bigSoundSensor', 'smallSoundSensor']],
      ['Gás, água e solo', ['mq2', 'soilMoisture', 'soilCapacitive', 'waterLevel', 'rainSensor']],
      ['Corrente, tensão, peso e corpo', ['acs712', 'voltageSensor', 'hx711', 'heartbeat']],
    ],
  },
  {
    key: 'entradas',
    label: 'Entradas e módulos',
    groups: [
      ['Botões e interruptores', ['button', 'pushbutton6mm', 'button12mm', 'buttonModule', 'slideSwitch', 'toggleSwitch', 'rockerSwitch', 'rockerLighted', 'dipSwitch8', 'touchTTP223']],
      ['Potenciómetros, joystick e encoder', ['pot', 'potRotativo', 'slidePot', 'joystick', 'encoder', 'rotaryDialer']],
      ['Teclados', ['keypad4x4', 'keypad3x4']],
      ['Comando IR e comunicação', ['irRemote', 'irReceiver', 'hc05']],
      ['Relógio e memória', ['ds1307', 'ds3231', 'microSD']],
    ],
  },
  {
    key: 'saidas',
    label: 'Luz, som e displays',
    groups: [
      ['LEDs', ['led', 'rgbled', 'bargraph', 'semaforo']],
      ['Fitas e matrizes RGB (NeoPixel)', ['neopixelLed', 'neopixelModule', 'neopixelStrip', 'neopixelRing', 'neopixelMatrix8', 'neopixelMatrix16', 'barraLedRgb']],
      ['Displays LCD e 7 segmentos', ['lcd1602', 'lcd1602p', 'lcd2004', 'lcd2004p', 'sevenseg', 'sevenseg4', 'tm1637', 'max7219']],
      ['Ecrãs OLED e TFT', ['ssd1306', 'ssd1306spi', 'sh1106', 'pcd8544', 'st7735', 'st7789', 'gc9a01', 'ili9341']],
      ['E-paper', ['epaper154', 'epaper213', 'epaper290', 'epaper420', 'epaper565', 'epaper750']],
      ['Som', ['buzzer', 'buzzerPassive']],
      ['Relés', ['relay', 'ks2eRelay', 'relayModule2', 'relayModule4', 'relayModule8']],
    ],
  },
  {
    key: 'motores',
    label: 'Motores e drivers',
    groups: [
      ['Servos', ['servo', 'servoMG90', 'servoMG', 'servoFS90R']],
      ['Motores DC', ['motor', 'motorTT', 'dcMotor', 'motor12v', 'motor130', 'motor775', 'vibrationMotor']],
      ['Motores com encoder', ['motorEnc', 'motorTTEnc', 'n20Enc', 'motorRedondoEnc']],
      ['Motores de passo', ['stepper', 'nema17', 'biaxialStepper']],
      ['Brushless', ['brushless', 'esc']],
      ['Drivers de motor', ['l298n', 'l293d', 'l9110s', 'tb6612', 'a4988', 'drv8825', 'pca9685']],
      ['Solenoides', ['solenoid']],
    ],
  },
  {
    key: 'energia',
    label: 'Energia',
    groups: [
      ['Baterias e pilhas', ['battery', 'battery9v', 'aaPack', 'aaBox4', 'aaCell', 'cr2032', 'lipo3s', 'bateriaLipo2s']],
      ['Reguladores e conversores', ['lm7805', 'lm7812', 'lm7905', 'lm317', 'buck']],
      ['Solar', ['painelSolar']],
      ['Instrumentos de bancada e medida', ['benchPsu', 'sigGen', 'voltimetro', 'amperimetro']],
    ],
  },
  {
    key: 'mecanica',
    label: 'Mecânica',
    groups: [
      ['Chassis e veículos', ['chassis', 'chassis4wd1', 'chassis4wd', 'chassisTri2wd', 'chassisKiwi', 'tankChassis', 'carro']],
      ['Rodas', ['rubberWheel', 'rodaImpressa', 'omniWheel', 'mecanumWheel', 'casterBall', 'rodizio']],
      ['Engrenagens', ['spurGear', 'compoundGear', 'wormGear', 'wormWheel', 'gearRack']],
      ['Transmissão', ['poliaElastico', 'elastico', 'molduraDentada', 'gt2Pulley', 'correiaGt2', 'leadScrew', 'axle', 'shaftCoupler', 'pillowBlock', 'turntable', 'hinge', 'shockAbsorber', 'bercoMotor']],
      ['Hélices e ventoinhas', ['propeller', 'heliceVentoinha', 'heliceMesa']],
      ['Estrutura e fixação', ['beam', 'angleBracket', 'uBracket', 'mechPlate', 'extrusion2020', 'standoff', 'frame']],
      ['Materiais (blocos, placas, tubos)', ['bloco', 'cilindro', 'esfera', 'tubo', 'placa', 'elo', 'loadBlock', 'cube']],
    ],
  },
  {
    key: 'robotica',
    label: 'Robótica',
    groups: [
      ['Braços e garras', ['armBase', 'armLink', 'gripper', 'garraMetal', 'parallelGripper', 'suporteServo', 'uLongo', 'servoBracket', 'panTilt', 'caneta']],
      ['Braço meArm em MDF', ['baseMdf', 'plataformaMdf', 'eloMdf', 'garraMdf']],
      ['Kit MDF / acrílico cortado a laser', ['garraEngrenagemMdf', 'placaBaseMdf', 'molduraServoMdf', 'eloCurvoMdf', 'eloCameMdf', 'eloArgolaMdf']],
      ['Cão robô de alumínio', ['chassisCaoAlu', 'coxaAlu', 'canelaAlu', 'pataCao', 'pescocoCao', 'cabecaCao', 'cameraModule', 'espiralCabo']],
      ['Pato robô bípede (tipo XGO-Duck)', ['corpoPato', 'cabecaPato', 'bicoPato', 'pePato', 'suportePato', 'servoFeetech']],
      ['Humanoide Microban (Rhoban)', ['microbanTronco', 'microbanPeca', 'servoXL330', 'raspberryPiZero2W']],
      ['Quadrúpede, humanoide e drone', ['quadrupedBody', 'spiderChassis', 'robotPaw', 'humanoidTorso', 'robotFoot', 'droneFrame']],
    ],
  },
  {
    key: 'casa',
    label: 'Casa inteligente',
    groups: [
      ['Estrutura', ['laje', 'parede', 'paredePorta', 'paredeJanela', 'telhado']],
      ['Portas, janelas e estores', ['porta', 'janela', 'portaoGaragem', 'estore']],
      ['Iluminação, interruptores e sensores', ['lampadaCasa', 'interruptorParede', 'sensorMagnetico', 'imanPorta', 'campainha']],
      ['Eletrodomésticos', ['arCondicionado', 'ventoinhaTeto', 'ventoinhaPe', 'televisao', 'aquecedor']],
      ['Pessoas e mobiliário', ['pessoa', 'mesa']],
    ],
  },
]

// família de recurso para peças novas (por def.cat)
const FALLBACK = { mcu: 'placas', proto: 'eletronica', discrete: 'eletronica', logic: 'eletronica', sensor: 'sensores', input: 'entradas', output: 'saidas', motion: 'motores', power: 'energia', mech: 'mecanica', build: 'mecanica', robot: 'robotica', casa: 'casa' }

// [{ key, label, groups: [{ label, types }] }] só com tipos que existem
export const CATALOG = (() => {
  const placed = new Set()
  const fams = CATALOG_SPEC.map((f) => ({
    key: f.key,
    label: f.label,
    groups: f.groups.map(([label, types]) => {
      const ok = types.filter((t) => DEFS[t] && !placed.has(t))
      ok.forEach((t) => placed.add(t))
      return { key: label, label, types: ok } // key = rótulo em português (estável para as traduções)
    }),
  }))
  const rest = {}
  // peças antigas que já não estão no catálogo (def.hidden): continuam a abrir nos projetos guardados
  for (const t of Object.keys(DEFS)) if (!placed.has(t) && !DEFS[t].hidden) (rest[FALLBACK[DEFS[t].cat] || 'mecanica'] ||= []).push(t)
  for (const f of fams) if (rest[f.key]) f.groups.push({ key: 'outros', label: 'Outros', types: rest[f.key] })
  for (const f of fams) f.groups = f.groups.filter((g) => g.types.length)
  return fams.filter((f) => f.groups.length)
})()
