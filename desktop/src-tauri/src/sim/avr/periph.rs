// Periféricos AVR — tradução do avr8js 0.21.1 (MIT, Uri Shaked e contribuidores): GPIO
// (com interrupções externas e de mudança de pino), timers 8/16 bits (PWM, CTC, saídas de
// comparação, relógio externo), USART, ADC, EEPROM, TWI (I2C), SPI, relógio (CLKPR) e watchdog.
//
// No JS cada periférico regista closures em cpu.readHooks/writeHooks e cpu.addClockEvent. Aqui
// os hooks são uma tabela endereço → `W`/`R` e os eventos são (id, arg), tratados em `Io`.
// A ordem de criação (e portanto qual hook fica num endereço) é a de runner.js.
// Comportamentos do avr8js mantidos de propósito (para dar resultados iguais), mesmo quando
// não são os do chip real: ex. TIMSK/TIFR não tratam o OCFC.
use super::config::*;
use super::cpu::{Cpu, Interrupt, Io};

// ---------------- ligação ao resto do simulador ----------------

/// Pedido ao barramento I2C (o firmware é o mestre)
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TwiEvent {
    Start { repeated: bool },
    Stop,
    Connect { addr: u8, write: bool },
    Write(u8),
    Read { ack: bool },
}
/// Resposta do barramento: o que fica concluído e daqui a quantos ciclos (0 = já)
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TwiDone {
    Start,
    Stop,
    Connect(bool),
    Write(bool),
    Read(u8),
}

/// O que está à volta do microcontrolador (circuito, peças, Monitor Série).
/// As implementações por omissão fazem o mesmo que o avr8js sem nada ligado.
pub trait Host {
    /// a saída de uma porta mudou (valor e DDR já estão nos registos)
    fn port_write(&mut self, _port: usize, _value: u8, _prev: u8) {}
    /// o firmware vai ler PINx: oportunidade de atualizar as entradas (`Avr::set_pin`)
    fn wants_pin_read_hook(&self) -> bool {
        false
    }
    /// byte enviado pela USART `i`
    fn usart_tx(&mut self, _i: usize, _byte: u8) {}
    /// conversão do ADC: valor 0..1023 (omissão: tensões de `Adc::channel_values`, como o avr8js)
    fn adc_sample(&mut self, input: MuxInput, vref: f64, channel_values: &[f64]) -> u16 {
        let v = match input {
            MuxInput::Constant(v) => v,
            MuxInput::SingleEnded(c) => channel_values.get(c as usize).copied().unwrap_or(0.0),
            MuxInput::Temperature => 0.378125,
        };
        ((v / vref) * 1024.0).floor().clamp(0.0, 1023.0) as u16
    }
    /// SPI: byte recebido (MISO) em troca do enviado (omissão do avr8js: 0)
    fn spi_transfer(&mut self, _byte: u8) -> u8 {
        0
    }
    /// I2C: omissão = NoopTWIEventHandler do avr8js (ninguém responde, conclui logo)
    fn twi(&mut self, ev: TwiEvent) -> (TwiDone, i64) {
        let d = match ev {
            TwiEvent::Start { .. } => TwiDone::Start,
            TwiEvent::Stop => TwiDone::Stop,
            TwiEvent::Connect { .. } => TwiDone::Connect(false),
            TwiEvent::Write(_) => TwiDone::Write(false),
            TwiEvent::Read { .. } => TwiDone::Read(0xff),
        };
        (d, 0)
    }
    /// a EEPROM mudou (para guardar entre simulações)
    fn eeprom_changed(&mut self) {}
    /// evento agendado pelo próprio host (`Avr::add_host_event`)
    fn host_event(&mut self, _arg: u32) {}
}
pub struct NoHost;
impl Host for NoHost {}

// ---------------- ids dos eventos de relógio ----------------
const EV_TIMER: u32 = 0x100; // + timer
const EV_USART_TX: u32 = 0x200; // + usart
const EV_USART_RX: u32 = 0x300; // + usart (arg = byte)
const EV_ADC: u32 = 0x400; // arg = resultado
const EV_SPI: u32 = 0x500; // arg = byte recebido
const EV_TWI: u32 = 0x600; // arg = TWCR | estado << 8 | TWDR << 16
const EV_TWI_DONE: u32 = 0x700; // arg = tipo | valor << 8
const EV_EE_MPE: u32 = 0x800;
const EV_EE_READY: u32 = 0x900;
const EV_WDT: u32 = 0xa00;
pub const EV_HOST: u32 = 0x1000;

// ---------------- hooks ----------------
#[derive(Clone, Copy, PartialEq, Debug)]
enum W {
    None,
    Ddr(u8),
    Port(u8),
    Pin(u8),
    Pcifr,
    Pcmsk(u16),
    ExtReg(u16, ExtKind),
    Tcnt(u8),
    TempHigh(u8),
    Ocra(u8),
    Ocrb(u8),
    Ocrc(u8),
    OcrHigh(u8),
    Icr(u8),
    Tccra(u8),
    Tccrb(u8),
    Tccrc(u8),
    Tifr(u8),
    Timsk(u8),
    Ucsra(u8),
    Ucsrb(u8),
    Ucsrc(u8),
    Udr(u8),
    Ubrr(u8, u16),
    Adcsra,
    Eecr,
    Twcr,
    Spdr,
    Spcr,
    Spsr,
    Clkpr,
    Wdtcsr,
}
#[derive(Clone, Copy, PartialEq, Debug)]
enum ExtKind {
    Other,
    Mask,
    Flag,
}
#[derive(Clone, Copy, PartialEq, Debug)]
enum R {
    None,
    Tcnt(u8),
    Udr(u8),
    Pin(u8),
}

fn irq(address: u8, flag_register: u16, flag_mask: u8, enable_register: u16, enable_mask: u8) -> Interrupt {
    Interrupt { address, enable_register, enable_mask, flag_register, flag_mask, constant: false, inverse_flag: false }
}

// ---------------- GPIO ----------------
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum PinOverride {
    None,
    Enable,
    Set,
    Clear,
    Toggle,
}

pub struct Port {
    pub cfg: PortCfg,
    pub pin_value: u8,
    pub override_mask: u8,
    pub override_value: u8,
    pub last_value: u8,
    pub last_ddr: u8,
    pub last_pin: u8,
    pub open_collector: u8,
    ext_ints: [Option<Interrupt>; 8],
    pcint: Option<Interrupt>,
    /// relógio externo de um timer neste pino: (timer, sobe?)
    ext_clock: [Option<usize>; 8],
}

// ---------------- timers ----------------
#[derive(Clone, Copy, PartialEq, Debug)]
enum TMode {
    Normal,
    PwmPhase,
    Ctc,
    FastPwm,
    PwmPhaseFreq,
    Reserved,
}
#[derive(Clone, Copy, PartialEq, Debug)]
enum Upd {
    Immediate,
    Max,
    Top,
    Bottom,
}
const TOP_OCRA: u32 = 1;
const TOP_ICR: u32 = 2;
const OC_TOGGLE: u8 = 1;
use TMode::*;
use Upd::*;
// (modo, TOP, atualização do OCR, atualização do TOV, flags)
const WGM8: [(TMode, u32, Upd, Upd, u8); 8] = [
    (Normal, 0xff, Immediate, Max, 0),
    (PwmPhase, 0xff, Top, Bottom, 0),
    (Ctc, TOP_OCRA, Immediate, Max, 0),
    (FastPwm, 0xff, Bottom, Max, 0),
    (Reserved, 0xff, Immediate, Max, 0),
    (PwmPhase, TOP_OCRA, Top, Bottom, OC_TOGGLE),
    (Reserved, 0xff, Immediate, Max, 0),
    (FastPwm, TOP_OCRA, Bottom, Top, OC_TOGGLE),
];
const WGM16: [(TMode, u32, Upd, Upd, u8); 16] = [
    (Normal, 0xffff, Immediate, Max, 0),
    (PwmPhase, 0x00ff, Top, Bottom, 0),
    (PwmPhase, 0x01ff, Top, Bottom, 0),
    (PwmPhase, 0x03ff, Top, Bottom, 0),
    (Ctc, TOP_OCRA, Immediate, Max, 0),
    (FastPwm, 0x00ff, Bottom, Top, 0),
    (FastPwm, 0x01ff, Bottom, Top, 0),
    (FastPwm, 0x03ff, Bottom, Top, 0),
    (PwmPhaseFreq, TOP_ICR, Bottom, Bottom, 0),
    (PwmPhaseFreq, TOP_OCRA, Bottom, Bottom, OC_TOGGLE),
    (PwmPhase, TOP_ICR, Top, Bottom, 0),
    (PwmPhase, TOP_OCRA, Top, Bottom, OC_TOGGLE),
    (Ctc, TOP_ICR, Immediate, Max, 0),
    (Reserved, 0xffff, Immediate, Max, 0),
    (FastPwm, TOP_ICR, Bottom, Top, OC_TOGGLE),
    (FastPwm, TOP_OCRA, Bottom, Top, OC_TOGGLE),
];
const FOCA: u8 = 1 << 7;
const FOCB: u8 = 1 << 6;
const FOCC: u8 = 1 << 5;

