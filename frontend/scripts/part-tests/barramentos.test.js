// Ensaios da família "barramentos": módulos I2C/SPI/1 fio, ecrãs e LEDs endereçáveis, comparados
// com o funcionamento real (folhas de dados e bibliotecas Arduino habituais).
import { bench, part, wire, test, near, ok } from '../part-bench.js'

// ---------- utilitários ----------
const UNO = () => part('uno', 'arduino')
// alimentação + I2C no Uno (vcc = nome do pino de alimentação da peça)
const i2cW = (id, vcc = 'VCC', sup = '5V') => [wire(`uno.${sup}`, `${id}.${vcc}`), wire('uno.GND.1', `${id}.GND`), wire('uno.A4', `${id}.SDA`), wire('uno.A5', `${id}.SCL`)]
const SCAN = `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin();
  for (int a = 1; a < 127; a++) { Wire.beginTransmission(a); if (Wire.endTransmission() == 0) { Serial.print("@"); Serial.print(a, HEX); Serial.print(";"); } }
  Serial.println("fim"); }
void loop(){}`
const scan = async (parts, wires) => {
  const b = await bench({ parts: [UNO(), ...parts], wires, code: SCAN })
  b.advance(0.6)
  ok(b.serial.includes('fim'), `o scanner não terminou: "${b.serial}"`)
  return [...b.serial.matchAll(/@([0-9A-F]+);/g)].map((m) => parseInt(m[1], 16))
}
const same = (got, want, msg) => ok(JSON.stringify(got) === JSON.stringify(want), `${msg}: esperado ${JSON.stringify(want)}, obtido ${JSON.stringify(got)}`)
// números de uma linha "chave=1.5,2,3" do monitor série (última ocorrência)
const nums = (b, key) => {
  const m = [...b.serial.matchAll(new RegExp(`\\b${key}=([^\\r\\n]*)`, 'g'))].pop()
  ok(m, `o sketch não imprimiu "${key}=": "${b.serial.slice(0, 200)}" avisos: ${b.warnings.slice(0, 3).join(' | ')}`)
  return m[1].split(',').map(Number)
}
const hasIssue = (b, re, level) => b.diagnose().issues.some((i) => re.test(i.msg) && (!level || i.level === level))

// ============================================================================================
// 1. Endereços I2C e condições para responder
// ============================================================================================
const I2C = [
  // tipo, pino de alimentação, alimentação, endereço por omissão
  ['mpu6050', 'VCC', '5V', 0x68],
  ['adxl345', 'VCC', '5V', 0x53],
  ['hmc5883l', 'VCC', '5V', 0x1e],
  ['qmc5883l', 'VCC', '5V', 0x0d],
  ['bmp280', 'VCC', '5V', 0x76],
  ['bh1750', 'VCC', '5V', 0x23],
  ['vl53l0x', 'VIN', '5V', 0x29],
  ['apds9960', 'VCC', '3V3', 0x39],
  ['tcs34725', 'VIN', '5V', 0x29],
  ['ds1307', '5V', '5V', 0x68],
  ['ds3231', 'VCC', '5V', 0x68],
  ['pca9685', 'VCC', '5V', 0x40],
  ['lcd1602', 'VCC', '5V', 0x27],
  ['lcd2004', 'VCC', '5V', 0x27],
  ['ssd1306', 'VCC', '5V', 0x3c],
  ['sh1106', 'VCC', '5V', 0x3c],
]
for (const [type, vcc, sup, addr] of I2C) {
  test(`${type}: responde em 0x${addr.toString(16)} e só com alimentação e SDA/SCL certos`, async () => {
    const hex = (l) => l.map((a) => '0x' + a.toString(16))
    same(hex(await scan([part('u', type)], i2cW('u', vcc, sup))), hex([addr]), 'endereço por omissão')
    same(await scan([part('u', type)], i2cW('u', vcc, sup).slice(1)), [], 'sem alimentação não responde')
    same(await scan([part('u', type)], [wire(`uno.${sup}`, `u.${vcc}`), wire('uno.GND.1', 'u.GND'), wire('uno.A5', 'u.SDA'), wire('uno.A4', 'u.SCL')]), [], 'SDA/SCL trocados não responde')
    same(await scan([part('u', type)], [wire(`uno.${sup}`, `u.${vcc}`), wire('uno.GND.1', 'u.GND'), wire('uno.D2', 'u.SDA'), wire('uno.D3', 'u.SCL')]), [], 'em D2/D3 não responde')
    same(await scan([part('u', type)], [wire(`uno.${sup}`, `u.${vcc}`), wire('uno.A4', 'u.SDA'), wire('uno.A5', 'u.SCL')]), [], 'sem GND não responde')
  })
}

test('pinos de seleção de endereço: AD0 (MPU6050), SDO (ADXL345, BMP280), ADDR (BH1750)', async () => {
  for (const [type, pin, lo, hi] of [['mpu6050', 'AD0', 0x68, 0x69], ['adxl345', 'SDO', 0x53, 0x1d], ['bmp280', 'SDO', 0x76, 0x77], ['bh1750', 'ADDR', 0x23, 0x5c]]) {
    same(await scan([part('u', type)], [...i2cW('u'), wire('uno.GND.2', `u.${pin}`)]), [lo], `${type}: ${pin} a GND`)
    same(await scan([part('u', type)], [...i2cW('u'), wire('uno.5V', `u.${pin}`)]), [hi], `${type}: ${pin} a VCC`)
  }
})

test('endereços configuráveis por jumper: PCA9685 (A0–A5), LCD PCF8574 (0x27/0x3F), OLED (0x3C/0x3D)', async () => {
  same(await scan([part('u', 'pca9685', { addr: 0x41 })], i2cW('u')), [0x41], 'PCA9685 com A0 soldado')
  same(await scan([part('u', 'lcd1602', { addr: 0x3f })], i2cW('u')), [0x3f], 'LCD com PCF8574A')
  same(await scan([part('u', 'ssd1306', { addr: 0x3d })], i2cW('u')), [0x3d], 'OLED em 0x3D')
  // dois dispositivos diferentes no mesmo barramento aparecem os dois
  same(await scan([part('a', 'bh1750'), part('b', 'ssd1306')], [...i2cW('a'), ...i2cW('b')]), [0x23, 0x3c], 'dois dispositivos')
})

test('3,3 V: APDS-9960 a 5 V estraga-se (módulo sem regulador) e deixa de responder', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'apds9960')], wires: i2cW('u', 'VCC', '5V'), code: SCAN })
  b.advance(0.6)
  ok(!/@39;/.test(b.serial), 'não devia responder a 5 V')
  ok(hasIssue(b, /./, 'error'), 'o diagnóstico devia dar erro com 5 V no VCC')
})

// ============================================================================================
// 2. Sensores I2C: escalas e unidades
// ============================================================================================
const MPU_RAW = (cfgWrites = '') => `#include <Wire.h>
int rd16(byte reg){ Wire.beginTransmission(0x68); Wire.write(reg); Wire.endTransmission(false); Wire.requestFrom(0x68, 2); int h = Wire.read(); int l = Wire.read(); return (int)(h << 8 | l); }
byte rd8(byte reg){ Wire.beginTransmission(0x68); Wire.write(reg); Wire.endTransmission(false); Wire.requestFrom(0x68, 1); return Wire.read(); }
void wr(byte reg, byte v){ Wire.beginTransmission(0x68); Wire.write(reg); Wire.write(v); Wire.endTransmission(); }
void setup(){ Serial.begin(9600); Wire.begin();
  Serial.print("who="); Serial.println(rd8(0x75));
  Serial.print("dorme="); Serial.println(rd16(0x3F));
  wr(0x6B, 0); ${cfgWrites} }
void loop(){ long ax=0, ay=0, az=0, gx=0, gy=0, gz=0, t=0;
  for (int i = 0; i < 16; i++) { ax += rd16(0x3B); ay += rd16(0x3D); az += rd16(0x3F); t += rd16(0x41); gx += rd16(0x43); gy += rd16(0x45); gz += rd16(0x47); }
  Serial.print("a="); Serial.print(ax/16); Serial.print(","); Serial.print(ay/16); Serial.print(","); Serial.println(az/16);
  Serial.print("g="); Serial.print(gx/16); Serial.print(","); Serial.print(gy/16); Serial.print(","); Serial.println(gz/16);
  Serial.print("t="); Serial.println(t/16); delay(50); }`

test('MPU6050: WHO_AM_I, arranca a dormir, ±2 g = 16384 LSB/g, temperatura e giroscópio parado', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'mpu6050')], wires: i2cW('u'), code: MPU_RAW() })
  b.advance(1)
  same(nums(b, 'who'), [0x68], 'WHO_AM_I')
  same(nums(b, 'dorme'), [0], 'a dormir os dados são 0')
  const [ax, ay, az] = nums(b, 'a')
  near(az, 16384, 300, 'Z pousado = +1 g')
  near(ax, 0, 300, 'X pousado')
  near(ay, 0, 300, 'Y pousado')
  const g = nums(b, 'g')
  for (const v of g) near(v, 0, 2.5 * 131, 'giroscópio parado (só o desvio, < 2,5 °/s)')
  // T(°C) = cru/340 + 36,53: uma temperatura ambiente plausível
  const tc = nums(b, 't')[0] / 340 + 36.53
  ok(tc > 15 && tc < 40, `temperatura do chip implausível: ${tc}`)
})

test('MPU6050: ±8 g = 4096 LSB/g e inclinação de 45° reparte a gravidade por Y e Z', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'mpu6050')], wires: i2cW('u'), code: MPU_RAW('wr(0x1C, 0x10);') })
  b.advance(1)
  near(nums(b, 'a')[2], 4096, 100, 'Z com ±8 g')
  b.inputs.u = { x: 1, y: 0.5 } // rolamento de 45°
  b.advance(2)
  const [ax, ay, az] = nums(b, 'a')
  near(Math.abs(ay), 4096 * Math.SQRT1_2, 150, '|Y| a 45°')
  near(az, 4096 * Math.SQRT1_2, 150, 'Z a 45°')
  near(ax, 0, 150, 'X a 45° de rolamento')
})

test('MPU6050 (Adafruit_MPU6050): m/s² e rad/s', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'mpu6050')],
    wires: i2cW('u'),
    code: `#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
Adafruit_MPU6050 mpu;
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(mpu.begin() ? 1 : 0); mpu.setAccelerometerRange(MPU6050_RANGE_4_G); }
void loop(){ sensors_event_t a, g, t; mpu.getEvent(&a, &g, &t);
  Serial.print("a="); Serial.print(a.acceleration.x); Serial.print(","); Serial.print(a.acceleration.y); Serial.print(","); Serial.println(a.acceleration.z);
  Serial.print("g="); Serial.print(g.gyro.x, 4); Serial.print(","); Serial.print(g.gyro.y, 4); Serial.print(","); Serial.println(g.gyro.z, 4); delay(100); }`,
  })
  b.advance(1)
  same(nums(b, 'ok'), [1], 'begin()')
  near(nums(b, 'a')[2], 9.81, 0.25, 'Z = 1 g em m/s²')
  for (const v of nums(b, 'g')) near(v, 0, 0.05, 'giroscópio parado em rad/s')
})

test('ADXL345: DEVID 0xE5, 256 LSB/g (3,9 mg/LSB) e m/s² pela Adafruit_ADXL345_U', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'adxl345')],
    wires: i2cW('u'),
    code: `#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
Adafruit_ADXL345_Unified acc = Adafruit_ADXL345_Unified(12345);
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(acc.begin() ? 1 : 0); Serial.print("id="); Serial.println(acc.getDeviceID()); }
void loop(){ long z = 0; for (int i = 0; i < 20; i++) z += acc.getZ();
  Serial.print("raw="); Serial.println(z / 20);
  sensors_event_t e; acc.getEvent(&e);
  Serial.print("a="); Serial.print(e.acceleration.x); Serial.print(","); Serial.print(e.acceleration.y); Serial.print(","); Serial.println(e.acceleration.z); delay(100); }`,
  })
  b.advance(1)
  same(nums(b, 'ok'), [1], 'begin()')
  same(nums(b, 'id'), [0xe5], 'DEVID')
  near(nums(b, 'raw')[0], 256, 4, '1 g em contagens (256 LSB/g)')
  // a biblioteca multiplica as contagens por 0,004 g: 256 × 0,004 × 9,80665 ≈ 10,04 m/s²
  near(nums(b, 'a')[2], 10.04, 0.25, 'Z em m/s²')
  b.inputs.u = { x: 1, y: 0.5 }
  b.advance(0.5)
  const [x, y, z] = nums(b, 'a')
  near(Math.abs(y), 7.1, 0.3, '|Y| a 45°')
  near(z, 7.1, 0.3, 'Z a 45°')
  near(x, 0, 0.3, 'X')
})

test('ADXL345: registos pela Wire (DEVID, POWER_CTL, DATAZ little-endian)', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'adxl345')],
    wires: i2cW('u'),
    code: `#include <Wire.h>
int rd16(byte reg){ Wire.beginTransmission(0x53); Wire.write(reg); Wire.endTransmission(false); Wire.requestFrom(0x53, 2); int l = Wire.read(); int h = Wire.read(); return (int)(h << 8 | l); }
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x53); Wire.write(0x00); Wire.endTransmission(); Wire.requestFrom(0x53, 1); Serial.print("id="); Serial.println(Wire.read());
  Serial.print("standby="); Serial.println(rd16(0x36));
  Wire.beginTransmission(0x53); Wire.write(0x2D); Wire.write(0x08); Wire.endTransmission(); delay(20); }
void loop(){ long z = 0; for (int i = 0; i < 20; i++) z += rd16(0x36); Serial.print("z="); Serial.println(z / 20); delay(100); }`,
  })
  b.advance(1)
  same(nums(b, 'id'), [0xe5], 'DEVID')
  same(nums(b, 'standby'), [0], 'em standby (POWER_CTL = 0) não mede')
  near(nums(b, 'z')[0], 256, 4, '±2 g, 10 bits: 256 LSB/g')
})

