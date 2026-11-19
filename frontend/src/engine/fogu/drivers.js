// Drivers da biblioteca mcu (import x from "mcu/drivers/NOME", mcu v0.8.0) no simulador.
// Na placa real os drivers são módulos em Fogu que falam com o chip pelos pinos / I2C / SPI; aqui
// cada função é traduzida para a biblioteca Arduino simulada equivalente (DHT, LiquidCrystal_I2C,
// Adafruit_SSD1306, …), com AS MESMAS unidades inteiras e os mesmos valores de retorno do cabeçalho
// de cada módulo (dht: décimas de °C; ds18b20 e bme280: centésimas; hcsr04: mm, −1 sem eco;
// mpu6050: mg e milésimas de °/s; …).
//
// Cada driver serve um dispositivo de cada vez (como na biblioteca: begin() escolhe-o). Os
// argumentos de begin() que dizem qual é o dispositivo (pinos, endereço I2C, chip select, tamanho)
// têm de ser fixos (literais ou const): o objeto da biblioteca simulada é criado com eles.
//
// Especificação de cada driver:
//   consts   constantes exportadas (dht.DHT22, …)
//   fns      nome → { p: tipos dos parâmetros, r: tipo devolvido, cfg: true (é o begin) }
//            tipos: int bool str bytes pin pwm i2c spi void
//   other    funções que existem no driver real mas ainda não são simuladas (mensagem clara)
//   headers  #includes
//   cpp(cfg, ctx)  código C++ (objeto global + funções __d_<driver>_<função>); cfg = valores fixos
//            dos parâmetros do begin (os i2c ficam null; spi = { cs, sck, mosi, miso })
// A chamada drv.f(a, b) vira __d_<driver>_<f>(a, b) (pin / pwm passam o número do pino; os
// parâmetros fixos do begin não são passados).

