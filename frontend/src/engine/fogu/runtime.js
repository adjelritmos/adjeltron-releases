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

// dispositivo SPI (mcu.spi({ cs: "D10" })): por agora só o chip select, para os drivers
struct FgSpi {
  long cs = -1;
  FgSpi() {}
  FgSpi(long c) { cs = c; pinMode(cs, OUTPUT); digitalWrite(cs, HIGH); }
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
// pin.pulseCount(): subidas contadas numa interrupção (como na mcu); o pino começa a contar na
// primeira chamada de pulseCount() / resetPulseCount()
void __fg_pisr0() { __fg_pulseCount[0]++; }
void __fg_pisr1() { __fg_pulseCount[1]++; }
void __fg_pisr2() { __fg_pulseCount[2]++; }
void __fg_pisr3() { __fg_pulseCount[3]++; }
void __fg_pisr4() { __fg_pulseCount[4]++; }
void __fg_pisr5() { __fg_pulseCount[5]++; }
void __fg_pisr6() { __fg_pulseCount[6]++; }
void __fg_pisr7() { __fg_pulseCount[7]++; }
long __fg_pulseIdx(long pin) {
  for (long i = 0; i < __fg_pulseN; i++) if (__fg_pulsePin[i] == pin) return i;
  if (__fg_pulseN >= 8) __fg_panic(String("demasiados pinos com pulseCount (8)"), 0);
  long i = __fg_pulseN;
  __fg_pulseN++;
  __fg_pulsePin[i] = pin;
  __fg_pulseCount[i] = 0;
  long irq = digitalPinToInterrupt(pin);
  if (i == 0) attachInterrupt(irq, __fg_pisr0, RISING);
  else if (i == 1) attachInterrupt(irq, __fg_pisr1, RISING);
  else if (i == 2) attachInterrupt(irq, __fg_pisr2, RISING);
  else if (i == 3) attachInterrupt(irq, __fg_pisr3, RISING);
  else if (i == 4) attachInterrupt(irq, __fg_pisr4, RISING);
  else if (i == 5) attachInterrupt(irq, __fg_pisr5, RISING);
  else if (i == 6) attachInterrupt(irq, __fg_pisr6, RISING);
  else attachInterrupt(irq, __fg_pisr7, RISING);
  return i;
}
long __fg_pulses(long pin) { return __fg_pulseCount[__fg_pulseIdx(pin)]; }
void __fg_pulsesReset(long pin) { __fg_pulseCount[__fg_pulseIdx(pin)] = 0; }

// ---------- mcu.timer(period, h, { oneShot, immediate }) ----------
long __fg_tiH[8];
unsigned long __fg_tiPer[8];
unsigned long __fg_tiNext[8];
bool __fg_tiOn[8];
bool __fg_tiOne[8];
long __fg_tiCount[8];
long __fg_tiN = 0;
struct FgTimer {
  long i = -1;
  FgTimer() {}
  FgTimer(long k) { i = k; }
  void cancel() { __fg_tiOn[i] = false; }
  void restart() { __fg_tiOn[i] = true; __fg_tiNext[i] = micros() + __fg_tiPer[i]; }
  bool running() { return __fg_tiOn[i]; }
  long count() { return __fg_tiCount[i]; }
  long period() { return (long)__fg_tiPer[i]; }
  void setPeriod(long us) {
    if (us < 50) __fg_panic(String("periodo do timer abaixo de 50 us: ") + String(us), 0);
    __fg_tiPer[i] = us;
  }
};
FgTimer __fg_timer(long us, long h, bool oneShot) {
  if (__fg_tiN >= 8) __fg_panic(String("demasiados timers (8)"), 0);
  if (us < 50) __fg_panic(String("periodo do timer abaixo de 50 us: ") + String(us), 0);
  long i = __fg_tiN;
  __fg_tiN++;
  __fg_tiH[i] = h;
  __fg_tiPer[i] = us;
  __fg_tiNext[i] = micros() + us;
  __fg_tiOn[i] = true;
  __fg_tiOne[i] = oneShot;
  __fg_tiCount[i] = 0;
  return FgTimer(i);
}

// ---------- handlers imediatos: correm dentro da interrupção (attachInterrupt) ----------
long __fg_iH[8];
long __fg_iPin[8];
long __fg_iMode[8]; // 2 subida, 3 descida, 4 mudança, 7 nível LOW, 8 nível HIGH
long __fg_iN = 0;
bool __fg_masked[64];
void __fg_mask(long pin, bool on) { if (pin >= 0 && pin < 64) __fg_masked[pin] = on; }
void __fg_iRun(long k) {
  if (__fg_masked[__fg_iPin[k]]) return;
  long m = __fg_iMode[k];
  if (m == 7 && digitalRead(__fg_iPin[k]) != LOW) return;
  if (m == 8 && digitalRead(__fg_iPin[k]) != HIGH) return;
  __fg_run(__fg_iH[k]);
}
void __fg_iisr0() { __fg_iRun(0); }
void __fg_iisr1() { __fg_iRun(1); }
void __fg_iisr2() { __fg_iRun(2); }
void __fg_iisr3() { __fg_iRun(3); }
void __fg_iisr4() { __fg_iRun(4); }
void __fg_iisr5() { __fg_iRun(5); }
void __fg_iisr6() { __fg_iRun(6); }
void __fg_iisr7() { __fg_iRun(7); }
void __fg_onImm(long pin, long kind, long h) {
  if (__fg_iN >= 8) __fg_panic(String("demasiados handlers imediatos (8)"), 0);
  long k = __fg_iN;
  __fg_iN++;
  __fg_iH[k] = h;
  __fg_iPin[k] = pin;
  __fg_iMode[k] = kind;
  int mode = kind == 2 ? RISING : kind == 3 ? FALLING : CHANGE;
  long irq = digitalPinToInterrupt(pin);
  if (k == 0) attachInterrupt(irq, __fg_iisr0, mode);
  else if (k == 1) attachInterrupt(irq, __fg_iisr1, mode);
  else if (k == 2) attachInterrupt(irq, __fg_iisr2, mode);
  else if (k == 3) attachInterrupt(irq, __fg_iisr3, mode);
  else if (k == 4) attachInterrupt(irq, __fg_iisr4, mode);
  else if (k == 5) attachInterrupt(irq, __fg_iisr5, mode);
  else if (k == 6) attachInterrupt(irq, __fg_iisr6, mode);
  else attachInterrupt(irq, __fg_iisr7, mode);
}
void __fg_detach(long pin) { detachInterrupt(digitalPinToInterrupt(pin)); }
// mcu.interrupts(on): no simulador não há interrupções a mascarar (os handlers continuam a correr)
void __fg_interrupts(bool on) {}

// ---------- canais (mcu.channel / mcu.isrQueue), atomic e mutex ----------
// receive() espera (com os handlers e as outras tarefas a correr entretanto)
void __fg_delay(long ms);
struct FgChanI {
  long q[16];
  long cap = 16;
  long h = 0;
  long n = 0;
  FgChanI() {}
  FgChanI(long c) { cap = c < 1 ? 1 : (c > 16 ? 16 : c); }
  bool trySend(long v) { if (n >= cap) return false; q[(h + n) % cap] = v; n++; return true; }
  void send(long v) { while (n >= cap) __fg_delay(1); trySend(v); }
  long receive() { while (n == 0) __fg_delay(1); long v = q[h]; h = (h + 1) % cap; n--; return v; }
  long tryReceive() { if (n == 0) return 0; return receive(); }
  bool available() { return n > 0; }
  bool full() { return n >= cap; }
  long count() { return n; }
};
struct FgChanS {
  String q[16];
  long cap = 16;
  long h = 0;
  long n = 0;
  FgChanS() {}
  FgChanS(long c) { cap = c < 1 ? 1 : (c > 16 ? 16 : c); }
  bool trySend(String v) { if (n >= cap) return false; q[(h + n) % cap] = v; n++; return true; }
  void send(String v) { while (n >= cap) __fg_delay(1); trySend(v); }
  String receive() { while (n == 0) __fg_delay(1); String v = q[h]; h = (h + 1) % cap; n--; return v; }
  String tryReceive() { if (n == 0) return String(""); return receive(); }
  bool available() { return n > 0; }
  bool full() { return n >= cap; }
  long count() { return n; }
};
struct FgAtomic {
  long v = 0;
  FgAtomic() {}
  FgAtomic(long x) { v = x; }
  long get() { return v; }
  void set(long x) { v = x; }
  long add(long d) { v += d; return v; }
  long sub(long d) { v -= d; return v; }
  long increment() { v++; return v; }
  long decrement() { v--; return v; }
};
struct FgMutex {
  bool l = false;
  void lock() { while (l) __fg_delay(1); l = true; }
  bool tryLock() { if (l) return false; l = true; return true; }
  void unlock() { l = false; }
  bool locked() { return l; }
};

void __fg_uartPoll(); // gerado pelo compilador (portas mcu.uart)

void __fg_poll() {
  if (__fg_inPoll) return; // um handler que espera não corre outros handlers dentro de si
  __fg_inPoll = true;
  unsigned long now = millis();
  for (long i = 0; i < __fg_evN; i++) {
    if (__fg_masked[__fg_evPin[i]]) continue;
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
  // mcu.timer: períodos em µs (os que já passaram correm agora, um de cada vez)
  unsigned long nowUs = micros();
  for (long i = 0; i < __fg_tiN; i++) {
    if (!__fg_tiOn[i] || (long)(nowUs - __fg_tiNext[i]) < 0) continue;
    __fg_tiNext[i] += __fg_tiPer[i];
    if ((long)(nowUs - __fg_tiNext[i]) >= 0) __fg_tiNext[i] = nowUs + __fg_tiPer[i];
    __fg_tiCount[i]++;
    if (__fg_tiOne[i]) __fg_tiOn[i] = false;
    __fg_run(__fg_tiH[i]);
  }
  __fg_uartPoll();
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