const HMC = `#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>
Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(1);
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(mag.begin() ? 1 : 0); }
void loop(){ sensors_event_t e; mag.getEvent(&e);
  float h = atan2(e.magnetic.y, e.magnetic.x) * 180 / PI; if (h < 0) h += 360;
  Serial.print("m="); Serial.print(e.magnetic.x); Serial.print(","); Serial.print(e.magnetic.y); Serial.print(","); Serial.println(e.magnetic.z);
  Serial.print("h="); Serial.println(h); delay(100); }`
test('HMC5883L: campo em µT (terra ≈ 25–65 µT) e rumo = atan2(Y, X)', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'hmc5883l')], wires: i2cW('u'), code: HMC, inputs: { u: { value: 0 } } })
  b.advance(0.5)
  same(nums(b, 'ok'), [1], 'begin()')
  const [x, y, z] = nums(b, 'm')
  const tot = Math.hypot(x, y, z)
  ok(tot > 25 && tot < 65, `campo total fora do da Terra: ${tot} µT`)
  near(y, 0, 1.5, 'Y com X a norte')
  ok(x > 10, `X devia apontar a norte: ${x}`)
  b.inputs.u = { value: 90 }
  b.advance(0.5)
  near(nums(b, 'h')[0], 90, 3, 'rumo 90°')
  b.inputs.u = { value: 225 }
  b.advance(0.5)
  near(nums(b, 'h')[0], 225, 3, 'rumo 225°')
})

test('HMC5883L pela Wire: identificação "H43" e dados X, Z, Y big-endian (1090 LSB/G)', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'hmc5883l')],
    wires: i2cW('u'),
    inputs: { u: { value: 90 } },
    code: `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x1E); Wire.write(0x0A); Wire.endTransmission(); Wire.requestFrom(0x1E, 3);
  Serial.print("id="); Serial.print(Wire.read()); Serial.print(","); Serial.print(Wire.read()); Serial.print(","); Serial.println(Wire.read());
  Wire.beginTransmission(0x1E); Wire.write(0x02); Wire.write(0x00); Wire.endTransmission(); delay(70); }
void loop(){ Wire.beginTransmission(0x1E); Wire.write(0x03); Wire.endTransmission(); Wire.requestFrom(0x1E, 6);
  int x = Wire.read() << 8; x |= Wire.read(); int z = Wire.read() << 8; z |= Wire.read(); int y = Wire.read() << 8; y |= Wire.read();
  Serial.print("r="); Serial.print(x); Serial.print(","); Serial.print(y); Serial.print(","); Serial.println(z); delay(100); }`,
  })
  b.advance(0.5)
  same(nums(b, 'id'), [72, 52, 51], 'registos de identificação A/B/C')
  const [x, y, z] = nums(b, 'r')
  // inclinação 60°, 0,45 G: horizontal 0,225 G → 245 LSB em Y (rumo 90°), vertical −0,39 G → −425 LSB
  near(x, 0, 15, 'X')
  near(y, 245, 15, 'Y')
  near(z, -425, 20, 'Z')
})

test('QMC5883L (QMC5883LCompass): azimute e contagens; a biblioteca do HMC não o encontra', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'qmc5883l')],
    wires: i2cW('u'),
    inputs: { u: { value: 135 } },
    code: `#include <QMC5883LCompass.h>
QMC5883LCompass c;
void setup(){ Serial.begin(9600); c.init(); }
void loop(){ c.read(); Serial.print("az="); Serial.println(c.getAzimuth());
  Serial.print("r="); Serial.print(c.getX()); Serial.print(","); Serial.print(c.getY()); Serial.print(","); Serial.println(c.getZ()); delay(100); }`,
  })
  b.advance(0.5)
  near(nums(b, 'az')[0], 135, 3, 'azimute')
  const [x, y, z] = nums(b, 'r')
  // ±8 G: 3000 LSB/G; campo total 0,45 G → 1350 LSB
  near(Math.hypot(x, y, z), 1350, 60, 'módulo do campo em contagens')
  const h = await bench({ parts: [UNO(), part('u', 'qmc5883l')], wires: i2cW('u'), code: HMC })
  h.advance(0.5)
  same(nums(h, 'ok'), [0], 'Adafruit_HMC5883 com um QMC5883L')
})

test('QMC5883L pela Wire: dados X, Y, Z little-endian a partir de 0x00, depois de configurado', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'qmc5883l')],
    wires: i2cW('u'),
    inputs: { u: { value: 0 } },
    code: `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x0D); Wire.write(0x0B); Wire.write(0x01); Wire.endTransmission();
  Wire.beginTransmission(0x0D); Wire.write(0x09); Wire.write(0x1D); Wire.endTransmission(); delay(20); }
void loop(){ Wire.beginTransmission(0x0D); Wire.write(0x00); Wire.endTransmission(); Wire.requestFrom(0x0D, 6);
  int x = Wire.read(); x |= Wire.read() << 8; int y = Wire.read(); y |= Wire.read() << 8; int z = Wire.read(); z |= Wire.read() << 8;
  Serial.print("r="); Serial.print(x); Serial.print(","); Serial.print(y); Serial.print(","); Serial.println(z); delay(100); }`,
  })
  b.advance(0.5)
  const [x, y, z] = nums(b, 'r')
  // 0x1D = contínuo, 200 Hz, ±8 G (3000 LSB/G)
  near(x, 675, 30, 'X a norte')
  near(y, 0, 30, 'Y')
  near(z, -1169, 40, 'Z (campo a descer no hemisfério norte)')
})

const BMP = (addr) => `#include <Wire.h>
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp;
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(bmp.begin(${addr}) ? 1 : 0); }
void loop(){ Serial.print("p="); Serial.println(bmp.readPressure()); Serial.print("t="); Serial.println(bmp.readTemperature()); Serial.print("alt="); Serial.println(bmp.readAltitude(1013.25)); delay(100); }`
test('BMP280: Pa, °C e altitude; begin() no endereço errado falha', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'bmp280', { temp: 18.5 })], wires: i2cW('u'), code: BMP('0x76'), inputs: { u: { value: 0 } } })
  b.advance(0.5)
  same(nums(b, 'ok'), [1], 'begin(0x76)')
  near(nums(b, 'p')[0], 101325, 15, 'pressão ao nível do mar (Pa)')
  near(nums(b, 't')[0], 18.5, 0.1, 'temperatura (°C)')
  b.inputs.u = { value: 1000 }
  b.advance(0.3)
  near(nums(b, 'p')[0], 89875, 40, 'pressão a 1000 m (atmosfera padrão)')
  near(nums(b, 'alt')[0], 1000, 5, 'altitude')
  const w = await bench({ parts: [UNO(), part('u', 'bmp280')], wires: i2cW('u'), code: BMP('0x77') })
  w.advance(0.3)
  same(nums(w, 'ok'), [0], 'begin(0x77) com SDO a GND')
  const w2 = await bench({ parts: [UNO(), part('u', 'bmp280')], wires: [...i2cW('u'), wire('uno.5V', 'u.SDO')], code: BMP('0x77') })
  w2.advance(0.3)
  same(nums(w2, 'ok'), [1], 'begin(0x77) com SDO a VCC')
})

test('BH1750: lux pela biblioteca e pela Wire (contagem = lux × 1,2)', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'bh1750')],
    wires: i2cW('u'),
    inputs: { u: { value: 500 } },
    code: `#include <Wire.h>
#include <BH1750.h>
BH1750 m;
void setup(){ Serial.begin(9600); Wire.begin(); Serial.print("ok="); Serial.println(m.begin() ? 1 : 0); delay(200); }
void loop(){ Serial.print("lx="); Serial.println(m.readLightLevel()); delay(200); }`,
  })
  b.advance(1)
  same(nums(b, 'ok'), [1], 'begin()')
  near(nums(b, 'lx')[0], 500, 12, 'lux')
  b.inputs.u = { value: 20000 }
  b.advance(0.5)
  near(nums(b, 'lx')[0], 20000, 450, 'lux alto')
  const r = await bench({
    parts: [UNO(), part('u', 'bh1750')],
    wires: i2cW('u'),
    inputs: { u: { value: 1000 } },
    code: `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin(); Wire.beginTransmission(0x23); Wire.write(0x10); Wire.endTransmission(); delay(200); }
void loop(){ Wire.requestFrom(0x23, 2); unsigned int v = Wire.read() << 8; v |= Wire.read(); Serial.print("raw="); Serial.println(v); delay(200); }`,
  })
  r.advance(1)
  near(nums(r, 'raw')[0], 1200, 30, 'contagem crua a 1000 lx')
})

test('VL53L0X: mm, fora de alcance (> 2 m) dá 8190/RangeStatus 4, XSHUT a GND desliga', async () => {
  const pololu = `#include <Wire.h>
#include <VL53L0X.h>
VL53L0X s;
void setup(){ Serial.begin(9600); Wire.begin(); s.setTimeout(500); Serial.print("ok="); Serial.println(s.init() ? 1 : 0); }
void loop(){ Serial.print("mm="); Serial.println(s.readRangeSingleMillimeters()); delay(50); }`
  const b = await bench({ parts: [UNO(), part('u', 'vl53l0x')], wires: i2cW('u', 'VIN'), code: pololu, inputs: { u: { value: 450 } } })
  b.advance(0.5)
  same(nums(b, 'ok'), [1], 'init()')
  near(nums(b, 'mm')[0], 450, 25, 'distância (mm)')
  b.inputs.u = { value: 2400 }
  b.advance(0.5)
  ok(nums(b, 'mm')[0] >= 8190, `fora de alcance devia dar 8190/8191: ${nums(b, 'mm')[0]}`)
  const a = await bench({
    parts: [UNO(), part('u', 'vl53l0x')],
    wires: i2cW('u', 'VIN'),
    inputs: { u: { value: 2400 } },
    code: `#include <Adafruit_VL53L0X.h>
Adafruit_VL53L0X lox = Adafruit_VL53L0X();
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(lox.begin() ? 1 : 0); }
void loop(){ VL53L0X_RangingMeasurementData_t m; lox.rangingTest(&m, false); Serial.print("st="); Serial.println(m.RangeStatus); Serial.print("mm="); Serial.println(m.RangeMilliMeter); delay(50); }`,
  })
  a.advance(0.5)
  same(nums(a, 'st'), [4], 'RangeStatus fora de alcance')
  a.inputs.u = { value: 120 }
  a.advance(0.5)
  same(nums(a, 'st'), [0], 'RangeStatus válido')
  near(nums(a, 'mm')[0], 120, 10, 'distância Adafruit (mm)')
  const off = await bench({ parts: [UNO(), part('u', 'vl53l0x')], wires: [...i2cW('u', 'VIN'), wire('uno.GND.2', 'u.XSHUT')], code: pololu })
  off.advance(0.5)
  same(nums(off, 'ok'), [0], 'init() com XSHUT a GND')
})

test('APDS-9960: proximidade 0–255, cor e gestos (a 3,3 V)', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'apds9960')],
    wires: i2cW('u', 'VCC', '3V3'),
    inputs: { u: { prox: 180, gesture: 0, r: 200, g: 40, b: 40 } },
    code: `#include <Adafruit_APDS9960.h>
Adafruit_APDS9960 apds;
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(apds.begin() ? 1 : 0); apds.enableProximity(true); apds.enableGesture(true); apds.enableColor(true); }
void loop(){ Serial.print("prox="); Serial.println(apds.readProximity());
  uint8_t g = apds.readGesture(); if (g) { Serial.print("gesto="); Serial.println(g); }
  uint16_t r, gr, bl, c; if (apds.colorDataReady()) { apds.getColorData(&r, &gr, &bl, &c); Serial.print("cor="); Serial.print(r); Serial.print(","); Serial.print(gr); Serial.print(","); Serial.print(bl); Serial.print(","); Serial.println(c); }
  delay(50); }`,
  })
  b.advance(0.5)
  same(nums(b, 'ok'), [1], 'begin()')
  near(nums(b, 'prox')[0], 180, 6, 'proximidade')
  const [r, g, bl, c] = nums(b, 'cor')
  ok(r > g * 2 && r > bl * 2, `objeto vermelho: R devia dominar (${r}, ${g}, ${bl})`)
  ok(c >= r, `C (luz total) ≥ R: ${c} vs ${r}`)
  ok(!/gesto=/.test(b.serial), 'sem gesto não devia devolver nenhum')
  b.inputs.u = { prox: 180, gesture: 3, r: 200, g: 40, b: 40 }
  b.advance(0.3)
  same(nums(b, 'gesto'), [3], 'APDS9960_LEFT = 3')
})

test('TCS34725: o LED branco da placa ilumina o objeto — com LED a GND as contagens caem', async () => {
  const code = `#include <Wire.h>
#include <Adafruit_TCS34725.h>
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
void setup(){ Serial.begin(9600); tcs.begin(); }
void loop(){ uint16_t r, g, b, c; tcs.getRawData(&r, &g, &b, &c); Serial.print("c="); Serial.println(c); delay(50); }`
  const on = await bench({ parts: [UNO(), part('u', 'tcs34725')], wires: i2cW('u', 'VIN'), code })
  on.advance(0.5)
  ok(on.live.u.led === true, 'LED aceso com o pino LED solto')
  const off = await bench({ parts: [UNO(), part('u', 'tcs34725')], wires: [...i2cW('u', 'VIN'), wire('uno.GND.2', 'u.LED')], code })
  off.advance(0.5)
  ok(off.live.u.led === false, 'LED apagado com o pino LED a GND')
  ok(nums(off, 'c')[0] < nums(on, 'c')[0] * 0.5, `sem iluminação as contagens caem (${nums(off, 'c')[0]} vs ${nums(on, 'c')[0]})`)
})

