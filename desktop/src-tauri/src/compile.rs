// Compilação dos sketches (antes backend/compile.js e backend/compile-real.js, em Bun):
//  - check(): verificação rápida com o clang++/g++ (-fsyntax-only) contra o core Arduino
//    mínimo de src-tauri/resources/arduino — erros de tipo, variáveis por declarar… com linha e coluna;
//  - real(): compilação verdadeira com o arduino-cli (avr-gcc, xtensa-gcc, arm-gcc), com
//    fila (no máximo 2 ao mesmo tempo), cache em disco por (placa, código), pedidos iguais
//    partilhados e instalação automática das bibliotecas em falta.
// A tradução C++ → JavaScript (tradutor rápido) corre no worker do simulador, no browser.
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, LazyLock, Mutex};
use std::time::{Duration, Instant};

use futures_util::future::{BoxFuture, FutureExt, Shared};
use regex::Regex;
use serde_json::{json, Value};
use tokio::process::Command;
use tokio::sync::Semaphore;

pub struct Compiler {
    res: PathBuf,       // recursos só de leitura (arduino/, arduino-libs/, arduino-compat/)
    root: PathBuf,      // <dados da app>/.arduino
    cli: Option<PathBuf>,
    cxx: Option<PathBuf>,
    jobs: Semaphore,
    memo: Mutex<HashMap<String, Value>>,
    inflight: Mutex<HashMap<String, Shared<BoxFuture<'static, Value>>>>,
    check_cache: Mutex<HashMap<String, Value>>,
    lib_tried: Mutex<HashSet<String>>,
    config_ready: tokio::sync::OnceCell<()>,
}

const KEEP_BUILDS: usize = 60;

// biblioteca do utilizador (carregada no editor): nome e ficheiros (.h/.cpp/…), sem pastas
#[derive(serde::Deserialize, serde::Serialize, Clone, Default, Debug)]
pub struct UserLib {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub files: BTreeMap<String, String>,
}
fn safe_name(s: &str) -> String {
    let n: String = s.chars().map(|c| if c.is_ascii_alphanumeric() || "_-.".contains(c) { c } else { '_' }).collect();
    let n = n.trim_matches('.').to_string();
    if n.is_empty() { "lib".into() } else { n }
}
// escreve as bibliotecas em <dir>/<nome>/<ficheiro> (formato "plano" do Arduino)
async fn write_libs(dir: &Path, libs: &[UserLib]) -> std::io::Result<()> {
    for (i, l) in libs.iter().enumerate() {
        let d = dir.join(format!("{}{}", safe_name(&l.name), if i > 0 { format!("_{i}") } else { String::new() }));
        tokio::fs::create_dir_all(&d).await?;
        for (f, text) in &l.files {
            let base = f.rsplit(['/', '\\']).next().unwrap_or(f);
            if base.is_empty() || base.starts_with('.') {
                continue;
            }
            tokio::fs::write(d.join(safe_name(base)), text).await?;
        }
    }
    Ok(())
}
fn libs_hash(libs: &[UserLib]) -> String {
    if libs.is_empty() { String::new() } else { fnv64(&serde_json::to_string(libs).unwrap_or_default()) }
}
const COMPAT_VER: u32 = 2;

// ---------- utilidades ----------
pub fn fnv64(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    let mut n = h;
    let digits = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut out = Vec::new();
    while n > 0 {
        out.push(digits[(n % 36) as usize]);
        n /= 36;
    }
    if out.is_empty() {
        out.push(b'0');
    }
    out.reverse();
    String::from_utf8(out).unwrap()
}

fn hidden(cmd: &mut Command) -> &mut Command {
    // sem janelas de consola a piscar no Windows
    #[cfg(windows)]
    cmd.creation_flags(0x0800_0000);
    cmd
}

struct Output {
    stdout: String,
    stderr: String,
    code: i32,
    timed_out: bool,
}

async fn run(mut cmd: Command, timeout: Duration) -> std::io::Result<Output> {
    hidden(&mut cmd).stdout(Stdio::piped()).stderr(Stdio::piped()).stdin(Stdio::null()).kill_on_drop(true);
    let child = cmd.spawn()?;
    match tokio::time::timeout(timeout, child.wait_with_output()).await {
        Ok(Ok(o)) => Ok(Output {
            stdout: String::from_utf8_lossy(&o.stdout).into(),
            stderr: String::from_utf8_lossy(&o.stderr).into(),
            code: o.status.code().unwrap_or(-1),
            timed_out: false,
        }),
        Ok(Err(e)) => Err(e),
        // o processo é morto ao largar o futuro (kill_on_drop)
        Err(_) => Ok(Output { stdout: String::new(), stderr: String::new(), code: -1, timed_out: true }),
    }
}

