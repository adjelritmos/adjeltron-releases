// CPU AVR (ATmega328P / ATmega2560) — tradução do avr8js (MIT, Uri Shaked e contribuidores),
// com o mesmo comportamento ciclo a ciclo para dar resultados iguais à versão JS.
//
// Diferença de desenho em relação ao JS: lá cada periférico regista closures na CPU
// (readHooks/writeHooks/addClockEvent). Em Rust os periféricos ficam fora da CPU, num tipo que
// implementa `Io`; a CPU só guarda que endereços têm hook e a fila de eventos (por id).

pub const REGISTER_SPACE: usize = 0x100;
const MAX_INTERRUPTS: usize = 128; // chega para o ATmega2560
const SREG: usize = 95;
const SP: usize = 93;

/// Vetor de interrupção (igual ao AVRInterruptConfig do avr8js).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Interrupt {
    pub address: u8,
    pub enable_register: u16,
    pub enable_mask: u8,
    pub flag_register: u16,
    pub flag_mask: u8,
    pub constant: bool,
    pub inverse_flag: bool,
}

/// Periféricos ligados à CPU: hooks de leitura/escrita e eventos de relógio.
pub trait Io {
    /// leitura de um endereço com hook (só chamado se `cpu.read_hook[addr]`)
    fn read(&mut self, cpu: &mut Cpu, addr: u16) -> u8;
    /// escrita num endereço com hook; true = o periférico tratou (a CPU não guarda o valor)
    fn write(&mut self, cpu: &mut Cpu, addr: u16, value: u8, old: u8, mask: u8) -> bool;
    /// evento de relógio agendado com `Cpu::add_clock_event(id, arg, …)` (no JS eram closures:
    /// `arg` leva o valor que a closure guardava)
    fn clock_event(&mut self, cpu: &mut Cpu, id: u32, arg: u32);
    /// instrução WDR
    fn watchdog_reset(&mut self, _cpu: &mut Cpu) {}
}

/// Sem periféricos (testes da CPU sozinha).
pub struct NoIo;
impl Io for NoIo {
    fn read(&mut self, cpu: &mut Cpu, addr: u16) -> u8 {
        cpu.get(addr as usize)
    }
    fn write(&mut self, _: &mut Cpu, _: u16, _: u8, _: u8, _: u8) -> bool {
        false
    }
    fn clock_event(&mut self, _: &mut Cpu, _: u32, _: u32) {}
}

#[derive(Clone, Copy)]
struct ClockEvent {
    cycles: u64,
    id: u32,
    arg: u32,
}

pub struct Cpu {
    /// registos (0..32), I/O (32..0x100) e SRAM
    pub data: Vec<u8>,
    /// memória de programa (palavras de 16 bits)
    pub prog: Vec<u16>,
    pub pc: i64,
    pub cycles: u64,
    pub pc22: bool,
    pub read_hook: Vec<bool>,
    pub write_hook: Vec<bool>,
    pending: [Option<Interrupt>; MAX_INTERRUPTS],
    pub next_interrupt: i32,
    max_interrupt: i32,
    /// eventos por ordem (o primeiro é o próximo), como a lista ligada do JS
    events: Vec<ClockEvent>,
}

impl Cpu {
    pub fn new(prog: Vec<u16>, sram_bytes: usize) -> Self {
        let n = sram_bytes + REGISTER_SPACE;
        let pc22 = prog.len() * 2 > 0x20000;
        let mut cpu = Cpu {
            data: vec![0; n],
            prog,
            pc: 0,
            cycles: 0,
            pc22,
            read_hook: vec![false; n],
            write_hook: vec![false; n],
            pending: [None; MAX_INTERRUPTS],
            next_interrupt: -1,
            max_interrupt: 0,
            events: Vec::with_capacity(16),
        };
        cpu.reset();
        cpu
    }

    pub fn reset(&mut self) {
        self.reset_keep_events();
        self.events.clear();
    }
    /// reset feito pelo watchdog dentro de um evento de relógio: no avr8js a fila de eventos
    /// volta a ficar com os que estavam depois do evento que disparou (os timers continuam)
    pub fn reset_keep_events(&mut self) {
        let sp = (self.data.len() - 1) as u16;
        self.set_sp(sp);
        self.pc = 0;
        self.pending = [None; MAX_INTERRUPTS];
        self.next_interrupt = -1;
    }

    // ---------- acesso à memória (fora dos limites: lê 0 e ignora, como o Uint8Array do JS) ----------
    #[inline(always)]
    pub fn get(&self, addr: usize) -> u8 {
        match self.data.get(addr) {
            Some(v) => *v,
            None => 0,
        }
    }
    #[inline(always)]
    pub fn set(&mut self, addr: usize, v: u8) {
        if let Some(x) = self.data.get_mut(addr) {
            *x = v;
        }
    }
    #[inline(always)]
    pub fn get16(&self, addr: usize) -> u16 {
        self.get(addr) as u16 | ((self.get(addr + 1) as u16) << 8)
    }
    #[inline(always)]
    pub fn set16(&mut self, addr: usize, v: u16) {
        self.set(addr, v as u8);
        self.set(addr + 1, (v >> 8) as u8);
    }
    #[inline(always)]
    pub fn prog_word(&self, i: i64) -> u16 {
        if i < 0 {
            return 0;
        }
        match self.prog.get(i as usize) {
            Some(v) => *v,
            None => 0,
        }
    }
    #[inline(always)]
    pub fn prog_byte(&self, i: usize) -> u8 {
        match self.prog.get(i >> 1) {
            Some(w) => (if i & 1 == 0 { *w } else { *w >> 8 }) as u8,
            None => 0,
        }
    }
    pub fn prog_bytes_len(&self) -> usize {
        self.prog.len() * 2
    }