test('TCS34725: getRGB normalizado pela luz total, contagens crescem com o ganho, ID 0x44', async () => {
  const code = (gain) => `#include <Wire.h>
#include <Adafruit_TCS34725.h>
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, ${gain});
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(tcs.begin() ? 1 : 0); }
void loop(){ uint16_t r, g, b, c; tcs.getRawData(&r, &g, &b, &c); Serial.print("raw="); Serial.print(r); Serial.print(","); Serial.print(g); Serial.print(","); Serial.print(b); Serial.print(","); Serial.println(c);
  float fr, fg, fb; tcs.getRGB(&fr, &fg, &fb); Serial.print("rgb="); Serial.print(fr); Serial.print(","); Serial.print(fg); Serial.print(","); Serial.println(fb); delay(50); }`
  const mk = async (gain) => {
    const b = await bench({ parts: [UNO(), part('u', 'tcs34725')], wires: i2cW('u', 'VIN'), code: code(gain), inputs: { u: { r: 30, g: 200, b: 60 } } })
    b.advance(0.6)
    same(nums(b, 'ok'), [1], 'begin()')
    return b
  }
  const b1 = await mk('TCS34725_GAIN_1X')
  const b4 = await mk('TCS34725_GAIN_4X')
  const r1 = nums(b1, 'raw')
  const r4 = nums(b4, 'raw')
  ok(r1[1] > r1[0] * 2 && r1[1] > r1[2] * 2, `objeto verde: G devia dominar (${r1})`)
  near(r4[1] / r1[1], 4, 0.3, 'ganho 4× quadruplica as contagens')
  ok(r1[3] <= 21504, `50 ms de integração: máximo 21 × 1024 contagens (${r1[3]})`)
  const [fr, fg, fb] = nums(b1, 'rgb')
  near(fr + fg + fb, 255, 20, 'getRGB: r + g + b ≈ 255 (normalizado por C)')
  ok(fg > fr && fg > fb, 'verde dominante em getRGB')
})

// ============================================================================================
// 3. RTC, EEPROM, ADC, balança, cartão, GPS, Bluetooth, PCA9685
// ============================================================================================
const RTC = (cls) => `#include <Wire.h>
#include <RTClib.h>
${cls} rtc;
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(rtc.begin() ? 1 : 0); rtc.adjust(DateTime(2024, 2, 28, 23, 59, 50)); }
void loop(){ DateTime n = rtc.now(); Serial.print("d="); Serial.print(n.year()); Serial.print(","); Serial.print(n.month()); Serial.print(","); Serial.print(n.day()); Serial.print(","); Serial.print(n.hour()); Serial.print(","); Serial.print(n.minute()); Serial.print(","); Serial.println(n.second()); delay(250); }`
for (const [type, cls, vcc] of [['ds1307', 'RTC_DS1307', '5V'], ['ds3231', 'RTC_DS3231', 'VCC']]) {
  test(`${type}: acerta-se, anda ao segundo e passa o dia (ano bissexto) — RTClib`, async () => {
    const b = await bench({ parts: [UNO(), part('u', type)], wires: i2cW('u', vcc), code: RTC(cls) })
    b.advance(0.6)
    same(nums(b, 'ok'), [1], 'begin()')
    same(nums(b, 'd').slice(0, 5), [2024, 2, 28, 23, 59], 'data acertada')
    b.advance(12)
    const d = nums(b, 'd')
    same(d.slice(0, 5), [2024, 2, 29, 0, 0], '12 s depois: 29 de fevereiro de 2024')
    near(d[5], 2, 1.1, 'segundos')
  })
}

test('DS1307/DS3231: registos BCD pela Wire; só o DS3231 tem temperatura (0x11); DS1307 tem RAM (0x08–0x3F)', async () => {
  const code = `#include <Wire.h>
byte rd(byte reg){ Wire.beginTransmission(0x68); Wire.write(reg); Wire.endTransmission(); Wire.requestFrom(0x68, 1); return Wire.read(); }
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x68); Wire.write(0); Wire.write(0x45); Wire.write(0x59); Wire.write(0x23); Wire.write(0x05); Wire.write(0x31); Wire.write(0x12); Wire.write(0x25); Wire.endTransmission();
  Wire.beginTransmission(0x68); Wire.write(0x20); Wire.write(0xA7); Wire.endTransmission();
  Serial.print("bcd="); Serial.print(rd(0)); Serial.print(","); Serial.print(rd(1)); Serial.print(","); Serial.print(rd(2)); Serial.print(","); Serial.print(rd(4)); Serial.print(","); Serial.print(rd(5)); Serial.print(","); Serial.println(rd(6));
  Serial.print("t11="); Serial.println(rd(0x11)); Serial.print("ram="); Serial.println(rd(0x20)); }
void loop(){}`
  const a = await bench({ parts: [UNO(), part('u', 'ds3231', { temp: 31.25 })], wires: i2cW('u'), code })
  a.advance(0.3)
  same(nums(a, 'bcd'), [0x45, 0x59, 0x23, 0x31, 0x12, 0x25], 'DS3231: BCD 23:59:45 31/12/25')
  same(nums(a, 't11'), [31], 'DS3231: parte inteira da temperatura')
  const d = await bench({ parts: [UNO(), part('u', 'ds1307')], wires: i2cW('u', '5V'), code })
  d.advance(0.3)
  same(nums(d, 'bcd'), [0x45, 0x59, 0x23, 0x31, 0x12, 0x25], 'DS1307: BCD')
  same(nums(d, 'ram'), [0xa7], 'DS1307: RAM não volátil em 0x20')
  same(nums(d, 't11'), [0], 'DS1307: 0x11 é RAM (a zero), não há sensor de temperatura')
})

test('DS3231: getTemperature() em passos de 0,25 °C; DS1307 a 3,3 V não funciona; DS3231 a 3,3 V sim', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'ds3231', { temp: 27.6 })],
    wires: i2cW('u', 'VCC', '3V3'),
    code: `#include <RTClib.h>
RTC_DS3231 rtc;
void setup(){ Serial.begin(9600); Serial.print("ok="); Serial.println(rtc.begin() ? 1 : 0); Serial.print("temp="); Serial.println(rtc.getTemperature()); }
void loop(){}`,
  })
  b.advance(0.3)
  same(nums(b, 'ok'), [1], 'DS3231 a 3,3 V')
  same(nums(b, 'temp'), [27.5], 'temperatura arredondada a 0,25 °C')
  same(await scan([part('u', 'ds1307')], i2cW('u', '5V', '3V3')), [], 'DS1307 a 3,3 V (VCC mín. 4,5 V)')
})

test('24LC256: guarda bytes, página de 64 dá a volta, A0–A2 mudam o endereço, WP protege', async () => {
  const code = (addr) => `#include <Wire.h>
void wr(unsigned int a, byte v){ Wire.beginTransmission(${addr}); Wire.write(a >> 8); Wire.write(a & 255); Wire.write(v); Wire.endTransmission(); delay(6); }
byte rd(unsigned int a){ Wire.beginTransmission(${addr}); Wire.write(a >> 8); Wire.write(a & 255); Wire.endTransmission(); Wire.requestFrom(${addr}, 1); return Wire.read(); }
void setup(){ Serial.begin(9600); Wire.begin();
  wr(0x1234, 0x5A); wr(0x7FFF, 0xC3); wr(0, 0); wr(64, 0);
  Wire.beginTransmission(${addr}); Wire.write(0); Wire.write(62); Wire.write(1); Wire.write(2); Wire.write(3); Wire.write(4); Wire.endTransmission(); delay(6);
  Serial.print("v="); Serial.print(rd(0x1234)); Serial.print(","); Serial.print(rd(0x7FFF)); Serial.print(","); Serial.print(rd(62)); Serial.print(","); Serial.print(rd(63)); Serial.print(","); Serial.print(rd(0)); Serial.print(","); Serial.print(rd(1)); Serial.print(","); Serial.println(rd(64));
  Wire.beginTransmission(${addr}); Wire.write(0x12); Wire.write(0x34); Wire.endTransmission(); Wire.requestFrom(${addr}, 1); Wire.read();
  Wire.requestFrom(${addr}, 1); Serial.print("seq="); Serial.println(Wire.read()); }
void loop(){}`
  const base = [wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.A4', 'u.SDA'), wire('uno.A5', 'u.SCL'), wire('uno.GND.2', 'u.WP')]
  const b = await bench({ parts: [UNO(), part('u', 'eeprom24')], wires: [...base, wire('uno.GND.3', 'u.A0'), wire('uno.GND.3', 'u.A1'), wire('uno.GND.3', 'u.A2')], code: code('0x50') })
  b.advance(0.5)
  // 4 bytes escritos a partir de 62: 62, 63 e depois dá a volta ao início da página (0 e 1); 64 fica intacto
  same(nums(b, 'v'), [0x5a, 0xc3, 1, 2, 3, 4, 0], 'leitura depois de escrever')
  same(await scan([part('u', 'eeprom24')], [...base, wire('uno.5V', 'u.A0'), wire('uno.5V', 'u.A2')]), [0x55], 'A0 e A2 a 5 V = 0x55')
  const wp = await bench({
    parts: [UNO(), part('u', 'eeprom24')],
    wires: [...base.slice(0, 4), wire('uno.5V', 'u.WP')],
    code: `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x50); Wire.write(1); Wire.write(0); Wire.write(0x77); Wire.endTransmission(); delay(6);
  Wire.beginTransmission(0x50); Wire.write(1); Wire.write(0); Wire.endTransmission(); Wire.requestFrom(0x50, 1); Serial.print("v="); Serial.println(Wire.read()); }
void loop(){}`,
  })
  wp.advance(0.3)
  ok(nums(wp, 'v')[0] !== 0x77, 'com WP a HIGH a escrita devia ser ignorada')
})

const MCP = `#include <SPI.h>
int rd(byte ch){ digitalWrite(10, LOW); SPI.transfer(0x01); byte h = SPI.transfer(0x80 | (ch << 4)); byte l = SPI.transfer(0); digitalWrite(10, HIGH); return ((h & 3) << 8) | l; }
void setup(){ Serial.begin(9600); pinMode(10, OUTPUT); digitalWrite(10, HIGH); SPI.begin(); }
void loop(){ Serial.print("ch="); Serial.print(rd(0)); Serial.print(","); Serial.print(rd(1)); Serial.print(","); Serial.println(rd(2)); delay(100); }`
const mcpW = (vref = '5V', cs = 'D10') => [wire('uno.5V', 'u.VDD'), wire(`uno.${vref}`, 'u.VREF'), wire('uno.GND.1', 'u.AGND'), wire('uno.GND.1', 'u.DGND'), wire('uno.D13', 'u.CLK'), wire('uno.D12', 'u.DOUT'), wire('uno.D11', 'u.DIN'), wire(`uno.${cs}`, 'u.CS'), wire('uno.3V3', 'u.CH0'), wire('uno.GND.2', 'u.CH1'), wire('uno.5V', 'u.CH2')]
test('MCP3008: 10 bits sobre VREF (3,3 V/5 V → 675; com VREF = 3,3 V → 1023) e CS errado não responde', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'mcp3008')], wires: mcpW(), code: MCP })
  b.advance(0.4)
  const [c0, c1, c2] = nums(b, 'ch')
  near(c0, 675, 8, 'CH0 = 3,3 V com VREF 5 V')
  near(c1, 0, 1, 'CH1 = GND')
  near(c2, 1023, 1, 'CH2 = VREF')
  const r = await bench({ parts: [UNO(), part('u', 'mcp3008')], wires: mcpW('3V3'), code: MCP })
  r.advance(0.4)
  near(nums(r, 'ch')[0], 1023, 3, 'CH0 = VREF = 3,3 V')
  // CS preso a 5 V (nunca selecionado): DOUT fica em alta impedância e lê-se tudo a 1 → 1023
  const w = await bench({ parts: [UNO(), part('u', 'mcp3008')], wires: mcpW('5V', '5V'), code: MCP })
  w.advance(0.4)
  same(nums(w, 'ch'), [1023, 1023, 1023], 'com CS a HIGH não converte')
  const m = await bench({ parts: [UNO(), part('u', 'mcp3008')], wires: mcpW().filter((x) => x.b.pin !== 'DOUT'), code: MCP })
  m.advance(0.4)
  ok(nums(m, 'ch')[0] !== c0, 'sem o fio DOUT (MISO) não se lê nada')
})

const HX = (gain, dt = 3, sck = 2) => `#include <HX711.h>
HX711 scale;
void setup(){ Serial.begin(9600); scale.begin(${dt}, ${sck}${gain ? ', ' + gain : ''}); delay(500); long z = scale.read_average(10); Serial.print("zero="); Serial.println(z); scale.set_offset(z); scale.set_scale(420.0); }
void loop(){ Serial.print("raw="); Serial.println(scale.get_value(10)); Serial.print("g="); Serial.println(scale.get_units(5)); }`
const hxW = [wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D3', 'u.DT'), wire('uno.D2', 'u.SCK')]
test('HX711: ~420 contagens/g com ganho 128, metade com ganho 64, 10 leituras/s', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'hx711')], wires: hxW, code: HX(), inputs: { u: { value: 0 } } })
  b.advance(3)
  b.inputs.u = { value: 1000 }
  b.advance(4)
  near(nums(b, 'g')[0], 1000, 3, 'gramas com o fator 420')
  near(nums(b, 'raw')[0], 420000, 1500, 'contagens por kg')
  // 10 amostras/s: get_value(10) + get_units(5) = 15 leituras = 1,5 s por volta do loop
  const loops = (b.serial.match(/g=/g) || []).length
  ok(loops >= 3 && loops <= 5, `ritmo de 10 SPS: ${loops} voltas em ~6,5 s`)
  const h = await bench({ parts: [UNO(), part('u', 'hx711')], wires: hxW, code: HX(64), inputs: { u: { value: 0 } } })
  h.advance(3)
  h.inputs.u = { value: 1000 }
  h.advance(4)
  near(nums(h, 'raw')[0], 210000, 1500, 'ganho 64 = metade das contagens')
})

test('HX711: sem alimentação ou com DT/SCK trocados não mede', async () => {
  const off = await bench({ parts: [UNO(), part('u', 'hx711')], wires: hxW.slice(1), code: HX(), inputs: { u: { value: 2000 } } })
  off.advance(5)
  near(nums(off, 'raw')[0], 0, 1, 'sem alimentação')
  const sw = await bench({ parts: [UNO(), part('u', 'hx711')], wires: hxW, code: HX(0, 2, 3), inputs: { u: { value: 2000 } } })
  sw.advance(5)
  near(nums(sw, 'raw')[0], 0, 1, 'DT/SCK trocados no begin()')
})