fn arch_of(fqbn: &str) -> &'static str {
    if fqbn.starts_with("arduino:avr") {
        "avr"
    } else if fqbn.starts_with("esp32") {
        "esp32"
    } else if fqbn.starts_with("rp2040") {
        "rp2040"
    } else if fqbn.contains("stm32") {
        "stm32"
    } else if fqbn.contains(":mbed") {
        "mbed"
    } else if fqbn.contains(":avr:") {
        "avr-other" // ATTinyCore, Digispark… (sem emulação: só a compilação verdadeira)
    } else {
        "other"
    }
}

fn arduino_data_dir() -> PathBuf {
    if let Ok(d) = std::env::var("ARDUINO_DATA_DIR") {
        return d.into();
    }
    let home = dirs::home_dir().unwrap_or_default();
    if cfg!(windows) {
        dirs::data_local_dir().unwrap_or(home.join("AppData").join("Local")).join("Arduino15")
    } else if cfg!(target_os = "linux") {
        home.join(".arduino15")
    } else {
        home.join("Library").join("Arduino15")
    }
}

fn find_cli() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("ARDUINO_CLI") {
        return Some(p.into());
    }
    if let Ok(p) = which::which("arduino-cli") {
        return Some(p);
    }
    // arduino-cli que vem dentro do Arduino IDE 2
    let ide = if cfg!(windows) {
        PathBuf::from(std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".into()))
            .join("Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe")
    } else if cfg!(target_os = "macos") {
        PathBuf::from("/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli")
    } else {
        PathBuf::from("/opt/Arduino IDE/resources/app/lib/backend/resources/arduino-cli")
    };
    ide.exists().then_some(ide)
}

// ---------- verificação rápida (clang++) ----------
static TYPE: &str = r"(?:unsigned\s+|signed\s+|const\s+|static\s+|inline\s+)*[A-Za-z_]\w*\s*[*&]?";
static RE_PROTO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(r"(?m)^\s*({TYPE})\s+([A-Za-z_]\w*)\s*\(([^()]*)\)(?:\s|//[^\n]*|/\*[\s\S]*?\*/)*\{{")).unwrap()
});
static RE_KEYWORD: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(if|for|while|switch|return|else)$").unwrap());
static RE_TYPE_KW: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(if|else|return)\b").unwrap());
static RE_INCLUDE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"(?m)^\s*#\s*include\s*[<"]([^>"]+)[>"]"#).unwrap());
static RE_CLANG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(.*?):(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$").unwrap());
static RE_NOTFOUND: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"'(.+?)' file not found").unwrap());

// tal como o arduino-builder: protótipos para chamar funções definidas mais abaixo
fn prototypes(code: &str) -> Vec<String> {
    let mut out = Vec::new();
    for c in RE_PROTO.captures_iter(code) {
        let (ty, name, params) = (&c[1], &c[2], &c[3]);
        if RE_KEYWORD.is_match(name) || RE_TYPE_KW.is_match(ty) || params.contains('=') {
            continue;
        }
        out.push(format!("{} {}({});", ty.trim(), name, params.trim()));
    }
    out
}

fn parse_clang(text: &str, libs: &[String]) -> Vec<Value> {
    let mut diags = Vec::new();
    for line in text.lines() {
        let Some(m) = RE_CLANG.captures(line) else { continue };
        let (file, sev, msg) = (&m[1], &m[4], &m[5]);
        // #error dentro de um cabeçalho do core (ex.: WiFi.h num Uno) também é mostrado
        if !file.ends_with("sketch.ino") {
            if sev == "error" && msg.starts_with('"') {
                diags.push(json!({ "line": 0, "col": 0, "severity": "error", "message": msg.trim_matches('"') }));
            }
            continue;
        }
        let severity = if sev == "fatal error" { "error" } else { sev };
        if severity == "note" {
            continue;
        }
        let mut message = msg.to_string();
        if let Some(l) = RE_NOTFOUND.captures(msg) {
            message = tr!(format!("Biblioteca \"{}\" não existe no simulador (suportadas: {})", &l[1], libs.join(", ")), format!("Library \"{}\" is not available in the simulator (supported: {})", &l[1], libs.join(", ")));
        }
        diags.push(json!({ "line": m[2].parse::<u32>().unwrap_or(0), "col": m[3].parse::<u32>().unwrap_or(0), "severity": severity, "message": message }));
    }
    diags
}