    pub fn read_data<I: Io + ?Sized>(&mut self, io: &mut I, addr: u16) -> u8 {
        let a = addr as usize;
        if a >= 32 && a < self.read_hook.len() && self.read_hook[a] {
            return io.read(self, addr);
        }
        self.get(a)
    }
    pub fn write_data<I: Io + ?Sized>(&mut self, io: &mut I, addr: u16, value: u8, mask: u8) {
        let a = addr as usize;
        if a < self.write_hook.len() && self.write_hook[a] {
            let old = self.get(a);
            if io.write(self, addr, value, old, mask) {
                return;
            }
        }
        self.set(a, value);
    }

    #[inline(always)]
    pub fn sp(&self) -> u16 {
        self.get16(SP)
    }
    #[inline(always)]
    pub fn set_sp(&mut self, v: u16) {
        self.set16(SP, v)
    }
    #[inline(always)]
    pub fn sreg(&self) -> u8 {
        self.data[SREG]
    }
    pub fn interrupts_enabled(&self) -> bool {
        self.sreg() & 0x80 != 0
    }

    // ---------- interrupções ----------
    pub fn set_interrupt_flag(&mut self, i: &Interrupt) {
        let f = i.flag_register as usize;
        if i.inverse_flag {
            let v = self.get(f) & !i.flag_mask;
            self.set(f, v);
        } else {
            let v = self.get(f) | i.flag_mask;
            self.set(f, v);
        }
        if self.get(i.enable_register as usize) & i.enable_mask != 0 {
            self.queue_interrupt(i);
        }
    }
    pub fn update_interrupt_enable(&mut self, i: &Interrupt, register_value: u8) {
        if register_value & i.enable_mask != 0 {
            let bit_set = self.get(i.flag_register as usize) & i.flag_mask != 0;
            if if i.inverse_flag { !bit_set } else { bit_set } {
                self.queue_interrupt(i);
            }
        } else {
            self.clear_interrupt(i, false);
        }
    }
    pub fn queue_interrupt(&mut self, i: &Interrupt) {
        let a = i.address as i32;
        self.pending[i.address as usize] = Some(*i);
        if self.next_interrupt == -1 || self.next_interrupt > a {
            self.next_interrupt = a;
        }
        if a > self.max_interrupt {
            self.max_interrupt = a;
        }
    }
    pub fn clear_interrupt(&mut self, i: &Interrupt, clear_flag: bool) {
        if clear_flag {
            let f = i.flag_register as usize;
            let v = self.get(f) & !i.flag_mask;
            self.set(f, v);
        }
        let a = i.address as usize;
        if self.pending[a].is_none() {
            return;
        }
        self.pending[a] = None;
        if self.next_interrupt == a as i32 {
            self.next_interrupt = -1;
            for k in (a + 1)..=(self.max_interrupt as usize) {
                if self.pending[k].is_some() {
                    self.next_interrupt = k as i32;
                    break;
                }
            }
        }
    }
    pub fn clear_interrupt_by_flag(&mut self, i: &Interrupt, register_value: u8) {
        if register_value & i.flag_mask != 0 {
            let f = i.flag_register as usize;
            let v = self.get(f) & !i.flag_mask;
            self.set(f, v);
            self.clear_interrupt(i, true);
        }
    }

    // ---------- eventos de relógio ----------
    /// `cycles` pode ser ≤ 0 (como no JS: conta como 1)
    pub fn add_clock_event(&mut self, id: u32, arg: u32, cycles: i64) {
        let at = self.cycles + cycles.max(1) as u64;
        // à frente dos que já estão marcados para o mesmo ciclo (como no JS)
        let k = self.events.iter().position(|e| e.cycles >= at).unwrap_or(self.events.len());
        self.events.insert(k, ClockEvent { cycles: at, id, arg });
    }
    pub fn update_clock_event(&mut self, id: u32, cycles: i64) -> bool {
        if let Some(k) = self.events.iter().position(|e| e.id == id) {
            let arg = self.events[k].arg;
            self.events.remove(k);
            self.add_clock_event(id, arg, cycles);
            return true;
        }
        false
    }
    pub fn clear_clock_event(&mut self, id: u32) -> bool {
        if let Some(k) = self.events.iter().position(|e| e.id == id) {
            self.events.remove(k);
            return true;
        }
        false
    }

    /// depois de cada instrução: no máximo um evento de relógio e uma interrupção
    pub fn tick<I: Io + ?Sized>(&mut self, io: &mut I) {
        if let Some(e) = self.events.first().copied() {
            if e.cycles <= self.cycles {
                // o JS chama a callback antes de a tirar da lista: se ela própria se voltar a
                // agendar, fica na lista e a primeira (esta) é retirada a seguir
                self.events.remove(0);
                io.clock_event(self, e.id, e.arg);
            }
        }
        if self.interrupts_enabled() && self.next_interrupt >= 0 {
            if let Some(i) = self.pending[self.next_interrupt as usize] {
                self.interrupt(i.address as i64);
                if !i.constant {
                    self.clear_interrupt(&i, true);
                }
            }
        }
    }

    fn interrupt(&mut self, addr: i64) {
        let sp = self.sp() as usize;
        let pc = self.pc;
        self.set(sp, pc as u8);
        self.set(sp.wrapping_sub(1), (pc >> 8) as u8);
        if self.pc22 {
            self.set(sp.wrapping_sub(2), (pc >> 16) as u8);
        }
        self.set_sp((sp as u16).wrapping_sub(if self.pc22 { 3 } else { 2 }));
        self.data[SREG] &= 0x7f;
        self.cycles += 2;
        self.pc = addr;
    }
}