export const DRIVERS = {
  // ------------------------------------------------------------------ DHT11 / DHT22
  dht: {
    consts: { DHT11: 11, DHT22: 22, OK: 0, NO_RESPONSE: 1, TIMEOUT: 2, CHECKSUM: 3, RANGE: 4 },
    fns: { begin: { p: ['pin', 'int'], r: 'bool', cfg: true }, read: { p: [], r: 'bool' }, temperature: { p: [], r: 'int' }, humidity: { p: [], r: 'int' }, error: { p: [], r: 'int' } },
    other: ['decode', 'data'],
    headers: ['DHT.h'],
    cpp: ([pin, type]) => `
DHT __d_dht(${pin}, ${type === 11 ? 'DHT11' : 'DHT22'});
long __d_dht_t = 0;
long __d_dht_h = 0;
long __d_dht_e = 0;
bool __d_dht_begin() { __d_dht.begin(); return true; }
bool __d_dht_read() {
  float h = __d_dht.readHumidity();
  float t = __d_dht.readTemperature();
  if (isnan(h) || isnan(t)) { __d_dht_e = 1; return false; }
  __d_dht_t = (long)round(t * 10);
  __d_dht_h = (long)round(h * 10);
  __d_dht_e = 0;
  return true;
}
long __d_dht_temperature() { return __d_dht_t; }
long __d_dht_humidity() { return __d_dht_h; }
long __d_dht_error() { return __d_dht_e; }`,
  },

  // ------------------------------------------------------------------ DS18B20 (1-Wire)
  ds18b20: {
    consts: { OK: 0, NO_DEVICE: 1, BUS_LOW: 2, TOO_SLOW: 3, CRC: 4, NO_DATA: 5, WRONG_FAMILY: 6, RANGE: 7 },
    fns: {
      begin: { p: ['pin'], r: 'bool', cfg: true }, read: { p: [], r: 'bool' }, temperature: { p: [], r: 'int' }, raw: { p: [], r: 'int' }, error: { p: [], r: 'int' },
      start: { p: [], r: 'bool' }, ready: { p: [], r: 'bool' }, fetch: { p: [], r: 'bool' }, conversionMs: { p: [], r: 'int' },
      setResolution: { p: ['int'], r: 'bool' }, resolution: { p: [], r: 'int' }, family: { p: [], r: 'int' },
    },
    other: ['convert', 'romByte'],
    headers: ['OneWire.h', 'DallasTemperature.h'],
    cpp: ([pin]) => `
OneWire __d_ow(${pin});
DallasTemperature __d_ds(&__d_ow);
long __d_ds_t = 0;
long __d_ds_e = 1;
long __d_ds_bits = 12;
bool __d_ds18b20_begin() {
  __d_ds.begin();
  if (__d_ds.getDeviceCount() < 1) { __d_ds_e = 1; return false; }
  __d_ds_e = 0;
  return true;
}
bool __d_ds18b20_fetch() {
  float t = __d_ds.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C) { __d_ds_e = 1; return false; }
  __d_ds_t = (long)round(t * 100);
  __d_ds_e = 0;
  return true;
}
bool __d_ds18b20_read() { __d_ds.setWaitForConversion(true); __d_ds.requestTemperatures(); return __d_ds18b20_fetch(); }
bool __d_ds18b20_start() { __d_ds.setWaitForConversion(false); __d_ds.requestTemperatures(); return __d_ds_e == 0; }
bool __d_ds18b20_ready() { return __d_ds.isConversionComplete(); }
long __d_ds18b20_conversionMs() { return 750 >> (12 - __d_ds_bits); }
long __d_ds18b20_temperature() { return __d_ds_t; }
long __d_ds18b20_raw() { return (__d_ds_t * 16 + 50) / 100; }
long __d_ds18b20_error() { return __d_ds_e; }
bool __d_ds18b20_setResolution(long b) { if (b < 9 || b > 12) return false; __d_ds_bits = b; __d_ds.setResolution(b); return true; }
long __d_ds18b20_resolution() { return __d_ds_bits; }
long __d_ds18b20_family() { return 0x28; }`,
  },

  // ------------------------------------------------------------------ HC-SR04
  hcsr04: {
    consts: { OK: 0, NO_ECHO: 1, OUT_OF_RANGE: 2 },
    fns: {
      begin: { p: ['pin', 'pin'], r: 'bool' }, read: { p: [], r: 'int' }, readMedian: { p: [], r: 'int' }, pulse: { p: [], r: 'int' }, distance: { p: ['int'], r: 'int' },
      setSpeed: { p: ['int'], r: 'bool' }, setTemperature: { p: ['int'], r: 'bool' }, speedOfSound: { p: [], r: 'int' }, setLimit: { p: ['int'], r: 'bool' }, error: { p: [], r: 'int' },
    },
    headers: [],
    // begin() escolhe o sensor em cada chamada (vários HC-SR04: begin() de novo para trocar)
    cpp: () => `
long __d_us_trig = -1;
long __d_us_echo = -1;
long __d_us_e = 0;
long __d_us_v = 3430;    // velocidade do som em décimas de m/s (343 m/s a 20 °C)
long __d_us_lim = 25000; // µs: ~4,3 m ida e volta
long __d_hcsr04_pulse() {
  if (__d_us_trig < 0) { __d_us_e = 1; return -1; }
  digitalWrite(__d_us_trig, LOW);
  delayMicroseconds(2);
  digitalWrite(__d_us_trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(__d_us_trig, LOW);
  long us = (long)pulseIn(__d_us_echo, HIGH, (unsigned long)__d_us_lim);
  if (us <= 0) { __d_us_e = 2; return -1; }
  __d_us_e = 0;
  return us;
}
long __d_hcsr04_distance(long us) { return us * __d_us_v / 20000; }
long __d_hcsr04_read() { long us = __d_hcsr04_pulse(); return us < 0 ? -1 : __d_hcsr04_distance(us); }
long __d_hcsr04_readMedian() {
  long v[5];
  long n = 0;
  for (long i = 0; i < 5; i++) {
    long d = __d_hcsr04_read();
    if (d >= 0) { v[n] = d; n++; }
    delay(30);
  }
  if (n == 0) return -1;
  for (long i = 1; i < n; i++) for (long j = i; j > 0 && v[j - 1] > v[j]; j--) { long t = v[j]; v[j] = v[j - 1]; v[j - 1] = t; }
  return v[n / 2];
}
bool __d_hcsr04_begin(long trig, long echo) {
  __d_us_trig = trig;
  __d_us_echo = echo;
  pinMode(trig, OUTPUT);
  digitalWrite(trig, LOW);
  pinMode(echo, INPUT);
  return true;
}
bool __d_hcsr04_setSpeed(long v) { if (v < 3000 || v > 4000) return false; __d_us_v = v; return true; }
bool __d_hcsr04_setTemperature(long c) { if (c < -40 || c > 85) return false; __d_us_v = 3313 + (c * 606) / 100; return true; }
long __d_hcsr04_speedOfSound() { return __d_us_v; }
bool __d_hcsr04_setLimit(long us) { if (us < 100 || us > 60000) return false; __d_us_lim = us; return true; }
long __d_hcsr04_error() { return __d_us_e; }`,
  },

  // ------------------------------------------------------------------ LCD com mochila I2C
  lcd: {
    consts: { ADDRESS: 0x27, ADDRESS_A: 0x3f },
    fns: {
      begin: { p: ['i2c', 'int', 'int', 'int'], r: 'bool', cfg: true }, clear: { p: [], r: 'bool' }, cursor: { p: ['int', 'int'], r: 'bool' }, write: { p: ['str'], r: 'bool' },
      text: { p: ['int', 'int', 'str'], r: 'bool' }, backlight: { p: ['bool'], r: 'bool' }, show: { p: ['bool', 'bool', 'bool'], r: 'bool' }, createChar: { p: ['int', 'bytes'], r: 'bool' }, writeCode: { p: ['int'], r: 'bool' },
    },
    headers: ['LiquidCrystal_I2C.h'],
    cpp: ([, addr, cols, rows]) => `
LiquidCrystal_I2C __d_lcd(${addr}, ${cols}, ${rows});
bool __d_lcd_ok = false;
bool __d_lcd_begin() {
  Wire.begin();
  Wire.beginTransmission(${addr});
  __d_lcd_ok = Wire.endTransmission() == 0;
  __d_lcd.init();
  __d_lcd.backlight();
  return __d_lcd_ok;
}
bool __d_lcd_clear() { __d_lcd.clear(); return __d_lcd_ok; }
bool __d_lcd_cursor(long c, long r) {
  if (c < 0 || c >= ${cols} || r < 0 || r >= ${rows}) return false;
  __d_lcd.setCursor(c, r);
  return __d_lcd_ok;
}
bool __d_lcd_write(String s) { __d_lcd.print(s); return __d_lcd_ok; }
bool __d_lcd_text(long c, long r, String s) { if (!__d_lcd_cursor(c, r)) return false; __d_lcd.print(s); return __d_lcd_ok; }
bool __d_lcd_backlight(bool on) { if (on) __d_lcd.backlight(); else __d_lcd.noBacklight(); return __d_lcd_ok; }
bool __d_lcd_show(bool t, bool u, bool b) {
  if (t) __d_lcd.display(); else __d_lcd.noDisplay();
  if (u) __d_lcd.cursor(); else __d_lcd.noCursor();
  if (b) __d_lcd.blink(); else __d_lcd.noBlink();
  return __d_lcd_ok;
}
bool __d_lcd_createChar(long slot, FgBytes rows) {
  if (slot < 0 || slot > 7) return false;
  uint8_t m[8];
  for (int i = 0; i < 8; i++) m[i] = i < rows.n ? (uint8_t)rows.d[i] : 0;
  __d_lcd.createChar(slot, m);
  return __d_lcd_ok;
}
bool __d_lcd_writeCode(long c) { __d_lcd.write((uint8_t)c); return __d_lcd_ok; }`,
  },

  // ------------------------------------------------------------------ LCD paralelo (6 pinos)
  hd44780: {
    consts: {},
    fns: {
      begin: { p: ['pin', 'pin', 'pin', 'pin', 'pin', 'pin', 'int', 'int'], r: 'bool', cfg: true }, clear: { p: [], r: 'bool' }, home: { p: [], r: 'bool' }, cursor: { p: ['int', 'int'], r: 'bool' },
      write: { p: ['str'], r: 'bool' }, text: { p: ['int', 'int', 'str'], r: 'bool' }, show: { p: ['bool', 'bool', 'bool'], r: 'bool' }, createChar: { p: ['int', 'bytes'], r: 'bool' }, writeCode: { p: ['int'], r: 'bool' },
    },
    headers: ['LiquidCrystal.h'],
    cpp: ([rs, e, d4, d5, d6, d7, cols, rows]) => `
LiquidCrystal __d_hd(${rs}, ${e}, ${d4}, ${d5}, ${d6}, ${d7});
bool __d_hd44780_begin() { if (${cols} * ${rows} > 80) return false; __d_hd.begin(${cols}, ${rows}); return true; }
bool __d_hd44780_clear() { __d_hd.clear(); return true; }
bool __d_hd44780_home() { __d_hd.home(); return true; }
bool __d_hd44780_cursor(long c, long r) {
  if (c < 0 || c >= ${cols} || r < 0 || r >= ${rows}) return false;
  __d_hd.setCursor(c, r);
  return true;
}
bool __d_hd44780_write(String s) { __d_hd.print(s); return true; }
bool __d_hd44780_text(long c, long r, String s) { if (!__d_hd44780_cursor(c, r)) return false; __d_hd.print(s); return true; }
bool __d_hd44780_show(bool t, bool u, bool b) {
  if (t) __d_hd.display(); else __d_hd.noDisplay();
  if (u) __d_hd.cursor(); else __d_hd.noCursor();
  if (b) __d_hd.blink(); else __d_hd.noBlink();
  return true;
}
bool __d_hd44780_createChar(long slot, FgBytes rows) {
  if (slot < 0 || slot > 7) return false;
  uint8_t m[8];
  for (int i = 0; i < 8; i++) m[i] = i < rows.n ? (uint8_t)rows.d[i] : 0;
  __d_hd.createChar(slot, m);
  return true;
}
bool __d_hd44780_writeCode(long c) { __d_hd.write((uint8_t)c); return true; }`,
  },

  // ------------------------------------------------------------------ OLED SSD1306 (I2C)
  ssd1306: {
    consts: { ADDRESS: 0x3c, ADDRESS_ALT: 0x3d, WIDTH: 128 },
    fns: {
      begin: { p: ['i2c', 'int', 'int'], r: 'bool', cfg: true }, rows: { p: [], r: 'int' }, clear: { p: [], r: 'bool' }, text: { p: ['int', 'int', 'str'], r: 'bool' }, bigText: { p: ['int', 'int', 'str'], r: 'bool' },
      bar: { p: ['int', 'int', 'int', 'int'], r: 'bool' }, fill: { p: ['int', 'int', 'int', 'int'], r: 'bool' }, draw: { p: ['int', 'int', 'bytes'], r: 'bool' },
      contrast: { p: ['int'], r: 'bool' }, invert: { p: ['bool'], r: 'bool' }, power: { p: ['bool'], r: 'bool' }, flip: { p: ['bool'], r: 'bool' },
    },
    headers: ['Adafruit_GFX.h', 'Adafruit_SSD1306.h'],
    cpp: ([, addr, height]) => `
Adafruit_SSD1306 __d_oled(128, ${height === 32 ? 32 : 64}, &Wire, -1);
bool __d_oled_ok = false;
bool __d_ssd1306_begin() {
  __d_oled_ok = __d_oled.begin(SSD1306_SWITCHCAPVCC, ${addr});
  if (__d_oled_ok) { __d_oled.clearDisplay(); __d_oled.setTextColor(SSD1306_WHITE, SSD1306_BLACK); __d_oled.display(); }
  return __d_oled_ok;
}
long __d_ssd1306_rows() { return ${height === 32 ? 4 : 8}; }
bool __d_ssd1306_clear() { if (!__d_oled_ok) return false; __d_oled.clearDisplay(); __d_oled.display(); return true; }
// texto em células de 6 × 8 (21 colunas); cada célula é escrita com o fundo (apaga o que lá estava)
bool __d_ssd1306_text(long c, long r, String s) {
  if (!__d_oled_ok || c < 0 || c > 20 || r < 0 || r >= __d_ssd1306_rows()) return false;
  long n = (long)s.length();
  if (c + n > 21) n = 21 - c;
  __d_oled.fillRect(c * 6, r * 8, n * 6, 8, SSD1306_BLACK);
  __d_oled.setTextSize(1);
  __d_oled.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
  __d_oled.setCursor(c * 6, r * 8);
  __d_oled.print(s.substring(0, n));
  __d_oled.display();
  return true;
}
bool __d_ssd1306_bigText(long c, long r, String s) {
  if (!__d_oled_ok || c < 0 || c > 9 || r < 0 || r + 1 >= __d_ssd1306_rows()) return false;
  long n = (long)s.length();
  if (c + n > 10) n = 10 - c;
  __d_oled.fillRect(c * 12, r * 8, n * 12, 16, SSD1306_BLACK);
  __d_oled.setTextSize(2);
  __d_oled.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
  __d_oled.setCursor(c * 12, r * 8);
  __d_oled.print(s.substring(0, n));
  __d_oled.setTextSize(1);
  __d_oled.display();
  return true;
}
bool __d_ssd1306_bar(long r, long x, long w, long pct) {
  if (!__d_oled_ok || r < 0 || r >= __d_ssd1306_rows() || x < 0 || w < 2 || x + w > 128) return false;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  __d_oled.fillRect(x, r * 8, w, 8, SSD1306_BLACK);
  __d_oled.drawRect(x, r * 8, w, 8, SSD1306_WHITE);
  __d_oled.fillRect(x + 1, r * 8 + 1, ((w - 2) * pct) / 100, 6, SSD1306_WHITE);
  __d_oled.display();
  return true;
}
bool __d_ssd1306_fill(long x, long page, long w, long pat) {
  if (!__d_oled_ok || x < 0 || x + w > 128 || page < 0 || page >= __d_ssd1306_rows()) return false;
  for (long i = 0; i < w; i++) for (long b = 0; b < 8; b++) __d_oled.drawPixel(x + i, page * 8 + b, (pat >> b) & 1 ? SSD1306_WHITE : SSD1306_BLACK);
  __d_oled.display();
  return true;
}
bool __d_ssd1306_draw(long x, long page, FgBytes cols) {
  if (!__d_oled_ok || x < 0 || x + cols.n > 128 || page < 0 || page >= __d_ssd1306_rows()) return false;
  for (long i = 0; i < cols.n; i++) for (long b = 0; b < 8; b++) __d_oled.drawPixel(x + i, page * 8 + b, (cols.d[i] >> b) & 1 ? SSD1306_WHITE : SSD1306_BLACK);
  __d_oled.display();
  return true;
}
bool __d_ssd1306_contrast(long v) { if (v < 0 || v > 255) return false; __d_oled.ssd1306_command(0x81); __d_oled.ssd1306_command(v); return __d_oled_ok; }
bool __d_ssd1306_invert(bool on) { __d_oled.invertDisplay(on); return __d_oled_ok; }
bool __d_ssd1306_power(bool on) { __d_oled.ssd1306_command(on ? 0xAF : 0xAE); return __d_oled_ok; }
bool __d_ssd1306_flip(bool on) { __d_oled.setRotation(on ? 2 : 0); __d_oled.display(); return __d_oled_ok; }`,
  },

  // ------------------------------------------------------------------ TM1637 (4 dígitos)
  tm1637: {
    consts: { MINUS: 0x40, BLANK: 0, DOT: 0x80 },
    fns: {
      begin: { p: ['pin', 'pin'], r: 'bool', cfg: true }, bitDelay: { p: ['int'], r: 'bool' }, glyph: { p: ['int'], r: 'int' }, raw: { p: ['int', 'int', 'int', 'int'], r: 'bool' }, digit: { p: ['int', 'int'], r: 'bool' },
      number: { p: ['int'], r: 'bool' }, clock: { p: ['int', 'int', 'bool'], r: 'bool' }, hex: { p: ['int'], r: 'bool' }, colon: { p: ['bool'], r: 'bool' }, clear: { p: [], r: 'bool' },
      brightness: { p: ['int'], r: 'bool' }, power: { p: ['bool'], r: 'bool' },
    },
    headers: ['TM1637Display.h'],
    cpp: ([clk, dio]) => `
TM1637Display __d_tm(${clk}, ${dio});
uint8_t __d_tm_s[4] = {0, 0, 0, 0};
long __d_tm_b = 7;
bool __d_tm_on = true;
const uint8_t __d_tm_g[16] = {0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71};
bool __d_tm1637_show() { __d_tm.setSegments(__d_tm_s, 4, 0); return true; }
bool __d_tm1637_begin() { __d_tm.setBrightness(7, true); return __d_tm1637_show(); }
bool __d_tm1637_bitDelay(long us) { return us >= 1 && us <= 1000; }
long __d_tm1637_glyph(long v) { return v >= 0 && v < 16 ? __d_tm_g[v] : 0; }
bool __d_tm1637_raw(long a, long b, long c, long d) { __d_tm_s[0] = a; __d_tm_s[1] = b; __d_tm_s[2] = c; __d_tm_s[3] = d; return __d_tm1637_show(); }
bool __d_tm1637_digit(long pos, long seg) { if (pos < 0 || pos > 3) return false; __d_tm_s[pos] = seg; return __d_tm1637_show(); }
bool __d_tm1637_number(long n) {
  if (n < -999 || n > 9999) return false;
  bool neg = n < 0;
  long v = neg ? -n : n;
  for (int i = 3; i >= 0; i--) {
    if (v == 0 && i < 3) { __d_tm_s[i] = 0; continue; }
    __d_tm_s[i] = __d_tm_g[v % 10];
    v /= 10;
  }
  if (neg) for (int i = 3; i >= 0; i--) if (__d_tm_s[i] == 0) { __d_tm_s[i] = 0x40; break; }
  return __d_tm1637_show();
}
bool __d_tm1637_clock(long l, long r, bool colon) {
  if (l < 0 || l > 99 || r < 0 || r > 99) return false;
  __d_tm_s[0] = __d_tm_g[l / 10]; __d_tm_s[1] = __d_tm_g[l % 10] | (colon ? 0x80 : 0);
  __d_tm_s[2] = __d_tm_g[r / 10]; __d_tm_s[3] = __d_tm_g[r % 10];
  return __d_tm1637_show();
}
bool __d_tm1637_hex(long n) {
  if (n < 0 || n > 0xFFFF) return false;
  for (int i = 3; i >= 0; i--) { __d_tm_s[i] = __d_tm_g[n & 15]; n >>= 4; }
  return __d_tm1637_show();
}
bool __d_tm1637_colon(bool on) { if (on) __d_tm_s[1] |= 0x80; else __d_tm_s[1] &= 0x7F; return __d_tm1637_show(); }
bool __d_tm1637_clear() { for (int i = 0; i < 4; i++) __d_tm_s[i] = 0; return __d_tm1637_show(); }
bool __d_tm1637_brightness(long b) { if (b < 0 || b > 7) return false; __d_tm_b = b; __d_tm.setBrightness(b, __d_tm_on); return __d_tm1637_show(); }
bool __d_tm1637_power(bool on) { __d_tm_on = on; __d_tm.setBrightness(__d_tm_b, on); return __d_tm1637_show(); }`,
  },

  // ------------------------------------------------------------------ MAX7219 (SPI)
  max7219: {
    consts: { MAX_MODULES: 4, CODE_MINUS: 10, CODE_E: 11, CODE_H: 12, CODE_L: 13, CODE_P: 14, CODE_BLANK: 15 },
    fns: {
      begin: { p: ['spi', 'int'], r: 'bool', cfg: true }, modules: { p: [], r: 'int' }, test: { p: ['int', 'bool'], r: 'bool' }, power: { p: ['int', 'bool'], r: 'bool' }, intensity: { p: ['int', 'int'], r: 'bool' },
      scanLimit: { p: ['int', 'int'], r: 'bool' }, segments: { p: ['int', 'int', 'int'], r: 'bool' }, row: { p: ['int', 'int', 'int'], r: 'bool' }, pixel: { p: ['int', 'int', 'int', 'bool'], r: 'bool' },
      shown: { p: ['int', 'int'], r: 'int' }, clear: { p: ['int'], r: 'bool' }, pattern: { p: ['int'], r: 'int' }, digit: { p: ['int', 'int', 'int', 'bool'], r: 'bool' }, number: { p: ['int', 'int'], r: 'bool' },
    },
    other: ['write', 'decode', 'codeB'],
    headers: ['LedControl.h'],
    cpp: ([sp, n]) => `
LedControl __d_mx(${sp.mosi}, ${sp.sck}, ${sp.cs}, ${n});
uint8_t __d_mx_b[${8 * n}];
const uint8_t __d_mx_g[16] = {0x7E, 0x30, 0x6D, 0x79, 0x33, 0x5B, 0x5F, 0x70, 0x7F, 0x7B, 0x77, 0x1F, 0x4E, 0x3D, 0x4F, 0x47};
bool __d_mx_okm(long m) { return m >= 0 && m < ${n}; }
bool __d_max7219_begin() {
  if (${n} < 1 || ${n} > 4) return false;
  for (int m = 0; m < ${n}; m++) {
    __d_mx.shutdown(m, false);
    __d_mx.setIntensity(m, 8);
    __d_mx.clearDisplay(m);
    for (int i = 0; i < 8; i++) __d_mx_b[m * 8 + i] = 0;
  }
  return true;
}
long __d_max7219_modules() { return ${n}; }
bool __d_max7219_test(long m, bool on) { return __d_mx_okm(m); }
bool __d_max7219_power(long m, bool on) { if (!__d_mx_okm(m)) return false; __d_mx.shutdown(m, !on); return true; }
bool __d_max7219_intensity(long m, long v) { if (!__d_mx_okm(m) || v < 0 || v > 15) return false; __d_mx.setIntensity(m, v); return true; }
bool __d_max7219_scanLimit(long m, long d) { if (!__d_mx_okm(m) || d < 1 || d > 8) return false; __d_mx.setScanLimit(m, d - 1); return true; }
bool __d_max7219_segments(long m, long d, long bits) {
  if (!__d_mx_okm(m) || d < 0 || d > 7 || bits < 0 || bits > 255) return false;
  __d_mx_b[m * 8 + d] = bits;
  __d_mx.setRow(m, d, bits);
  return true;
}
bool __d_max7219_row(long m, long y, long bits) { return __d_max7219_segments(m, y, bits); }
bool __d_max7219_pixel(long m, long x, long y, bool on) {
  if (!__d_mx_okm(m) || x < 0 || x > 7 || y < 0 || y > 7) return false;
  long v = __d_mx_b[m * 8 + y];
  if (on) v |= (0x80 >> x); else v &= ~(0x80 >> x);
  return __d_max7219_segments(m, y, v & 0xFF);
}
long __d_max7219_shown(long m, long d) { return __d_mx_okm(m) && d >= 0 && d < 8 ? __d_mx_b[m * 8 + d] : 0; }
bool __d_max7219_clear(long m) { if (!__d_mx_okm(m)) return false; for (int i = 0; i < 8; i++) __d_mx_b[m * 8 + i] = 0; __d_mx.clearDisplay(m); return true; }
long __d_max7219_pattern(long v) { return v >= 0 && v < 16 ? __d_mx_g[v] : 0; }
bool __d_max7219_digit(long m, long d, long v, bool dp) { if (v < 0 || v > 15) return false; return __d_max7219_segments(m, d, __d_mx_g[v] | (dp ? 0x80 : 0)); }
bool __d_max7219_number(long m, long value) {
  if (!__d_mx_okm(m) || value < -9999999 || value > 99999999) return false;
  bool neg = value < 0;
  long v = neg ? -value : value;
  long d = 0;
  do { __d_max7219_segments(m, d, __d_mx_g[v % 10]); v /= 10; d++; } while (v > 0 && d < 8);
  if (neg && d < 8) { __d_max7219_segments(m, d, 0x01); d++; }
  while (d < 8) { __d_max7219_segments(m, d, 0); d++; }
  return true;
}`,
  },

  // ------------------------------------------------------------------ teclado matricial
  keypad: {
    consts: {},
    fns: {
      begin: { p: ['pin', 'pin', 'pin', 'pin', 'pin', 'pin', 'pin', 'pin'], r: 'bool', cfg: true },
      begin4x3: { p: ['pin', 'pin', 'pin', 'pin', 'pin', 'pin', 'pin'], r: 'bool', cfg: true },
      key: { p: [], r: 'str' }, name: { p: ['int'], r: 'str' },
    },
    other: ['scan', 'poll', 'layout', 'down', 'isDown'],
    headers: ['Keypad.h'],
    cpp: (pins) => {
      const c = pins.length - 4
      const rows = c === 4 ? `{'1', '2', '3', 'A'}, {'4', '5', '6', 'B'}, {'7', '8', '9', 'C'}, {'*', '0', '#', 'D'}` : `{'1', '2', '3'}, {'4', '5', '6'}, {'7', '8', '9'}, {'*', '0', '#'}`
      return `
char __d_kp_m[4][${c}] = {${rows}};
byte __d_kp_r[4] = {${pins.slice(0, 4).join(', ')}};
byte __d_kp_c[${c}] = {${pins.slice(4).join(', ')}};
Keypad __d_kp = Keypad(makeKeymap(__d_kp_m), __d_kp_r, __d_kp_c, 4, ${c});
bool __d_keypad_begin() { return true; }
bool __d_keypad_begin4x3() { return true; }
String __d_keypad_key() {
  char k = __d_kp.getKey();
  if (!k) return String("");
  return String(k);
}
String __d_keypad_name(long n) {
  const char* t = "123A456B789C*0#D";
  if (n < 0 || n > 15) return String("");
  return String(t[n]);
}`
    },
  },

  // ------------------------------------------------------------------ codificador rotativo
  encoder: {
    consts: {},
    fns: {
      begin: { p: ['pin', 'pin'], r: 'bool', cfg: true }, detents: { p: ['int'], r: 'bool' }, watch: { p: [], r: 'void' }, poll: { p: [], r: 'void' },
      raw: { p: [], r: 'int' }, position: { p: [], r: 'int' }, delta: { p: [], r: 'int' }, reset: { p: [], r: 'void' }, missed: { p: [], r: 'int' },
    },
    headers: ['Encoder.h'],
    cpp: ([a, b]) => `
Encoder __d_enc(${a}, ${b});
long __d_enc_det = 4;
long __d_enc_last = 0;
bool __d_encoder_begin() { __d_enc.write(0); __d_enc_last = 0; return true; }
bool __d_encoder_detents(long t) { if (t != 1 && t != 2 && t != 4) return false; __d_enc_det = t; return true; }
void __d_encoder_watch() {}
void __d_encoder_poll() {}
long __d_encoder_raw() { return (long)__d_enc.read(); }
// arredondado ao clique mais perto (muda a meio caminho entre dois repousos)
long __d_encoder_position() {
  long r = __d_encoder_raw();
  long h = __d_enc_det / 2;
  return r >= 0 ? (r + h) / __d_enc_det : -((-r + h) / __d_enc_det);
}
long __d_encoder_delta() { long p = __d_encoder_position(); long d = p - __d_enc_last; __d_enc_last = p; return d; }
void __d_encoder_reset() { __d_enc.write(0); __d_enc_last = 0; }
long __d_encoder_missed() { return 0; }`,
  },

  // ------------------------------------------------------------------ servos no PWM do chip
  servo: {
    consts: { PERIOD_US: 20000, MIN_US: 544, MAX_US: 2400 },
    fns: { write: { p: ['pwm', 'int'], r: 'int' }, writeMicros: { p: ['pwm', 'int'], r: 'int' }, detach: { p: ['pwm'], r: 'void' }, range: { p: ['int', 'int'], r: 'bool' }, pulseFor: { p: ['int'], r: 'int' }, dutyFor: { p: ['int'], r: 'int' } },
    headers: [],
    headersFor: (ctx) => [ctx.fam === 'esp32' ? 'ESP32Servo.h' : 'Servo.h'],
    cpp: (cfg, ctx) => `
Servo __d_sv[12];
long __d_svPin[12];
bool __d_svOn[12];
long __d_svN = 0;
long __d_svLo = 544;
long __d_svHi = 2400;
long __d_servo_idx(long p) {
  for (long i = 0; i < __d_svN; i++) if (__d_svPin[i] == p) return i;${ctx.fam === 'uno' || ctx.fam === 'nano' ? `
  // no ATmega328P só D9 e D10 (Timer1) fazem os 50 Hz de um servo
  if (p != 9 && p != 10) __fg_panic(String("servo no pino ") + String(p) + String(": no ATmega328P so D9 e D10 fazem 50 Hz"), 0);` : ''}
  if (__d_svN >= 12) __fg_panic(String("demasiados servos (12 no máximo)"), 0);
  __d_svPin[__d_svN] = p;
  __d_svOn[__d_svN] = false;
  __d_svN++;
  return __d_svN - 1;
}
bool __d_servo_range(long lo, long hi) { if (lo < 400 || hi > 2600 || lo >= hi) return false; __d_svLo = lo; __d_svHi = hi; return true; }
long __d_servo_pulseFor(long a) { if (a < 0) a = 0; if (a > 180) a = 180; return __d_svLo + ((__d_svHi - __d_svLo) * a + 90) / 180; }
long __d_servo_dutyFor(long us) { return (us + 1) / 2; }
long __d_servo_writeMicros(long p, long us) {
  if (us < 400 || us > 2600) __fg_panic(String("pulso de servo fora de 400..2600 µs: ") + String(us), 0);
  long i = __d_servo_idx(p);
  if (!__d_svOn[i]) { __d_sv[i].attach(p); __d_svOn[i] = true; }
  __d_sv[i].writeMicroseconds(us);
  return us;
}
long __d_servo_write(long p, long a) {
  if (a < 0 || a > 180) __fg_panic(String("ângulo de servo fora de 0..180: ") + String(a), 0);
  return __d_servo_writeMicros(p, __d_servo_pulseFor(a));
}
void __d_servo_detach(long p) { long i = __d_servo_idx(p); if (__d_svOn[i]) { __d_sv[i].detach(); __d_svOn[i] = false; } }`,
  },

  // ------------------------------------------------------------------ motor de passo (STEP / DIR)
  stepper: {
    consts: { MAX_SPEED: 40000, MAX_ACCELERATION: 1000000, MAX_POSITION: 500000000 },
    fns: {
      begin: { p: ['pin', 'pin'], r: 'bool', cfg: true }, enablePin: { p: ['pin'], r: 'void' }, enable: { p: [], r: 'void' }, disable: { p: [], r: 'void' },
      speed: { p: ['int'], r: 'bool' }, acceleration: { p: ['int'], r: 'bool' }, pulseWidth: { p: ['int'], r: 'bool' }, target: { p: ['int'], r: 'bool' }, tick: { p: [], r: 'bool' }, run: { p: [], r: 'void' },
      moveTo: { p: ['int'], r: 'bool' }, move: { p: ['int'], r: 'bool' }, stop: { p: [], r: 'void' }, position: { p: [], r: 'int' }, setPosition: { p: ['int'], r: 'bool' }, remaining: { p: [], r: 'int' }, moving: { p: [], r: 'bool' },
    },
    other: ['speedAt', 'pulses'],
    headers: ['AccelStepper.h'],
    cpp: ([step, dir]) => stepperCpp('stepper', `AccelStepper __d_stepper_m(AccelStepper::DRIVER, ${step}, ${dir});`, 1000),
  },
  uln2003: {
    consts: { MAX_POSITION: 1000000000, MAX_HALF_STEPS: 1000 },
    fns: {
      begin: { p: ['pin', 'pin', 'pin', 'pin', 'bool'], r: 'bool', cfg: true }, speed: { p: ['int'], r: 'bool' }, target: { p: ['int'], r: 'bool' }, tick: { p: [], r: 'bool' }, run: { p: [], r: 'void' },
      moveTo: { p: ['int'], r: 'bool' }, move: { p: ['int'], r: 'bool' }, release: { p: [], r: 'void' }, stop: { p: [], r: 'void' }, position: { p: [], r: 'int' }, setPosition: { p: ['int'], r: 'bool' }, remaining: { p: [], r: 'int' }, moving: { p: [], r: 'bool' },
    },
    headers: ['AccelStepper.h'],
    // a ordem do AccelStepper para o 28BYJ-48 é IN1, IN3, IN2, IN4
    cpp: ([a, b, c, d, half]) => stepperCpp('uln2003', `AccelStepper __d_uln2003_m(AccelStepper::${half ? 'HALF4WIRE' : 'FULL4WIRE'}, ${a}, ${c}, ${b}, ${d});`, half ? 500 : 250) + `\nvoid __d_uln2003_release() { __d_uln2003_m.disableOutputs(); }`,
  },

  // ------------------------------------------------------------------ HX711 (célula de carga)
  hx711: {
    consts: { OK: 0, TIMEOUT: 1, SPOILED: 2, STUCK: 3 },
    fns: {
      begin: { p: ['pin', 'pin'], r: 'bool', cfg: true }, ready: { p: [], r: 'bool' }, read: { p: [], r: 'bool' }, readAverage: { p: ['int'], r: 'bool' }, raw: { p: [], r: 'int' },
      tare: { p: ['int'], r: 'bool' }, offset: { p: [], r: 'int' }, setOffset: { p: ['int'], r: 'bool' }, setScale: { p: ['int', 'int'], r: 'bool' }, calibrate: { p: ['int', 'int'], r: 'bool' },
      scaleCountsPer: { p: [], r: 'int' }, value: { p: [], r: 'int' }, setGain: { p: ['int'], r: 'bool' }, setTimeout: { p: ['int'], r: 'bool' }, powerDown: { p: [], r: 'void' }, powerUp: { p: [], r: 'void' },
      clockWaitUs: { p: [], r: 'int' }, setClockWait: { p: ['int'], r: 'bool' }, error: { p: [], r: 'int' },
    },
    headers: ['HX711.h'],
    cpp: ([dout, sck]) => `
HX711 __d_hx;
long __d_hx_raw = 0;
long __d_hx_off = 0;
long __d_hx_cnt = 1;
long __d_hx_un = 1;
long __d_hx_e = 0;
long __d_hx_to = 1000;
bool __d_hx711_wait() { if (__d_hx.wait_ready_timeout(__d_hx_to)) { __d_hx_e = 0; return true; } __d_hx_e = 1; return false; }
bool __d_hx711_begin() { __d_hx.begin(${dout}, ${sck}); return __d_hx711_wait(); }
bool __d_hx711_ready() { return __d_hx.is_ready(); }
bool __d_hx711_read() { if (!__d_hx711_wait()) return false; __d_hx_raw = (long)__d_hx.read(); return true; }
bool __d_hx711_readAverage(long n) {
  if (n < 1 || n > 64) return false;
  float s = 0;
  for (long i = 0; i < n; i++) { if (!__d_hx711_read()) return false; s += __d_hx_raw; }
  __d_hx_raw = (long)round(s / n);
  return true;
}
long __d_hx711_raw() { return __d_hx_raw; }
bool __d_hx711_tare(long n) { if (!__d_hx711_readAverage(n)) return false; __d_hx_off = __d_hx_raw; return true; }
long __d_hx711_offset() { return __d_hx_off; }
bool __d_hx711_setOffset(long c) { __d_hx_off = c; return true; }
bool __d_hx711_setScale(long c, long u) { if (c == 0 || u <= 0) return false; __d_hx_cnt = c; __d_hx_un = u; return true; }
bool __d_hx711_calibrate(long u, long n) {
  if (u <= 0 || !__d_hx711_readAverage(n)) return false;
  long c = __d_hx_raw - __d_hx_off;
  if (c == 0) return false;
  __d_hx_cnt = c;
  __d_hx_un = u;
  return true;
}
long __d_hx711_scaleCountsPer() { return __d_hx_cnt / __d_hx_un; }
long __d_hx711_value() { return (long)round(((float)(__d_hx_raw - __d_hx_off)) * __d_hx_un / __d_hx_cnt); }
bool __d_hx711_setGain(long g) { if (g != 128 && g != 64 && g != 32) return false; __d_hx.set_gain(g); return true; }
bool __d_hx711_setTimeout(long ms) { if (ms < 1 || ms > 10000) return false; __d_hx_to = ms; return true; }
void __d_hx711_powerDown() { __d_hx.power_down(); }
void __d_hx711_powerUp() { __d_hx.power_up(); }
long __d_hx711_clockWaitUs() { return 0; }
bool __d_hx711_setClockWait(long us) { return us >= 0 && us <= 10; }
long __d_hx711_error() { return __d_hx_e; }`,
  },

  // ------------------------------------------------------------------ MPU-6050 (I2C)
  mpu6050: {
    consts: { ADDRESS: 0x68, ADDRESS_ALT: 0x69 },
    fns: {
      begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, range: { p: ['int', 'int'], r: 'bool' }, read: { p: [], r: 'bool' },
      ax: { p: [], r: 'int' }, ay: { p: [], r: 'int' }, az: { p: [], r: 'int' }, gx: { p: [], r: 'int' }, gy: { p: [], r: 'int' }, gz: { p: [], r: 'int' }, temperature: { p: [], r: 'int' },
    },
    other: ['decode'],
    headers: ['Adafruit_MPU6050.h', 'Adafruit_Sensor.h'],
    cpp: ([, addr]) => `
Adafruit_MPU6050 __d_mpu;
bool __d_mpu_ok = false;
long __d_mpu_v[7] = {0, 0, 0, 0, 0, 0, 0};
bool __d_mpu6050_begin() { __d_mpu_ok = __d_mpu.begin(${addr}); return __d_mpu_ok; }
bool __d_mpu6050_range(long g, long dps) {
  if (g != 2 && g != 4 && g != 8 && g != 16) return false;
  if (dps != 250 && dps != 500 && dps != 1000 && dps != 2000) return false;
  if (g == 2) __d_mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  else if (g == 4) __d_mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  else if (g == 8) __d_mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  else __d_mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  if (dps == 250) __d_mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  else if (dps == 500) __d_mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  else if (dps == 1000) __d_mpu.setGyroRange(MPU6050_RANGE_1000_DEG);
  else __d_mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
  return __d_mpu_ok;
}
bool __d_mpu6050_read() {
  if (!__d_mpu_ok) return false;
  sensors_event_t a, g, t;
  __d_mpu.getEvent(&a, &g, &t);
  __d_mpu_v[0] = (long)round(a.acceleration.x * 101.97162);
  __d_mpu_v[1] = (long)round(a.acceleration.y * 101.97162);
  __d_mpu_v[2] = (long)round(a.acceleration.z * 101.97162);
  __d_mpu_v[3] = (long)round(g.gyro.x * 57295.7795);
  __d_mpu_v[4] = (long)round(g.gyro.y * 57295.7795);
  __d_mpu_v[5] = (long)round(g.gyro.z * 57295.7795);
  __d_mpu_v[6] = (long)round(t.temperature * 100);
  return true;
}
long __d_mpu6050_ax() { return __d_mpu_v[0]; }
long __d_mpu6050_ay() { return __d_mpu_v[1]; }
long __d_mpu6050_az() { return __d_mpu_v[2]; }
long __d_mpu6050_gx() { return __d_mpu_v[3]; }
long __d_mpu6050_gy() { return __d_mpu_v[4]; }
long __d_mpu6050_gz() { return __d_mpu_v[5]; }
long __d_mpu6050_temperature() { return __d_mpu_v[6]; }`,
  },

  // ------------------------------------------------------------------ ADXL345 (I2C)
  adxl345: {
    consts: { ADDRESS: 0x53, ADDRESS_ALT: 0x1d },
    fns: { begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, range: { p: ['int'], r: 'bool' }, rate: { p: ['int'], r: 'bool' }, standby: { p: ['bool'], r: 'bool' }, read: { p: [], r: 'bool' }, x: { p: [], r: 'int' }, y: { p: [], r: 'int' }, z: { p: [], r: 'int' } },
    other: ['convert', 'decode'],
    headers: ['Adafruit_Sensor.h', 'Adafruit_ADXL345_U.h'],
    cpp: ([, addr]) => `
Adafruit_ADXL345_Unified __d_adx = Adafruit_ADXL345_Unified(12345);
bool __d_adx_ok = false;
long __d_adx_v[3] = {0, 0, 0};
bool __d_adxl345_begin() { __d_adx_ok = __d_adx.begin(${addr}); return __d_adx_ok; }
bool __d_adxl345_range(long g) {
  if (g == 2) __d_adx.setRange(ADXL345_RANGE_2_G);
  else if (g == 4) __d_adx.setRange(ADXL345_RANGE_4_G);
  else if (g == 8) __d_adx.setRange(ADXL345_RANGE_8_G);
  else if (g == 16) __d_adx.setRange(ADXL345_RANGE_16_G);
  else return false;
  return __d_adx_ok;
}
bool __d_adxl345_rate(long hz) { return hz > 0 && hz <= 3200 && __d_adx_ok; }
bool __d_adxl345_standby(bool on) { return __d_adx_ok; }
bool __d_adxl345_read() {
  if (!__d_adx_ok) return false;
  sensors_event_t e;
  __d_adx.getEvent(&e);
  __d_adx_v[0] = (long)round(e.acceleration.x * 101.97162);
  __d_adx_v[1] = (long)round(e.acceleration.y * 101.97162);
  __d_adx_v[2] = (long)round(e.acceleration.z * 101.97162);
  return true;
}
long __d_adxl345_x() { return __d_adx_v[0]; }
long __d_adxl345_y() { return __d_adx_v[1]; }
long __d_adxl345_z() { return __d_adx_v[2]; }`,
  },

  // ------------------------------------------------------------------ BH1750 (I2C)
  bh1750: {
    consts: { ADDRESS: 0x23, ADDRESS_ALT: 0x5c },
    fns: { begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, lux: { p: [], r: 'int' }, decilux: { p: [], r: 'int' }, raw: { p: [], r: 'int' }, fine: { p: ['bool'], r: 'bool' } },
    other: ['convert'],
    headers: ['BH1750.h'],
    cpp: ([, addr]) => `
BH1750 __d_bh(${addr});
bool __d_bh1750_begin() { Wire.begin(); return __d_bh.begin(); }
long __d_bh1750_lux() { float l = __d_bh.readLightLevel(); return l < 0 ? -1 : (long)round(l); }
long __d_bh1750_decilux() { float l = __d_bh.readLightLevel(); return l < 0 ? -1 : (long)round(l * 10); }
long __d_bh1750_raw() { float l = __d_bh.readLightLevel(); return l < 0 ? -1 : (long)round(l * 1.2); }
bool __d_bh1750_fine(bool on) { return true; }`,
  },

  // ------------------------------------------------------------------ BME280 / BMP280 (I2C)
  bme280: {
    consts: { ADDRESS: 0x76, ADDRESS_ALT: 0x77 },
    fns: {
      begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, read: { p: [], r: 'bool' }, temperature: { p: [], r: 'int' }, pressure: { p: [], r: 'int' }, humidity: { p: [], r: 'int' },
      hasHumidity: { p: [], r: 'bool' }, oversampling: { p: ['int', 'int', 'int'], r: 'void' },
    },
    other: ['loadCalibration', 'compensate', 'altitudeOf', 'altitude'],
    headers: ['Adafruit_BMP280.h'],
    // o simulador tem o BMP280 (sem humidade): a humidade fica 0, como a biblioteca faz num BMP280
    cpp: ([, addr]) => `
Adafruit_BMP280 __d_bmp;
bool __d_bmp_ok = false;
long __d_bmp_t = 0;
long __d_bmp_p = 0;
bool __d_bme280_begin() { __d_bmp_ok = __d_bmp.begin(${addr}); return __d_bmp_ok; }
bool __d_bme280_read() {
  if (!__d_bmp_ok) return false;
  float t = __d_bmp.readTemperature();
  float p = __d_bmp.readPressure();
  if (isnan(t) || isnan(p)) return false;
  __d_bmp_t = (long)round(t * 100);
  __d_bmp_p = (long)round(p);
  return true;
}
long __d_bme280_temperature() { return __d_bmp_t; }
long __d_bme280_pressure() { return __d_bmp_p; }
long __d_bme280_humidity() { return 0; }
bool __d_bme280_hasHumidity() { return false; }
void __d_bme280_oversampling(long t, long p, long h) {}`,
  },

  // ------------------------------------------------------------------ PCA9685 (I2C)
  pca9685: {
    consts: { ADDRESS: 0x40 },
    fns: {
      begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, frequency: { p: ['int'], r: 'bool' }, duty: { p: ['int', 'int'], r: 'bool' }, pulse: { p: ['int', 'int'], r: 'bool' },
      servoRange: { p: ['int', 'int'], r: 'void' }, servo: { p: ['int', 'int'], r: 'bool' }, off: { p: ['int'], r: 'bool' },
    },
    other: ['prescaleFor', 'periodOf', 'stepsFor'],
    headers: ['Adafruit_PWMServoDriver.h'],
    cpp: ([, addr]) => `
Adafruit_PWMServoDriver __d_pca = Adafruit_PWMServoDriver(${addr});
bool __d_pca_ok = false;
long __d_pca_lo = 500;
long __d_pca_hi = 2500;
bool __d_pca9685_begin() {
  Wire.begin();
  Wire.beginTransmission(${addr});
  __d_pca_ok = Wire.endTransmission() == 0;
  __d_pca.begin();
  __d_pca.setOscillatorFrequency(25000000);
  return __d_pca_ok;
}
bool __d_pca9685_frequency(long hz) { if (hz < 24 || hz > 1526) return false; __d_pca.setPWMFreq(hz); return __d_pca_ok; }
bool __d_pca9685_duty(long ch, long s) {
  if (ch < 0 || ch > 15 || s < 0 || s > 4096) return false;
  if (s >= 4096) __d_pca.setPWM(ch, 4096, 0); else if (s == 0) __d_pca.setPWM(ch, 0, 4096); else __d_pca.setPWM(ch, 0, s);
  return __d_pca_ok;
}
bool __d_pca9685_pulse(long ch, long us) { if (ch < 0 || ch > 15 || us < 0 || us > 40000) return false; __d_pca.writeMicroseconds(ch, us); return __d_pca_ok; }
void __d_pca9685_servoRange(long lo, long hi) { __d_pca_lo = lo; __d_pca_hi = hi; }
bool __d_pca9685_servo(long ch, long deg) {
  if (deg < 0 || deg > 180) return false;
  return __d_pca9685_pulse(ch, __d_pca_lo + ((__d_pca_hi - __d_pca_lo) * deg + 90) / 180);
}
bool __d_pca9685_off(long ch) { if (ch < 0 || ch > 15) return false; __d_pca.setPWM(ch, 0, 4096); return __d_pca_ok; }`,
  },

  // ------------------------------------------------------------------ PCF8574 (I2C)
  pcf8574: {
    consts: { ADDRESS: 0x20, ADDRESS_A: 0x38 },
    fns: { begin: { p: ['i2c', 'int'], r: 'bool', cfg: true }, write: { p: ['int', 'bool'], r: 'bool' }, writePort: { p: ['int'], r: 'bool' }, readPort: { p: [], r: 'int' }, read: { p: ['int'], r: 'bool' } },
    headers: ['PCF8574.h'],
    cpp: ([, addr]) => `
PCF8574 __d_pcf(${addr});
long __d_pcf_out = 0xFF;
bool __d_pcf8574_begin() { Wire.begin(); __d_pcf_out = 0xFF; return __d_pcf.begin(0xFF); }
bool __d_pcf8574_writePort(long v) { if (v < 0 || v > 255) return false; __d_pcf_out = v; __d_pcf.write8(v); return __d_pcf.isConnected(); }
bool __d_pcf8574_write(long p, bool h) {
  if (p < 0 || p > 7) return false;
  long v = h ? (__d_pcf_out | (1 << p)) : (__d_pcf_out & ~(1 << p));
  return __d_pcf8574_writePort(v & 0xFF);
}
long __d_pcf8574_readPort() { return (long)__d_pcf.read8(); }
bool __d_pcf8574_read(long p) { if (p < 0 || p > 7) return false; return ((__d_pcf8574_readPort() >> p) & 1) != 0; }`,
  },

  // ------------------------------------------------------------------ relógios DS3231 / DS1307
  ds3231: rtcDriver('ds3231', 'RTC_DS3231'),
  ds1307: rtcDriver('ds1307', 'RTC_DS1307'),

  // ------------------------------------------------------------------ MCP3008 (SPI)
  mcp3008: {
    consts: { MCP3004: 3004, MCP3008: 3008, MCP3204: 3204, MCP3208: 3208 },
    fns: { begin: { p: ['spi', 'int'], r: 'bool', cfg: true }, read: { p: ['int'], r: 'int' }, difference: { p: ['int', 'int'], r: 'int' }, millivolts: { p: ['int', 'int'], r: 'int' }, bits: { p: [], r: 'int' }, channels: { p: [], r: 'int' } },
    headers: ['SPI.h', 'Adafruit_MCP3008.h'],
    cpp: ([sp, chip], ctx) => `
Adafruit_MCP3008 __d_mcp;
long __d_mcp_bits = ${chip === 3204 || chip === 3208 ? 12 : 10};
long __d_mcp_ch = ${chip === 3004 || chip === 3204 ? 4 : 8};
bool __d_mcp3008_begin() { return ${sp.sck === ctx.spi.sck && sp.mosi === ctx.spi.mosi && sp.miso === ctx.spi.miso ? `__d_mcp.begin(${sp.cs})` : `__d_mcp.begin(${sp.sck}, ${sp.mosi}, ${sp.miso}, ${sp.cs})`}; }
long __d_mcp3008_read(long c) { if (c < 0 || c >= __d_mcp_ch) return -1; return (long)__d_mcp.readADC(c); }
long __d_mcp3008_difference(long p, long m) { long a = __d_mcp3008_read(p); long b = __d_mcp3008_read(m); if (a < 0 || b < 0) return -1; return a > b ? a - b : 0; }
long __d_mcp3008_millivolts(long raw, long vref) { if (raw < 0) return -1; return raw * vref / (1L << __d_mcp_bits); }
long __d_mcp3008_bits() { return __d_mcp_bits; }
long __d_mcp3008_channels() { return __d_mcp_ch; }`,
  },

  // ------------------------------------------------------------------ EEPROM AT24C (I2C)
  at24c: {
    consts: { ADDRESS: 0x50, WRITE_TIMEOUT_MS: 25, MAX_READ: 32 },
    fns: {
      begin: { p: ['i2c', 'int', 'int', 'int'], r: 'bool', cfg: true }, size: { p: [], r: 'int' }, ready: { p: [], r: 'bool' }, read: { p: ['int', 'int'], r: 'bytes' },
      readByte: { p: ['int'], r: 'int' }, write: { p: ['int', 'bytes'], r: 'bool' }, writeByte: { p: ['int', 'int'], r: 'bool' },
    },
    headers: ['I2C_eeprom.h'],
    cpp: ([, addr, size]) => `
I2C_eeprom __d_ee(${addr}, ${size});
bool __d_at24c_begin() { Wire.begin(); __d_ee.begin(); return __d_ee.isConnected(); }
long __d_at24c_size() { return ${size}; }
bool __d_at24c_ready() { return __d_ee.isConnected(); }
FgBytes __d_at24c_read(long pos, long n) {
  FgBytes b;
  if (n < 0 || n > 32 || pos < 0 || pos + n > ${size} || !__d_ee.isConnected()) return b;
  for (long i = 0; i < n; i++) b.push((long)__d_ee.readByte(pos + i));
  return b;
}
long __d_at24c_readByte(long pos) { if (pos < 0 || pos >= ${size}) return -1; return (long)__d_ee.readByte(pos); }
bool __d_at24c_writeByte(long pos, long v) { if (pos < 0 || pos >= ${size} || v < 0 || v > 255) return false; return __d_ee.writeByte(pos, v) == 0; }
bool __d_at24c_write(long pos, FgBytes d) {
  if (pos < 0 || pos + d.n > ${size}) return false;
  for (long i = 0; i < d.n; i++) if (__d_ee.writeByte(pos + i, d.d[i]) != 0) return false;
  return true;
}`,
  },

  // ------------------------------------------------------------------ 74HC595 (SPI ou 3 pinos)
  hc595: {
    consts: { MAX_CHIPS: 8 },
    fns: {
      begin: { p: ['spi', 'int'], r: 'bool', cfg: true }, beginPins: { p: ['pin', 'pin', 'pin', 'int'], r: 'bool', cfg: true },
      update: { p: [], r: 'bool' }, set: { p: ['int', 'bool'], r: 'bool' }, write: { p: ['int', 'bool'], r: 'bool' }, writeByte: { p: ['int', 'int'], r: 'bool' }, fill: { p: ['int'], r: 'bool' },
      get: { p: ['int'], r: 'bool' }, getByte: { p: ['int'], r: 'int' }, outputs: { p: [], r: 'int' },
    },
    headers: [],
    cpp: (cfg) => {
      // begin(spi, chips): SER = MOSI, SRCLK = SCK, RCLK = cs; beginPins(data, clock, latch, chips)
      const [data, clock, latch, chips] = cfg.length === 2 ? [cfg[0].mosi, cfg[0].sck, cfg[0].cs, cfg[1]] : cfg
      return `
uint8_t __d_595[8] = {0, 0, 0, 0, 0, 0, 0, 0};
long __d_595n = ${chips};
bool __d_hc595_update() {
  digitalWrite(${latch}, LOW);
  for (long c = __d_595n - 1; c >= 0; c--) shiftOut(${data}, ${clock}, MSBFIRST, __d_595[c]);
  digitalWrite(${latch}, HIGH);
  return true;
}
bool __d_hc595_start() {
  if (${chips} < 1 || ${chips} > 8) return false;
  pinMode(${data}, OUTPUT);
  pinMode(${clock}, OUTPUT);
  pinMode(${latch}, OUTPUT);
  return __d_hc595_update();
}
bool __d_hc595_begin() { return __d_hc595_start(); }
bool __d_hc595_beginPins() { return __d_hc595_start(); }
bool __d_hc595_set(long n, bool h) {
  if (n < 0 || n >= __d_595n * 8) return false;
  if (h) __d_595[n / 8] |= (1 << (n % 8)); else __d_595[n / 8] &= ~(1 << (n % 8));
  return true;
}
bool __d_hc595_write(long n, bool h) { if (!__d_hc595_set(n, h)) return false; return __d_hc595_update(); }
bool __d_hc595_writeByte(long c, long v) { if (c < 0 || c >= __d_595n || v < 0 || v > 255) return false; __d_595[c] = v; return __d_hc595_update(); }
bool __d_hc595_fill(long v) { if (v < 0 || v > 255) return false; for (long c = 0; c < __d_595n; c++) __d_595[c] = v; return __d_hc595_update(); }
bool __d_hc595_get(long n) { if (n < 0 || n >= __d_595n * 8) return false; return ((__d_595[n / 8] >> (n % 8)) & 1) != 0; }
long __d_hc595_getByte(long c) { if (c < 0 || c >= __d_595n) return 0; return __d_595[c]; }
long __d_hc595_outputs() { return __d_595n * 8; }`
    },
  },
}