// ---------- compilação real: camadas de compatibilidade ----------
struct Compat {
    swap: Regex,
    need: Vec<Regex>,
    header: &'static str,
}
static COMPAT: LazyLock<Vec<Compat>> = LazyLock::new(|| {
    vec![
        // Adafruit_SSD1306 display(w, h, &meuSoftwareWire, rst) — a original só aceita TwoWire*
        Compat {
            swap: Regex::new(r#"([<"])Adafruit_SSD1306\.h([>"])"#).unwrap(),
            need: vec![
                Regex::new(r#"(?m)^\s*#\s*include\s*[<"]Adafruit_SSD1306\.h[>"]"#).unwrap(),
                Regex::new(r#"(?m)^\s*#\s*include\s*[<"]SoftwareWire\.h[>"]"#).unwrap(),
            ],
            header: "AdjeltronSSD1306SW.h",
        },
        // API antiga da Adafruit_ST7735 (Color565, setAddrWindow por cantos)
        Compat {
            swap: Regex::new(r#"([<"])Adafruit_ST7735\.h([>"])"#).unwrap(),
            need: vec![
                Regex::new(r#"(?m)^\s*#\s*include\s*[<"]Adafruit_ST7735\.h[>"]"#).unwrap(),
                Regex::new(r"\.\s*Color565\s*\(").unwrap(),
            ],
            header: "AdjeltronST7735Legacy.h",
        },
    ]
});

// o #include original é trocado NA MESMA LINHA pelo da camada (os números de linha não mudam)
fn with_compat(code: &str) -> String {
    let mut out = code.to_string();
    for c in COMPAT.iter() {
        if !c.need.iter().all(|r| r.is_match(&out)) {
            continue;
        }
        let rep = format!("<{}>", c.header);
        out = out
            .split('\n')
            .map(|l| if c.need[0].is_match(l) { c.swap.replace(l, rep.as_str()).into_owned() } else { l.to_string() })
            .collect::<Vec<_>>()
            .join("\n");
    }
    out
}

// ---------- diagnósticos do gcc → linhas do sketch ----------
static RE_GCC: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(.*?):(\d+):(?:(\d+):)?\s+(fatal error|error|warning|note):\s+(.*)$").unwrap());
static RE_WFLAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s*\[-W[\w=+-]+\]$").unwrap());
static RE_NOFILE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^(.+?): No such file or directory$").unwrap());
static RE_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(undefined reference to [`'](.+?)'|region [`']?(\w+)'? overflowed by (\d+) bytes|section [`'](.+?)' will not fit in region)").unwrap()
});

fn parse_gcc(text: &str) -> Vec<Value> {
    let mut diags = Vec::new();
    let mut seen = HashSet::new();
    for line in text.lines() {
        if let Some(m) = RE_GCC.captures(line) {
            let sev0 = &m[4];
            if sev0 == "note" {
                continue;
            }
            let severity = if sev0 == "fatal error" { "error" } else { sev0 };
            let file = &m[1];
            let mut message = RE_WFLAG.replace(&m[5], "").replace(['‘', '’'], "'");
            if let Some(l) = RE_NOFILE.captures(&message.clone()) {
                message = tr!(format!("Biblioteca/cabeçalho \"{}\" não encontrado (instale-a: arduino-cli lib install \"<nome>\")", &l[1]), format!("Library/header \"{}\" not found (install it: arduino-cli lib install \"<name>\")", &l[1]));
            }
            let in_sketch = file.ends_with("sketch.ino") || file.ends_with("sketch.ino.cpp");
            // avisos dentro de bibliotecas/core não interessam ao aluno (os erros sim)
            if !in_sketch && severity == "warning" {
                continue;
            }
            let (ln, col, msg) = if in_sketch {
                (m[2].parse::<u32>().unwrap_or(0), m.get(3).and_then(|c| c.as_str().parse().ok()).unwrap_or(1), message)
            } else {
                let parts: Vec<&str> = file.split(['/', '\\']).collect();
                let short = parts[parts.len().saturating_sub(2)..].join("/");
                (0, 0, format!("{short}:{}: {message}", &m[2]))
            };
            if seen.insert(format!("{ln}:{col}:{msg}")) {
                diags.push(json!({ "line": ln, "col": col, "severity": severity, "message": msg }));
            }
            continue;
        }
        // erros do linker (função não definida, memória a mais…)
        if let Some(lk) = RE_LINK.captures(line) {
            let message = if let Some(f) = lk.get(2) {
                tr!(format!("Erro de ligação: {} não está definida (falta a função ou a biblioteca)", f.as_str()), format!("Link error: {} is not defined (missing function or library)", f.as_str()))
            } else if let (Some(r), Some(n)) = (lk.get(3), lk.get(4)) {
                tr!(format!("O programa não cabe na memória {} (excede {} bytes)", r.as_str(), n.as_str()), format!("The program does not fit in {} memory (exceeds by {} bytes)", r.as_str(), n.as_str()))
            } else {
                tr!(format!("O programa não cabe na memória: {}", &lk[0]), format!("The program does not fit in memory: {}", &lk[0]))
            };
            if seen.insert(message.clone()) {
                diags.push(json!({ "line": 0, "col": 0, "severity": "error", "message": message }));
            }
        }
    }
    diags
}

static RE_SIZE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"Sketch uses (\d+) bytes \((\d+)%\).*?Maximum is (\d+)").unwrap());
static RE_RAM: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"Global variables use (\d+) bytes \((\d+)%\)").unwrap());
fn size_info(out: &str) -> Value {
    let n = |s: &str| s.parse::<u64>().unwrap_or(0);
    match RE_SIZE.captures(out) {
        Some(m) => {
            let r = RE_RAM.captures(out);
            json!({
                "flash": n(&m[1]), "flashPct": n(&m[2]), "flashMax": n(&m[3]),
                "ram": r.as_ref().map(|r| n(&r[1])), "ramPct": r.as_ref().map(|r| n(&r[2])),
            })
        }
        None => Value::Null,
    }
}

// ---------- bibliotecas em falta ----------
const KNOWN_LIBS: &[(&str, &str)] = &[
    ("U8g2lib.h", "U8g2"), ("U8x8lib.h", "U8g2"), ("DHT.h", "DHT sensor library"), ("DHT_U.h", "DHT sensor library"),
    ("TM1637Display.h", "TM1637"), ("Adafruit_GFX.h", "Adafruit GFX Library"), ("Adafruit_Sensor.h", "Adafruit Unified Sensor"),
    ("Adafruit_NeoPixel.h", "Adafruit NeoPixel"), ("Adafruit_PWMServoDriver.h", "Adafruit PWM Servo Driver Library"),
    ("Adafruit_BMP280.h", "Adafruit BMP280 Library"), ("Adafruit_PCD8544.h", "Adafruit PCD8544 Nokia 5110 LCD library"),
    ("Adafruit_ST7735.h", "Adafruit ST7735 and ST7789 Library"), ("Adafruit_ST7789.h", "Adafruit ST7735 and ST7789 Library"),
    ("DallasTemperature.h", "DallasTemperature"), ("OneWire.h", "OneWire"), ("RTClib.h", "RTClib"), ("IRremote.h", "IRremote"),
    ("IRremote.hpp", "IRremote"), ("TinyGPS++.h", "TinyGPSPlus"), ("TinyGPSPlus.h", "TinyGPSPlus"), ("MFRC522.h", "MFRC522"),
    ("HX711.h", "HX711"), ("NewPing.h", "NewPing"), ("Keypad.h", "Keypad"), ("AccelStepper.h", "AccelStepper"),
    ("LiquidCrystal_I2C.h", "LiquidCrystal I2C"), ("FastLED.h", "FastLED"), ("ArduinoJson.h", "ArduinoJson"),
    ("PubSubClient.h", "PubSubClient"), ("Bounce2.h", "Bounce2"), ("LedControl.h", "LedControl"), ("MD_MAX72xx.h", "MD_MAX72XX"),
    ("MD_Parola.h", "MD_Parola"), ("SevSeg.h", "SevSeg"), ("Encoder.h", "Encoder"), ("ESP32Servo.h", "ESP32Servo"),
    ("MPU6050_light.h", "MPU6050_light"), ("Adafruit_MPU6050.h", "Adafruit MPU6050"), ("Adafruit_SSD1306.h", "Adafruit SSD1306"),
    ("Adafruit_SH110X.h", "Adafruit SH110X"), ("Adafruit_ILI9341.h", "Adafruit ILI9341"), ("GxEPD2_BW.h", "GxEPD2"),
    ("NTPClient.h", "NTPClient"), ("BH1750.h", "BH1750"), ("Adafruit_VL53L0X.h", "Adafruit_VL53L0X"), ("TFT_eSPI.h", "TFT_eSPI"),
    // bibliotecas comuns cujo nome no índice é diferente do .h
    ("TimeLib.h", "Time"), ("TimeAlarms.h", "TimeAlarms"), ("PID_v1.h", "PID"), ("QuickPID.h", "QuickPID"), ("ServoEasing.hpp", "ServoEasing"),
    ("A4988.h", "StepperDriver"), ("DRV8825.h", "StepperDriver"), ("BasicStepperDriver.h", "StepperDriver"), ("Kalman.h", "Kalman Filter Library"),
    ("MadgwickAHRS.h", "Madgwick"), ("arduinoFFT.h", "arduinoFFT"), ("CRC32.h", "CRC32"), ("LowPower.h", "Low-Power"), ("EmonLib.h", "EmonLib"),
    ("MD_MAX72xx.h", "MD_MAX72XX"), ("MD_Parola.h", "MD_Parola"), ("WS2812FX.h", "WS2812FX"), ("LiquidCrystal_PCF8574.h", "LiquidCrystal_PCF8574"),
    ("MPU6050.h", "MPU6050"), ("I2Cdev.h", "I2Cdevlib-Core"), ("millisDelay.h", "SafeString"), ("arduino-timer.h", "arduino-timer"),
    ("TaskScheduler.h", "TaskScheduler"), ("OneButton.h", "OneButton"), ("ezButton.h", "ezButton"), ("Ultrasonic.h", "Ultrasonic"),
    ("RotaryEncoder.h", "RotaryEncoder"), ("RunningAverage.h", "RunningAverage"), ("movingAvg.h", "movingAvg"), ("LibPrintf.h", "LibPrintf"),
    ("IRremoteESP8266.h", "IRremoteESP8266"), ("AltSoftSerial.h", "AltSoftSerial"), ("ACS712.h", "ACS712"), ("I2C_eeprom.h", "I2C_EEPROM"),
    ("Adafruit_MCP3008.h", "Adafruit MCP3008"), ("WiFiNINA.h", "WiFiNINA"),
];
static RE_PLATFORM: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[Pp]latform '([\w.-]+:[\w.-]+)' not (?:found|installed)").unwrap());
static RE_MISSING: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"fatal error:\s+(\S+?\.(?:h|hpp)): No such file or directory").unwrap());
fn norm(t: &str) -> String {
    t.to_lowercase().chars().filter(|c| c.is_ascii_alphanumeric()).collect()
}

impl Compiler {
    pub fn new(res: PathBuf, data: PathBuf) -> Arc<Self> {
        let jobs = std::env::var("ARDUINO_MAX_JOBS").ok().and_then(|v| v.parse().ok()).unwrap_or(2usize).max(1);
        Arc::new(Self {
            res,
            root: data.join(".arduino"),
            cli: find_cli(),
            cxx: which::which("clang++").or_else(|_| which::which("g++")).ok(),
            jobs: Semaphore::new(jobs),
            memo: Mutex::default(),
            inflight: Mutex::default(),
            check_cache: Mutex::default(),
            lib_tried: Mutex::default(),
            config_ready: tokio::sync::OnceCell::new(),
        })
    }

    pub fn health(&self) -> Value {
        json!({ "compiler": self.cxx, "arduinoCli": self.cli })
    }

    // verificação com clang++/g++; defines e cabeçalhos suportados vêm do worker (catálogo JS)
    pub async fn check(&self, code: &str, defines: &[String], libs: &[String], user: &[UserLib]) -> Value {
        let Some(cxx) = self.cxx.clone() else {
            return json!({ "available": false, "diagnostics": [] });
        };
        let key = format!("{}:{}:{}:{}", crate::i18n::lang(), defines.join(","), fnv64(code), libs_hash(user));
        if let Some(v) = self.check_cache.lock().unwrap().get(&key) {
            return v.clone();
        }
        let res = async {
            let dir = tempfile::Builder::new().prefix("adjeltron-").tempdir()?;
            // bibliotecas do utilizador: todas numa pasta com -I (o #include encontra-as)
            let ulib = dir.path().join("userlibs");
            tokio::fs::create_dir_all(&ulib).await?;
            let mut user_headers: Vec<String> = Vec::new();
            for l in user {
                for (f, text) in &l.files {
                    let base = safe_name(f.rsplit(['/', '\\']).next().unwrap_or(f));
                    user_headers.push(base.clone());
                    tokio::fs::write(ulib.join(&base), text).await?;
                }
            }
            let used: Vec<String> = RE_INCLUDE.captures_iter(code).map(|c| c[1].to_string()).filter(|h| libs.contains(h) && !user_headers.contains(h)).collect();
            let mut header = vec!["#include <Arduino.h>".to_string()];
            header.extend(used.iter().map(|h| format!("#include <{h}>")));
            header.extend(prototypes(code));
            let file = dir.path().join("sketch.ino.cpp");
            tokio::fs::write(&file, format!("{}\n#line 1 \"sketch.ino\"\n{}\n", header.join("\n"), code)).await?;
            let mut cmd = Command::new(&cxx);
            cmd.arg("-std=gnu++11");
            for d in defines {
                cmd.arg(format!("-D{d}"));
            }
            cmd.args(["-fsyntax-only", "-fno-color-diagnostics", "-Wall", "-Wno-unused-variable", "-Wno-unused-function", "-isystem"])
                .arg(self.res.join("arduino"))
                .arg("-I")
                .arg(&ulib)
                .args(["-x", "c++"])
                .arg(&file);
            let out = run(cmd, Duration::from_secs(10)).await?;
            Ok::<_, std::io::Error>(parse_clang(&out.stderr, libs))
        }
        .await;
        let name = cxx.file_name().map(|n| n.to_string_lossy().to_string());
        let v = match res {
            Ok(d) => json!({ "available": true, "compiler": name, "diagnostics": d }),
            Err(e) => json!({ "available": false, "diagnostics": [], "error": e.to_string() }),
        };
        let mut c = self.check_cache.lock().unwrap();
        if c.len() > 200 {
            c.clear();
        }
        c.insert(key, v.clone());
        v
    }

    fn config(&self) -> PathBuf {
        self.root.join("arduino-cli.yaml")
    }
    fn builds(&self) -> PathBuf {
        self.root.join("build")
    }

    async fn ensure_config(&self) {
        self.config_ready
            .get_or_init(|| async {
                for d in ["user/libraries", "downloads", "cache", "build"] {
                    let _ = tokio::fs::create_dir_all(self.root.join(d)).await;
                }
                let data = arduino_data_dir();
                let q = |p: &Path| serde_json::to_string(&p.to_string_lossy()).unwrap();
                let txt = [
                    "# Configuração do arduino-cli do adjeltron (gerada pela app desktop)".to_string(),
                    "directories:".into(),
                    format!("  data: {}", q(&data)),
                    format!("  user: {}", q(&self.root.join("user"))),
                    format!("  downloads: {}", q(&self.root.join("downloads"))),
                    "  builtin:".into(),
                    format!("    libraries: {}", q(&data.join("libraries"))),
                    "build_cache:".into(),
                    format!("  path: {}", q(&self.root.join("cache"))),
                    // índices dos cores que não vêm no oficial (instalados quando uma placa precisa)
                    "board_manager:".into(),
                    "  additional_urls:".into(),
                    "    - https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json".into(),
                    "    - https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json".into(),
                    "    - http://drazzy.com/package_drazzy.com_index.json".into(),
                    "    - https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json".into(),
                    "updater:".into(),
                    "  enable_notification: false".into(),
                    "metrics:".into(),
                    "  enabled: false".into(),
                    String::new(),
                ]
                .join("\n");
                let _ = tokio::fs::write(self.config(), txt).await;
            })
            .await;
    }

    async fn cli_json(&self, args: &[&str], ms: u64) -> Option<Value> {
        let mut cmd = Command::new(self.cli.as_ref()?);
        cmd.arg("--config-file").arg(self.config()).args(args).args(["--format", "json"]);
        let o = run(cmd, Duration::from_millis(ms)).await.ok()?;
        if o.code != 0 {
            return None;
        }
        serde_json::from_str(if o.stdout.trim().is_empty() { "{}" } else { &o.stdout }).ok()
    }

    async fn lib_for_header(&self, h: &str) -> Option<String> {
        if let Some((_, n)) = KNOWN_LIBS.iter().find(|(k, _)| *k == h) {
            return Some(n.to_string());
        }
        let base = h.trim_end_matches(".hpp").trim_end_matches(".h");
        if base.len() < 3 {
            return None;
        }
        let r = self.cli_json(&["lib", "search", &base.replace('_', " "), "--omit-releases-details"], 60_000).await?;
        let names: Vec<String> = r["libraries"].as_array()?.iter().filter_map(|l| l["name"].as_str().map(String::from)).collect();
        let nb = norm(base);
        names.iter().find(|n| norm(n) == nb).or_else(|| names.iter().find(|n| norm(n).starts_with(&nb))).cloned()
    }

    // instala as bibliotecas que faltam; devolve true se instalou alguma
    async fn install_missing(&self, text: &str) -> bool {
        let mut missing: Vec<String> = RE_MISSING.captures_iter(text).map(|c| c[1].to_string()).collect();
        missing.dedup();
        let mut any = false;
        for h in missing {
            if !self.lib_tried.lock().unwrap().insert(h.clone()) {
                continue;
            }
            let Some(name) = self.lib_for_header(&h).await else { continue };
            if self.cli_json(&["lib", "install", &name], 180_000).await.is_some() {
                println!("[compile] biblioteca \"{name}\" instalada para {h}");
                self.lib_tried.lock().unwrap().remove(&h);
                any = true;
            }
        }
        any
    }

    // core da placa em falta (ATTinyCore, STM32duino, Arduino mbed…): atualiza os índices e instala-o
    async fn install_core(&self, text: &str) -> bool {
        let Some(c) = RE_PLATFORM.captures(text) else { return false };
        let core = c[1].to_string();
        if !self.lib_tried.lock().unwrap().insert(format!("core:{core}")) {
            return false;
        }
        println!("[compile] a instalar o core {core}…");
        let _ = self.cli_json(&["core", "update-index"], 180_000).await;
        let ok = self.cli_json(&["core", "install", &core], 900_000).await.is_some();
        if ok {
            println!("[compile] core {core} instalado");
            self.lib_tried.lock().unwrap().remove(&format!("core:{core}"));
        }
        ok
    }

    async fn run_cli(&self, code: &str, fqbn: &str, dir: &Path, libs: &[UserLib]) -> std::io::Result<Output> {
        let sk = dir.join("sketch");
        tokio::fs::create_dir_all(&sk).await?;
        let ulibs = dir.join("libs");
        if !libs.is_empty() {
            let _ = tokio::fs::remove_dir_all(&ulibs).await;
            write_libs(&ulibs, libs).await?;
        }
        tokio::fs::write(sk.join("sketch.ino"), with_compat(code)).await?;
        let mut cmd = Command::new(self.cli.as_ref().unwrap());
        cmd.arg("--config-file").arg(self.config()).args(["compile", "-b", fqbn, "--warnings", "default", "--build-path"]);
        cmd.arg(dir.join("build")).arg("--output-dir").arg(dir.join("out")).arg("--no-color");
        let user_libs = dirs::document_dir().unwrap_or_default().join("Arduino").join("libraries");
        for l in [user_libs, self.res.join("arduino-libs")] {
            if l.exists() {
                cmd.arg("--libraries").arg(l);
            }
        }
        if !libs.is_empty() {
            cmd.arg("--libraries").arg(&ulibs);
        }
        cmd.arg("--libraries").arg(self.res.join("arduino-compat")).arg(&sk);
        cmd.env("ARDUINO_UPDATER_ENABLE_NOTIFICATION", "false");
        let secs = match arch_of(fqbn) {
            "avr" | "avr-other" => 90,
            "esp32" | "mbed" => 600,
            "rp2040" | "stm32" => 300,
            _ => 120,
        };
        run(cmd, Duration::from_secs(secs)).await
    }

    fn key(fqbn: &str, code: &str, libs: &[UserLib]) -> String {
        let f: String = fqbn.chars().map(|c| if c.is_ascii_alphanumeric() || c == '_' { c } else { '_' }).collect();
        format!("{f}-{}", fnv64(&format!("{}\0{COMPAT_VER}\0{}", with_compat(code), libs_hash(libs))))
    }

    // resultado gravado em disco por uma compilação anterior (com o .hex no AVR)
    async fn from_disk(&self, key: &str, fqbn: &str) -> Option<Value> {
        let dir = self.builds().join(key);
        let mut prev: Value = serde_json::from_str(&tokio::fs::read_to_string(dir.join("result.json")).await.ok()?).ok()?;
        if prev["ok"].as_bool() == Some(true) && arch_of(fqbn) == "avr" {
            prev["hex"] = Value::String(tokio::fs::read_to_string(dir.join("out").join("sketch.ino.hex")).await.ok()?);
        }
        Some(prev)
    }

    fn remember(&self, key: &str, v: &Value) {
        let mut m = self.memo.lock().unwrap();
        if m.len() > 300 {
            if let Some(k) = m.keys().next().cloned() {
                m.remove(&k);
            }
        }
        m.insert(key.to_string(), v.clone());
    }

    async fn prune(&self) {
        let Ok(mut rd) = tokio::fs::read_dir(self.builds()).await else { return };
        let mut all = Vec::new();
        while let Ok(Some(e)) = rd.next_entry().await {
            let t = e.metadata().await.and_then(|m| m.modified()).ok();
            all.push((t, e.path()));
        }
        if all.len() <= KEEP_BUILDS {
            return;
        }
        all.sort_by_key(|(t, _)| *t);
        let n = all.len() - KEEP_BUILDS;
        for (_, p) in all.into_iter().take(n) {
            let _ = tokio::fs::remove_dir_all(p).await;
        }
    }

    async fn compile_job(self: Arc<Self>, code: String, fqbn: String, key: String, libs: Vec<UserLib>) -> Value {
        self.ensure_config().await;
        if let Some(prev) = self.from_disk(&key, &fqbn).await {
            self.remember(&key, &prev);
            return prev;
        }
        let _permit = self.jobs.acquire().await;
        let t0 = Instant::now();
        let arch = arch_of(&fqbn);
        let dir = self.builds().join(&key);
        let mut r = match self.run_cli(&code, &fqbn, &dir, &libs).await {
            Ok(r) => r,
            Err(e) => {
                return json!({ "ok": false, "available": true, "fqbn": fqbn, "arch": arch,
                    "diagnostics": [{ "line": 0, "col": 0, "severity": "error", "message": format!("arduino-cli: {e}") }] })
            }
        };
        // falta o core da placa? instala-o e compila outra vez
        if r.code != 0 && !r.timed_out && self.install_core(&format!("{}\n{}", r.stderr, r.stdout)).await {
            if let Ok(r2) = self.run_cli(&code, &fqbn, &dir, &libs).await {
                r = r2;
            }
        }
        // falta uma biblioteca? instala-a e compila outra vez
        if r.code != 0 && !r.timed_out && self.install_missing(&format!("{}\n{}", r.stderr, r.stdout)).await {
            if let Ok(r2) = self.run_cli(&code, &fqbn, &dir, &libs).await {
                r = r2;
            }
        }
        let mut diagnostics = parse_gcc(&format!("{}\n{}", r.stderr, r.stdout));
        if r.timed_out {
            diagnostics.push(json!({ "line": 0, "col": 0, "severity": "error", "message": tr!("A compilação demorou demasiado e foi cancelada.", "Compilation took too long and was canceled.") }));
        }
        let ok = r.code == 0 && !r.timed_out;
        if !ok && !diagnostics.iter().any(|d| d["severity"] == "error") {
            let src = if r.stderr.trim().is_empty() { &r.stdout } else { &r.stderr };
            let lines: Vec<&str> = src.trim().lines().filter(|l| !l.is_empty()).collect();
            let tail = lines[lines.len().saturating_sub(3)..].join(" · ");
            let tail = if tail.is_empty() { tr!(format!("terminou com o código {}", r.code), format!("exited with code {}", r.code)) } else { tail };
            diagnostics.push(json!({ "line": 0, "col": 0, "severity": "error", "message": format!("arduino-cli: {tail}") }));
        }
        let gcc = match arch {
            "avr" => "avr-gcc",
            "esp32" => "xtensa-esp32-gcc",
            "rp2040" | "stm32" | "mbed" => "arm-none-eabi-gcc",
            "avr-other" => "avr-gcc",
            _ => "gcc",
        };
        let mut result = json!({
            "ok": ok, "available": true, "diagnostics": diagnostics, "compiler": format!("arduino-cli · {gcc}"),
            "fqbn": fqbn, "arch": arch, "size": size_info(&r.stdout), "ms": t0.elapsed().as_millis() as u64,
        });
        // só os sucessos ficam em disco (um erro pode desaparecer ao instalar uma biblioteca)
        if ok {
            let _ = tokio::fs::write(dir.join("result.json"), result.to_string()).await;
            if arch == "avr" {
                if let Ok(hex) = tokio::fs::read_to_string(dir.join("out").join("sketch.ino.hex")).await {
                    result["hex"] = Value::String(hex);
                }
            }
            self.remember(&key, &result);
        }
        self.prune().await;
        result
    }

    // compilação real; cached_only: só o que já está em cache (senão começa em segundo plano e devolve null)
    pub async fn real(self: &Arc<Self>, code: String, fqbn: String, cached_only: bool, libs: Vec<UserLib>) -> Value {
        if self.cli.is_none() {
            return if cached_only { Value::Null } else { json!({ "ok": false, "available": false, "diagnostics": [], "compiler": null }) };
        }
        let key = Self::key(&fqbn, &code, &libs);
        if let Some(v) = self.memo.lock().unwrap().get(&key) {
            let mut v = v.clone();
            v["cached"] = Value::Bool(true);
            return v;
        }
        if cached_only {
            if let Some(mut prev) = self.from_disk(&key, &fqbn).await {
                self.remember(&key, &prev);
                prev["cached"] = Value::Bool(true);
                return prev;
            }
        }
        let fut = {
            let mut inflight = self.inflight.lock().unwrap();
            inflight
                .entry(key.clone())
                .or_insert_with(|| {
                    let me = self.clone();
                    let k = key.clone();
                    async move {
                        let v = me.clone().compile_job(code, fqbn, k.clone(), libs).await;
                        me.inflight.lock().unwrap().remove(&k);
                        v
                    }
                    .boxed()
                    .shared()
                })
                .clone()
        };
        if cached_only {
            tokio::spawn(fut);
            return Value::Null;
        }
        fut.await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn protos() {
        let p = prototypes("void setup() {\n}\nint soma(int a, int b) // x\n{ return a+b; }\nif (x) {\n");
        assert_eq!(p, vec!["void setup();", "int soma(int a, int b);"]);
    }
    #[test]
    fn gcc() {
        let d = parse_gcc("/tmp/x/sketch/sketch.ino:5:3: error: 'foo' was not declared in this scope\n/a/b/lib/X.cpp:2:1: warning: w [-Wall]");
        assert_eq!(d.len(), 1);
        assert_eq!(d[0]["line"], 5);
    }
    #[test]
    fn compat() {
        let c = "#include <Adafruit_ST7735.h>\nx.Color565(1,2,3);";
        assert!(with_compat(c).starts_with("#include <AdjeltronST7735Legacy.h>"));
    }
}