pub struct Timer {
    pub cfg: TimerCfg,
    max: u32,
    last_cycle: u64,
    ocr_a: u32,
    next_ocr_a: u32,
    ocr_b: u32,
    next_ocr_b: u32,
    has_ocrc: bool,
    ocr_c: u32,
    next_ocr_c: u32,
    ocr_update: Upd,
    tov_update: Upd,
    icr: u32,
    pub tcnt: u32,
    tcnt_next: u32,
    tcnt_updated: bool,
    update_divider: bool,
    counting_up: bool,
    divider: u32,
    ext_rising: bool,
    ext_port: Option<usize>,
    high_byte_temp: u8,
    mode: TMode,
    top_value: u32,
    comp_a: u8,
    comp_b: u8,
    comp_c: u8,
    ovf: Interrupt,
    ocfa: Interrupt,
    ocfb: Interrupt,
    ocfc: Interrupt,
}

// ---------------- USART ----------------
const UCSRA_RXC: u8 = 0x80;
const UCSRA_TXC: u8 = 0x40;
const UCSRA_UDRE: u8 = 0x20;
const UCSRA_U2X: u8 = 0x2;
const UCSRA_MPCM: u8 = 0x1;
const UCSRB_RXCIE: u8 = 0x80;
const UCSRB_TXCIE: u8 = 0x40;
const UCSRB_UDRIE: u8 = 0x20;
const UCSRB_RXEN: u8 = 0x10;
const UCSRB_TXEN: u8 = 0x8;
const UCSRB_UCSZ2: u8 = 0x4;
const UCSRC_UPM1: u8 = 0x20;
const UCSRC_USBS: u8 = 0x8;
const UCSRC_UCSZ1: u8 = 0x4;
const UCSRC_UCSZ0: u8 = 0x2;

pub struct Usart {
    pub cfg: UsartCfg,
    pub rx_busy: bool,
    rx_byte: u8,
    rxc: Interrupt,
    udre: Interrupt,
    txc: Interrupt,
}

// ---------------- ADC ----------------
const ADIE: u8 = 0x8;
const ADIF: u8 = 0x10;
const ADSC: u8 = 0x40;
const ADEN: u8 = 0x80;
const ADLAR: u8 = 0x20;
const MUX5: u8 = 0x8;

pub struct Adc {
    pub cfg: AdcCfg,
    /// tensões dos canais (se o host usar a leitura por omissão)
    pub channel_values: Vec<f64>,
    pub avcc: f64,
    pub aref: f64,
    converting: bool,
    conversion_cycles: u64,
    irq: Interrupt,
}

// ---------------- EEPROM ----------------
const EERE: u8 = 1;
const EEPE: u8 = 2;
const EEMPE: u8 = 4;
const EERIE: u8 = 8;
const EEPM0: u8 = 16;
const EEPM1: u8 = 32;
const EECR_WRITE_MASK: u8 = EEPE | EEMPE | EERIE | EEPM0 | EEPM1;

pub struct Eeprom {
    pub cfg: EepromCfg,
    pub memory: Vec<u8>,
    write_enabled_cycles: u64,
    write_complete_cycles: u64,
    irq: Interrupt,
}

// ---------------- TWI ----------------
const TWCR_TWINT: u8 = 0x80;
const TWCR_TWEA: u8 = 0x40;
const TWCR_TWSTA: u8 = 0x20;
const TWCR_TWSTO: u8 = 0x10;
const TWCR_TWEN: u8 = 0x4;
const TWCR_TWIE: u8 = 0x1;
const TWSR_TWS_MASK: u8 = 0xf8;
const ST_IDLE: u8 = 0xf8;
const ST_START: u8 = 0x08;
const ST_REP_START: u8 = 0x10;
const ST_SLAW_ACK: u8 = 0x18;
const ST_SLAW_NACK: u8 = 0x20;
const ST_SENT_ACK: u8 = 0x28;
const ST_SENT_NACK: u8 = 0x30;
const ST_SLAR_ACK: u8 = 0x40;
const ST_SLAR_NACK: u8 = 0x48;
const ST_RECV_ACK: u8 = 0x50;
const ST_RECV_NACK: u8 = 0x58;
const TWBR: u16 = 0xb8;
const TWSR: u16 = 0xb9;
const TWDR: u16 = 0xbb;
const TWCR: u16 = 0xbc;

pub struct Twi {
    busy: bool,
    irq: Interrupt,
}

// ---------------- SPI ----------------
const SPCR: u16 = 0x4c;
const SPSR: u16 = 0x4d;
const SPDR: u16 = 0x4e;
const SPCR_SPIE: u8 = 0x80;
const SPCR_SPE: u8 = 0x40;
const SPSR_SPIF: u8 = 0x80;
const SPSR_WCOL: u8 = 0x40;
const SPSR_SPI2X: u8 = 0x1;

pub struct Spi {
    active: bool,
    irq: Interrupt,
}

// ---------------- relógio e watchdog ----------------
const CLKPR: u16 = 0x61;
const CLKPCE: u8 = 128;
const PRESCALERS: [f64; 16] = [1., 2., 4., 8., 16., 32., 64., 128., 256., 2., 4., 8., 16., 32., 64., 128.];
pub struct Clock {
    pub base_hz: f64,
    enabled_cycles: u64,
    pub prescaler: f64,
    pub cycles_delta: f64,
}
const MCUSR: u16 = 0x54;
const WDTCSR: u16 = 0x60;
const WDIF: u8 = 0x80;
const WDIE: u8 = 0x40;
const WDP3: u8 = 0x20;
const WDCE: u8 = 0x10;
const WDE: u8 = 0x8;
const WDP210: u8 = 0x7;
const WD_PROTECT: u8 = WDE | WDP3 | WDP210;
pub struct Watchdog {
    change_enabled_cycles: u64,
    timeout: u64,
    enabled: bool,
    scheduled: bool,
    irq: Interrupt,
}

// ---------------- conjunto ----------------
pub struct Periph<H: Host> {
    pub cfg: McuCfg,
    pub ports: Vec<Port>,
    pub timers: Vec<Timer>,
    pub usarts: Vec<Usart>,
    pub adc: Adc,
    pub eeprom: Eeprom,
    pub twi: Twi,
    pub spi: Spi,
    pub clock: Clock,
    pub wdt: Option<Watchdog>,
    pub host: H,
    w: Vec<W>,
    r: Vec<R>,
    /// endereço PORTx → porta
    port_by_addr: Vec<Option<usize>>,
}

/// Microcontrolador completo: CPU + periféricos.
pub struct Avr<H: Host> {
    pub cpu: Cpu,
    pub p: Periph<H>,
}

pub const HZ: f64 = 16e6;

impl<H: Host> Avr<H> {
    pub fn new(cfg: McuCfg, program: Vec<u16>, host: H) -> Self {
        let mut cpu = Cpu::new(program, cfg.cpu_sram());
        let n = cpu.data.len();
        let mut p = Periph {
            ports: vec![],
            timers: vec![],
            usarts: vec![],
            adc: Adc { cfg: cfg.adc.clone(), channel_values: vec![0.0; cfg.adc.num_channels], avcc: 5.0, aref: 5.0, converting: false, conversion_cycles: 25, irq: irq(cfg.adc.interrupt, cfg.adc.adcsra, ADIF, cfg.adc.adcsra, ADIE) },
            eeprom: Eeprom {
                cfg: cfg.eeprom_cfg,
                memory: vec![0xff; cfg.eeprom],
                write_enabled_cycles: 0,
                write_complete_cycles: 0,
                irq: Interrupt { constant: true, inverse_flag: true, ..irq(cfg.eeprom_cfg.interrupt, cfg.eeprom_cfg.eecr, EEPE, cfg.eeprom_cfg.eecr, EERIE) },
            },
            twi: Twi { busy: false, irq: irq(cfg.twi_int, TWCR, TWCR_TWINT, TWCR, TWCR_TWIE) },
            spi: Spi { active: false, irq: irq(cfg.spi_int, SPSR, SPSR_SPIF, SPCR, SPCR_SPIE) },
            clock: Clock { base_hz: HZ, enabled_cycles: 0, prescaler: 1.0, cycles_delta: 0.0 },
            wdt: None,
            host,
            w: vec![W::None; n.max(0x140)],
            r: vec![R::None; n.max(0x140)],
            port_by_addr: vec![None; 0x140],
            cfg,
        };
        p.build(&mut cpu);
        Avr { cpu, p }
    }

