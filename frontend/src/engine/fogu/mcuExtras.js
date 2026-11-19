// Código C++ gerado para as partes da mcu que dependem do programa (portas mcu.uart, tarefas,
// mcu.storage). As estruturas genéricas (timers, canais, atomic, mutex, handlers imediatos) estão
// no runtime.js.

// ---------- mcu.uart(unidade, { tx, rx, baud }) ----------
// Uno/Nano: UART por software em quaisquer dois pinos (SoftwareSerial, 8N1 até 9600 baud);
// ESP32: UART1/UART2 em quaisquer pinos (Serial1/Serial2); Pico: UART0/UART1 (Serial1/Serial2);
// Blue Pill: USART2 (PA2/PA3) / USART3 (PB10/PB11).
export function uartCpp(uarts, fam) {
  const port = (u, k) => (u.soft ? `__fg_up${k}` : fam === 'pico' ? `Serial${u.unit + 1}` : `Serial${u.unit}`)
  const decl = uarts.map((u, k) => (u.soft ? `SoftwareSerial __fg_up${k}(${u.rx}, ${u.tx});` : '')).filter(Boolean)
  const begin = uarts.map((u, k) => {
    const P = port(u, k)
    if (u.soft) return `    case ${k}: ${P}.begin(${u.baud}); break;`
    if (fam === 'esp32') return `    case ${k}: ${P}.begin(${u.baud}, SERIAL_8N1, ${u.rx}, ${u.tx}); break;`
    if (fam === 'pico') return `    case ${k}: ${P}.setTX(${u.tx}); ${P}.setRX(${u.rx}); ${P}.begin(${u.baud}); break;`
    return `    case ${k}: ${P}.begin(${u.baud}); break;`
  })
  // uma porta por software só ouve enquanto é a escolhida (listen), como no AVR
  const sel = (u, k) => (u.soft && uarts.filter((x) => x.soft).length > 1 ? `${port(u, k)}.listen(); ` : '')
  const sw = (body) => uarts.map((u, k) => `    case ${k}: ${sel(u, k)}${body(port(u, k), u)} break;`).join('\n')
  return `// portas mcu.uart (${uarts.length})
${decl.join('\n')}
long __fg_uH[2] = {-1, -1};
void __fg_uBegin(long k) {
  switch (k) {
${begin.join('\n')}
  }
}
void __fg_uOut(long k, String s) {
  switch (k) {
${sw((P) => `${P}.print(s);`)}
  }
}
long __fg_uRead(long k) {
  switch (k) {
${sw((P) => `return ${P}.available() > 0 ? (long)${P}.read() : -1L;`)}
  }
  return -1;
}
bool __fg_uAvail(long k) {
  switch (k) {
${sw((P) => `return ${P}.available() > 0;`)}
  }
  return false;
}
void __fg_uFlush(long k) {
  switch (k) {
${sw((P) => `${P}.flush();`)}
  }
}
long __fg_uBaud(long k) {
  switch (k) {
${uarts.map((u, k) => `    case ${k}: return ${u.baud};`).join('\n')}
  }
  return 0;
}
struct FgUart {
  long k = -1;
  FgUart() {}
  FgUart(long i) { k = i; __fg_uBegin(i); }
  void print(String s) { __fg_uOut(k, s + String("\\r\\n")); }
  void write(String s) { __fg_uOut(k, s); }
  long read() { return __fg_uRead(k); }
  bool available() { return __fg_uAvail(k); }
  FgBytes readBytes() {
    FgBytes b;
    while (__fg_uAvail(k) && b.n < 64) b.push(__fg_uRead(k));
    return b;
  }
  // linha até '\\n' (sem o '\\r'); "" se passar o prazo
  String readLine(long ms) {
    String s = "";
    unsigned long t0 = millis();
    while ((long)(millis() - t0) < ms) {
      while (__fg_uAvail(k)) {
        long c = __fg_uRead(k);
        if (c == 10) return s;
        if (c != 13) s += String((char)c);
      }
      delay(1);
    }
    return String("");
  }
  void flush() { __fg_uFlush(k); }
  long baud() { return __fg_uBaud(k); }
  void onReceive(long h) { __fg_uH[k] = h; }
};
void __fg_netPoll();
void __fg_uartPoll() {
  __fg_netPoll();
  for (long k = 0; k < ${uarts.length}; k++) if (__fg_uH[k] >= 0 && __fg_uAvail(k)) __fg_run(__fg_uH[k]);
}`
}

