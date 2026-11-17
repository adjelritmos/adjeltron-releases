// Configuração dos microcontroladores emulados: endereços dos registos, vetores de interrupção,
// pinos de comparação dos timers, canais do ADC. Igual a src/engine/sim/avr/mcu.js (Uno/Nano =
// ATmega328P com as configurações do avr8js; Mega = ATmega2560 com as tabelas do Velxio).

#[derive(Clone, Copy, Debug)]
pub struct PinChange {
    pub pcie: u8,
    pub pcicr: u16,
    pub pcifr: u16,
    pub pcmsk: u16,
    pub vector: u8,
    pub mask: u8,
    pub offset: u8,
}

#[derive(Clone, Copy, Debug)]
pub struct ExtInt {
    pub eicr: u16,
    pub eimsk: u16,
    pub eifr: u16,
    pub index: u8,
    pub isc_offset: u8,
    pub vector: u8,
}

#[derive(Clone, Debug)]
pub struct PortCfg {
    pub pin: u16,
    pub ddr: u16,
    pub port: u16,
    pub pin_change: Option<PinChange>,
    pub ext: [Option<ExtInt>; 8],
    /// pino do Arduino de cada bit (−1 = sem pino)
    pub pins: [i16; 8],
}

#[derive(Clone, Copy, Debug)]
pub struct TimerCfg {
    pub bits: u8,
    pub comp_a_int: u8,
    pub comp_b_int: u8,
    pub comp_c_int: u8,
    pub ovf_int: u8,
    pub tifr: u16,
    pub ocra: u16,
    pub ocrb: u16,
    pub ocrc: u16,
    pub icr: u16,
    pub tcnt: u16,
    pub tccra: u16,
    pub tccrb: u16,
    pub tccrc: u16,
    pub timsk: u16,
    pub dividers: [u32; 8],
    pub comp_port_a: u16,
    pub comp_pin_a: u8,
    pub comp_port_b: u16,
    pub comp_pin_b: u8,
    pub comp_port_c: u16,
    pub comp_pin_c: u8,
    pub ext_clock_port: u16,
    pub ext_clock_pin: u8,
    pub tov: u8,
    pub ocfa: u8,
    pub ocfb: u8,
    pub ocfc: u8,
    pub toie: u8,
    pub ociea: u8,
    pub ocieb: u8,
    pub ociec: u8,
}