    /// uma instrução + eventos/interrupções
    #[inline]
    pub fn step(&mut self) {
        super::instruction::step(&mut self.cpu, &mut self.p);
        self.cpu.tick(&mut self.p);
    }
    pub fn run_until(&mut self, cycles: u64) {
        while self.cpu.cycles < cycles {
            self.step();
        }
    }
    /// valor de entrada de um pino (bit `bit` da porta `port`)
    pub fn set_pin(&mut self, port: usize, bit: u8, value: bool) {
        self.p.set_pin(&mut self.cpu, port, bit, value);
    }
    /// byte para a USART (como `writeByte` do avr8js); false se ocupada/desligada
    pub fn usart_write(&mut self, i: usize, byte: u8, immediate: bool) -> bool {
        self.p.usart_write_byte(&mut self.cpu, i, byte, immediate)
    }
    pub fn add_host_event(&mut self, arg: u32, cycles: i64) {
        self.cpu.add_clock_event(EV_HOST, arg, cycles);
    }
    pub fn time_us(&self) -> f64 {
        self.p.clock.time_us(self.cpu.cycles)
    }
}

impl Clock {
    pub fn frequency(&self) -> f64 {
        self.base_hz / self.prescaler
    }
    pub fn time_us(&self, cycles: u64) -> f64 {
        ((cycles as f64 + self.cycles_delta) / self.frequency()) * 1e6
    }
}

impl<H: Host> Periph<H> {
    // ---------- montagem (ordem de runner.js: portas, timers, relógio, watchdog, USART, ADC, EEPROM, TWI, SPI) ----------
    fn build(&mut self, cpu: &mut Cpu) {
        let cfg = self.cfg.clone();
        for (i, pc) in cfg.ports.iter().enumerate() {
            let i8 = i as u8;
            let ext_ints = pc.ext.map(|e| e.map(|e| irq(e.vector, e.eifr, 1 << e.index, e.eimsk, 1 << e.index)));
            let pcint = pc.pin_change.map(|c| irq(c.vector, c.pcifr, 1 << c.pcie, c.pcicr, 1 << c.pcie));
            self.ports.push(Port { cfg: pc.clone(), pin_value: 0, override_mask: 0xff, override_value: 0, last_value: 0, last_ddr: 0, last_pin: 0, open_collector: 0, ext_ints, pcint, ext_clock: [None; 8] });
            if (pc.port as usize) < self.port_by_addr.len() {
                self.port_by_addr[pc.port as usize] = Some(i);
            }
            self.set_w(pc.ddr, W::Ddr(i8));
            self.set_w(pc.port, W::Port(i8));
            self.set_w(pc.pin, W::Pin(i8));
            // interrupções externas: EICRx (cada um), EIMSK, EIFR
            let mut eicrs: Vec<u16> = vec![];
            for e in pc.ext.iter().flatten() {
                if !eicrs.contains(&e.eicr) {
                    eicrs.push(e.eicr);
                }
            }
            for r in eicrs {
                self.set_w(r, W::ExtReg(r, ExtKind::Other));
            }
            if let Some(e) = pc.ext.iter().flatten().next() {
                self.set_w(e.eimsk, W::ExtReg(e.eimsk, ExtKind::Mask));
                self.set_w(e.eifr, W::ExtReg(e.eifr, ExtKind::Flag));
            }
            if let Some(c) = pc.pin_change {
                self.set_w(c.pcifr, W::Pcifr);
                self.set_w(c.pcmsk, W::Pcmsk(c.pcmsk));
            }
            // (runner.js) ler PINx passa pelo host
            if self.host.wants_pin_read_hook() {
                self.set_r(pc.pin, R::Pin(i8));
            }
        }
        for (i, tc) in cfg.timers.iter().enumerate() {
            self.add_timer(cpu, i, *tc);
        }
        // relógio
        self.set_w(CLKPR, W::Clkpr);
        if cfg.watchdog {
            self.wdt = Some(Watchdog { change_enabled_cycles: 0, timeout: 0, enabled: false, scheduled: false, irq: irq(0x0c, WDTCSR, WDIF, WDTCSR, WDIE) });
            self.set_w(WDTCSR, W::Wdtcsr);
        }
        for (i, (uc, _, _)) in cfg.usarts.iter().enumerate() {
            let u = Usart {
                cfg: *uc,
                rx_busy: false,
                rx_byte: 0,
                rxc: Interrupt { constant: true, ..irq(uc.rx_int, uc.ucsra, UCSRA_RXC, uc.ucsrb, UCSRB_RXCIE) },
                udre: irq(uc.udre_int, uc.ucsra, UCSRA_UDRE, uc.ucsrb, UCSRB_UDRIE),
                txc: irq(uc.tx_int, uc.ucsra, UCSRA_TXC, uc.ucsrb, UCSRB_TXCIE),
            };
            cpu.set(uc.ucsra as usize, UCSRA_UDRE);
            cpu.set(uc.ucsrb as usize, 0);
            cpu.set(uc.ucsrc as usize, UCSRC_UCSZ1 | UCSRC_UCSZ0);
            self.usarts.push(u);
            let i8 = i as u8;
            self.set_w(uc.ucsra, W::Ucsra(i8));
            self.set_w(uc.ucsrb, W::Ucsrb(i8));
            self.set_w(uc.ucsrc, W::Ucsrc(i8));
            self.set_r(uc.udr, R::Udr(i8));
            self.set_w(uc.udr, W::Udr(i8));
            self.set_w(uc.ubrrh, W::Ubrr(i8, uc.ubrrh));
            self.set_w(uc.ubrrl, W::Ubrr(i8, uc.ubrrl));
        }
        self.set_w(cfg.adc.adcsra, W::Adcsra);
        self.set_w(cfg.eeprom_cfg.eecr, W::Eecr);
        // TWI: começa parado (estado 0xF8, com o TWINT a 1)
        self.twi_update_status(cpu, ST_IDLE);
        self.set_w(TWCR, W::Twcr);
        self.set_w(SPDR, W::Spdr);
        self.set_w(SPCR, W::Spcr);
        self.set_w(SPSR, W::Spsr);
        // a CPU só chama o Io nos endereços com hook
        for a in 0..cpu.data.len() {
            cpu.write_hook[a] = self.w.get(a).map_or(false, |w| *w != W::None);
            cpu.read_hook[a] = self.r.get(a).map_or(false, |r| *r != R::None);
        }
    }
    fn set_w(&mut self, addr: u16, w: W) {
        if addr == 0 {
            return;
        }
        if let Some(x) = self.w.get_mut(addr as usize) {
            *x = w;
        }
    }
    fn set_r(&mut self, addr: u16, r: R) {
        if let Some(x) = self.r.get_mut(addr as usize) {
            *x = r;
        }
    }