// AccelStepper partilhado pelos drivers stepper e uln2003. Sem aceleração anda à velocidade
// constante (runSpeedToPosition); com ela, rampa (run()), como os drivers da mcu.
function stepperCpp(n, decl, v0) {
  const m = `__d_${n}_m`
  return `
${decl}
long __d_${n}_v = ${v0};
long __d_${n}_a = 0;
void __d_${n}_sync() {
  ${m}.setMaxSpeed(__d_${n}_v);
  if (__d_${n}_a <= 0) ${m}.setSpeed(${m}.distanceToGo() >= 0 ? __d_${n}_v : -__d_${n}_v);
}
bool __d_${n}_begin() { ${m}.setMaxSpeed(__d_${n}_v); ${m}.setCurrentPosition(0); return true; }
void __d_${n}_enablePin(long p) { ${m}.setEnablePin(p); ${m}.setPinsInverted(false, false, true); ${m}.enableOutputs(); }
void __d_${n}_enable() { ${m}.enableOutputs(); }
void __d_${n}_disable() { ${m}.disableOutputs(); }
bool __d_${n}_speed(long v) { if (v < 1 || v > 40000) return false; __d_${n}_v = v; __d_${n}_sync(); return true; }
bool __d_${n}_acceleration(long a) { if (a < 0 || a > 1000000) return false; __d_${n}_a = a; if (a > 0) ${m}.setAcceleration(a); __d_${n}_sync(); return true; }
bool __d_${n}_pulseWidth(long us) { if (us < 1 || us > 100) return false; ${m}.setMinPulseWidth(us); return true; }
bool __d_${n}_target(long p) { ${m}.moveTo(p); __d_${n}_sync(); return true; }
bool __d_${n}_tick() {
  if (${m}.distanceToGo() == 0) return false;
  if (__d_${n}_a > 0) ${m}.run(); else ${m}.runSpeedToPosition();
  return ${m}.distanceToGo() != 0;
}
void __d_${n}_run() { while (__d_${n}_tick()) {} }
bool __d_${n}_moveTo(long p) { __d_${n}_target(p); __d_${n}_run(); return true; }
bool __d_${n}_move(long s) { return __d_${n}_moveTo(${m}.currentPosition() + s); }
void __d_${n}_stop() { ${m}.stop(); if (__d_${n}_a <= 0) ${m}.moveTo(${m}.currentPosition()); }
long __d_${n}_position() { return (long)${m}.currentPosition(); }
bool __d_${n}_setPosition(long p) { ${m}.setCurrentPosition(p); return true; }
long __d_${n}_remaining() { return (long)${m}.distanceToGo(); }
bool __d_${n}_moving() { return ${m}.distanceToGo() != 0; }`
}