// ---------- mcu.storage: chave → valor (texto), guardado na EEPROM ----------
// Formato: linhas "chave=valor\\n" terminadas por um 0. O AVR tem 1 KB de EEPROM; nos outros a
// EEPROM é emulada na flash (EEPROM.begin + commit), 4 KB.
export function storageCpp(avr) {
  const size = avr ? 1024 : 4096
  return `// mcu.storage (EEPROM)
const long __FG_ST = ${size};
bool __fg_stReady = false;
String __fg_stErr = "";
void __fg_stInit() {
  if (__fg_stReady) return;
  __fg_stReady = true;
${avr ? '' : '  EEPROM.begin(__FG_ST);\n'}}
String __fg_stLoad() {
  __fg_stInit();
  String s = "";
  for (long i = 0; i < __FG_ST; i++) {
    long c = EEPROM.read(i);
    if (c == 0 || c == 255) break;
    s += String((char)c);
  }
  return s;
}
bool __fg_stSave(String s) {
  __fg_stInit();
  if ((long)s.length() + 1 > __FG_ST) {
    __fg_stErr = "full";
    return false;
  }
  for (long i = 0; i < (long)s.length(); i++) EEPROM.${avr ? 'update' : 'write'}(i, (uint8_t)s.charAt(i));
  EEPROM.${avr ? 'update' : 'write'}(s.length(), 0);
${avr ? '' : '  EEPROM.commit();\n'}  __fg_stErr = "";
  return true;
}
// linha i (0…) e a sua chave / valor
String __fg_stLine(String s, long i) {
  long p = 0;
  long n = 0;
  while (p < (long)s.length()) {
    long e = s.indexOf('\\n', p);
    if (e < 0) e = s.length();
    if (n == i) return s.substring(p, e);
    n++;
    p = e + 1;
  }
  return String("");
}
long __fg_stKeys() {
  String s = __fg_stLoad();
  long n = 0;
  for (long i = 0; i < (long)s.length(); i++) if (s.charAt(i) == '\\n') n++;
  return n;
}
String __fg_stKey(long i) {
  String l = __fg_stLine(__fg_stLoad(), i);
  long q = l.indexOf('=');
  return q < 0 ? String("") : l.substring(0, q);
}
long __fg_stFind(String s, String k) {
  long p = 0;
  long n = 0;
  while (p < (long)s.length()) {
    long e = s.indexOf('\\n', p);
    if (e < 0) e = s.length();
    String l = s.substring(p, e);
    long q = l.indexOf('=');
    if (q >= 0 && l.substring(0, q) == k) return n;
    n++;
    p = e + 1;
  }
  return -1;
}
bool __fg_stHas(String k) { return __fg_stFind(__fg_stLoad(), k) >= 0; }
String __fg_stGet(String k) {
  String s = __fg_stLoad();
  long i = __fg_stFind(s, k);
  if (i < 0) {
    __fg_stErr = "not found";
    return String("");
  }
  String l = __fg_stLine(s, i);
  return l.substring(l.indexOf('=') + 1);
}
long __fg_stGetInt(String k, long def) {
  if (!__fg_stHas(k)) return def;
  return (long)__fg_stGet(k).toInt();
}
bool __fg_stRemove(String k) {
  String s = __fg_stLoad();
  long i = __fg_stFind(s, k);
  if (i < 0) return false;
  String out = "";
  long n = __fg_stKeys();
  for (long j = 0; j < n; j++) if (j != i) out += __fg_stLine(s, j) + String("\\n");
  return __fg_stSave(out);
}
bool __fg_stSet(String k, String v) {
  if (k.length() == 0 || k.indexOf('=') >= 0 || k.indexOf('\\n') >= 0 || v.indexOf('\\n') >= 0) {
    __fg_stErr = "bad key";
    return false;
  }
  __fg_stRemove(k);
  return __fg_stSave(__fg_stLoad() + k + String("=") + v + String("\\n"));
}
bool __fg_stClear() { return __fg_stSave(String("")); }`
}

// ---------- tarefas: mcu.task(fn, { … }) / fg fn() ----------
export const TASK_DECL = `// tarefas (FreeRTOS no simulador)
long __fg_taskCount();
String __fg_taskInfo(long i);
void __fg_tkStop(long k);
bool __fg_tkRun(long k);
String __fg_tkName(long k);
struct FgTask {
  long id = -1;
  FgTask() {}
  FgTask(long k) { id = k; }
  bool ok() { return id >= 0; }
  void stop() { __fg_tkStop(id); }
  bool running() { return __fg_tkRun(id); }
  String name() { return __fg_tkName(id); }
  long stackUsed() { return 0; }
  long stackSize() { return 2048; }
  long switches() { return 0; }
  long cpu() { return -1; }
};
FgTask __fg_taskStart(long k);`