const SDC = (cs) => `#include <SPI.h>
#include <SD.h>
void setup(){ Serial.begin(9600); bool okc = SD.begin(${cs}); Serial.print("ok="); Serial.println(okc ? 1 : 0);
  File f = SD.open("dados.txt", FILE_WRITE); if (f) { f.println("temp;23"); f.print("hum;"); f.println(55); f.close(); }
  Serial.print("existe="); Serial.println(SD.exists("dados.txt") ? 1 : 0);
  f = SD.open("dados.txt"); Serial.print("tam="); Serial.println(f ? (int)f.size() : -1);
  Serial.print("txt="); while (f && f.available()) { char c = f.read(); if (c == '\\r' || c == '\\n') Serial.print('|'); else Serial.print(c); } Serial.println(); if (f) f.close();
  SD.remove("dados.txt"); Serial.print("depois="); Serial.println(SD.exists("dados.txt") ? 1 : 0); }
void loop(){}`
const sdW = (cs = 'D10') => [wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D11', 'u.MOSI'), wire('uno.D12', 'u.MISO'), wire('uno.D13', 'u.SCK'), wire(`uno.${cs}`, 'u.CS')]
test('microSD: escreve, lê (CRLF do println), apaga; CS errado, MISO/MOSI trocados ou sem 5 V falham', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'microSD')], wires: sdW(), code: SDC(10) })
  b.advance(1)
  same(nums(b, 'ok'), [1], 'SD.begin(10)')
  same(nums(b, 'existe'), [1], 'ficheiro criado')
  same(nums(b, 'tam'), [17], 'tamanho: "temp;23\\r\\n" + "hum;55\\r\\n"')
  ok(/txt=temp;23\|\|hum;55\|\|/.test(b.serial), `conteúdo lido: ${b.serial}`)
  same(nums(b, 'depois'), [0], 'remove()')
  for (const [nome, wires, cs] of [
    ['CS noutro pino', sdW('D9'), 10],
    ['sem alimentação', sdW().slice(1), 10],
    ['a 3,3 V (módulo com regulador precisa de 5 V)', [wire('uno.3V3', 'u.VCC'), ...sdW().slice(1)], 10],
    ['MOSI/MISO trocados', [wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D12', 'u.MOSI'), wire('uno.D11', 'u.MISO'), wire('uno.D13', 'u.SCK'), wire('uno.D10', 'u.CS')], 10],
    ['sem SCK', sdW().filter((x) => x.b.pin !== 'SCK'), 10],
  ]) {
    const w = await bench({ parts: [UNO(), part('u', 'microSD')], wires, code: SDC(cs) })
    w.advance(1)
    same(nums(w, 'ok'), [0], `SD.begin() ${nome}`)
    same(nums(w, 'existe'), [0], `ficheiro ${nome}`)
  }
})

test('GPS NEO-6M: NMEA a 9600 baud, 1 Hz, descodificado pela TinyGPS++ (lat, lon, satélites, km/h)', async () => {
  const code = `#include <SoftwareSerial.h>
#include <TinyGPS++.h>
SoftwareSerial ss(4, 3);
TinyGPSPlus gps;
unsigned long n = 0;
void setup(){ Serial.begin(9600); ss.begin(9600); }
void loop(){ while (ss.available()) { char c = ss.read(); if (c == '$') n++; gps.encode(c); }
  if (gps.location.isUpdated()) { Serial.print("pos="); Serial.print(gps.location.lat(), 5); Serial.print(","); Serial.print(gps.location.lng(), 5); Serial.print(","); Serial.print(gps.satellites.value()); Serial.print(","); Serial.println(gps.speed.kmph()); Serial.print("frases="); Serial.println(n); } }`
  const mk = (wires, inputs) => bench({ parts: [UNO(), part('u', 'gpsNeo6m', { fixTime: 1 })], wires, code, inputs })
  const b = await mk([wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D4', 'u.TX'), wire('uno.D3', 'u.RX')], { u: { lat: 41.7969, lon: -6.7683, speed: 0, course: 90, sats: 9, alt: 690 } })
  b.advance(5)
  const [lat, lon, sats, kmh] = nums(b, 'pos')
  near(lat, 41.7969, 0.00002, 'latitude')
  near(lon, -6.7683, 0.00002, 'longitude (oeste negativa)')
  same([sats], [9], 'satélites')
  near(kmh, 0, 0.1, 'parado')
  // 6 a 8 frases por segundo ($GPRMC, VTG, GGA, GSA, GSV×n, GLL), uma rajada por segundo
  const n = nums(b, 'frases')[0]
  ok(n >= 12 && n <= 45, `frases NMEA em ~4 s com posição: ${n}`)
  b.inputs.u = { lat: 41.7969, lon: -6.7683, speed: 36, course: 90, sats: 9, alt: 690 }
  b.advance(3)
  near(nums(b, 'pos')[3], 36, 0.5, 'velocidade km/h (nós × 1,852)')
  const w = await mk([wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D3', 'u.TX'), wire('uno.D4', 'u.RX')], {})
  w.advance(5)
  ok(!/pos=/.test(w.serial), 'com TX/RX trocados não chega nada')
})

test('HC-05: o texto do telemóvel sai pelo TXD a 9600 baud e o que o Arduino envia chega ao telemóvel', async () => {
  const code = `#include <SoftwareSerial.h>
SoftwareSerial bt(10, 11);
void setup(){ Serial.begin(9600); bt.begin(9600); }
void loop(){ if (bt.available()) { String s = bt.readStringUntil('\\n'); Serial.print("msg:"); Serial.println(s); bt.print("OK "); bt.print(s); } }`
  const wires = [wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.D10', 'u.TXD'), wire('uno.D11', 'u.RXD')]
  const b = await bench({ parts: [UNO(), part('u', 'hc05')], wires, code })
  b.advance(0.5)
  b.inputs.u = { text: 'LIGAR', seq: 1 }
  b.advance(1.5)
  ok(/msg:LIGAR/.test(b.serial), `o Arduino devia receber "LIGAR": ${b.serial}`)
  ok(String(b.live.u.rx).includes('OK LIGAR'), `o telemóvel devia receber "OK LIGAR": ${b.live.u.rx}`)
  ok(b.live.u.paired === true, 'STATE/emparelhado depois de o telemóvel ligar')
  near(b.v('u.STATE', 'uno.GND.1'), 3.3, 0.4, 'STATE a HIGH (3,3 V) com o telemóvel ligado')
  const off = await bench({ parts: [UNO(), part('u', 'hc05')], wires: wires.slice(1), code })
  off.advance(0.5)
  off.inputs.u = { text: 'LIGAR', seq: 1 }
  off.advance(1.5)
  ok(!/msg:LIGAR/.test(off.serial), 'sem alimentação não transmite')
})

const PCA = (addr, extra = '') => `#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(${addr});
void setup(){ pwm.begin(); pwm.setPWMFreq(50); pwm.setPWM(0, 0, 410); pwm.writeMicroseconds(3, 1500); ${extra} }
void loop(){}`
const pcaW = [...[wire('uno.5V', 'u.VCC'), wire('uno.GND.1', 'u.GND'), wire('uno.A4', 'u.SDA'), wire('uno.A5', 'u.SCL')], wire('uno.5V', 'u.V+'), wire('u.PWM0', 'sv.SIG'), wire('u.V+0', 'sv.VCC'), wire('u.GND0', 'sv.GND')]
test('PCA9685: 50 Hz, 12 bits (410/4096 × 20 ms ≈ 2000 µs → servo a ~141°), endereço e OE', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'pca9685'), part('sv', 'servo')], wires: pcaW, code: PCA('0x40') })
  b.advance(1.5)
  near(b.live.u.freq, 50, 1.5, 'frequência')
  near(b.live.u.us[0], 2002, 12, 'canal 0: 410 passos × 4,88 µs = 2,0 ms')
  near(b.live.u.us[3], 1500, 12, 'canal 3: writeMicroseconds(1500)')
  near(b.servo('sv'), 141, 4, 'servo: (2002 − 544) / 1856 × 180°')
  const w = await bench({ parts: [UNO(), part('u', 'pca9685'), part('sv', 'servo')], wires: pcaW, code: PCA('0x41') })
  w.advance(1.5)
  ok(!(w.live.u.us?.[0] > 100), `endereço errado (0x41): não devia haver impulsos (${w.live.u.us?.[0]})`)
  const oe = await bench({ parts: [UNO(), part('u', 'pca9685'), part('sv', 'servo')], wires: [...pcaW, wire('uno.3V3', 'u.OE')], code: PCA('0x40') })
  oe.advance(1.5)
  near(oe.v('u.PWM0', 'uno.GND.1'), 0, 0.3, 'OE a HIGH desliga as saídas')
  ok(Math.abs(oe.servo('sv') - 141) > 20, `com OE a HIGH o servo não recebe impulsos (ângulo ${oe.servo('sv')})`)
})

test('PCA9685: arranca a dormir e a ~200 Hz; sem setPWMFreq(50) o impulso sai 4× mais curto', async () => {
  const b = await bench({
    parts: [UNO(), part('u', 'pca9685')],
    wires: pcaW.slice(0, 5),
    code: `#include <Wire.h>
void setup(){ Serial.begin(9600); Wire.begin();
  Wire.beginTransmission(0x40); Wire.write(0x00); Wire.endTransmission(); Wire.requestFrom(0x40, 1); Serial.print("mode1="); Serial.println(Wire.read());
  Wire.beginTransmission(0x40); Wire.write(0xFE); Wire.endTransmission(); Wire.requestFrom(0x40, 1); Serial.print("pre="); Serial.println(Wire.read()); }
void loop(){}`,
  })
  b.advance(0.3)
  same(nums(b, 'mode1'), [0x11], 'MODE1 ao ligar: SLEEP + ALLCALL')
  same(nums(b, 'pre'), [0x1e], 'PRE_SCALE ao ligar (200 Hz)')
})

// ============================================================================================
// 4. LCD de caracteres (HD44780): I2C (PCF8574) e paralelo
// ============================================================================================
const LCDI = (cols, rows, body, addr = '0x27') => `#include <Wire.h>
#include <LiquidCrystal_I2C.h>
LiquidCrystal_I2C lcd(${addr}, ${cols}, ${rows});
void setup(){ lcd.init(); ${body} }
void loop(){}`
test('LCD 16×2 I2C: geometria 16×2, setCursor(coluna, linha), números e retroiluminação só com backlight()', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(16, 2, 'lcd.print("Ola mundo"); lcd.setCursor(3, 1); lcd.print(3.14159); lcd.print(" "); lcd.print(42);') })
  b.advance(0.5)
  same(b.live.u.lines, ['Ola mundo       ', '   3.14 42      '], 'texto')
  ok(b.live.u.backlight === false, 'sem lcd.backlight() a luz fica apagada (como na biblioteca real)')
  const c = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(16, 2, 'lcd.backlight(); lcd.print("A"); lcd.clear(); lcd.print("B");') })
  c.advance(0.5)
  ok(c.live.u.backlight === true, 'backlight()')
  same(c.live.u.lines, ['B               ', '                '], 'clear() volta ao início')
})

test('LCD 16×2 I2C: só se veem 16 colunas; a DDRAM tem 40 por linha e a linha 1 continua na linha 2', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(16, 2, 'lcd.print("0123456789ABCDEFGHIJ");') })
  b.advance(0.5)
  same(b.live.u.lines, ['0123456789ABCDEF', '                '], '20 caracteres: os 4 a mais ficam fora do ecrã')
  // 42 caracteres: 40 enchem a linha 1 da DDRAM e os 2 seguintes aparecem no início da linha 2
  const w = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(16, 2, 'for (int i = 0; i < 40; i++) lcd.print("-"); lcd.print("XY");') })
  w.advance(0.5)
  same(w.live.u.lines, ['----------------', 'XY              '], 'passagem para a 2.ª linha depois de 40 caracteres')
  // biblioteca configurada para 20×4 num ecrã 16×2: as "linhas 3 e 4" são a continuação (invisível) das linhas 1 e 2
  const g = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(20, 4, 'lcd.print("um"); lcd.setCursor(0, 2); lcd.print("tres");') })
  g.advance(0.5)
  same(g.live.u.lines, ['um              ', '                '], 'um 16×2 tem sempre 2 linhas de 16')
  // scrollDisplayLeft: o texto escondido entra no ecrã
  const s = await bench({ parts: [UNO(), part('u', 'lcd1602')], wires: i2cW('u'), code: LCDI(16, 2, 'lcd.print("0123456789ABCDEFGHIJ"); lcd.scrollDisplayLeft(); lcd.scrollDisplayLeft();') })
  s.advance(0.5)
  same(s.live.u.lines[0], '23456789ABCDEFGH', 'scrollDisplayLeft × 2')
})

test('LCD 20×4 I2C: 4 linhas de 20; a linha 1 continua na linha 3 (DDRAM 0x14); endereço errado e 3,3 V não mostram nada', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd2004')], wires: i2cW('u'), code: LCDI(20, 4, 'lcd.backlight(); lcd.print("L0"); lcd.setCursor(0, 1); lcd.print("L1"); lcd.setCursor(18, 2); lcd.print("L2"); lcd.setCursor(5, 3); lcd.print("L3");') })
  b.advance(0.5)
  same(b.live.u.lines, ['L0                  ', 'L1                  ', '                  L2', '     L3             '], '4 linhas')
  const w = await bench({ parts: [UNO(), part('u', 'lcd2004')], wires: i2cW('u'), code: LCDI(20, 4, 'lcd.print("0123456789012345678901234");') })
  w.advance(0.5)
  same(w.live.u.lines, ['01234567890123456789', '                    ', '01234               ', '                    '], 'texto longo na linha 1 passa para a linha 3')
  const a = await bench({ parts: [UNO(), part('u', 'lcd2004')], wires: i2cW('u'), code: LCDI(20, 4, 'lcd.backlight(); lcd.print("X");', '0x3F') })
  a.advance(0.5)
  ok(!a.live.u.lines || a.live.u.lines.every((l) => !l.trim()), 'endereço 0x3F com o módulo em 0x27')
  const v = await bench({ parts: [UNO(), part('u', 'lcd2004')], wires: i2cW('u', 'VCC', '3V3'), code: LCDI(20, 4, 'lcd.backlight(); lcd.print("X");') })
  v.advance(0.5)
  ok(!v.live.u.lines && !v.live.u.backlight, 'a 3,3 V um LCD de 5 V não mostra nada')
})

