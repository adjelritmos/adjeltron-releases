// Grupos dos projetos de exemplo (página Exemplos e menu Projetos), por esta ordem.
// Cada exemplo pertence a um grupo pelo seu id; um exemplo novo que não esteja aqui cai no grupo
// da sua categoria (campo `cat`) através de CAT_GROUP, ou em "Outros".
import { m } from './i18n.js'

export const EXAMPLE_GROUPS = [
  { key: 'basicos', label: 'Primeiros passos', ids: ['botaoLed', 'semaforo', 'rgb', 'interrupcao', 'eepromArranques', 'luzAutomatica', 'megaLeds', 'picoRespirar', 'picoBotao'] },
  { key: 'luzes', label: 'Luzes e displays', ids: ['anelNeopixel', 'matrizFastled', 'matriz', 'contador7seg', 'cronometro', 'lcdParalelo', 'termometroOled', 'relogioRtc', 'tftGrafico', 'rodaCoresSt7789', 'meteoEpaper'] },
  { key: 'jogos', label: 'Jogos', ids: ['pong', 'dinoLcd'] },
  { key: 'sensores', label: 'Sensores e medição', ids: ['termometroLcd', 'estacaoDs18b20', 'alarmePir', 'estacionamento', 'distanciaLaser', 'detetorGas', 'balanca', 'gpsLcd', 'plotterSeno', 'correnteMotor'] },
  { key: 'moveis', label: 'Robôs móveis', ids: ['seguidor', 'obstaculos', 'carro4wd', 'carro4wd1', 'dijkstra', 'rodasGrandes', 'p4dBasico', 'p4dRobo', 'p4dTanque', 'tanqueLagartas', 'robotMecanum', 'robotKiwi', 'robo2wdEncoder'] },
  { key: 'bracos', label: 'Braços robóticos', ids: ['braco6', 'meArm', 'bracoEsp32', 'desenhador'] },
  { key: 'robos', label: 'Robôs com pernas e drones', ids: ['caoRoboAlu', 'patoRobo', 'humanoide', 'drone'] },
  { key: 'otto', label: 'Robô Otto DIY', ids: ['ottoDanca', 'ottoEvita', 'ottoHumanoide', 'ottoAranha', 'ottoNinja'] },
  { key: 'motores', label: 'Motores e controlo', ids: ['servoContinuo', 'passoPot', 'panTilt', 'ventoinha', 'pmosMotor', 'motorL293d', 'pidVelocidade', 'posicaoEncoder', 'rpmMotorTT', 'mostradorCorreiaGt2'] },
  { key: 'mecanismos', label: 'Mecanismos e máquinas', ids: ['atuadorLinear', 'cancela', 'torreEngrenagens', 'defletor', 'plotterXY', 'cncNema17', 'seguidorSolar'] },
  { key: 'casa', label: 'Casa inteligente e segurança', ids: ['casaInteligente', 'salaEletrodomesticos', 'climatizacao', 'salaComandoIr', 'contadorPessoas', 'fechadura', 'placaReles', 'comandoIr', 'bluetoothLed', 'marcadorTelefone', 'corridaPcf8574'] },
  { key: 'iot', label: 'IoT, Wi-Fi e ESP32', ids: ['esp32Pwm', 'esp32Rtos', 'esp32Wifi', 'iotMqttLed', 'iotMqttDht', 'iotHttpJson', 'iotWebLed', 'iotRelogioNtp', 'iotWifiScan', 'pico2wMqtt', 'pico2wWeb'] },
  { key: 'fogu', label: 'Programar em Fogu', ids: ['foguSemaforo', 'foguBotao', 'foguBrilho'] },
  { key: 'velxio', label: 'Placas e chips: ATtiny, STM32, EEPROM, ADC', ids: ['attinyPilha', 'bluePillLed', 'eepromI2c', 'mcp3008Pots', 'cd4094Leds', 'lcd20x4Paralelo', 'medirLed'] },
  { key: 'eletronica', label: 'Eletrónica analógica e lógica', ids: ['meioSomador', 'flipFlopT', 'contador595', 'bc547Pwm', 'comparadorLdr', 'geradorFreq', 'osciloscopio', 'fonte7812'] },
]

// categoria antiga → grupo (exemplos ainda não listados acima)
const CAT_GROUP = {
  Básicos: 'basicos',
  Displays: 'luzes',
  Sensores: 'sensores',
  Robótica: 'moveis',
  Robôs: 'robos',
  Motores: 'motores',
  Mecânica: 'mecanismos',
  'Casa inteligente': 'casa',
  Projetos: 'casa',
  IoT: 'iot',
  ESP32: 'iot',
  Analógico: 'eletronica',
  Lógica: 'eletronica',
  Placas: 'basicos',
  Jogos: 'jogos',
  Energia: 'mecanismos',
  Entradas: 'casa',
}

const BY_ID = new Map(EXAMPLE_GROUPS.flatMap((g, gi) => g.ids.map((id, i) => [id, { g, order: gi * 1000 + i }])))

// grupo e ordem de um exemplo
export function exampleGroup(id, cat) {
  const hit = BY_ID.get(id)
  if (hit) return { label: hit.g.label, order: hit.order }
  const gi = EXAMPLE_GROUPS.findIndex((g) => g.key === CAT_GROUP[cat])
  return gi >= 0 ? { label: EXAMPLE_GROUPS[gi].label, order: gi * 1000 + 900 } : { label: m('Outros', 'Other'), order: 99000 }
}