    // ================= GPIO =================
    fn port_idx(&self, port_addr: u16) -> Option<usize> {
        self.port_by_addr.get(port_addr as usize).copied().flatten()
    }
    pub fn set_pin(&mut self, cpu: &mut Cpu, pi: usize, bit: u8, value: bool) {
        let m = 1u8 << bit;
        let p = &mut self.ports[pi];
        p.pin_value &= !m;
        if value {
            p.pin_value |= m;
        }
        let ddr = cpu.get(p.cfg.ddr as usize);
        self.update_pin_register(cpu, pi, ddr);
    }
    pub fn pin_state_out(&self, cpu: &Cpu, pi: usize, bit: u8) -> Option<bool> {
        let p = &self.ports[pi];
        let m = 1u8 << bit;
        if cpu.get(p.cfg.ddr as usize) & m != 0 {
            Some(p.last_value & m != 0)
        } else {
            None
        }
    }
    fn write_gpio(&mut self, pi: usize, value: u8, ddr: u8) {
        let p = &mut self.ports[pi];
        let new = (((value & p.override_mask) | p.override_value) & ddr) | (value & !ddr);
        let prev = p.last_value;
        if new != prev || ddr != p.last_ddr {
            p.last_value = new;
            p.last_ddr = ddr;
            self.host.port_write(pi, new, prev);
        }
    }
    fn update_pin_register(&mut self, cpu: &mut Cpu, pi: usize, ddr: u8) {
        let (new, last) = {
            let p = &self.ports[pi];
            ((p.pin_value & !ddr) | (p.last_value & ddr), p.last_pin)
        };
        cpu.set(self.ports[pi].cfg.pin as usize, new);
        if last != new {
            for b in 0..8u8 {
                let m = 1u8 << b;
                if new & m != last & m {
                    let v = new & m != 0;
                    self.toggle_interrupt(cpu, pi, b, v);
                    if let Some(t) = self.ports[pi].ext_clock[b as usize] {
                        if v == self.timers[t].ext_rising {
                            self.timer_count(cpu, t, false, true);
                        }
                    }
                }
            }
            self.ports[pi].last_pin = new;
        }
    }
    fn toggle_interrupt(&mut self, cpu: &mut Cpu, pi: usize, pin: u8, rising: bool) {
        let ext_cfg = self.ports[pi].cfg.ext[pin as usize];
        if let (Some(c), Some(_)) = (ext_cfg, self.ports[pi].ext_ints[pin as usize]) {
            if cpu.get(c.eimsk as usize) & (1 << c.index) != 0 {
                let conf = (cpu.get(c.eicr as usize) >> c.isc_offset) & 3;
                let (gen, constant) = match conf {
                    0 => (!rising, true),
                    1 => (true, false),
                    2 => (!rising, false),
                    _ => (rising, false),
                };
                let ext = self.ports[pi].ext_ints[pin as usize].as_mut().unwrap();
                ext.constant = constant;
                let ext = *ext;
                if gen {
                    cpu.set_interrupt_flag(&ext);
                } else if ext.constant {
                    cpu.clear_interrupt(&ext, true);
                }
            }
        }
        let pcfg = self.ports[pi].cfg.pin_change;
        if let (Some(c), Some(pcint)) = (pcfg, self.ports[pi].pcint) {
            if c.mask & (1 << pin) != 0 && cpu.get(c.pcmsk as usize) & (1u8 << (pin + c.offset)) != 0 {
                cpu.set_interrupt_flag(&pcint);
            }
        }
    }
    fn check_external_interrupts(&mut self, cpu: &mut Cpu, pi: usize) {
        for pin in 0..8 {
            let Some(e) = self.ports[pi].cfg.ext[pin] else { continue };
            let pv = self.ports[pi].last_pin & (1 << pin) != 0;
            if cpu.get(e.eimsk as usize) & (1 << e.index) == 0 || pv {
                continue;
            }
            if (cpu.get(e.eicr as usize) >> e.isc_offset) & 3 == 0 {
                cpu.queue_interrupt(&Interrupt { constant: true, ..irq(e.vector, e.eifr, 1 << e.index, e.eimsk, 1 << e.index) });
            }
        }
    }
    pub fn timer_override_pin(&mut self, cpu: &mut Cpu, pi: usize, pin: u8, mode: PinOverride) {
        let m = 1u8 << pin;
        let port_addr = self.ports[pi].cfg.port as usize;
        let portv = cpu.get(port_addr);
        let p = &mut self.ports[pi];
        if mode == PinOverride::None {
            p.override_mask |= m;
            p.override_value &= !m;
        } else {
            p.override_mask &= !m;
            match mode {
                PinOverride::Enable => {
                    p.override_value &= !m;
                    p.override_value |= portv & m;
                }
                PinOverride::Set => p.override_value |= m,
                PinOverride::Clear => p.override_value &= !m,
                PinOverride::Toggle => p.override_value ^= m,
                PinOverride::None => {}
            }
        }
        let ddr = cpu.get(self.ports[pi].cfg.ddr as usize);
        self.write_gpio(pi, portv, ddr);
        self.update_pin_register(cpu, pi, ddr);
    }