const LCDP = (cols, rows, body) => `#include <LiquidCrystal.h>
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
void setup(){ lcd.begin(${cols}, ${rows}); ${body} }
void loop(){}`
const lcdpW = ({ v0 = 'GND.2', rw = 'GND.2', a = '5V', skip = [] } = {}) =>
  [wire('uno.GND.1', 'u.VSS'), wire('uno.5V', 'u.VDD'), wire(`uno.${v0}`, 'u.V0'), wire('uno.D12', 'u.RS'), wire(`uno.${rw}`, 'u.RW'), wire('uno.D11', 'u.E'), wire('uno.D5', 'u.D4'), wire('uno.D4', 'u.D5'), wire('uno.D3', 'u.D6'), wire('uno.D2', 'u.D7'), wire(`uno.${a}`, 'u.A'), wire('uno.GND.3', 'u.K')].filter((w) => !skip.includes(w.b.pin))
test('LCD 16×2 paralelo (LiquidCrystal, 4 bits): texto, contraste por V0, RW a GND, retroiluminação por A/K', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW(), code: LCDP(16, 2, 'lcd.print("Temp: 23C"); lcd.setCursor(0, 1); lcd.print(1023);') })
  b.advance(0.5)
  same(b.live.u.lines, ['Temp: 23C       ', '1023            '], 'texto')
  near(b.live.u.contrast, 5, 0.2, 'V0 a GND: tensão de contraste máxima (visível)')
  ok(b.live.u.bl > 0.6, `retroiluminação acesa com A → 5V e K → GND (${b.live.u.bl})`)
  // V0 a 5 V: os caracteres não se veem (contraste 0)
  const c = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW({ v0: '5V' }), code: LCDP(16, 2, 'lcd.print("X");') })
  c.advance(0.5)
  near(c.live.u.contrast, 0, 0.2, 'V0 a 5 V: sem contraste')
  ok(hasIssue(c, /V0|contraste/i), 'o diagnóstico devia avisar do contraste')
  // RW a 5 V = modo de leitura: o LCD ignora as escritas
  const r = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW({ rw: '5V' }), code: LCDP(16, 2, 'lcd.print("X");') })
  r.advance(0.5)
  ok(!r.live.u.lines || r.live.u.lines.every((l) => !l.includes('X')), 'com RW a HIGH nada é escrito')
  // sem A ligado: sem luz, mas o texto está lá
  const n = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW({ skip: ['A'] }), code: LCDP(16, 2, 'lcd.print("X");') })
  n.advance(0.5)
  near(n.live.u.bl, 0, 0.01, 'sem A a retroiluminação fica apagada')
  same(n.live.u.lines[0][0], 'X', 'texto sem retroiluminação')
  // fio D6 em falta: os nibbles chegam errados, não pode aparecer o texto certo
  const m = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW({ skip: ['D6'] }), code: LCDP(16, 2, 'lcd.print("Temp");') })
  m.advance(0.5)
  ok(!m.live.u.lines || !m.live.u.lines[0].startsWith('Temp'), 'sem D6 o texto não pode sair certo')
})

test('LCD paralelo: sem begin() fica 1 linha por inicializar; retroiluminação sem resistência queima', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd1602p')], wires: lcdpW(), code: 'void setup(){} void loop(){}' })
  b.advance(0.3)
  ok(b.live.u.inited === false, 'sem inicialização')
  const x = await bench({ parts: [UNO(), part('u', 'lcd1602p', { blR: 0 })], wires: lcdpW(), code: LCDP(16, 2, 'lcd.print("X");') })
  x.advance(2.5)
  ok(x.live.u.blBurned === true, '5 V diretos no LED de fundo sem resistência (≈ 160 mA) queimam-no')
})

test('LCD 20×4 paralelo: linhas 3 e 4 em DDRAM 0x14/0x54', async () => {
  const b = await bench({ parts: [UNO(), part('u', 'lcd2004p')], wires: lcdpW(), code: LCDP(20, 4, 'lcd.print("A"); lcd.setCursor(19, 1); lcd.print("B"); lcd.setCursor(0, 2); lcd.print("C"); lcd.setCursor(10, 3); lcd.print("D");') })
  b.advance(0.5)
  same(b.live.u.lines, ['A                   ', '                   B', 'C                   ', '          D         '], '4 linhas de 20')
})

// ============================================================================================
// 5. LEDs e displays de segmentos
// ============================================================================================
// resistência em série: pino da placa → R → pino da peça
const viaR = (id, from, to, ohms = 220) => ({ parts: [part(id, 'resistor', { ohms })], wires: [wire(from, `${id}.1`), wire(`${id}.2`, to)] })
const withR = (list) => ({ parts: list.flatMap((x) => x.parts), wires: list.flatMap((x) => x.wires) })

test('LED 5 mm: ~14 mA com 220 Ω a 5 V, polaridade, sem resistência queima', async () => {
  const r = viaR('r1', 'uno.D2', 'l.A')
  const on = 'void setup(){ pinMode(2, OUTPUT); digitalWrite(2, HIGH); } void loop(){}'
  const b = await bench({ parts: [UNO(), part('l', 'led'), ...r.parts], wires: [...r.wires, wire('l.K', 'uno.GND.1')], code: on })
  b.advance(0.3)
  ok(b.led('l') > 0.5, `LED aceso (${b.led('l')})`)
  near(b.v('l.A', 'l.K'), 2.0, 0.25, 'queda no LED vermelho')
  near((b.v('uno.D2', 'l.A') / 220) * 1000, 13.5, 2, 'corrente (mA)')
  const inv = await bench({ parts: [UNO(), part('l', 'led'), ...r.parts], wires: [wire('uno.D2', 'r1.1'), wire('r1.2', 'l.K'), wire('l.A', 'uno.GND.1')], code: on })
  inv.advance(0.3)
  near(inv.led('l'), 0, 0.01, 'LED ao contrário não acende')
  const azul = await bench({ parts: [UNO(), part('l', 'led', { color: 'blue' }), ...r.parts], wires: [...r.wires, wire('l.K', 'uno.GND.1')], code: on })
  azul.advance(0.3)
  near(azul.v('l.A', 'l.K'), 3.1, 0.3, 'queda no LED azul (~3 V)')
  const dir = await bench({ parts: [UNO(), part('l', 'led')], wires: [wire('uno.5V', 'l.A'), wire('l.K', 'uno.GND.1')] })
  dir.advance(1)
  ok(dir.warnings.some((w) => /queim|burn/i.test(w)) || hasIssue(dir, /resist/i), 'LED direto aos 5 V: devia queimar/avisar')
})

test('LED RGB (cátodo comum): cada cor no seu pino, PWM mistura, K ao 5 V não acende', async () => {
  const rs = withR([viaR('rr', 'uno.D9', 'l.R'), viaR('rg', 'uno.D10', 'l.G'), viaR('rb', 'uno.D11', 'l.B')])
  const code = 'void setup(){ pinMode(9, OUTPUT); pinMode(10, OUTPUT); pinMode(11, OUTPUT); digitalWrite(9, HIGH); analogWrite(10, 64); digitalWrite(11, LOW); } void loop(){}'
  const b = await bench({ parts: [UNO(), part('l', 'rgbled'), ...rs.parts], wires: [...rs.wires, wire('l.K', 'uno.GND.1')], code })
  b.advance(0.5)
  ok(b.live.l.r > 0.7, `vermelho aceso (${b.live.l.r})`)
  ok(b.live.l.g > 0.05 && b.live.l.g < b.live.l.r * 0.5, `verde a 25 % (${b.live.l.g})`)
  near(b.live.l.b, 0, 0.01, 'azul apagado')
  const k = await bench({ parts: [UNO(), part('l', 'rgbled'), ...rs.parts], wires: [...rs.wires, wire('l.K', 'uno.5V')], code })
  k.advance(0.5)
  near(k.live.l.r + k.live.l.g + k.live.l.b, 0, 0.01, 'cátodo comum ligado ao 5 V')
})

test('Módulo semáforo: resistências na placa (≈10 mA), HIGH acende cada cor', async () => {
  const b = await bench({
    parts: [UNO(), part('s', 'semaforo')],
    wires: [wire('uno.D2', 's.R'), wire('uno.D3', 's.Y'), wire('uno.D4', 's.G'), wire('uno.GND.1', 's.GND')],
    code: 'void setup(){ pinMode(2, OUTPUT); pinMode(3, OUTPUT); pinMode(4, OUTPUT); digitalWrite(2, HIGH); digitalWrite(4, LOW); digitalWrite(3, LOW); } void loop(){}',
  })
  b.advance(0.3)
  ok(b.live.s.r > 0.8 && b.live.s.y < 0.01 && b.live.s.g < 0.01, `só o vermelho: ${JSON.stringify(b.live.s)}`)
  ok(!b.warnings.some((w) => /queim/i.test(w)), 'não queima sem resistências externas')
})

// segmentos do dígito (a b c d e f g) como na tabela habitual
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 7: 'abc', 8: 'abcdefg' }
const SEGP = { a: 2, b: 3, c: 4, d: 5, e: 6, f: 7, g: 8, dp: 9 }
const seg7 = (common, digit, anodeLogic) => {
  const rs = withR(Object.entries(SEGP).map(([k, pin]) => viaR(`r${k}`, `uno.D${pin}`, `d.${k}`)))
  const lit = DIGITS[digit]
  const lines = Object.entries(SEGP).map(([k, pin]) => `pinMode(${pin}, OUTPUT); digitalWrite(${pin}, ${lit.includes(k) !== anodeLogic ? 'HIGH' : 'LOW'});`)
  return { parts: [UNO(), part('d', 'sevenseg', { common }), ...rs.parts], wires: rs.wires, code: `void setup(){ ${lines.join(' ')} } void loop(){}` }
}
const litSegs = (seg) => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].filter((_, i) => seg[i] > 0.3).join('')
test('7 segmentos: cátodo comum (COM → GND, HIGH acende) e ânodo comum (COM → 5V, LOW acende); mapa a–g', async () => {
  for (const digit of [2, 4, 7]) {
    const c = seg7('cathode', digit, false)
    const b = await bench({ ...c, wires: [...c.wires, wire('d.COM.1', 'uno.GND.1')] })
    b.advance(0.3)
    same(litSegs(b.live.d.seg), DIGITS[digit], `cátodo comum: dígito ${digit}`)
  }
  const a = seg7('anode', 3, true)
  const b = await bench({ ...a, wires: [...a.wires, wire('d.COM.2', 'uno.5V')] })
  b.advance(0.3)
  same(litSegs(b.live.d.seg), DIGITS[3], 'ânodo comum: dígito 3 (pelo COM.2: os dois COM são o mesmo pino)')
  // cátodo comum com o COM ao 5 V: nada acende
  const w = seg7('cathode', 8, false)
  const x = await bench({ ...w, wires: [...w.wires, wire('d.COM.1', 'uno.5V')] })
  x.advance(0.3)
  same(litSegs(x.live.d.seg), '', 'cátodo comum com COM → 5V')
  ok(hasIssue(x, /cátodo comum/i, 'error'), 'diagnóstico do COM ao 5V')
})

const SEG4P = { A: 2, B: 3, C: 4, D: 5, E: 6, F: 7, G: 8, DP: 9 }
const DIGP = [10, 11, 12, 13]
const seg4 = (common, code) => {
  const rs = withR(Object.entries(SEG4P).map(([k, pin]) => viaR(`r${k}`, `uno.D${pin}`, `d.${k}`)))
  return { parts: [UNO(), part('d', 'sevenseg4', { common }), ...rs.parts], wires: [...rs.wires, ...DIGP.map((p, i) => wire(`uno.D${p}`, `d.DIG${i + 1}`))], code }
}
const lit4 = (seg) => seg.map((d) => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].filter((_, i) => d[i] > 0.3).join(''))
test('7 segmentos × 4 (multiplexado à mão, cátodo comum): "1237", brilho ≈ 1/4 do tempo', async () => {
  const pat = [1, 2, 3, 7].map((n) => ['a', 'b', 'c', 'd', 'e', 'f', 'g'].reduce((m, k, i) => m | (DIGITS[n].includes(k) ? 1 << i : 0), 0))
  const c = seg4('cathode', `const byte pat[4] = {${pat.join(', ')}};
void setup(){ for (int p = 2; p <= 13; p++) { pinMode(p, OUTPUT); } for (int d = 10; d <= 13; d++) digitalWrite(d, HIGH); }
void loop(){ for (int d = 0; d < 4; d++) { for (int s = 0; s < 7; s++) digitalWrite(2 + s, (pat[d] >> s) & 1); digitalWrite(10 + d, LOW); delay(2); digitalWrite(10 + d, HIGH); } }`)
  const b = await bench(c)
  b.advance(1)
  same(lit4(b.live.d.seg), ['bc', 'abdeg', 'abcdg', 'abc'], 'dígitos')
})