// DS3231 e DS1307 (RTClib): data em ints; dia da semana ISO (1 = segunda … 7 = domingo)
function rtcDriver(n, cls) {
  const ds3231 = n === 'ds3231'
  return {
    consts: ds3231 ? { ADDRESS: 0x68 } : { ADDRESS: 0x68, RAM_SIZE: 56 },
    fns: {
      begin: { p: ['i2c'], r: 'bool', cfg: true }, read: { p: [], r: 'bool' }, set: { p: ['int', 'int', 'int', 'int', 'int', 'int'], r: 'bool' }, lostPower: { p: [], r: 'bool' },
      year: { p: [], r: 'int' }, month: { p: [], r: 'int' }, day: { p: [], r: 'int' }, hour: { p: [], r: 'int' }, minute: { p: [], r: 'int' }, second: { p: [], r: 'int' },
      weekday: { p: [], r: 'int' }, unixTime: { p: [], r: 'int' }, weekdayOf: { p: ['int', 'int', 'int'], r: 'int' },
      ...(ds3231 ? { temperature: { p: [], r: 'int' } } : {}),
    },
    other: ds3231 ? ['daysSince1970', 'decode'] : ['daysSince1970', 'decode', 'halt', 'squareWave', 'output', 'readRam', 'writeRam'],
    headers: ['RTClib.h'],
    cpp: () => `
${cls} __d_${n}_c;
bool __d_${n}_ok = false;
long __d_${n}_v[7] = {2000, 1, 1, 0, 0, 0, 0};
bool __d_${n}_begin() { Wire.begin(); __d_${n}_ok = __d_${n}_c.begin(); return __d_${n}_ok; }
bool __d_${n}_read() {
  if (!__d_${n}_ok) return false;
  DateTime t = __d_${n}_c.now();
  __d_${n}_v[0] = t.year(); __d_${n}_v[1] = t.month(); __d_${n}_v[2] = t.day();
  __d_${n}_v[3] = t.hour(); __d_${n}_v[4] = t.minute(); __d_${n}_v[5] = t.second();
  __d_${n}_v[6] = (long)t.unixtime();
  return true;
}
bool __d_${n}_set(long y, long mo, long d, long h, long mi, long s) {
  if (y < 2000 || y > 2099 || mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59 || s < 0 || s > 59) return false;
  __d_${n}_c.adjust(DateTime(y, mo, d, h, mi, s));
  return __d_${n}_ok;
}
bool __d_${n}_lostPower() { return ${ds3231 ? `__d_${n}_c.lostPower()` : `!__d_${n}_c.isrunning()`}; }
long __d_${n}_year() { return __d_${n}_v[0]; }
long __d_${n}_month() { return __d_${n}_v[1]; }
long __d_${n}_day() { return __d_${n}_v[2]; }
long __d_${n}_hour() { return __d_${n}_v[3]; }
long __d_${n}_minute() { return __d_${n}_v[4]; }
long __d_${n}_second() { return __d_${n}_v[5]; }
long __d_${n}_unixTime() { return __d_${n}_v[6]; }
long __d_${n}_weekdayOf(long y, long m, long d) {
  if (m < 3) { m += 12; y -= 1; }
  long w = (d + (13 * (m + 1)) / 5 + y + y / 4 - y / 100 + y / 400) % 7; // 0 = sábado
  return ((w + 5) % 7) + 1;
}
long __d_${n}_weekday() { return __d_${n}_weekdayOf(__d_${n}_v[0], __d_${n}_v[1], __d_${n}_v[2]); }${ds3231 ? `\nlong __d_${n}_temperature() { return (long)round(__d_${n}_c.getTemperature() * 100); }` : ''}`,
  }
}

// pinos do SPI por omissão de cada placa (MOSI, MISO, SCK no core Arduino)
export function spiPins(fam) {
  if (fam === 'esp32') return { mosi: 23, miso: 19, sck: 18 }
  if (fam === 'pico') return { mosi: 19, miso: 16, sck: 18 }
  if (fam === 'bluepill') return { mosi: 7, miso: 6, sck: 5 }
  return { mosi: 11, miso: 12, sck: 13 }
}