    // ================= timers =================
    fn add_timer(&mut self, cpu: &mut Cpu, i: usize, c: TimerCfg) {
        let t = Timer {
            cfg: c,
            max: if c.bits == 16 { 0xffff } else { 0xff },
            last_cycle: 0,
            ocr_a: 0,
            next_ocr_a: 0,
            ocr_b: 0,
            next_ocr_b: 0,
            has_ocrc: c.ocrc > 0,
            ocr_c: 0,
            next_ocr_c: 0,
            ocr_update: Immediate,
            tov_update: Max,
            icr: 0,
            tcnt: 0,
            tcnt_next: 0,
            tcnt_updated: false,
            update_divider: false,
            counting_up: true,
            divider: 0,
            ext_rising: false,
            ext_port: None,
            high_byte_temp: 0,
            mode: Normal,
            top_value: 0xff,
            comp_a: 0,
            comp_b: 0,
            comp_c: 0,
            ovf: irq(c.ovf_int, c.tifr, c.tov, c.timsk, c.toie),
            ocfa: irq(c.comp_a_int, c.tifr, c.ocfa, c.timsk, c.ociea),
            ocfb: irq(c.comp_b_int, c.tifr, c.ocfb, c.timsk, c.ocieb),
            ocfc: irq(c.comp_c_int, c.tifr, c.ocfc, c.timsk, c.ociec),
        };
        self.timers.push(t);
        self.update_wgm(cpu, i);
        let i8 = i as u8;
        self.set_r(c.tcnt, R::Tcnt(i8));
        self.set_w(c.tcnt, W::Tcnt(i8));
        self.set_w(c.ocra, W::Ocra(i8));
        self.set_w(c.ocrb, W::Ocrb(i8));
        if c.ocrc > 0 {
            self.set_w(c.ocrc, W::Ocrc(i8));
        }
        if c.bits == 16 {
            self.set_w(c.icr, W::Icr(i8));
            self.set_w(c.tcnt + 1, W::TempHigh(i8));
            self.set_w(c.ocra + 1, W::OcrHigh(i8));
            self.set_w(c.ocrb + 1, W::OcrHigh(i8));
            if c.ocrc > 0 {
                self.set_w(c.ocrc + 1, W::OcrHigh(i8));
            }
            self.set_w(c.icr + 1, W::TempHigh(i8));
        }
        self.set_w(c.tccra, W::Tccra(i8));
        self.set_w(c.tccrb, W::Tccrb(i8));
        if c.tccrc > 0 {
            self.set_w(c.tccrc, W::Tccrc(i8));
        }
        self.set_w(c.tifr, W::Tifr(i8));
        self.set_w(c.timsk, W::Timsk(i8));
    }
    fn t_top(&self, i: usize) -> u32 {
        let t = &self.timers[i];
        match t.top_value {
            TOP_OCRA => t.ocr_a,
            TOP_ICR => t.icr,
            v => v,
        }
    }
    fn t_ocr_mask(&self, i: usize) -> u32 {
        match self.timers[i].top_value {
            TOP_OCRA | TOP_ICR => 0xffff,
            v => v,
        }
    }
    fn update_wgm(&mut self, cpu: &mut Cpu, i: usize) {
        let c = self.timers[i].cfg;
        let tccra = cpu.get(c.tccra as usize);
        let tccrb = cpu.get(c.tccrb as usize);
        let mask = if c.bits == 16 { 0x18 } else { 0x8 };
        let wgm = (((tccrb & mask) >> 1) | (tccra & 3)) as usize;
        let (mode, top, ocr_up, tov_up, flags) = if c.bits == 16 { WGM16[wgm] } else { WGM8[wgm] };
        {
            let t = &mut self.timers[i];
            t.mode = mode;
            t.top_value = top;
            t.ocr_update = ocr_up;
            t.tov_update = tov_up;
        }
        let pwm = matches!(mode, FastPwm | PwmPhase | PwmPhaseFreq);
        let prev_a = self.timers[i].comp_a;
        let mut a = (tccra >> 6) & 3;
        if a == 1 && pwm && flags & OC_TOGGLE == 0 {
            a = 0;
        }
        self.timers[i].comp_a = a;
        if (prev_a != 0) != (a != 0) {
            self.update_comp(cpu, i, 'A', if a != 0 { PinOverride::Enable } else { PinOverride::None });
        }
        let prev_b = self.timers[i].comp_b;
        let mut b = (tccra >> 4) & 3;
        if b == 1 && pwm {
            b = 0;
        }
        self.timers[i].comp_b = b;
        if (prev_b != 0) != (b != 0) {
            self.update_comp(cpu, i, 'B', if b != 0 { PinOverride::Enable } else { PinOverride::None });
        }
        if self.timers[i].has_ocrc {
            let prev_c = self.timers[i].comp_c;
            let mut cc = (tccra >> 2) & 3;
            if cc == 1 && pwm {
                cc = 0;
            }
            self.timers[i].comp_c = cc;
            if (prev_c != 0) != (cc != 0) {
                self.update_comp(cpu, i, 'C', if cc != 0 { PinOverride::Enable } else { PinOverride::None });
            }
        }
    }
    fn update_comp(&mut self, cpu: &mut Cpu, i: usize, which: char, mode: PinOverride) {
        let c = self.timers[i].cfg;
        let (port, pin) = match which {
            'A' => (c.comp_port_a, c.comp_pin_a),
            'B' => (c.comp_port_b, c.comp_pin_b),
            _ => (c.comp_port_c, c.comp_pin_c),
        };
        if let Some(pi) = self.port_idx(port) {
            self.timer_override_pin(cpu, pi, pin, mode);
        }
    }
    fn update_comp_pin(&mut self, cpu: &mut Cpu, i: usize, comp: u8, which: char, bottom: bool) {
        let t = &self.timers[i];
        let inverting = comp == 3;
        let is_set = t.counting_up == inverting;
        let nv = match t.mode {
            Normal | Ctc => match comp {
                1 => PinOverride::Toggle,
                2 => PinOverride::Clear,
                3 => PinOverride::Set,
                _ => PinOverride::Enable,
            },
            FastPwm => {
                if comp == 1 {
                    if bottom {
                        PinOverride::None
                    } else {
                        PinOverride::Toggle
                    }
                } else if inverting != bottom {
                    PinOverride::Set
                } else {
                    PinOverride::Clear
                }
            }
            PwmPhase | PwmPhaseFreq => {
                if comp == 1 {
                    PinOverride::Toggle
                } else if is_set {
                    PinOverride::Set
                } else {
                    PinOverride::Clear
                }
            }
            Reserved => PinOverride::None,
        };
        if nv != PinOverride::None {
            self.update_comp(cpu, i, which, nv);
        }
    }
    fn check_force_compare(&mut self, cpu: &mut Cpu, i: usize, value: u8) {
        if matches!(self.timers[i].mode, FastPwm | PwmPhase | PwmPhaseFreq) {
            return;
        }
        let (a, b, c) = (self.timers[i].comp_a, self.timers[i].comp_b, self.timers[i].comp_c);
        if value & FOCA != 0 {
            self.update_comp_pin(cpu, i, a, 'A', false);
        }
        if value & FOCB != 0 {
            self.update_comp_pin(cpu, i, b, 'B', false);
        }
        if self.timers[i].cfg.comp_port_c != 0 && value & FOCC != 0 {
            self.update_comp_pin(cpu, i, c, 'C', false);
        }
    }
    fn timer_updated(&mut self, cpu: &mut Cpu, i: usize, value: u32, prev: u32) {
        let t = &self.timers[i];
        let (oa, ob, oc, has_c) = (t.ocr_a, t.ocr_b, t.ocr_c, t.has_ocrc);
        let (fa, fb, fc) = (t.ocfa, t.ocfb, t.ocfc);
        let overflow = prev > value;
        let hit = |o: u32| ((prev < o || overflow) && value >= o) || (prev < o && overflow);
        if hit(oa) {
            cpu.set_interrupt_flag(&fa);
            let c = self.timers[i].comp_a;
            if c != 0 {
                self.update_comp_pin(cpu, i, c, 'A', false);
            }
        }
        if hit(ob) {
            cpu.set_interrupt_flag(&fb);
            let c = self.timers[i].comp_b;
            if c != 0 {
                self.update_comp_pin(cpu, i, c, 'B', false);
            }
        }
        if has_c && hit(oc) {
            cpu.set_interrupt_flag(&fc);
            let c = self.timers[i].comp_c;
            if c != 0 {
                self.update_comp_pin(cpu, i, c, 'C', false);
            }
        }
    }
    fn latch_ocr(&mut self, i: usize) {
        let t = &mut self.timers[i];
        t.ocr_a = t.next_ocr_a;
        t.ocr_b = t.next_ocr_b;
        t.ocr_c = t.next_ocr_c;
    }
    fn phase_pwm_count(&mut self, cpu: &mut Cpu, i: usize, mut value: u32, mut delta: u64) -> u32 {
        let top = self.t_top(i);
        let (oa, ob, oc, has_c, max, tu) = {
            let t = &self.timers[i];
            (t.ocr_a, t.ocr_b, t.ocr_c, t.has_ocrc, t.max, t.tcnt_updated)
        };
        if value == 0 && top == 0 {
            delta = 0;
            if self.timers[i].ocr_update == Top {
                self.latch_ocr(i);
            }
        }
        // (o JS usa números sem sinal só até TOP; value-- a partir de 0 dá −1, como lá)
        let mut v = value as i64;
        while delta > 0 {
            if self.timers[i].counting_up {
                v += 1;
                if v == top as i64 && !tu {
                    self.timers[i].counting_up = false;
                    if self.timers[i].ocr_update == Top {
                        self.latch_ocr(i);
                    }
                }
            } else {
                v -= 1;
                if v == 0 && !tu {
                    self.timers[i].counting_up = true;
                    let ovf = self.timers[i].ovf;
                    cpu.set_interrupt_flag(&ovf);
                    if self.timers[i].ocr_update == Bottom {
                        self.latch_ocr(i);
                    }
                }
            }
            if !tu {
                if v == oa as i64 {
                    let f = self.timers[i].ocfa;
                    cpu.set_interrupt_flag(&f);
                    let c = self.timers[i].comp_a;
                    if c != 0 {
                        self.update_comp_pin(cpu, i, c, 'A', false);
                    }
                }
                if v == ob as i64 {
                    let f = self.timers[i].ocfb;
                    cpu.set_interrupt_flag(&f);
                    let c = self.timers[i].comp_b;
                    if c != 0 {
                        self.update_comp_pin(cpu, i, c, 'B', false);
                    }
                }
                if has_c && v == oc as i64 {
                    let f = self.timers[i].ocfc;
                    cpu.set_interrupt_flag(&f);
                    let c = self.timers[i].comp_c;
                    if c != 0 {
                        self.update_comp_pin(cpu, i, c, 'C', false);
                    }
                }
            }
            delta -= 1;
        }
        value = (v & max as i64) as u32;
        value
    }
    /// `count` do avr8js (agendado como evento de relógio, ou por leitura/escrita do TCNT)
    fn timer_count(&mut self, cpu: &mut Cpu, i: usize, reschedule: bool, external: bool) {
        let (divider, last_cycle) = (self.timers[i].divider as u64, self.timers[i].last_cycle);
        let delta = cpu.cycles.saturating_sub(last_cycle);
        if (divider != 0 && delta >= divider) || external {
            let cd = if external { 1 } else { delta / divider };
            self.timers[i].last_cycle += cd * divider;
            let val = self.timers[i].tcnt;
            let mode = self.timers[i].mode;
            let top = self.t_top(i);
            let phase = matches!(mode, PwmPhase | PwmPhaseFreq);
            let new_val = if phase { self.phase_pwm_count(cpu, i, val, cd) } else { ((val as u64 + cd) % (top as u64 + 1)) as u32 };
            let overflow = val as u64 + cd > top as u64;
            if !self.timers[i].tcnt_updated {
                self.timers[i].tcnt = new_val;
                if !phase {
                    self.timer_updated(cpu, i, new_val, val);
                }
            }
            if !phase {
                if mode == FastPwm && overflow {
                    let (a, b) = (self.timers[i].comp_a, self.timers[i].comp_b);
                    if a != 0 {
                        self.update_comp_pin(cpu, i, a, 'A', true);
                    }
                    if b != 0 {
                        self.update_comp_pin(cpu, i, b, 'B', true);
                    }
                }
                if self.timers[i].ocr_update == Bottom && overflow {
                    self.latch_ocr(i);
                }
                if overflow && (self.timers[i].tov_update == Top || top == self.timers[i].max) {
                    let ovf = self.timers[i].ovf;
                    cpu.set_interrupt_flag(&ovf);
                }
            }
        }
        if self.timers[i].tcnt_updated {
            let top = self.t_top(i);
            let t = &mut self.timers[i];
            t.tcnt = t.tcnt_next;
            t.tcnt_updated = false;
            if (t.tcnt == 0 && t.ocr_update == Bottom) || (t.tcnt == top && t.ocr_update == Top) {
                self.latch_ocr(i);
            }
        }
        if self.timers[i].update_divider {
            let c = self.timers[i].cfg;
            let cs = (cpu.get(c.tccrb as usize) & 7) as usize;
            let nd = c.dividers[cs];
            self.timers[i].last_cycle = if nd != 0 { cpu.cycles } else { 0 };
            self.timers[i].update_divider = false;
            self.timers[i].divider = nd;
            if c.ext_clock_port != 0 && self.timers[i].ext_port.is_none() {
                self.timers[i].ext_port = self.port_idx(c.ext_clock_port);
            }
            if let Some(pi) = self.timers[i].ext_port {
                self.ports[pi].ext_clock[c.ext_clock_pin as usize] = None;
            }
            if nd != 0 {
                let lc = self.timers[i].last_cycle;
                cpu.add_clock_event(EV_TIMER + i as u32, 0, lc as i64 + nd as i64 - cpu.cycles as i64);
            } else if let Some(pi) = self.timers[i].ext_port {
                if cs == 6 || cs == 7 {
                    self.ports[pi].ext_clock[c.ext_clock_pin as usize] = Some(i);
                    self.timers[i].ext_rising = cs == 7;
                }
            }
            return;
        }
        if reschedule && divider != 0 {
            let lc = self.timers[i].last_cycle;
            cpu.add_clock_event(EV_TIMER + i as u32, 0, lc as i64 + divider as i64 - cpu.cycles as i64);
        }
    }