export function taskCpp(tasks) {
  const n = tasks.length
  return `// tarefas: cada fn corre com a sua pilha; ao acabar a tarefa apaga-se
bool __fg_tkOn[${n}];
${tasks.map((f, k) => `TaskHandle_t __fg_tkH${k};\nvoid __fg_tw${k}(void* p) {\n  ${f}();\n  __fg_tkOn[${k}] = false;\n  vTaskDelete(NULL);\n}`).join('\n')}
FgTask __fg_taskStart(long k) {
  switch (k) {
${tasks.map((f, k) => `    case ${k}: if (!__fg_tkOn[${k}]) { __fg_tkOn[${k}] = true; xTaskCreate(__fg_tw${k}, "${f}", 4096, NULL, 1, &__fg_tkH${k}); } break;`).join('\n')}
  }
  return FgTask(k);
}
void __fg_tkStop(long k) {
  switch (k) {
${tasks.map((f, k) => `    case ${k}: if (__fg_tkOn[${k}]) { __fg_tkOn[${k}] = false; vTaskDelete(__fg_tkH${k}); } break;`).join('\n')}
  }
}
bool __fg_tkRun(long k) { return k >= 0 && k < ${n} && __fg_tkOn[k]; }
String __fg_tkName(long k) {
  switch (k) {
${tasks.map((f, k) => `    case ${k}: return String("${f}");`).join('\n')}
  }
  return String("");
}
// uma linha por tarefa a correr: nome e estado
String __fg_taskInfo(long i) {
  long c = 0;
  for (long k = 0; k < ${n}; k++) if (__fg_tkOn[k]) { if (c == i) return __fg_tkName(k) + String(" running"); c++; }
  return String("");
}
long __fg_taskCount() {
  long c = 0;
  for (long i = 0; i < ${n}; i++) if (__fg_tkOn[i]) c++;
  return c;
}`
}

