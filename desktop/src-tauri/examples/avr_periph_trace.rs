// Traço do microcontrolador completo (CPU + periféricos) para comparar com o avr8js
// (frontend/scripts/avr-periph-trace.mjs), com os mesmos estímulos:
//   cargo run --release --example avr_periph_trace -- <firmware.hex> <uno|mega> <passos> <cada>
use adjeltron_lib::sim::avr::{atmega2560, atmega328p, hex::load_hex, Avr, Host};

#[derive(Default)]
struct Rec {
    serial: Vec<u8>,
}
impl Host for Rec {
    fn usart_tx(&mut self, i: usize, b: u8) {
        if i == 0 {
            self.serial.push(b);
        }
    }
}

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let hex = std::fs::read_to_string(&a[1]).expect("hex");
    let mega = a.get(2).map(|s| s == "mega").unwrap_or(false);
    let steps: u64 = a.get(3).and_then(|s| s.parse().ok()).unwrap_or(1_000_000);
    let every: u64 = a.get(4).and_then(|s| s.parse().ok()).unwrap_or(10_000);
    let cfg = if mega { atmega2560() } else { atmega328p() };
    let prog = load_hex(&hex, cfg.flash);
    let mut avr = Avr::new(cfg, prog, Rec::default());
    for (i, v) in [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0].iter().enumerate() {
        avr.p.adc.channel_values[i] = *v;
    }
    // (porta, bit) das entradas que mudam: B0, D2 (INT0) / D2 (INT2 no Mega), C3 / K3
    let ins: [(usize, u8); 3] = if mega { [(1, 0), (3, 2), (9, 3)] } else { [(0, 0), (2, 2), (1, 3)] };
    let sum = |v: &[u8]| v.iter().enumerate().fold(0u64, |h, (i, &b)| (h.wrapping_mul(31).wrapping_add(b as u64 * (i as u64 + 1))) % 1_000_000_007);
    let t = std::time::Instant::now();
    let (mut c50, mut c200, mut ce) = (0u64, 0u64, 0u64);
    for n in 1..=steps {
        avr.step();
        c50 += 1;
        c200 += 1;
        ce += 1;
        if c50 == 50_000 {
            c50 = 0;
            let k = n / 50_000;
            for (j, (p, b)) in ins.iter().enumerate() {
                avr.set_pin(*p, *b, (k >> j) & 1 == 1);
            }
        }
        if c200 == 200_000 {
            c200 = 0;
            let k = n / 200_000;
            avr.usart_write(0, b'A' + (k % 26) as u8, false);
        }
        if ce == every {
            ce = 0;
            let s = &avr.p.host.serial;
            println!("{} {} {} {} {} {} {} {} {}", n, avr.cpu.pc, avr.cpu.cycles, avr.cpu.sreg(), avr.cpu.sp(), sum(&avr.cpu.data[..32]), sum(&avr.cpu.data), s.len(), sum(s));
        }
    }
    let s = String::from_utf8_lossy(&avr.p.host.serial).to_string();
    let tail: String = s.chars().rev().take(120).collect::<Vec<_>>().into_iter().rev().collect();
    eprintln!("rust: {} instruções em {:?} | serial: {:?} … {:?}", steps, t.elapsed(), s.chars().take(80).collect::<String>(), tail);
}