    // ================= USART =================
    fn usart_bits_per_char(&self, cpu: &Cpu, i: usize) -> u32 {
        let c = self.usarts[i].cfg;
        let ucsz = ((cpu.get(c.ucsrc as usize) & (UCSRC_UCSZ1 | UCSRC_UCSZ0)) >> 1) | (cpu.get(c.ucsrb as usize) & UCSRB_UCSZ2);
        match ucsz {
            0 => 5,
            1 => 6,
            2 => 7,
            3 => 8,
            _ => 9,
        }
    }
    pub fn usart_cycles_per_char(&self, cpu: &Cpu, i: usize) -> i64 {
        let c = self.usarts[i].cfg;
        let ucsrc = cpu.get(c.ucsrc as usize);
        let symbols = 1 + self.usart_bits_per_char(cpu, i) + if ucsrc & UCSRC_USBS != 0 { 2 } else { 1 } + if ucsrc & UCSRC_UPM1 != 0 { 1 } else { 0 };
        let ubrr = ((cpu.get(c.ubrrh as usize) as i64) << 8) | cpu.get(c.ubrrl as usize) as i64;
        let mult = if cpu.get(c.ucsra as usize) & UCSRA_U2X != 0 { 8 } else { 16 };
        (ubrr + 1) * mult * symbols as i64
    }
    pub fn usart_baud(&self, cpu: &Cpu, i: usize) -> u32 {
        let c = self.usarts[i].cfg;
        let ubrr = ((cpu.get(c.ubrrh as usize) as f64) * 256.0) + cpu.get(c.ubrrl as usize) as f64;
        let mult = if cpu.get(c.ucsra as usize) & UCSRA_U2X != 0 { 8.0 } else { 16.0 };
        (HZ / (mult * (1.0 + ubrr))).floor() as u32
    }
    pub fn usart_rx_enabled(&self, cpu: &Cpu, i: usize) -> bool {
        cpu.get(self.usarts[i].cfg.ucsrb as usize) & UCSRB_RXEN != 0
    }
    pub fn usart_write_byte(&mut self, cpu: &mut Cpu, i: usize, value: u8, immediate: bool) -> bool {
        if self.usarts[i].rx_busy || !self.usart_rx_enabled(cpu, i) {
            return false;
        }
        if immediate {
            self.usarts[i].rx_byte = value;
            let rxc = self.usarts[i].rxc;
            cpu.set_interrupt_flag(&rxc);
            // (onRxComplete: o host volta a alimentar o RX no passo seguinte)
            false
        } else {
            self.usarts[i].rx_busy = true;
            let cpc = self.usart_cycles_per_char(cpu, i);
            cpu.add_clock_event(EV_USART_RX + i as u32, value as u32, cpc);
            true
        }
    }

    // ================= TWI =================
    fn twi_status(cpu: &Cpu) -> u8 {
        cpu.get(TWSR as usize) & TWSR_TWS_MASK
    }
    fn twi_update_status(&mut self, cpu: &mut Cpu, v: u8) {
        let s = (cpu.get(TWSR as usize) & !TWSR_TWS_MASK) | v;
        cpu.set(TWSR as usize, s);
        let i = self.twi.irq;
        cpu.set_interrupt_flag(&i);
    }
    pub fn twi_scl_hz(&self, cpu: &Cpu) -> f64 {
        let ps = match cpu.get(TWSR as usize) & 3 {
            0 => 1.0,
            1 => 4.0,
            2 => 16.0,
            _ => 64.0,
        };
        HZ / (16.0 + 2.0 * cpu.get(TWBR as usize) as f64 * ps)
    }
    fn twi_complete(&mut self, cpu: &mut Cpu, d: TwiDone) {
        self.twi.busy = false;
        match d {
            TwiDone::Start => {
                let s = if Self::twi_status(cpu) == ST_IDLE { ST_START } else { ST_REP_START };
                self.twi_update_status(cpu, s);
            }
            TwiDone::Stop => {
                let v = cpu.get(TWCR as usize) & !TWCR_TWSTO;
                cpu.set(TWCR as usize, v);
                self.twi_update_status(cpu, ST_IDLE);
            }
            TwiDone::Connect(ack) => {
                let s = if cpu.get(TWDR as usize) & 1 != 0 {
                    if ack {
                        ST_SLAR_ACK
                    } else {
                        ST_SLAR_NACK
                    }
                } else if ack {
                    ST_SLAW_ACK
                } else {
                    ST_SLAW_NACK
                };
                self.twi_update_status(cpu, s);
            }
            TwiDone::Write(ack) => self.twi_update_status(cpu, if ack { ST_SENT_ACK } else { ST_SENT_NACK }),
            TwiDone::Read(v) => {
                let ack = cpu.get(TWCR as usize) & TWCR_TWEA != 0;
                cpu.set(TWDR as usize, v);
                self.twi_update_status(cpu, if ack { ST_RECV_ACK } else { ST_RECV_NACK });
            }
        }
    }
    fn twi_dispatch(&mut self, cpu: &mut Cpu, ev: TwiEvent) {
        let (d, cycles) = self.host.twi(ev);
        if cycles <= 0 {
            self.twi_complete(cpu, d);
        } else {
            let arg = match d {
                TwiDone::Start => 0,
                TwiDone::Stop => 1,
                TwiDone::Connect(a) => 2 | (a as u32) << 8,
                TwiDone::Write(a) => 3 | (a as u32) << 8,
                TwiDone::Read(v) => 4 | (v as u32) << 8,
            };
            cpu.add_clock_event(EV_TWI_DONE, arg, cycles);
        }
    }

    // ================= watchdog =================
    fn wdt_reset(&mut self, cpu: &Cpu) {
        let wdtcsr = cpu.get(WDTCSR as usize);
        let value = ((wdtcsr & WDP3) >> 2) | (wdtcsr & WDP210);
        let presc = (2048u64 << value) as f64;
        let cycles = ((self.clock.frequency() / 128000.0) * presc).floor() as u64;
        if let Some(w) = self.wdt.as_mut() {
            w.timeout = cpu.cycles + cycles;
        }
    }
    fn wdt_check(&mut self, cpu: &mut Cpu) {
        let Some(w) = self.wdt.as_ref() else { return };
        if w.enabled && cpu.cycles >= w.timeout {
            let wdtcsr = cpu.get(WDTCSR as usize);
            let i = w.irq;
            if wdtcsr & WDIE != 0 {
                cpu.set_interrupt_flag(&i);
            }
            if wdtcsr & WDE != 0 {
                if wdtcsr & WDIE != 0 {
                    let v = cpu.get(WDTCSR as usize) & !WDIE;
                    cpu.set(WDTCSR as usize, v);
                } else {
                    cpu.reset_keep_events();
                    self.wdt.as_mut().unwrap().scheduled = false;
                    let v = cpu.get(MCUSR as usize) | 0x8;
                    cpu.set(MCUSR as usize, v);
                    return;
                }
            }
            self.wdt_reset(cpu);
        }
        let w = self.wdt.as_mut().unwrap();
        if w.enabled {
            w.scheduled = true;
            let t = w.timeout as i64 - cpu.cycles as i64;
            cpu.add_clock_event(EV_WDT, 0, t);
        } else {
            w.scheduled = false;
        }
    }

    // ================= ADC =================
    fn adc_sample_cycles(&self, cpu: &Cpu) -> i64 {
        let ps = match cpu.get(self.adc.cfg.adcsra as usize) & 7 {
            0 | 1 => 2,
            2 => 4,
            3 => 8,
            4 => 16,
            5 => 32,
            6 => 64,
            _ => 128,
        };
        (self.adc.conversion_cycles * ps) as i64
    }
    pub fn adc_vref(&self, cpu: &Cpu) -> f64 {
        // adcReferences = [AREF, AVCC, Reserved, Internal1V1]
        match (cpu.get(self.adc.cfg.admux as usize) >> 6) & 3 {
            0 => self.adc.aref,
            3 => 1.1,
            _ => self.adc.avcc,
        }
    }
    fn adc_complete(&mut self, cpu: &mut Cpu, value: u16) {
        let c = &self.adc.cfg;
        let (adcl, adch, admux, adcsra) = (c.adcl as usize, c.adch as usize, c.admux as usize, c.adcsra as usize);
        self.adc.converting = false;
        self.adc.conversion_cycles = 13;
        if cpu.get(admux) & ADLAR != 0 {
            cpu.set(adcl, ((value << 6) & 0xff) as u8);
            cpu.set(adch, (value >> 2) as u8);
        } else {
            cpu.set(adcl, (value & 0xff) as u8);
            cpu.set(adch, ((value >> 8) & 3) as u8);
        }
        let v = cpu.get(adcsra) & !ADSC;
        cpu.set(adcsra, v);
        let i = self.adc.irq;
        cpu.set_interrupt_flag(&i);
    }
}