test('7 segmentos × 4 com a SevSeg: cátodo comum e ânodo comum mostram o mesmo número', async () => {
  for (const [common, hw] of [['cathode', 'COMMON_CATHODE'], ['anode', 'COMMON_ANODE']]) {
    const c = seg4(common, `#include <SevSeg.h>
SevSeg sevseg;
void setup(){ byte dig[] = {10, 11, 12, 13}; byte seg[] = {2, 3, 4, 5, 6, 7, 8, 9}; sevseg.begin(${hw}, 4, dig, seg, true); sevseg.setBrightness(90); sevseg.setNumber(4087, 2); }
void loop(){ sevseg.refreshDisplay(); }`)
    const b = await bench(c)
    b.advance(1)
    same(lit4(b.live.d.seg), ['bcfg', 'abcdef' + 'dp', 'abcdefg', 'abc'], `SevSeg ${common}: "40.87"`)
  }
  // configuração trocada (ânodo comum declarado num display de cátodo comum): não mostra o número
  const w = seg4('cathode', `#include <SevSeg.h>
SevSeg sevseg;
void setup(){ byte dig[] = {10, 11, 12, 13}; byte seg[] = {2, 3, 4, 5, 6, 7, 8, 9}; sevseg.begin(COMMON_ANODE, 4, dig, seg, true); sevseg.setNumber(1111, 0); }
void loop(){ sevseg.refreshDisplay(); }`)
  const x = await bench(w)
  x.advance(1)
  ok(JSON.stringify(lit4(x.live.d.seg)) !== JSON.stringify(['bc', 'bc', 'bc', 'bc']), 'tipo de display errado não pode mostrar "1111"')
})

test('Barra de 10 LEDs: LEDs independentes Ai → Ki', async () => {
  const rs = withR([1, 2, 3, 10].map((n) => viaR(`r${n}`, `uno.D${n + 1}`, `g.A${n}`)))
  const b = await bench({
    parts: [UNO(), part('g', 'bargraph'), ...rs.parts],
    wires: [...rs.wires, ...[1, 2, 10].map((n) => wire(`g.K${n}`, 'uno.GND.1'))], // K3 fica por ligar
    code: 'void setup(){ for (int p = 2; p <= 11; p++) pinMode(p, OUTPUT); digitalWrite(2, HIGH); digitalWrite(3, LOW); digitalWrite(4, HIGH); digitalWrite(11, HIGH); } void loop(){}',
  })
  b.advance(0.3)
  const lit = b.live.g.b.map((v) => (v > 0.5 ? 1 : 0))
  same(lit, [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], 'LED 1 e 10 acesos; 2 a LOW; 3 sem cátodo ligado')
})

const TM = (body) => `#include <TM1637Display.h>
TM1637Display d(2, 3);
void setup(){ ${body} }
void loop(){}`
const tmW = (clk = 'D2', dio = 'D3') => [wire('uno.5V', 't.VCC'), wire('uno.GND.1', 't.GND'), wire(`uno.${clk}`, 't.CLK'), wire(`uno.${dio}`, 't.DIO')]
test('TM1637: segmentos de "1234", dois pontos (bit 7 do 2.º dígito), brilho 0–7, apagado sem setBrightness()', async () => {
  const b = await bench({ parts: [UNO(), part('t', 'tm1637')], wires: tmW(), code: TM('d.setBrightness(7); d.showNumberDecEx(1234, 0x40, true);') })
  b.advance(0.3)
  same(b.live.t.d, [0x06, 0x5b | 0x80, 0x4f, 0x66], 'códigos de segmentos com os dois pontos')
  const lo = await bench({ parts: [UNO(), part('t', 'tm1637')], wires: tmW(), code: TM('d.setBrightness(0); d.showNumberDec(-12);') })
  lo.advance(0.3)
  same(lo.live.t.d, [0, 0x40, 0x06, 0x5b], '"-12" alinhado à direita, sem zeros')
  ok(lo.live.t.b > 0 && lo.live.t.b < b.live.t.b, `brilho 0 < brilho 7 (${lo.live.t.b} vs ${b.live.t.b})`)
  const off = await bench({ parts: [UNO(), part('t', 'tm1637')], wires: tmW(), code: TM('d.showNumberDec(88);') })
  off.advance(0.3)
  same(off.live.t.d, [0, 0, 0, 0], 'sem setBrightness() fica apagado')
  const sw = await bench({ parts: [UNO(), part('t', 'tm1637')], wires: tmW('D3', 'D2'), code: TM('d.setBrightness(7); d.showNumberDec(1234);') })
  sw.advance(0.3)
  same(sw.live.t.d, [0, 0, 0, 0], 'CLK/DIO trocados')
  const np = await bench({ parts: [UNO(), part('t', 'tm1637')], wires: tmW().slice(1), code: TM('d.setBrightness(7); d.showNumberDec(1234);') })
  np.advance(0.3)
  same(np.live.t.d, [0, 0, 0, 0], 'sem alimentação')
})

const MAX = (n, body) => `#include <LedControl.h>
LedControl lc = LedControl(12, 11, 10, ${n});
void setup(){ ${body} }
void loop(){}`
const maxW = (id = 'm') => [wire('uno.5V', `${id}.VCC`), wire('uno.GND.1', `${id}.GND`), wire('uno.D12', `${id}.DIN`), wire('uno.D10', `${id}.CS`), wire('uno.D11', `${id}.CLK`)]
test('MAX7219: arranca em shutdown, setLed/setRow (bit 7 = coluna 0), intensidade 0–15', async () => {
  const b = await bench({ parts: [UNO(), part('m', 'max7219')], wires: maxW(), code: MAX(1, 'lc.shutdown(0, false); lc.setIntensity(0, 15); lc.clearDisplay(0); lc.setLed(0, 2, 0, true); lc.setLed(0, 2, 7, true); lc.setRow(0, 5, 0xB0); lc.setColumn(0, 3, 0x80);') })
  b.advance(0.3)
  // setColumn(3, 0x80) acende a coluna 3 só na linha 0 e APAGA-a nas outras: 0xB0 → 0xA0 na linha 5
  same(b.live.m.rows, [0x10, 0, 0x81, 0, 0, 0xa0, 0, 0], 'linhas')
  const lo = await bench({ parts: [UNO(), part('m', 'max7219')], wires: maxW(), code: MAX(1, 'lc.shutdown(0, false); lc.setIntensity(0, 0); lc.setRow(0, 0, 255);') })
  lo.advance(0.3)
  ok(lo.live.m.b > 0 && lo.live.m.b < b.live.m.b, `intensidade 0 (1/32) menos brilhante que 15 (31/32): ${lo.live.m.b} vs ${b.live.m.b}`)
  const sd = await bench({ parts: [UNO(), part('m', 'max7219')], wires: maxW(), code: MAX(1, 'lc.setRow(0, 0, 255);') })
  sd.advance(0.3)
  same(sd.live.m.rows, [0, 0, 0, 0, 0, 0, 0, 0], 'sem shutdown(0, false) fica apagada')
  const w = await bench({ parts: [UNO(), part('m', 'max7219')], wires: [...maxW().slice(0, 3), wire('uno.D11', 'm.CS'), wire('uno.D10', 'm.CLK')], code: MAX(1, 'lc.shutdown(0, false); lc.setRow(0, 0, 255);') })
  w.advance(0.3)
  same(w.live.m.rows, [0, 0, 0, 0, 0, 0, 0, 0], 'CS/CLK trocados')
})

test('MAX7219 em cadeia: DOUT → DIN do módulo seguinte; cada um com o seu conteúdo', async () => {
  const wires = [...maxW('m'), wire('uno.5V', 'n.VCC'), wire('uno.GND.1', 'n.GND'), wire('m.DOUT', 'n.DIN'), wire('m.CS.2', 'n.CS'), wire('m.CLK.2', 'n.CLK')]
  const b = await bench({ parts: [UNO(), part('m', 'max7219'), part('n', 'max7219')], wires, code: MAX(2, 'for (int k = 0; k < 2; k++) { lc.shutdown(k, false); lc.setIntensity(k, 8); lc.clearDisplay(k); } lc.setRow(0, 0, 0xAA); lc.setRow(1, 7, 0x0F);') })
  b.advance(0.3)
  same(b.live.m.rows, [0xaa, 0, 0, 0, 0, 0, 0, 0], '1.º módulo (endereço 0)')
  same(b.live.n.rows, [0, 0, 0, 0, 0, 0, 0, 0x0f], '2.º módulo (endereço 1)')
  // sem o fio DOUT → DIN o segundo não recebe nada
  const c = await bench({ parts: [UNO(), part('m', 'max7219'), part('n', 'max7219')], wires: wires.filter((w) => !(w.a.pin === 'DOUT')), code: MAX(2, 'lc.shutdown(1, false); lc.setRow(1, 7, 0x0F);') })
  c.advance(0.3)
  same(c.live.n.rows, [0, 0, 0, 0, 0, 0, 0, 0], '2.º módulo sem DIN')
})

// ============================================================================================
// 6. Ecrãs gráficos: OLED, Nokia 5110, TFT
// ============================================================================================
const state = (b, id) => b.engine.circuit.st[id]
// ponto (x, y) de uma imagem de 1 bit por ponto em base64 (linhas de ceil(w / 8) bytes, MSB primeiro)
const mono = (fb, w) => {
  const u = Buffer.from(fb || '', 'base64')
  const bpr = (w + 7) >> 3
  return (x, y) => (u[y * bpr + (x >> 3)] >> (7 - (x & 7))) & 1
}
const count = (fb, w, h) => {
  const px = mono(fb, w)
  let n = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) n += px(x, y)
  return n
}
const OLED_DRAW = `d.clearDisplay(); d.drawPixel(0, 0, 1); d.drawPixel(127, 63, 1); d.drawPixel(128, 10, 1); d.drawPixel(5, 64, 1); d.fillRect(10, 20, 4, 3, 1);
  d.setTextSize(1); d.setTextColor(1); d.setCursor(40, 40); d.print("BB"); d.display(); d.drawPixel(60, 5, 1);
  Serial.print("wh="); Serial.print(d.width()); Serial.print(","); Serial.println(d.height());`
// 'B' da fonte 5×7 da Adafruit_GFX: colunas 0x7F, 0x49, 0x49, 0x49, 0x36 (bit 0 = linha de cima); avanço de 6 pontos
const GLYPH_B = [0x7f, 0x49, 0x49, 0x49, 0x36, 0x00]
const checkOled = (b, id) => {
  same(nums(b, 'ok'), [1], 'begin()')
  same(nums(b, 'wh'), [128, 64], 'resolução')
  const px = mono(b.live[id].fb, 128)
  ok(px(0, 0) && px(127, 63), 'cantos (0,0) e (127,63)')
  ok(!px(60, 5), 'o que se desenha depois do display() ainda não aparece')
  for (let c = 0; c < 12; c++) for (let r = 0; r < 8; r++) ok(px(40 + c, 40 + r) === ((GLYPH_B[c % 6] >> r) & 1), `texto "BB", coluna ${c}, linha ${r}`)
  // 2 cantos + retângulo 4×3 + pontos dos dois "B" (os pontos fora de 128×64 são ignorados)
  const n = GLYPH_B.reduce((k, v) => k + v.toString(2).replace(/0/g, '').length, 0)
  same(count(b.live[id].fb, 128, 64), 2 + 12 + 2 * n, 'número de pontos acesos')
}
const SSD = (addr, body = OLED_DRAW) => `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 d(128, 64, &Wire, -1);
void setup(){ Serial.begin(9600); bool k = d.begin(SSD1306_SWITCHCAPVCC, ${addr}); Serial.print("ok="); Serial.println(k ? 1 : 0); if (!k) return; ${body} }
void loop(){}`
test('SSD1306 I2C 128×64: o que se desenha aparece só com display(), ponto a ponto; endereço errado falha', async () => {
  const b = await bench({ parts: [UNO(), part('o', 'ssd1306')], wires: i2cW('o'), code: SSD('0x3C') })
  b.advance(0.5)
  checkOled(b, 'o')
  const w = await bench({ parts: [UNO(), part('o', 'ssd1306')], wires: i2cW('o'), code: SSD('0x3D') })
  w.advance(0.5)
  same(nums(w, 'ok'), [0], 'begin(0x3D) com o ecrã em 0x3C')
  ok(!w.live.o.fb || count(w.live.o.fb, 128, 64) === 0, 'nada no ecrã')
  const v = await bench({ parts: [UNO(), part('o', 'ssd1306')], wires: i2cW('o', 'VCC', '3V3'), code: SSD('0x3C') })
  v.advance(0.5)
  same(nums(v, 'ok'), [1], 'funciona a 3,3 V')
})

test('SSD1306: invertDisplay, clearDisplay e consumo que cresce com os pontos acesos', async () => {
  const b = await bench({ parts: [UNO(), part('o', 'ssd1306')], wires: i2cW('o'), code: SSD('0x3C', 'd.clearDisplay(); d.display(); delay(300); Serial.println("vazio"); delay(300); d.fillScreen(1); d.display(); d.invertDisplay(true);') })
  b.advance(0.45)
  same(count(b.live.o.fb, 128, 64), 0, 'clearDisplay() + display() = ecrã vazio (sem logótipo)')
  b.advance(0.6)
  same(count(b.live.o.fb, 128, 64), 8192, 'fillScreen(1)')
  ok(b.live.o.inv === true, 'invertDisplay(true)')
})