// ---------- rede nas placas ESP (mcu.wifi, mcu.http, mcu.mqtt) ----------
// net = { serve: porta | null, http: bool (cliente), mqtt: bool }
export function netHeaders(net) {
  return ['WiFi.h', ...(net.serve != null ? ['WebServer.h'] : []), ...(net.http ? ['HTTPClient.h'] : []), ...(net.mqtt ? ['PubSubClient.h'] : [])]
}
export function netCpp(net) {
  const out = [`// rede (Wi-Fi${net.serve != null ? ', servidor HTTP' : ''}${net.http ? ', cliente HTTP' : ''}${net.mqtt ? ', MQTT' : ''})
String __fg_wifiErr = "";
bool __fg_wifiConnect(String ssid, String pass, long ms) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    long st0 = WiFi.status();
    // como na mcu: volta logo com a razão do driver (rede inexistente, palavra-passe errada)
    if (st0 == WL_NO_SSID_AVAIL || st0 == WL_CONNECT_FAILED || (long)(millis() - t0) > ms) {
      long st = st0;
      __fg_wifiErr = st == WL_NO_SSID_AVAIL ? String("NoAccessPointFound") : st == WL_CONNECT_FAILED ? String("AuthenticationFailed") : String("timeout");
      return false;
    }
    __fg_delay(50);
  }
  __fg_wifiErr = "";
  return true;
}
bool __fg_wifiAp(String ssid, String pass) { return WiFi.softAP(ssid.c_str(), pass.c_str()); }
bool __fg_wifiConnected() { return WiFi.status() == WL_CONNECTED; }
String __fg_wifiIp() { return WiFi.localIP().toString(); }
long __fg_wifiScanN = 0;
long __fg_wifiScan() { __fg_wifiScanN = WiFi.scanNetworks(); return __fg_wifiScanN; }`]
  if (net.serve != null)
    out.push(`// servidor HTTP: um handler (req) => … por pedido; sem resposta, 204
WebServer __fg_srv(${net.serve});
long __fg_srvH = -1;
bool __fg_answered = false;
struct FgReq {
  long d = 0;
  String method() { return __fg_srv.method() == HTTP_POST ? String("POST") : __fg_srv.method() == HTTP_PUT ? String("PUT") : __fg_srv.method() == HTTP_DELETE ? String("DELETE") : String("GET"); }
  String path() { return __fg_srv.uri(); }
  String query(String n) { return __fg_srv.arg(n); }
  String form(String n) { return __fg_srv.arg(n); }
  String header(String n) { return __fg_srv.header(n); }
  String body() { return __fg_srv.arg("plain"); }
  void reply(long code, String type, String s) { __fg_srv.send(code, type, s); __fg_answered = true; }
};
void __fg_runReq(long id, FgReq r);
void __fg_httpReq() {
  __fg_answered = false;
  FgReq r;
  if (__fg_srvH >= 0) __fg_runReq(__fg_srvH, r);
  if (!__fg_answered) __fg_srv.send(204);
}
void __fg_httpServe(long h) {
  __fg_srvH = h;
  __fg_srv.onNotFound(__fg_httpReq);
  __fg_srv.begin();
}`)
  if (net.http)
    out.push(`// cliente HTTP (sem TLS, como na mcu)
struct FgResp {
  long st = 0;
  String tx = "";
  long status() { return st; }
  bool ok() { return st >= 200 && st < 300; }
  String text() { return tx; }
  FgBytes body() { return __fg_strBytes(tx); }
};
FgResp __fg_httpReqC(String url, String type, String body, bool post, long ms) {
  HTTPClient h;
  FgResp r;
  h.setTimeout(ms);
  h.begin(url);
  if (post) h.addHeader("Content-Type", type);
  long c = post ? h.POST(body) : h.GET();
  r.st = c;
  if (c > 0) r.tx = h.getString();
  h.end();
  return r;
}`)
  if (net.mqtt)
    out.push(`// MQTT 3.1.1 (PubSubClient): subscribe(filtro, (msg) => …) com + e #
WiFiClient __fg_wc;
PubSubClient __fg_mq(__fg_wc);
String __fg_mqF[8];
long __fg_mqH[8];
long __fg_mqN = 0;
struct FgMsg {
  String t = "";
  String x = "";
  String topic() { return t; }
  String text() { return x; }
  FgBytes data() { return __fg_strBytes(x); }
};
void __fg_runMsg(long id, FgMsg m);
// o tópico t encaixa no filtro f? (+ = um nível, # = o resto)
bool __fg_topicMatch(String f, String t) {
  long i = 0;
  long j = 0;
  while (i < (long)f.length()) {
    char c = f.charAt(i);
    if (c == '#') return true;
    if (c == '+') {
      while (j < (long)t.length() && t.charAt(j) != '/') j++;
      i++;
      continue;
    }
    if (j >= (long)t.length() || t.charAt(j) != c) return false;
    i++;
    j++;
  }
  return j == (long)t.length();
}
void __fg_mqCb(char* topic, byte* payload, unsigned int length) {
  FgMsg m;
  m.t = String(topic);
  String s = "";
  for (unsigned int i = 0; i < length; i++) s += (char)payload[i];
  m.x = s;
  for (long i = 0; i < __fg_mqN; i++) if (__fg_topicMatch(__fg_mqF[i], m.t)) __fg_runMsg(__fg_mqH[i], m);
}
struct FgMqtt {
  bool up = false;
  bool publish(String t, String p, bool retain) { return __fg_mq.publish(t.c_str(), p.c_str(), retain); }
  bool subscribe(String f, long h) {
    // o mesmo filtro outra vez (depois de religar): substitui, não duplica o handler
    for (long i = 0; i < __fg_mqN; i++) if (__fg_mqF[i] == f) {
      __fg_mqH[i] = h;
      return __fg_mq.subscribe(f.c_str());
    }
    if (__fg_mqN >= 8) __fg_panic(String("demasiadas subscricoes MQTT (8)"), 0);
    {
      __fg_mqF[__fg_mqN] = f;
      __fg_mqH[__fg_mqN] = h;
      __fg_mqN++;
    }
    return __fg_mq.subscribe(f.c_str());
  }
  bool connected() { return __fg_mq.connected(); }
  void close() { __fg_mq.disconnect(); }
};
// "mqtt://anfitrião:porta"
FgMqtt __fg_mqttConnect(String url, String id, String user, String pass, long keepAlive) {
  String u = url;
  if (u.startsWith("mqtt://")) u = u.substring(7);
  long p = u.indexOf(':');
  String host = p >= 0 ? u.substring(0, p) : u;
  long port = p >= 0 ? u.substring(p + 1).toInt() : 1883;
  __fg_mq.setServer(host.c_str(), port);
  __fg_mq.setCallback(__fg_mqCb);
  __fg_mq.setKeepAlive(keepAlive);
  FgMqtt m;
  m.up = user.length() > 0 ? __fg_mq.connect(id.c_str(), user.c_str(), pass.c_str()) : __fg_mq.connect(id.c_str());
  return m;
}`)
  out.push(`void __fg_netPoll() {${net.serve != null ? '\n  __fg_srv.handleClient();' : ''}${net.mqtt ? '\n  __fg_mq.loop();' : ''}
}`)
  return out.join('\n')
}