impl<H: Host> Io for Periph<H> {
    fn read(&mut self, cpu: &mut Cpu, addr: u16) -> u8 {
        match self.r.get(addr as usize).copied().unwrap_or(R::None) {
            R::Tcnt(i) => {
                let i = i as usize;
                self.timer_count(cpu, i, false, false);
                let t = self.timers[i].tcnt;
                if self.timers[i].cfg.bits == 16 {
                    cpu.set(addr as usize + 1, (t >> 8) as u8);
                }
                cpu.set(addr as usize, (t & 0xff) as u8);
                (t & 0xff) as u8
            }
            R::Udr(i) => {
                let i = i as usize;
                let mask = match self.usart_bits_per_char(cpu, i) {
                    5 => 0x1f,
                    6 => 0x3f,
                    7 => 0x7f,
                    _ => 0xff,
                };
                let r = self.usarts[i].rx_byte & mask;
                self.usarts[i].rx_byte = 0;
                let rxc = self.usarts[i].rxc;
                cpu.clear_interrupt(&rxc, true);
                r
            }
            R::Pin(_) | R::None => cpu.get(addr as usize),
        }
    }

    fn write(&mut self, cpu: &mut Cpu, addr: u16, value: u8, old: u8, mask: u8) -> bool {
        let a = addr as usize;
        match self.w.get(a).copied().unwrap_or(W::None) {
            W::None => false,
            // ---------- GPIO ----------
            W::Ddr(i) => {
                let i = i as usize;
                let portv = cpu.get(self.ports[i].cfg.port as usize);
                cpu.set(a, value);
                self.write_gpio(i, portv, value);
                self.update_pin_register(cpu, i, value);
                true
            }
            W::Port(i) => {
                let i = i as usize;
                let ddr = cpu.get(self.ports[i].cfg.ddr as usize);
                cpu.set(a, value);
                self.write_gpio(i, value, ddr);
                self.update_pin_register(cpu, i, ddr);
                true
            }
            W::Pin(i) => {
                // escrever 1 em PINx troca os bits de PORTx
                let i = i as usize;
                let pa = self.ports[i].cfg.port as usize;
                let ddr = cpu.get(self.ports[i].cfg.ddr as usize);
                let pv = cpu.get(pa) ^ (value & mask);
                cpu.set(pa, pv);
                self.write_gpio(i, pv, ddr);
                self.update_pin_register(cpu, i, ddr);
                true
            }
            W::Pcifr => {
                for k in 0..self.ports.len() {
                    if let Some(p) = self.ports[k].pcint {
                        cpu.clear_interrupt_by_flag(&p, value);
                    }
                }
                true
            }
            W::Pcmsk(r) => {
                cpu.set(r as usize, value);
                for k in 0..self.ports.len() {
                    if let Some(p) = self.ports[k].pcint {
                        cpu.update_interrupt_enable(&p, value);
                    }
                }
                true
            }
            W::ExtReg(r, kind) => {
                if kind != ExtKind::Flag {
                    cpu.set(r as usize, value);
                }
                for k in 0..self.ports.len() {
                    for e in self.ports[k].ext_ints {
                        let Some(e) = e else { continue };
                        if kind == ExtKind::Mask {
                            cpu.update_interrupt_enable(&e, value);
                        }
                        if !e.constant && kind == ExtKind::Flag {
                            cpu.clear_interrupt_by_flag(&e, value);
                        }
                    }
                    self.check_external_interrupts(cpu, k);
                }
                true
            }
            // ---------- timers ----------
            W::Tcnt(i) => {
                let i = i as usize;
                let t = &mut self.timers[i];
                t.tcnt_next = ((t.high_byte_temp as u32) << 8) | value as u32;
                t.counting_up = true;
                t.tcnt_updated = true;
                cpu.update_clock_event(EV_TIMER + i as u32, 0);
                if self.timers[i].divider != 0 {
                    let n = self.timers[i].tcnt_next;
                    self.timer_updated(cpu, i, n, n);
                }
                false
            }
            W::TempHigh(i) => {
                self.timers[i as usize].high_byte_temp = value;
                false
            }
            W::OcrHigh(i) => {
                let i = i as usize;
                let m = (self.t_ocr_mask(i) >> 8) as u8;
                self.timers[i].high_byte_temp = value & m;
                cpu.set(a, value & m);
                true
            }
            W::Ocra(i) | W::Ocrb(i) | W::Ocrc(i) => {
                let w = self.w[a];
                let t = &mut self.timers[i as usize];
                let v = ((t.high_byte_temp as u32) << 8) | value as u32;
                let imm = t.ocr_update == Immediate;
                match w {
                    W::Ocra(_) => {
                        t.next_ocr_a = v;
                        if imm {
                            t.ocr_a = v;
                        }
                    }
                    W::Ocrb(_) => {
                        t.next_ocr_b = v;
                        if imm {
                            t.ocr_b = v;
                        }
                    }
                    _ => {
                        t.next_ocr_c = v;
                        if imm {
                            t.ocr_c = v;
                        }
                    }
                }
                false
            }
            W::Icr(i) => {
                let t = &mut self.timers[i as usize];
                t.icr = ((t.high_byte_temp as u32) << 8) | value as u32;
                false
            }
            W::Tccra(i) => {
                cpu.set(a, value);
                self.update_wgm(cpu, i as usize);
                true
            }
            W::Tccrb(i) => {
                let i = i as usize;
                let mut v = value;
                if self.timers[i].cfg.tccrc == 0 {
                    self.check_force_compare(cpu, i, v);
                    v &= !(FOCA | FOCB);
                }
                cpu.set(a, v);
                self.timers[i].update_divider = true;
                cpu.clear_clock_event(EV_TIMER + i as u32);
                cpu.add_clock_event(EV_TIMER + i as u32, 0, 0);
                self.update_wgm(cpu, i);
                true
            }
            W::Tccrc(i) => {
                self.check_force_compare(cpu, i as usize, value);
                false
            }
            W::Tifr(i) => {
                let t = &self.timers[i as usize];
                let (o, fa, fb) = (t.ovf, t.ocfa, t.ocfb);
                cpu.set(a, value);
                cpu.clear_interrupt_by_flag(&o, value);
                cpu.clear_interrupt_by_flag(&fa, value);
                cpu.clear_interrupt_by_flag(&fb, value);
                true
            }
            W::Timsk(i) => {
                let t = &self.timers[i as usize];
                let (o, fa, fb) = (t.ovf, t.ocfa, t.ocfb);
                cpu.update_interrupt_enable(&o, value);
                cpu.update_interrupt_enable(&fa, value);
                cpu.update_interrupt_enable(&fb, value);
                false
            }
            // ---------- USART ----------
            W::Ucsra(i) => {
                cpu.set(a, value & (UCSRA_MPCM | UCSRA_U2X));
                let t = self.usarts[i as usize].txc;
                cpu.clear_interrupt_by_flag(&t, value);
                true
            }
            W::Ucsrb(i) => {
                let u = &self.usarts[i as usize];
                let (rxc, udre, txc) = (u.rxc, u.udre, u.txc);
                cpu.update_interrupt_enable(&rxc, value);
                cpu.update_interrupt_enable(&udre, value);
                cpu.update_interrupt_enable(&txc, value);
                if value & UCSRB_RXEN != 0 && old & UCSRB_RXEN != 0 {
                    cpu.clear_interrupt(&rxc, true);
                }
                if value & UCSRB_TXEN != 0 && old & UCSRB_TXEN == 0 {
                    cpu.set_interrupt_flag(&udre);
                }
                cpu.set(a, value);
                true
            }
            W::Ucsrc(_) | W::Ubrr(_, _) => {
                cpu.set(a, value);
                true
            }
            W::Udr(i) => {
                let i = i as usize;
                self.host.usart_tx(i, value);
                let cpc = self.usart_cycles_per_char(cpu, i);
                cpu.add_clock_event(EV_USART_TX + i as u32, 0, cpc);
                let u = &self.usarts[i];
                let (txc, udre) = (u.txc, u.udre);
                cpu.clear_interrupt(&txc, true);
                cpu.clear_interrupt(&udre, true);
                false
            }
            // ---------- ADC ----------
            W::Adcsra => {
                if value & ADEN != 0 && old & ADEN == 0 {
                    self.adc.conversion_cycles = 25;
                }
                cpu.set(a, value);
                let ai = self.adc.irq;
                cpu.update_interrupt_enable(&ai, value);
                if !self.adc.converting && value & ADSC != 0 {
                    if value & ADEN == 0 {
                        let sc = self.adc_sample_cycles(cpu);
                        cpu.add_clock_event(EV_ADC, 0, sc);
                        return true;
                    }
                    let c = &self.adc.cfg;
                    let mut ch = cpu.get(c.admux as usize) & 0x1f;
                    if cpu.get(c.adcsrb as usize) & MUX5 != 0 {
                        ch |= 0x20;
                    }
                    ch &= c.mux_mask;
                    let input = c.mux.get(ch as usize).copied().flatten().unwrap_or(MuxInput::Constant(0.0));
                    self.adc.converting = true;
                    let vref = self.adc_vref(cpu);
                    let raw = self.host.adc_sample(input, vref, &self.adc.channel_values);
                    let sc = self.adc_sample_cycles(cpu);
                    cpu.add_clock_event(EV_ADC, raw as u32, sc);
                    return true;
                }
                false
            }
            // ---------- EEPROM ----------
            W::Eecr => {
                let c = self.eeprom.cfg;
                let addr = ((cpu.get(c.eearh as usize) as usize) << 8) | cpu.get(c.eearl as usize) as usize;
                let eecr = value;
                let v = (cpu.get(a) & !EECR_WRITE_MASK) | (eecr & EECR_WRITE_MASK);
                cpu.set(a, v);
                let ei = self.eeprom.irq;
                cpu.update_interrupt_enable(&ei, eecr);
                if eecr & EERE != 0 {
                    cpu.clear_interrupt(&ei, true);
                }
                if eecr & EEMPE != 0 {
                    self.eeprom.write_enabled_cycles = cpu.cycles + 4;
                    cpu.add_clock_event(EV_EE_MPE, 0, 4);
                }
                if eecr & EERE != 0 {
                    let m = self.eeprom.memory.get(addr).copied().unwrap_or(0);
                    cpu.set(c.eedr as usize, m);
                    cpu.cycles += 4;
                    return true;
                }
                if eecr & EEPE != 0 {
                    if cpu.cycles >= self.eeprom.write_enabled_cycles {
                        let v = cpu.get(a) & !EEPE;
                        cpu.set(a, v);
                        return true;
                    }
                    if cpu.cycles < self.eeprom.write_complete_cycles {
                        return true;
                    }
                    let eedr = cpu.get(c.eedr as usize);
                    self.eeprom.write_complete_cycles = cpu.cycles;
                    if eecr & EEPM1 == 0 {
                        if let Some(m) = self.eeprom.memory.get_mut(addr) {
                            *m = 0xff;
                        }
                        self.eeprom.write_complete_cycles += c.erase_cycles;
                    }
                    if eecr & EEPM0 == 0 {
                        if let Some(m) = self.eeprom.memory.get_mut(addr) {
                            *m &= eedr;
                        }
                        self.eeprom.write_complete_cycles += c.write_cycles;
                    }
                    self.host.eeprom_changed();
                    let v = cpu.get(a) | EEPE;
                    cpu.set(a, v);
                    let t = self.eeprom.write_complete_cycles as i64 - cpu.cycles as i64;
                    cpu.add_clock_event(EV_EE_READY, 0, t);
                    cpu.cycles += 2;
                }
                true
            }
            // ---------- TWI ----------
            W::Twcr => {
                cpu.set(a, value);
                let ti = self.twi.irq;
                cpu.clear_interrupt_by_flag(&ti, value);
                cpu.update_interrupt_enable(&ti, value);
                let status = Self::twi_status(cpu);
                if value & TWCR_TWINT != 0 && value & TWCR_TWEN != 0 && !self.twi.busy {
                    let twdr = cpu.get(TWDR as usize);
                    cpu.add_clock_event(EV_TWI, value as u32 | (status as u32) << 8 | (twdr as u32) << 16, 0);
                    return true;
                }
                false
            }
            // ---------- SPI ----------
            W::Spdr => {
                if cpu.get(SPCR as usize) & SPCR_SPE == 0 {
                    return false;
                }
                if self.spi.active {
                    let v = cpu.get(SPSR as usize) | SPSR_WCOL;
                    cpu.set(SPSR as usize, v);
                    return true;
                }
                let v = cpu.get(SPSR as usize) & !SPSR_WCOL;
                cpu.set(SPSR as usize, v);
                let si = self.spi.irq;
                cpu.clear_interrupt(&si, true);
                self.spi.active = true;
                let rx = self.host.spi_transfer(value);
                let base = if cpu.get(SPSR as usize) & SPSR_SPI2X != 0 { 2 } else { 4 };
                let div = match cpu.get(SPCR as usize) & 3 {
                    0 => base,
                    1 => base * 4,
                    2 => base * 16,
                    _ => base * 32,
                };
                cpu.add_clock_event(EV_SPI, rx as u32, div * 8);
                true
            }
            W::Spcr => {
                let si = self.spi.irq;
                cpu.update_interrupt_enable(&si, value);
                false
            }
            W::Spsr => {
                cpu.set(a, value);
                let si = self.spi.irq;
                cpu.clear_interrupt_by_flag(&si, value);
                false
            }
            // ---------- relógio ----------
            W::Clkpr => {
                let k = &mut self.clock;
                if (k.enabled_cycles == 0 || k.enabled_cycles < cpu.cycles) && value == CLKPCE {
                    k.enabled_cycles = cpu.cycles + 4;
                } else if k.enabled_cycles != 0 && k.enabled_cycles >= cpu.cycles {
                    k.enabled_cycles = 0;
                    let idx = (value & 0xf) as usize;
                    let old_p = k.prescaler;
                    k.prescaler = PRESCALERS[idx];
                    cpu.set(a, idx as u8);
                    if old_p != k.prescaler {
                        let c = cpu.cycles as f64;
                        k.cycles_delta = (c + k.cycles_delta) * (old_p / k.prescaler) - c;
                    }
                }
                true
            }
            // ---------- watchdog ----------
            W::Wdtcsr => {
                let mut v = value;
                {
                    let w = self.wdt.as_mut().unwrap();
                    if v & WDCE != 0 && v & WDE != 0 {
                        w.change_enabled_cycles = cpu.cycles + 4;
                        v &= !WD_PROTECT;
                    } else {
                        if cpu.cycles >= w.change_enabled_cycles {
                            v = (v & !WD_PROTECT) | (old & WD_PROTECT);
                        }
                        w.enabled = v & WDE != 0 || v & WDIE != 0;
                        cpu.set(a, v);
                    }
                }
                if self.wdt.as_ref().unwrap().enabled {
                    self.wdt_reset(cpu);
                }
                let w = self.wdt.as_mut().unwrap();
                if w.enabled && !w.scheduled {
                    let t = w.timeout as i64 - cpu.cycles as i64;
                    cpu.add_clock_event(EV_WDT, 0, t);
                }
                let wi = self.wdt.as_ref().unwrap().irq;
                cpu.clear_interrupt_by_flag(&wi, v);
                true
            }
        }
    }