test('SH1106 1,3": Adafruit_SH1106G desenha bem; a Adafruit_SSD1306 não serve para este controlador', async () => {
  const b = await bench({
    parts: [UNO(), part('o', 'sh1106')],
    wires: i2cW('o'),
    code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
Adafruit_SH1106G d = Adafruit_SH1106G(128, 64, &Wire, -1);
void setup(){ Serial.begin(9600); bool k = d.begin(0x3C, true); Serial.print("ok="); Serial.println(k ? 1 : 0); ${OLED_DRAW.replace(/, 1\)/g, ', SH110X_WHITE)').replace('setTextColor(1)', 'setTextColor(SH110X_WHITE)')} }
void loop(){}`,
  })
  b.advance(0.5)
  checkOled(b, 'o')
  const w = await bench({ parts: [UNO(), part('o', 'sh1106')], wires: i2cW('o'), code: SSD('0x3C') })
  w.advance(0.5)
  const good = (() => {
    try {
      checkOled(w, 'o')
      return true
    } catch {
      return false
    }
  })()
  ok(!good, 'com a Adafruit_SSD1306 um SH1106 não pode mostrar a imagem certa')
})

const SSDSPI = (dc, rst, cs) => `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 d(128, 64, &SPI, ${dc}, ${rst}, ${cs});
void setup(){ Serial.begin(9600); bool k = d.begin(SSD1306_SWITCHCAPVCC); Serial.print("ok="); Serial.println(k ? 1 : 0); ${OLED_DRAW} }
void loop(){}`
const spiOledW = ({ d0 = 'D13', d1 = 'D11', res = 'D8', dc = 'D9', cs = 'D10' } = {}) => [wire('uno.5V', 'o.VCC'), wire('uno.GND.1', 'o.GND'), wire(`uno.${d0}`, 'o.D0'), wire(`uno.${d1}`, 'o.D1'), wire(`uno.${res}`, 'o.RES'), wire(`uno.${dc}`, 'o.DC'), wire(`uno.${cs}`, 'o.CS')]
test('SSD1306 SPI (7 pinos): D0 = SCK, D1 = MOSI, DC e CS certos; ligações trocadas deixam o ecrã vazio', async () => {
  const b = await bench({ parts: [UNO(), part('o', 'ssd1306spi')], wires: spiOledW(), code: SSDSPI(9, 8, 10) })
  b.advance(0.5)
  checkOled(b, 'o')
  for (const [nome, w] of [['CS noutro pino', { cs: 'D7' }], ['D0/D1 trocados', { d0: 'D11', d1: 'D13' }], ['DC noutro pino', { dc: 'D6' }], ['no I2C (A5/A4)', { d0: 'A5', d1: 'A4' }]]) {
    const x = await bench({ parts: [UNO(), part('o', 'ssd1306spi')], wires: spiOledW(w), code: SSDSPI(9, 8, 10) })
    x.advance(0.5)
    ok(!x.live.o.fb || count(x.live.o.fb, 128, 64) === 0, `${nome}: o ecrã devia ficar vazio (${x.live.o.fb ? count(x.live.o.fb, 128, 64) : 0} pontos)`)
  }
})

const PCD = (body) => `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_PCD8544.h>
Adafruit_PCD8544 d = Adafruit_PCD8544(7, 6, 5, 4, 3);
void setup(){ Serial.begin(9600); d.begin(); d.setContrast(57); d.clearDisplay(); Serial.print("wh="); Serial.print(d.width()); Serial.print(","); Serial.println(d.height()); ${body} }
void loop(){}`
const pcdW = ({ vcc = '3V3', ce = 'D4', dc = 'D5', bl = null } = {}) => [wire(`uno.${vcc}`, 'n.VCC'), wire('uno.GND.1', 'n.GND'), wire('uno.D7', 'n.CLK'), wire('uno.D6', 'n.DIN'), wire(`uno.${dc}`, 'n.DC'), wire(`uno.${ce}`, 'n.CE'), wire('uno.D3', 'n.RST'), ...(bl ? [wire(`uno.${bl}`, 'n.BL')] : [])]
test('Nokia 5110 (PCD8544): 84×48, contraste, luz de fundo no BL, 3,3 V (a 5 V avisa), CE/DC trocados não mostram', async () => {
  const draw = 'd.drawPixel(0, 0, BLACK); d.drawPixel(83, 47, BLACK); d.drawPixel(84, 0, BLACK); d.drawPixel(0, 48, BLACK); d.drawFastHLine(10, 10, 20, BLACK); d.display();'
  const b = await bench({ parts: [UNO(), part('n', 'pcd8544')], wires: pcdW({ bl: '3V3' }), code: PCD(draw) })
  b.advance(0.5)
  same(nums(b, 'wh'), [84, 48], 'resolução')
  const px = mono(b.live.n.fb, 84)
  ok(px(0, 0) && px(83, 47) && px(10, 10) && px(29, 10) && !px(30, 10), 'pontos desenhados')
  same(count(b.live.n.fb, 84, 48), 22, 'número de pontos (os de fora do ecrã são ignorados)')
  same([b.live.n.contrast], [57], 'setContrast(57)')
  ok(b.live.n.bl === true, 'BL a 3,3 V acende a luz')
  ok(!hasIssue(b, /3,3 V/, 'warn') && !hasIssue(b, /./, 'error'), 'a 3,3 V não há avisos de tensão')
  const nb = await bench({ parts: [UNO(), part('n', 'pcd8544')], wires: pcdW(), code: PCD(draw) })
  nb.advance(0.5)
  ok(nb.live.n.bl === false, 'BL solto: luz apagada')
  const v5 = await bench({ parts: [UNO(), part('n', 'pcd8544')], wires: pcdW({ vcc: '5V' }), code: PCD(draw) })
  v5.advance(0.5)
  ok(hasIssue(v5, /3,3 V/), 'VCC a 5 V: aviso de que o módulo é de 3,3 V')
  for (const [nome, w] of [['CE noutro pino', { ce: 'D8' }], ['DC noutro pino', { dc: 'D8' }], ['sem alimentação', { vcc: 'GND.2' }]]) {
    const x = await bench({ parts: [UNO(), part('n', 'pcd8544')], wires: pcdW(w), code: PCD(draw) })
    x.advance(0.5)
    ok(!x.live.n.fb || count(x.live.n.fb, 84, 48) === 0, `${nome}: o ecrã devia ficar vazio`)
  }
})

const tftW = (type, { cs = 'D10', dc = 'D9', rst = 'D8', mosi = 'D11', sck = 'D13', bl = '5V', vcc = '5V' } = {}) => {
  const blk = type === 'st7735' || type === 'ili9341' ? 'LED' : 'BLK'
  return [wire(`uno.${vcc}`, 't.VCC'), wire('uno.GND.1', 't.GND'), wire(`uno.${cs}`, 't.CS'), wire(`uno.${dc}`, 't.DC'), wire(`uno.${rst}`, 't.RST'), wire(`uno.${mosi}`, 't.MOSI'), wire(`uno.${sck}`, 't.SCK'), ...(bl ? [wire(`uno.${bl}`, `t.${blk}`)] : [])]
}
const TFTS = {
  st7735: { inc: 'Adafruit_ST7735.h', cls: 'Adafruit_ST7735', init: 't.initR(INITR_BLACKTAB);', w: 128, h: 160, red: 'ST77XX_RED', blue: 'ST77XX_BLUE' },
  st7789: { inc: 'Adafruit_ST7789.h', cls: 'Adafruit_ST7789', init: 't.init(240, 240);', w: 240, h: 240, red: 'ST77XX_RED', blue: 'ST77XX_BLUE' },
  gc9a01: { inc: 'Adafruit_GC9A01A.h', cls: 'Adafruit_GC9A01A', init: 't.begin();', w: 240, h: 240, red: 'GC9A01A_RED', blue: 'GC9A01A_BLUE' },
  ili9341: { inc: 'Adafruit_ILI9341.h', cls: 'Adafruit_ILI9341', init: 't.begin();', w: 240, h: 320, red: 'ILI9341_RED', blue: 'ILI9341_BLUE' },
}
const TFT = (k) => `#include <SPI.h>
#include <Adafruit_GFX.h>
#include <${k.inc}>
${k.cls} t = ${k.cls}(10, 9, 8);
void setup(){ Serial.begin(9600); ${k.init} Serial.print("wh="); Serial.print(t.width()); Serial.print(","); Serial.println(t.height());
  t.fillScreen(${k.red}); t.drawPixel(0, 0, ${k.blue}); t.drawPixel(t.width() - 1, t.height() - 1, 0x07E0); t.drawPixel(t.width(), 0, 0xFFFF); t.fillRect(20, 30, 10, 5, 0xFFFF);
  t.setRotation(1); Serial.print("rot="); Serial.print(t.width()); Serial.print(","); Serial.println(t.height()); }
void loop(){}`
for (const [type, k] of Object.entries(TFTS)) {
  test(`${type}: ${k.w}×${k.h} RGB565, desenha logo (sem display()), rotação troca largura/altura, retroiluminação`, async () => {
    const b = await bench({ parts: [UNO(), part('t', type)], wires: tftW(type), code: TFT(k) })
    b.advance(1.5)
    same(nums(b, 'wh'), [k.w, k.h], 'resolução')
    same(nums(b, 'rot'), [k.h, k.w], 'setRotation(1)')
    const t = state(b, 't').tft
    ok(t && t.buf.length === k.w * k.h, 'memória de imagem do tamanho do ecrã')
    const px = (x, y) => t.buf[y * k.w + x]
    same([px(0, 0), px(k.w - 1, k.h - 1), px(20, 30), px(29, 34), px(30, 30), px(5, 5)], [0x001f, 0x07e0, 0xffff, 0xffff, 0xf800, 0xf800], 'cores RGB565 nos pontos')
    let red = 0
    for (const v of t.buf) if (v === 0xf800) red++
    same([red], [k.w * k.h - 52], 'resto do ecrã a vermelho')
    ok(b.live.t.lit === true, 'retroiluminação acesa')
    for (const [nome, w] of [['CS noutro pino', { cs: 'D7' }], ['DC noutro pino', { dc: 'D7' }], ['MOSI/SCK trocados', { mosi: 'D13', sck: 'D11' }], ['sem alimentação', { vcc: 'GND.2', bl: null }]]) {
      const x = await bench({ parts: [UNO(), part('t', type)], wires: tftW(type, w), code: TFT(k) })
      x.advance(1.5)
      const tx = state(x, 't')?.tft
      ok(!tx || !tx.buf.some((v) => v === 0xf800), `${nome}: o ecrã não devia receber a imagem`)
    }
  })
}

test('TFT: retroiluminação — ST7735/ILI9341 precisam do LED ligado; ST7789/GC9A01 acendem com BLK solto e apagam com BLK a GND', async () => {
  for (const type of ['st7735', 'ili9341']) {
    const b = await bench({ parts: [UNO(), part('t', type)], wires: tftW(type, { bl: null }), code: TFT(TFTS[type]) })
    b.advance(1)
    ok(b.live.t.lit === false, `${type}: sem LED ligado fica às escuras`)
  }
  for (const type of ['st7789', 'gc9a01']) {
    const b = await bench({ parts: [UNO(), part('t', type)], wires: tftW(type, { bl: null }), code: TFT(TFTS[type]) })
    b.advance(1)
    ok(b.live.t.lit === true, `${type}: BLK solto = aceso`)
    const o = await bench({ parts: [UNO(), part('t', type)], wires: tftW(type, { bl: 'GND.2' }), code: TFT(TFTS[type]) })
    o.advance(1)
    ok(o.live.t.lit === false, `${type}: BLK a GND = apagado`)
  }
})

// ============================================================================================
// 7. NeoPixel (WS2812B)
// ============================================================================================
const NEO = (n, body, type = 'NEO_GRB + NEO_KHZ800', pin = 6) => `#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel s(${n}, ${pin}, ${type});
void setup(){ s.begin(); ${body} s.show(); }
void loop(){}`
const neoW = (id = 'x', din = 'uno.D6') => [wire('uno.5V', `${id}.VCC`), wire('uno.GND.1', `${id}.GND`), wire(din, `${id}.DIN`)]
const hexs = (c) => c.map((v) => v.toString(16).padStart(6, '0'))
const NEO_COUNT = { neopixelLed: 1, neopixelModule: 1, neopixelStrip: 8, barraLedRgb: 11, neopixelRing: 16, neopixelMatrix8: 64, neopixelMatrix16: 256 }
for (const [type, n] of Object.entries(NEO_COUNT)) {
  test(`${type}: ${n} LED(s), cor por LED (ordem GRB), o último índice válido é ${n - 1}`, async () => {
    // programa com um LED a mais do que a peça tem: o LED extra não existe (sairia pelo DOUT)
    const b = await bench({ parts: [UNO(), part('x', type)], wires: neoW(), code: NEO(n + 1, `s.setPixelColor(0, s.Color(255, 0, 0)); s.setPixelColor(${n - 1}, s.Color(0, 16, 255)); s.setPixelColor(${n}, s.Color(9, 9, 9));`) })
    b.advance(0.3)
    same([b.live.x.c.length], [n], 'número de LEDs')
    const c = hexs(b.live.x.c)
    same(c[n - 1], '0010ff', 'último LED: verde 16 + azul 255')
    if (n > 1) same(c[0], 'ff0000', 'LED 0 vermelho')
    if (n > 2) ok(c.slice(1, n - 1).every((v) => v === '000000'), 'os outros ficam apagados')
  })
}

test('NeoPixel: tipo errado (NEO_RGB num WS2812B) troca vermelho e verde; sem begin() nada acende', async () => {
  const b = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW(), code: NEO(8, 's.setPixelColor(0, s.Color(255, 0, 0)); s.setPixelColor(1, s.Color(0, 0, 255));', 'NEO_RGB + NEO_KHZ800') })
  b.advance(0.3)
  same(hexs(b.live.x.c).slice(0, 2), ['00ff00', '0000ff'], 'vermelho sai verde; azul fica azul')
  const nb = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW(), code: `#include <Adafruit_NeoPixel.h>\nAdafruit_NeoPixel s(8, 6, NEO_GRB + NEO_KHZ800);\nvoid setup(){ s.setPixelColor(0, 255, 255, 255); s.show(); }\nvoid loop(){}` })
  nb.advance(0.3)
  same(hexs(nb.live.x.c)[0], '000000', 'sem begin()')
})

test('NeoPixel: setBrightness escala as cores; consumo ≈ 1 mA parado + 20 mA por canal (≈ 60 mA em branco)', async () => {
  const one = await bench({ parts: [UNO(), part('x', 'neopixelModule')], wires: neoW(), code: NEO(1, 's.setPixelColor(0, s.Color(255, 255, 255));') })
  one.advance(0.3)
  near(one.live.x.mA, 60, 3, '1 LED em branco total')
  const red = await bench({ parts: [UNO(), part('x', 'neopixelModule')], wires: neoW(), code: NEO(1, 's.setPixelColor(0, s.Color(255, 0, 0));') })
  red.advance(0.3)
  near(red.live.x.mA, 20.5, 2, '1 LED só vermelho')
  const off = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW(), code: NEO(8, '') })
  off.advance(0.3)
  near(off.live.x.mA, 8, 1.5, '8 LEDs apagados: ~1 mA cada')
  const dim = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW(), code: NEO(8, 's.setBrightness(64); for (int i = 0; i < 8; i++) s.setPixelColor(i, s.Color(255, 255, 255));') })
  dim.advance(0.3)
  const v = dim.live.x.c[0] & 255
  near(v, 64, 2, 'setBrightness(64): 255 → ~64')
  near(dim.live.x.mA, 8 + (8 * 3 * 19.5 * v) / 255, 6, 'consumo proporcional ao brilho')
})