#[derive(Clone, Copy, Debug)]
pub struct UsartCfg {
    pub rx_int: u8,
    pub udre_int: u8,
    pub tx_int: u8,
    pub ucsra: u16,
    pub ucsrb: u16,
    pub ucsrc: u16,
    pub ubrrl: u16,
    pub ubrrh: u16,
    pub udr: u16,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MuxInput {
    SingleEnded(u8),
    Constant(f64),
    Temperature,
}

#[derive(Clone, Debug)]
pub struct AdcCfg {
    pub admux: u16,
    pub adcsra: u16,
    pub adcsrb: u16,
    pub adcl: u16,
    pub adch: u16,
    pub interrupt: u8,
    pub num_channels: usize,
    pub mux_mask: u8,
    /// canal (0..0x3f) → entrada
    pub mux: Vec<Option<MuxInput>>,
}

#[derive(Clone, Copy, Debug)]
pub struct EepromCfg {
    pub interrupt: u8,
    pub eecr: u16,
    pub eedr: u16,
    pub eearl: u16,
    pub eearh: u16,
    pub erase_cycles: u64,
    pub write_cycles: u64,
}

#[derive(Clone, Debug)]
pub struct McuCfg {
    pub id: &'static str,
    pub flash: usize,
    pub sram: usize,
    pub eeprom: usize,
    pub ports: Vec<PortCfg>,
    pub timers: Vec<TimerCfg>,
    /// (config, pino TX, pino RX)
    pub usarts: Vec<(UsartCfg, u8, u8)>,
    pub spi_int: u8,
    pub twi_int: u8,
    pub adc: AdcCfg,
    pub eeprom_cfg: EepromCfg,
    pub watchdog: bool,
}

impl McuCfg {
    /// bytes de dados da CPU, como em runner.js (sram + 0x200, +0x100 no Mega)
    pub fn cpu_sram(&self) -> usize {
        self.sram + 0x200 + if self.id == "atmega2560" { 0x100 } else { 0 }
    }
    /// pino do Arduino de um canal do ADC
    pub fn adc_pin(&self, ch: u8) -> Option<u8> {
        if self.id == "atmega2560" {
            (ch < 16).then(|| 54 + ch)
        } else {
            (ch < 6).then(|| 14 + ch)
        }
    }
}

const T01_DIV: [u32; 8] = [0, 1, 8, 64, 256, 1024, 0, 0];
const T2_DIV: [u32; 8] = [0, 1, 8, 32, 64, 128, 256, 1024];
const NO_EXT: [Option<ExtInt>; 8] = [None; 8];

const PORT_B: u16 = 0x25;
const PORT_D: u16 = 0x2b;
const PORT_E: u16 = 0x2e;
const PORT_G: u16 = 0x34;
const PORT_H: u16 = 0x102;
const PORT_L: u16 = 0x10b;

fn port(pin: u16, pin_change: Option<PinChange>, ext: [Option<ExtInt>; 8], pins: [i16; 8]) -> PortCfg {
    PortCfg { pin, ddr: pin + 1, port: pin + 2, pin_change, ext, pins }
}

pub const TIMER0: TimerCfg = TimerCfg {
    bits: 8,
    comp_a_int: 0x1c,
    comp_b_int: 0x1e,
    comp_c_int: 0,
    ovf_int: 0x20,
    tifr: 0x35,
    ocra: 0x47,
    ocrb: 0x48,
    ocrc: 0,
    icr: 0,
    tcnt: 0x46,
    tccra: 0x44,
    tccrb: 0x45,
    tccrc: 0,
    timsk: 0x6e,
    dividers: T01_DIV,
    comp_port_a: PORT_D,
    comp_pin_a: 6,
    comp_port_b: PORT_D,
    comp_pin_b: 5,
    comp_port_c: 0,
    comp_pin_c: 0,
    ext_clock_port: PORT_D,
    ext_clock_pin: 4,
    tov: 1,
    ocfa: 2,
    ocfb: 4,
    ocfc: 0,
    toie: 1,
    ociea: 2,
    ocieb: 4,
    ociec: 0,
};
pub const TIMER1: TimerCfg = TimerCfg {
    bits: 16,
    comp_a_int: 0x16,
    comp_b_int: 0x18,
    ovf_int: 0x1a,
    tifr: 0x36,
    ocra: 0x88,
    ocrb: 0x8a,
    icr: 0x86,
    tcnt: 0x84,
    tccra: 0x80,
    tccrb: 0x81,
    tccrc: 0x82,
    timsk: 0x6f,
    comp_port_a: PORT_B,
    comp_pin_a: 1,
    comp_port_b: PORT_B,
    comp_pin_b: 2,
    ext_clock_port: PORT_D,
    ext_clock_pin: 5,
    ..TIMER0
};
pub const TIMER2: TimerCfg = TimerCfg {
    comp_a_int: 0x0e,
    comp_b_int: 0x10,
    ovf_int: 0x12,
    tifr: 0x37,
    ocra: 0xb3,
    ocrb: 0xb4,
    tcnt: 0xb2,
    tccra: 0xb0,
    tccrb: 0xb1,
    timsk: 0x70,
    dividers: T2_DIV,
    comp_port_a: PORT_B,
    comp_pin_a: 3,
    comp_port_b: PORT_D,
    comp_pin_b: 3,
    ext_clock_port: 0,
    ext_clock_pin: 0,
    ..TIMER0
};

const USART0: UsartCfg = UsartCfg { rx_int: 0x24, udre_int: 0x26, tx_int: 0x28, ucsra: 0xc0, ucsrb: 0xc1, ucsrc: 0xc2, ubrrl: 0xc4, ubrrh: 0xc5, udr: 0xc6 };

const EEPROM: EepromCfg = EepromCfg { interrupt: 0x2c, eecr: 0x3f, eedr: 0x40, eearl: 0x41, eearh: 0x42, erase_cycles: 28800, write_cycles: 28800 };

fn adc_base() -> AdcCfg {
    let mut mux = vec![None; 0x40];
    for i in 0..8 {
        mux[i] = Some(MuxInput::SingleEnded(i as u8));
    }
    mux[8] = Some(MuxInput::Temperature);
    mux[14] = Some(MuxInput::Constant(1.1));
    mux[15] = Some(MuxInput::Constant(0.0));
    AdcCfg { admux: 0x7c, adcsra: 0x7a, adcsrb: 0x7b, adcl: 0x78, adch: 0x79, interrupt: 0x2a, num_channels: 8, mux_mask: 0xf, mux }
}

/// ATmega328P (Uno, Nano)
pub fn atmega328p() -> McuCfg {
    let pcint = |n: u8| Some(PinChange { pcie: n, pcicr: 0x68, pcifr: 0x3b, pcmsk: 0x6b + n as u16, vector: 6 + 2 * n, mask: 0xff, offset: 0 });
    let int = |n: u8| Some(ExtInt { eicr: 0x69, eimsk: 0x3d, eifr: 0x3c, index: n, isc_offset: 2 * n, vector: 2 + 2 * n });
    McuCfg {
        id: "atmega328p",
        flash: 0x8000,
        sram: 2048,
        eeprom: 1024,
        ports: vec![
            port(0x23, pcint(0), NO_EXT, [8, 9, 10, 11, 12, 13, -1, -1]),
            port(0x26, pcint(1), NO_EXT, [14, 15, 16, 17, 18, 19, -1, -1]),
            port(0x29, pcint(2), [None, None, int(0), int(1), None, None, None, None], [0, 1, 2, 3, 4, 5, 6, 7]),
        ],
        timers: vec![TIMER0, TIMER1, TIMER2],
        usarts: vec![(USART0, 1, 0)],
        spi_int: 0x22,
        twi_int: 0x30,
        adc: adc_base(),
        eeprom_cfg: EEPROM,
        watchdog: true,
    }
}

/// ATmega2560 (Mega)
pub fn atmega2560() -> McuCfg {
    let pc = |n: u8, mask: u8, offset: u8| Some(PinChange { pcie: n, pcicr: 0x68, pcifr: 0x3b, pcmsk: 0x6b + n as u16, vector: 18 + 2 * n, mask, offset });
    let ei = |n: u8| Some(ExtInt { eicr: if n < 4 { 0x69 } else { 0x6a }, eimsk: 0x3d, eifr: 0x3c, index: n, isc_offset: (n % 4) * 2, vector: 2 + 2 * n });
    let t16 = TimerCfg { ocfc: 0b1000, ociec: 0b1000, ..TIMER1 };
    let usart = |rx: u8, udre: u8, tx: u8, b: u16| UsartCfg { rx_int: rx, udre_int: udre, tx_int: tx, ucsra: b, ucsrb: b + 1, ucsrc: b + 2, ubrrl: b + 4, ubrrh: b + 5, udr: b + 6 };
    let mut adc = adc_base();
    adc.interrupt = 0x3a;
    adc.num_channels = 16;
    adc.mux_mask = 0x3f;
    adc.mux = vec![None; 0x40];
    for i in 0..8u8 {
        adc.mux[i as usize] = Some(MuxInput::SingleEnded(i));
        adc.mux[0x20 + i as usize] = Some(MuxInput::SingleEnded(8 + i));
    }
    adc.mux[0x1e] = Some(MuxInput::Constant(1.1));
    adc.mux[0x1f] = Some(MuxInput::Constant(0.0));
    McuCfg {
        id: "atmega2560",
        flash: 0x40000,
        sram: 8192,
        eeprom: 4096,
        ports: vec![
            port(0x20, None, NO_EXT, [22, 23, 24, 25, 26, 27, 28, 29]),
            port(0x23, pc(0, 0xff, 0), NO_EXT, [53, 52, 51, 50, 10, 11, 12, 13]),
            port(0x26, None, NO_EXT, [37, 36, 35, 34, 33, 32, 31, 30]),
            port(0x29, None, [ei(0), ei(1), ei(2), ei(3), None, None, None, None], [21, 20, 19, 18, -1, -1, -1, 38]),
            port(0x2c, pc(1, 0x01, 0), [None, None, None, None, ei(4), ei(5), ei(6), ei(7)], [0, 1, -1, 5, 2, 3, -1, -1]),
            port(0x2f, None, NO_EXT, [54, 55, 56, 57, 58, 59, 60, 61]),
            port(0x32, None, NO_EXT, [41, 40, 39, -1, -1, 4, -1, -1]),
            port(0x100, None, NO_EXT, [17, 16, -1, 6, 7, 8, 9, -1]),
            port(0x103, pc(1, 0x7f, 1), NO_EXT, [15, 14, -1, -1, -1, -1, -1, -1]),
            port(0x106, pc(2, 0xff, 0), NO_EXT, [62, 63, 64, 65, 66, 67, 68, 69]),
            port(0x109, None, NO_EXT, [49, 48, 47, 46, 45, 44, 43, 42]),
        ],
        timers: vec![
            TimerCfg { comp_a_int: 0x2a, comp_b_int: 0x2c, ovf_int: 0x2e, comp_port_a: PORT_B, comp_pin_a: 7, comp_port_b: PORT_G, comp_pin_b: 5, ext_clock_port: PORT_D, ext_clock_pin: 7, ..TIMER0 },
            TimerCfg { comp_a_int: 0x22, comp_b_int: 0x24, ovf_int: 0x28, ocrc: 0x8c, comp_c_int: 0x26, ocfc: 0b1000, ociec: 0b1000, comp_port_a: PORT_B, comp_pin_a: 5, comp_port_b: PORT_B, comp_pin_b: 6, comp_port_c: PORT_B, comp_pin_c: 7, ext_clock_port: PORT_D, ext_clock_pin: 6, ..TIMER1 },
            TimerCfg { comp_a_int: 0x1a, comp_b_int: 0x1c, ovf_int: 0x1e, comp_port_a: PORT_B, comp_pin_a: 4, comp_port_b: PORT_H, comp_pin_b: 6, ext_clock_port: 0, ext_clock_pin: 0, ..TIMER2 },
            TimerCfg { comp_a_int: 0x40, comp_b_int: 0x42, comp_c_int: 0x44, ovf_int: 0x46, tifr: 0x38, timsk: 0x71, tccra: 0x90, tccrb: 0x91, tccrc: 0x92, tcnt: 0x94, icr: 0x96, ocra: 0x98, ocrb: 0x9a, ocrc: 0x9c, comp_port_a: PORT_E, comp_pin_a: 3, comp_port_b: PORT_E, comp_pin_b: 4, comp_port_c: PORT_E, comp_pin_c: 5, ext_clock_port: PORT_E, ext_clock_pin: 6, ..t16 },
            TimerCfg { comp_a_int: 0x54, comp_b_int: 0x56, comp_c_int: 0x58, ovf_int: 0x5a, tifr: 0x39, timsk: 0x72, tccra: 0xa0, tccrb: 0xa1, tccrc: 0xa2, tcnt: 0xa4, icr: 0xa6, ocra: 0xa8, ocrb: 0xaa, ocrc: 0xac, comp_port_a: PORT_H, comp_pin_a: 3, comp_port_b: PORT_H, comp_pin_b: 4, comp_port_c: PORT_H, comp_pin_c: 5, ext_clock_port: PORT_H, ext_clock_pin: 7, ..t16 },
            TimerCfg { comp_a_int: 0x5e, comp_b_int: 0x60, comp_c_int: 0x62, ovf_int: 0x64, tifr: 0x3a, timsk: 0x73, tccra: 0x120, tccrb: 0x121, tccrc: 0x122, tcnt: 0x124, icr: 0x126, ocra: 0x128, ocrb: 0x12a, ocrc: 0x12c, comp_port_a: PORT_L, comp_pin_a: 3, comp_port_b: PORT_L, comp_pin_b: 4, comp_port_c: PORT_L, comp_pin_c: 5, ext_clock_port: PORT_L, ext_clock_pin: 2, ..t16 },
        ],
        usarts: vec![
            (UsartCfg { rx_int: 0x32, udre_int: 0x34, tx_int: 0x36, ..USART0 }, 1, 0),
            (usart(0x48, 0x4a, 0x4c, 0xc8), 18, 19),
            (usart(0x66, 0x68, 0x6a, 0xd0), 16, 17),
            (usart(0x6c, 0x6e, 0x70, 0x130), 14, 15),
        ],
        spi_int: 0x30,
        twi_int: 0x4e,
        adc,
        eeprom_cfg: EepromCfg { interrupt: 0x3c, ..EEPROM },
        watchdog: false,
    }
}