    fn clock_event(&mut self, cpu: &mut Cpu, id: u32, arg: u32) {
        match id & !0xff {
            EV_TIMER => self.timer_count(cpu, (id & 0xff) as usize, true, false),
            EV_USART_TX => {
                let u = &self.usarts[(id & 0xff) as usize];
                let (udre, txc) = (u.udre, u.txc);
                cpu.set_interrupt_flag(&udre);
                cpu.set_interrupt_flag(&txc);
            }
            EV_USART_RX => {
                let i = (id & 0xff) as usize;
                self.usarts[i].rx_busy = false;
                self.usart_write_byte(cpu, i, arg as u8, true);
            }
            EV_ADC => self.adc_complete(cpu, arg as u16),
            EV_SPI => {
                cpu.set(SPDR as usize, arg as u8);
                let si = self.spi.irq;
                cpu.set_interrupt_flag(&si);
                self.spi.active = false;
            }
            EV_TWI => {
                let value = arg as u8;
                let status = (arg >> 8) as u8;
                let twdr = (arg >> 16) as u8;
                let ev = if value & TWCR_TWSTA != 0 {
                    Some(TwiEvent::Start { repeated: status != ST_IDLE })
                } else if value & TWCR_TWSTO != 0 {
                    Some(TwiEvent::Stop)
                } else if status == ST_START || status == ST_REP_START {
                    Some(TwiEvent::Connect { addr: twdr >> 1, write: twdr & 1 == 0 })
                } else if status == ST_SLAW_ACK || status == ST_SENT_ACK {
                    Some(TwiEvent::Write(twdr))
                } else if status == ST_SLAR_ACK || status == ST_RECV_ACK {
                    Some(TwiEvent::Read { ack: value & TWCR_TWEA != 0 })
                } else {
                    None
                };
                if let Some(ev) = ev {
                    self.twi.busy = true;
                    self.twi_dispatch(cpu, ev);
                }
            }
            EV_TWI_DONE => {
                let v = (arg >> 8) as u8;
                let d = match arg & 0xff {
                    0 => TwiDone::Start,
                    1 => TwiDone::Stop,
                    2 => TwiDone::Connect(v != 0),
                    3 => TwiDone::Write(v != 0),
                    _ => TwiDone::Read(v),
                };
                self.twi_complete(cpu, d);
            }
            EV_EE_MPE => {
                let a = self.eeprom.cfg.eecr as usize;
                let v = cpu.get(a) & !EEMPE;
                cpu.set(a, v);
            }
            EV_EE_READY => {
                let i = self.eeprom.irq;
                cpu.set_interrupt_flag(&i);
            }
            EV_WDT => self.wdt_check(cpu),
            _ if id >= EV_HOST => self.host.host_event(arg),
            _ => {}
        }
    }

    fn watchdog_reset(&mut self, cpu: &mut Cpu) {
        if self.wdt.is_some() {
            self.wdt_reset(cpu);
        }
    }
}