test('NeoPixel: 64 LEDs em branco pelo 5 V do Arduino (3,8 A) — a alimentação cai e o Arduino desliga-se', async () => {
  const b = await bench({ parts: [UNO(), part('x', 'neopixelMatrix8')], wires: neoW(), code: NEO(64, 'for (int i = 0; i < 64; i++) s.setPixelColor(i, s.Color(255, 255, 255));') })
  b.advance(1)
  ok(b.warnings.some((w) => /500 mA/.test(w)), `aviso de consumo acima dos 500 mA da USB: ${b.warnings.join(' | ')}`)
  ok(b.warnings.some((w) => /brownout|desligou/i.test(w)), 'o Arduino devia desligar-se por queda de tensão')
  ok(hasIssue(b, /3,8 A/), 'o diagnóstico avisa dos 3,8 A em branco total')
})

test('NeoPixel em cadeia: DOUT → DIN continua a numeração; ligado ao DOUT ou a outro pino não recebe; 330 Ω em série funciona', async () => {
  const chain = [...neoW('a'), wire('uno.5V', 'b.VCC'), wire('uno.GND.1', 'b.GND'), wire('a.DOUT', 'b.DIN')]
  const b = await bench({ parts: [UNO(), part('a', 'neopixelStrip'), part('b', 'neopixelRing')], wires: chain, code: NEO(24, 's.setPixelColor(7, s.Color(1, 2, 3)); s.setPixelColor(8, s.Color(4, 5, 6)); s.setPixelColor(23, s.Color(7, 8, 9));') })
  b.advance(0.3)
  same(hexs(b.live.a.c)[7], '010203', 'último LED da fita')
  same([hexs(b.live.b.c)[0], hexs(b.live.b.c)[15]], ['040506', '070809'], 'LED 8 e 23 = primeiro e último do anel')
  // sem a ligação DOUT → DIN o segundo não recebe
  const cut = await bench({ parts: [UNO(), part('a', 'neopixelStrip'), part('b', 'neopixelRing')], wires: chain.slice(0, -1), code: NEO(24, 's.setPixelColor(8, s.Color(4, 5, 6));') })
  cut.advance(0.3)
  same(hexs(cut.live.b.c)[0], '000000', 'anel sem DIN')
  // pino ligado ao DOUT em vez do DIN
  const out = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: [wire('uno.5V', 'x.VCC'), wire('uno.GND.1', 'x.GND'), wire('uno.D6', 'x.DOUT')], code: NEO(8, 's.setPixelColor(0, s.Color(255, 0, 0));') })
  out.advance(0.3)
  same(hexs(out.live.x.c)[0], '000000', 'dados pelo DOUT')
  ok(hasIssue(out, /DOUT/, 'error'), 'diagnóstico: Arduino ligado ao DOUT')
  const pin = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW('x', 'uno.D5'), code: NEO(8, 's.setPixelColor(0, s.Color(255, 0, 0));') })
  pin.advance(0.3)
  same(hexs(pin.live.x.c)[0], '000000', 'DIN no pino 5, programa no pino 6')
  const np = await bench({ parts: [UNO(), part('x', 'neopixelStrip')], wires: neoW().slice(1), code: NEO(8, 's.setPixelColor(0, s.Color(255, 0, 0));') })
  np.advance(0.3)
  same(hexs(np.live.x.c)[0], '000000', 'sem 5 V')
  // resistência de 330 Ω em série com DIN (como se recomenda): funciona na mesma
  const r = await bench({ parts: [UNO(), part('x', 'neopixelStrip'), part('r', 'resistor', { ohms: 330 })], wires: [wire('uno.5V', 'x.VCC'), wire('uno.GND.1', 'x.GND'), wire('uno.D6', 'r.1'), wire('r.2', 'x.DIN')], code: NEO(8, 's.setPixelColor(0, s.Color(255, 0, 0));') })
  r.advance(0.3)
  same(hexs(r.live.x.c)[0], 'ff0000', 'com 330 Ω em série no DIN')
})

test('NeoPixel com a FastLED: CRGB, ordem GRB e 330 Ω em série', async () => {
  const b = await bench({
    parts: [UNO(), part('x', 'neopixelRing'), part('r', 'resistor', { ohms: 470 })],
    wires: [wire('uno.5V', 'x.VCC'), wire('uno.GND.1', 'x.GND'), wire('uno.D6', 'r.1'), wire('r.2', 'x.DIN')],
    code: `#include <FastLED.h>
CRGB leds[16];
void setup(){ FastLED.addLeds<WS2812B, 6, GRB>(leds, 16); leds[0] = CRGB(255, 0, 0); leds[15] = CRGB::Blue; leds[3] = CRGB(0, 128, 0); FastLED.show(); }
void loop(){}`,
  })
  b.advance(0.3)
  const c = hexs(b.live.x.c)
  same([c[0], c[3], c[15], c[1]], ['ff0000', '008000', '0000ff', '000000'], 'cores')
})

// ============================================================================================
// 8. E-paper (GxEPD2)
// ============================================================================================
const epdW = ({ cs = 'D10', dc = 'D9', vcc = '5V' } = {}) => [wire(`uno.${vcc}`, 'e.VCC'), wire('uno.GND.1', 'e.GND'), wire('uno.D11', 'e.DIN'), wire('uno.D13', 'e.CLK'), wire(`uno.${cs}`, 'e.CS'), wire(`uno.${dc}`, 'e.DC'), wire('uno.D8', 'e.RST'), wire('uno.D7', 'e.BUSY')]
const EPD = (cls, panel, body, rot = 0) => `#include <${cls}.h>
${cls}<${panel}, ${panel}::HEIGHT> d(${panel}(10, 9, 8, 7));
void setup(){ Serial.begin(9600); d.init(); d.setRotation(${rot}); Serial.print("wh="); Serial.print(d.width()); Serial.print(","); Serial.println(d.height());
  unsigned long t0 = millis(); d.setFullWindow(); d.firstPage();
  do { d.fillScreen(GxEPD_WHITE); ${body} } while (d.nextPage());
  Serial.print("full="); Serial.println(millis() - t0);
  t0 = millis(); d.setPartialWindow(16, 16, 16, 16); d.firstPage();
  do { d.fillScreen(GxEPD_WHITE); d.fillRect(16, 16, 8, 8, GxEPD_BLACK); } while (d.nextPage());
  Serial.print("part="); Serial.println(millis() - t0); }
void loop(){}`
// tipo → [painel GxEPD2, largura, altura (na face, deitado), rotação para ficar deitado, s completa, s parcial]
const EPDS = {
  epaper154: ['GxEPD2_154_D67', 200, 200, 0, 2.0, 0.3],
  epaper213: ['GxEPD2_213_BN', 250, 122, 1, 2.0, 0.3],
  epaper290: ['GxEPD2_290_BS', 296, 128, 1, 2.0, 0.3],
  epaper420: ['GxEPD2_420_GDEY042T81', 400, 300, 0, 3.5, 0.6],
  epaper750: ['GxEPD2_750_T7', 800, 480, 0, 4.0, 0.9],
}
for (const [type, [panel, w, h, rot, tFull, tPart]] of Object.entries(EPDS)) {
  test(`${type}: ${w}×${h} P/B, atualização completa ~${tFull} s e parcial ~${tPart} s, vermelho/cinzento saem a branco (GxEPD2_BW)`, async () => {
    const body = `d.fillRect(0, 0, 10, 10, GxEPD_BLACK); d.drawPixel(${w - 1}, ${h - 1}, GxEPD_BLACK); d.drawPixel(${w}, 5, GxEPD_BLACK); d.fillRect(40, 40, 6, 6, GxEPD_RED); d.fillRect(60, 40, 6, 6, GxEPD_DARKGREY);`
    const b = await bench({ parts: [UNO(), part('e', type)], wires: epdW(), code: EPD('GxEPD2_BW', panel, body, rot) })
    b.advance(0.5)
    // a meio da 1.ª atualização: BUSY ativo (HIGH nos SSD16xx; LOW no UC8179 do 7,5")
    const busyActive = type === 'epaper750' ? 0 : 3.3
    near(b.v('e.BUSY', 'uno.GND.1'), busyActive, 0.4, 'BUSY durante a atualização')
    ok(b.live.e.ref && b.live.e.ref.full === true, 'a 1.ª atualização é completa (pisca)')
    b.advance(tFull + tPart + 1.5)
    near(b.v('e.BUSY', 'uno.GND.1'), 3.3 - busyActive, 0.4, 'BUSY em repouso')
    same(nums(b, 'wh'), [w, h], `resolução com setRotation(${rot})`)
    same([b.live.e.w, b.live.e.h], [w, h], 'imagem na face do módulo')
    near(nums(b, 'full')[0] / 1000, tFull, 0.5, 'tempo da atualização completa (s)')
    near(nums(b, 'part')[0] / 1000, tPart, 0.25, 'tempo da atualização parcial (s)')
    const img = state(b, 'e').img
    const px = (x, y) => img[y * w + x]
    // a atualização parcial só mexe na janela 16×16: o resto da 1.ª imagem fica
    same([px(0, 0), px(9, 9), px(10, 10), px(w - 1, h - 1), px(w - 2, h - 1)], [1, 1, 0, 1, 0], 'preto (1) / branco (0)')
    same([px(42, 42), px(62, 42), px(63, 42)], [0, 0, 0], 'vermelho e cinzento num painel P/B: branco')
    same([px(16, 16), px(23, 23), px(24, 24), px(31, 31)], [1, 1, 0, 0], 'janela parcial')
    let ink = 0
    for (const v of img) ink += v
    same([ink], [100 + 1 + 64], 'total de pontos pretos')
    same([b.live.e.refreshes], [2], 'duas atualizações')
  })
}

test('e-paper 1,54" de 3 cores (GxEPD2_3C): vermelho disponível, atualização ~15 s e sem parcial', async () => {
  const b = await bench({ parts: [UNO(), part('e', 'epaper154', { color: 'bwr' })], wires: epdW(), code: EPD('GxEPD2_3C', 'GxEPD2_154_Z90c', 'd.fillRect(0, 0, 10, 10, GxEPD_BLACK); d.fillRect(40, 40, 6, 6, GxEPD_RED);') })
  b.advance(10) // a meio da 1.ª atualização (15 s): a imagem pedida já está na memória do painel
  const img = Array.from(state(b, 'e').img)
  ok(b.live.e.ref && b.live.e.ref.full, 'ainda a atualizar aos 10 s')
  b.advance(23)
  same([img[0], img[42 * 200 + 42], img[100 * 200 + 100]], [1, 2, 0], 'preto, vermelho, branco')
  near(nums(b, 'full')[0] / 1000, 15, 1.5, 'atualização completa (s)')
  near(nums(b, 'part')[0] / 1000, 15, 1.5, 'sem atualização parcial: volta a ser completa')
})

test('e-paper 5,65" de 7 cores (GxEPD2_7C): 600×448, 7 cores ACeP, ~12 s por atualização, BUSY ativo a LOW', async () => {
  const cols = ['GxEPD_BLACK', 'GxEPD_WHITE', 'GxEPD_GREEN', 'GxEPD_BLUE', 'GxEPD_RED', 'GxEPD_YELLOW', 'GxEPD_ORANGE']
  const body = cols.map((c, i) => `d.fillRect(${i * 20}, 100, 20, 20, ${c});`).join(' ') + ' d.drawPixel(599, 447, GxEPD_BLUE);'
  const b = await bench({
    parts: [UNO(), part('e', 'epaper565')],
    wires: epdW(),
    code: `#include <GxEPD2_7C.h>
GxEPD2_7C<GxEPD2_565c, GxEPD2_565c::HEIGHT / 4> d(GxEPD2_565c(10, 9, 8, 7));
void setup(){ Serial.begin(9600); d.init(); Serial.print("wh="); Serial.print(d.width()); Serial.print(","); Serial.println(d.height());
  unsigned long t0 = millis(); d.setFullWindow(); d.firstPage(); do { d.fillScreen(GxEPD_WHITE); ${body} } while (d.nextPage()); Serial.print("full="); Serial.println(millis() - t0); }
void loop(){}`,
  })
  b.advance(1)
  near(b.v('e.BUSY', 'uno.GND.1'), 0, 0.4, 'BUSY a LOW durante a atualização')
  b.advance(13)
  near(b.v('e.BUSY', 'uno.GND.1'), 3.3, 0.4, 'BUSY a HIGH em repouso')
  same(nums(b, 'wh'), [600, 448], 'resolução')
  near(nums(b, 'full')[0] / 1000, 12, 1.5, 'atualização completa (s)')
  const img = state(b, 'e').img
  const got = cols.map((_, i) => img[110 * 600 + i * 20 + 10])
  same([new Set(got).size], [7], `7 cores diferentes: ${got}`)
  same([got[0], got[1], got[4]], [1, 0, 2], 'preto, branco e vermelho nos índices da paleta')
  ok(img[447 * 600 + 599] === got[3], 'canto inferior direito a azul')
})

test('e-paper: sem alimentação ou com CS/DC noutro pino a imagem não muda', async () => {
  for (const [nome, w] of [['sem alimentação', { vcc: 'GND.2' }], ['CS noutro pino', { cs: 'D6' }], ['DC noutro pino', { dc: 'D6' }]]) {
    const b = await bench({ parts: [UNO(), part('e', 'epaper154')], wires: epdW(w), code: EPD('GxEPD2_BW', 'GxEPD2_154_D67', 'd.fillRect(0, 0, 10, 10, GxEPD_BLACK);') })
    b.advance(4)
    const img = state(b, 'e')?.img
    ok(!img || !img.some((v) => v), `${nome}: não devia haver tinta preta`)
    ok(!b.live.e.refreshes, `${nome}: não devia haver atualizações`)
  }
})
