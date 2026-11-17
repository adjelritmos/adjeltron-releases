// Runtime da biblioteca mcu do Fogu para o simulador: C++ (Arduino) incluído em cada programa
// compilado por fogu.js — pinos (FgPin), ADC (FgAdc), PWM (FgPwm), bytes (FgBytes), I2C (FgI2c),
// eventos (onPress, onClick, mcu.every, serial.onReceive…) e mcu.delay que corre os handlers.
// Corre no tradutor rápido e compila no avr-gcc / arduino-cli.
export const RUNTIME = String.raw`
// ---------- runtime da biblioteca mcu (simulação) ----------
// declarações primeiro e os tipos antes de qualquer função: o arduino-cli insere protótipos
// automáticos antes da primeira função do ficheiro, e estes usam FgBytes
void __fg_run(long id);
void __fg_panic(String msg, long line);
long __fg_div(long a, long b, long line);

struct FgBytes {
  uint8_t d[64];
  long n = 0;
  long len() { return n; }
  long at(long i) {
    if (i < 0 || i >= n) __fg_panic(String("indice fora dos bytes: ") + String(i), 0);
    return d[i];
  }
  void set(long i, long v) {
    if (i < 0 || i >= n) __fg_panic(String("indice fora dos bytes: ") + String(i), 0);
    if (v < 0 || v > 255) __fg_panic(String("um byte vai de 0 a 255: ") + String(v), 0);
    d[i] = v;
  }
  void push(long v) {
    if (n >= 64) __fg_panic(String("bytes cheio (64)"), 0);
    if (v < 0 || v > 255) __fg_panic(String("um byte vai de 0 a 255: ") + String(v), 0);
    d[n] = v;
    n++;
  }
  String text() {
    String s = "";
    for (long i = 0; i < n; i++) s += (char)d[i];
    return s;
  }
  String show() {
    String s = "[";
    for (long i = 0; i < n; i++) {
      if (i) s += ", ";
      s += String(d[i]);
    }
    return s + "]";
  }
};

struct FgPin {
  long n = -1;
  FgPin() {}
  FgPin(long p) { n = p; }
  FgPin output() { pinMode(n, OUTPUT); return *this; }
  FgPin input() { pinMode(n, INPUT); return *this; }
  FgPin inputPullUp() { pinMode(n, INPUT_PULLUP); return *this; }
  FgPin inputPullDown() { pinMode(n, INPUT_PULLDOWN); return *this; }
  void high() { digitalWrite(n, HIGH); }
  void low() { digitalWrite(n, LOW); }
  void toggle() { digitalWrite(n, digitalRead(n) == HIGH ? LOW : HIGH); }
  void write(bool b) { digitalWrite(n, b ? HIGH : LOW); }
  bool read() { return digitalRead(n) == HIGH; }
};

struct FgAdc {
  long n = -1;
  long mv = 5000;
  long nbits = 10;
  long scale = 1;
  FgAdc() {}
  FgAdc(long p, long m, long b, long s) { n = p; mv = m; nbits = b; scale = s; }
  long read() {
    if (n == -2) return 400;
    if (n == -3) return 225;
    return analogRead(n) * scale;
  }
  long millivolts() { return __fg_div(read() * mv, (1L << nbits) - 1, 0); }
  long bits() { return nbits; }
};

struct FgPwm {
  long n = -1;
  long f = 1000;
  FgPwm() {}
  FgPwm(long p, long freq) { n = p; f = freq; pinMode(n, OUTPUT); analogWrite(n, 0); }
  void duty(long p) {
    if (p < 0 || p > 100) __fg_panic(String("duty vai de 0 a 100: ") + String(p), 0);
    analogWrite(n, __fg_div(p * 255, 100, 0));
  }
  void dutyFine(long p) {
    if (p < 0 || p > 10000) __fg_panic(String("dutyFine vai de 0 a 10000: ") + String(p), 0);
    analogWrite(n, __fg_div(p * 255, 10000, 0));
  }
  void off() { analogWrite(n, 0); }
};

struct FgI2c {
  long freq = 100000;
  FgI2c() {}
  FgI2c(long f) { freq = f; Wire.begin(); Wire.setClock((uint32_t)f); }
  bool probe(long addr) { Wire.beginTransmission((uint8_t)addr); return Wire.endTransmission() == 0; }
  bool write(long addr, FgBytes b) {
    Wire.beginTransmission((uint8_t)addr);
    for (long i = 0; i < b.n; i++) Wire.write((uint8_t)b.d[i]);
    return Wire.endTransmission() == 0;
  }
  FgBytes read(long addr, long k) {
    FgBytes b;
    Wire.requestFrom((uint8_t)addr, (uint8_t)k);
    while (Wire.available() && b.n < k) b.push(Wire.read());
    return b;
  }
  FgBytes writeRead(long addr, FgBytes w, long k) {
    Wire.beginTransmission((uint8_t)addr);
    for (long i = 0; i < w.n; i++) Wire.write((uint8_t)w.d[i]);
    Wire.endTransmission(false);
    return read(addr, k);
  }
};

void __fg_panic(String msg, long line) {
  Serial.print("[fogu] erro em execucao na linha ");
  Serial.print(line);
  Serial.print(": ");
  Serial.print(msg);
  Serial.println(" (programa parado)");
  while (true) delay(1000);
}
void __fg_print(String s) {
  Serial.print(s);
  Serial.print("\r\n");
}
long __fg_div(long a, long b, long line) {
  if (b == 0) __fg_panic(String("divisao por zero"), line);
  long q = a / b;
  return q;
}
long __fg_mod(long a, long b, long line) {
  if (b == 0) __fg_panic(String("divisao por zero"), line);
  return a % b;
}
long __fg_pow(long a, long b) {
  long r = 1;
  for (long i = 0; i < b; i++) r *= a;
  return r;
}
long __fg_range(long v, long lo, long hi, long line) {
  if (v < lo || v > hi) __fg_panic(String("valor fora do intervalo do tipo: ") + String(v), line);
  return v;
}
long __fg_int(String s, long line) {
  String t = s;
  t.trim();
  bool ok = t.length() > 0;
  for (unsigned int i = 0; i < t.length(); i++) {
    char c = t.charAt(i);
    if (!(c >= '0' && c <= '9') && !(i == 0 && c == '-')) ok = false;
  }
  if (!ok) __fg_panic(String("int(\"") + s + String("\") nao e um numero"), line);
  return t.toInt();
}
String __fg_char(String s, long line) {
  if (s.length() != 1) __fg_panic(String("um char e exatamente um caracter"), line);
  return s;
}
String __fg_trim(String s) { s.trim(); return s; }
String __fg_toUpperCase(String s) { s.toUpperCase(); return s; }
String __fg_toLowerCase(String s) { s.toLowerCase(); return s; }
long __fg_temperature(long off, long gain) { return __fg_div(25 * gain, 1000, 0) + off; }

FgBytes __fg_b(long k, long a0 = 0, long a1 = 0, long a2 = 0, long a3 = 0, long a4 = 0, long a5 = 0, long a6 = 0, long a7 = 0, long a8 = 0, long a9 = 0, long a10 = 0, long a11 = 0, long a12 = 0, long a13 = 0, long a14 = 0, long a15 = 0) {
  FgBytes b;
  long v[16] = {a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15};
  for (long i = 0; i < k; i++) b.push(v[i]);
  return b;
}
FgBytes __fg_bzero(long k) {
  FgBytes b;
  for (long i = 0; i < k; i++) b.push(0);
  return b;
}
FgBytes __fg_strBytes(String s) {
  FgBytes b;
  for (unsigned int i = 0; i < s.length(); i++) b.push((uint8_t)s.charAt(i));
  return b;
}
long __fg_crc16(FgBytes b) {
  long crc = 0xFFFF;
  for (long i = 0; i < b.n; i++) {
    crc ^= b.d[i];
    for (int k = 0; k < 8; k++) crc = (crc & 1) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
  }
  return crc;
}





// eventos: pinos (0 premir, 1 largar, 2 subida, 3 descida, 4 mudança, 5 clique, 6 duplo clique,
// 7 nível LOW, 8 nível HIGH), temporizadores (mcu.every) e a consola (serial.onReceive).
// Correm em mcu.delay / mcu.poll, em cada volta de um ciclo e depois do código do topo.
const int __FG_MAXEV = 32;
long __fg_evPin[__FG_MAXEV];
long __fg_evKind[__FG_MAXEV];
long __fg_evH[__FG_MAXEV];
long __fg_evDeb[__FG_MAXEV];
long __fg_evWin[__FG_MAXEV];
long __fg_evRaw[__FG_MAXEV];
long __fg_evStable[__FG_MAXEV];
unsigned long __fg_evT[__FG_MAXEV];
unsigned long __fg_evClickT[__FG_MAXEV];
long __fg_evClicks[__FG_MAXEV];
long __fg_evN = 0;
long __fg_tmH[16];
unsigned long __fg_tmPeriod[16];
unsigned long __fg_tmNext[16];
long __fg_tmN = 0;
long __fg_serialH = -1;
long __fg_pulsePin[8];
long __fg_pulseCount[8];
long __fg_pulseN = 0;
bool __fg_inPoll = false;

void __fg_on2(long pin, long kind, long h, long deb, long win) {
  if (__fg_evN >= __FG_MAXEV) __fg_panic(String("demasiados handlers (32)"), 0);
  // botões (premir / largar / clique): ligados ao GND, com o pull-up do pino
  if (kind == 0 || kind == 1 || kind == 5 || kind == 6) pinMode(pin, INPUT_PULLUP);
  long i = __fg_evN;
  __fg_evN++;
  __fg_evPin[i] = pin;
  __fg_evKind[i] = kind;
  __fg_evH[i] = h;
  __fg_evDeb[i] = deb;
  __fg_evWin[i] = win;
  long v = digitalRead(pin) == HIGH ? 1 : 0;
  __fg_evRaw[i] = v;
  __fg_evStable[i] = v;
  __fg_evT[i] = millis();
  __fg_evClicks[i] = 0;
}
void __fg_on(long pin, long kind, long h, long deb) { __fg_on2(pin, kind, h, deb, 400); }
void __fg_every(long ms, long h) {
  if (__fg_tmN >= 16) __fg_panic(String("demasiados temporizadores (16)"), 0);
  __fg_tmH[__fg_tmN] = h;
  __fg_tmPeriod[__fg_tmN] = ms;
  __fg_tmNext[__fg_tmN] = millis() + ms;
  __fg_tmN++;
}
void __fg_onSerial(long h) { __fg_serialH = h; }
long __fg_pulses(long pin) {
  for (long i = 0; i < __fg_pulseN; i++) if (__fg_pulsePin[i] == pin) return __fg_pulseCount[i];
  return 0;
}
void __fg_pulsesReset(long pin) {
  for (long i = 0; i < __fg_pulseN; i++) if (__fg_pulsePin[i] == pin) __fg_pulseCount[i] = 0;
}

void __fg_poll() {
  if (__fg_inPoll) return; // um handler que espera não corre outros handlers dentro de si
  __fg_inPoll = true;
  unsigned long now = millis();
  for (long i = 0; i < __fg_evN; i++) {
    long v = digitalRead(__fg_evPin[i]) == HIGH ? 1 : 0;
    long k = __fg_evKind[i];
    if (k == 7 || k == 8) {
      if (v == (k == 8 ? 1 : 0)) __fg_run(__fg_evH[i]);
      continue;
    }
    if (v != __fg_evRaw[i]) {
      __fg_evRaw[i] = v;
      __fg_evT[i] = now;
    }
    if (__fg_evRaw[i] != __fg_evStable[i] && now - __fg_evT[i] >= (unsigned long)__fg_evDeb[i]) {
      long was = __fg_evStable[i];
      __fg_evStable[i] = __fg_evRaw[i];
      long up = __fg_evStable[i];
      bool fire = false;
      if (k == 0) fire = up == 0;
      else if (k == 1) fire = up == 1;
      else if (k == 2) fire = up == 1 && was == 0;
      else if (k == 3) fire = up == 0 && was == 1;
      else if (k == 4) fire = true;
      else if (k == 5) fire = up == 1;
      else if (k == 6 && up == 1) {
        if (__fg_evClicks[i] > 0 && now - __fg_evClickT[i] <= (unsigned long)__fg_evWin[i]) {
          __fg_evClicks[i] = 0;
          fire = true;
        } else {
          __fg_evClicks[i] = 1;
          __fg_evClickT[i] = now;
        }
      }
      if (fire) __fg_run(__fg_evH[i]);
    }
  }
  for (long i = 0; i < __fg_tmN; i++) {
    if ((long)(now - __fg_tmNext[i]) >= 0) {
      __fg_tmNext[i] += __fg_tmPeriod[i];
      if ((long)(now - __fg_tmNext[i]) >= 0) __fg_tmNext[i] = now + __fg_tmPeriod[i];
      __fg_run(__fg_tmH[i]);
    }
  }
  if (__fg_serialH >= 0 && Serial.available() > 0) __fg_run(__fg_serialH);
  __fg_inPoll = false;
}

// mcu.delay: espera e corre os handlers entretanto (esperas abaixo de 1,5 ms não os correm)
void __fg_delay(long ms) {
  if (ms <= 0) return;
  if (ms < 2) {
    delay(ms);
    return;
  }
  unsigned long t0 = millis();
  while ((long)(millis() - t0) < ms) {
    __fg_poll();
    delay(1);
  }
}
String __fg_readLine() {
  String s = "";
  while (true) {
    while (Serial.available() > 0) {
      char c = Serial.read();
      if (c == '\n') return s;
      if (c != '\r') s += c;
    }
    __fg_poll();
    delay(1);
  }
}
FgBytes __fg_readBytes() {
  FgBytes b;
  while (Serial.available() > 0 && b.n < 64) b.push(Serial.read());
  return b;
}
// ---------- fim do runtime ----------`
