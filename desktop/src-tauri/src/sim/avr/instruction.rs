// Execução de uma instrução AVR — tradução direta do avr8js (instruction.ts, MIT).
// As contas usam i32 como os números do JS, para as flags darem exatamente o mesmo
// (incluindo as particularidades do avr8js, ex.: o V do NEG e o Z do FMULSU).
use super::cpu::{Cpu, Io};

const SREG: usize = 95;

#[inline(always)]
fn two_word(op: u16) -> bool {
    (op & 0xfe0f) == 0x9000 || (op & 0xfe0f) == 0x9200 || (op & 0xfe0e) == 0x940e || (op & 0xfe0e) == 0x940c
}
#[inline(always)]
fn b(c: bool, v: i32) -> i32 {
    if c {
        v
    } else {
        0
    }
}
// (S = N ^ V)
#[inline(always)]
fn s_flag(sreg: i32) -> i32 {
    b(((sreg >> 2) & 1) ^ ((sreg >> 3) & 1) != 0, 0x10)
}


// Descodificação: índice do ramo de `step` para cada uma das 65 536 instruções, calculado uma
// vez com as mesmas condições e pela mesma ordem da cadeia do avr8js (resultado igual, mas
// cada instrução custa um acesso à tabela em vez de até 96 comparações).
fn classify(op: u16) -> u8 {
    let o = op as i32;
    let q = ((o & 7) | ((o & 0xc00) >> 7) | ((o & 0x2000) >> 8)) as u16;
    if (op & 0xfc00) == 0x1c00 {
        return 0;
    }
    if (op & 0xfc00) == 0x0c00 {
        return 1;
    }
    if (op & 0xff00) == 0x9600 {
        return 2;
    }
    if (op & 0xfc00) == 0x2000 {
        return 3;
    }
    if (op & 0xf000) == 0x7000 {
        return 4;
    }
    if (op & 0xfe0f) == 0x9405 {
        return 5;
    }
    if (op & 0xff8f) == 0x9488 {
        return 6;
    }
    if (op & 0xfe08) == 0xf800 {
        return 7;
    }
    if (op & 0xfc00) == 0xf400 {
        return 8;
    }
    if (op & 0xfc00) == 0xf000 {
        return 9;
    }
    if (op & 0xff8f) == 0x9408 {
        return 10;
    }
    if (op & 0xfe08) == 0xfa00 {
        return 11;
    }
    if (op & 0xfe0e) == 0x940e {
        return 12;
    }
    if (op & 0xff00) == 0x9800 {
        return 13;
    }
    if (op & 0xfe0f) == 0x9400 {
        return 14;
    }
    if (op & 0xfc00) == 0x1400 {
        return 15;
    }
    if (op & 0xfc00) == 0x0400 {
        return 16;
    }
    if (op & 0xf000) == 0x3000 {
        return 17;
    }
    if (op & 0xfc00) == 0x1000 {
        return 18;
    }
    if (op & 0xfe0f) == 0x940a {
        return 19;
    }
    if op == 0x9519 {
        return 20;
    }
    if op == 0x9419 {
        return 21;
    }
    if op == 0x95d8 {
        return 22;
    }
    if (op & 0xfe0f) == 0x9006 {
        return 23;
    }
    if (op & 0xfe0f) == 0x9007 {
        return 24;
    }
    if (op & 0xfc00) == 0x2400 {
        return 25;
    }
    if (op & 0xff88) == 0x0308 {
        return 26;
    }
    if (op & 0xff88) == 0x0380 {
        return 27;
    }
    if (op & 0xff88) == 0x0388 {
        return 28;
    }
    if op == 0x9509 {
        return 29;
    }
    if op == 0x9409 {
        return 30;
    }
    if (op & 0xf800) == 0xb000 {
        return 31;
    }
    if (op & 0xfe0f) == 0x9403 {
        return 32;
    }
    if (op & 0xfe0e) == 0x940c {
        return 33;
    }
    if (op & 0xfe0f) == 0x9206 {
        return 34;
    }
    if (op & 0xfe0f) == 0x9205 {
        return 35;
    }
    if (op & 0xfe0f) == 0x9207 {
        return 36;
    }
    if (op & 0xf000) == 0xe000 {
        return 37;
    }
    if (op & 0xfe0f) == 0x9000 {
        return 38;
    }
    if (op & 0xfe0f) == 0x900c {
        return 39;
    }
    if (op & 0xfe0f) == 0x900d {
        return 40;
    }
    if (op & 0xfe0f) == 0x900e {
        return 41;
    }
    if (op & 0xfe0f) == 0x8008 {
        return 42;
    }
    if (op & 0xfe0f) == 0x9009 {
        return 43;
    }
    if (op & 0xfe0f) == 0x900a {
        return 44;
    }
    if (op & 0xd208) == 0x8008 && q != 0 {
        return 45;
    }
    if (op & 0xfe0f) == 0x8000 {
        return 46;
    }
    if (op & 0xfe0f) == 0x9001 {
        return 47;
    }
    if (op & 0xfe0f) == 0x9002 {
        return 48;
    }
    if (op & 0xd208) == 0x8000 && q != 0 {
        return 49;
    }
    if op == 0x95c8 {
        return 50;
    }
    if (op & 0xfe0f) == 0x9004 {
        return 51;
    }
    if (op & 0xfe0f) == 0x9005 {
        return 52;
    }
    if (op & 0xfe0f) == 0x9406 {
        return 53;
    }
    if (op & 0xfc00) == 0x2c00 {
        return 54;
    }
    if (op & 0xff00) == 0x0100 {
        return 55;
    }
    if (op & 0xfc00) == 0x9c00 {
        return 56;
    }
    if (op & 0xff00) == 0x0200 {
        return 57;
    }
    if (op & 0xff88) == 0x0300 {
        return 58;
    }
    if (op & 0xfe0f) == 0x9401 {
        return 59;
    }
    if op == 0 {
        return 60;
    }
    if (op & 0xfc00) == 0x2800 {
        return 61;
    }
    if (op & 0xf000) == 0x6000 {
        return 62;
    }
    if (op & 0xf800) == 0xb800 {
        return 63;
    }
    if (op & 0xfe0f) == 0x900f {
        return 64;
    }
    if (op & 0xfe0f) == 0x920f {
        return 65;
    }
    if (op & 0xf000) == 0xd000 {
        return 66;
    }
    if op == 0x9508 || op == 0x9518 {
        return 67;
    }
    if (op & 0xf000) == 0xc000 {
        return 68;
    }
    if (op & 0xfe0f) == 0x9407 {
        return 69;
    }
    if (op & 0xfc00) == 0x0800 {
        return 70;
    }
    if (op & 0xf000) == 0x4000 {
        return 71;
    }
    if (op & 0xff00) == 0x9a00 {
        return 72;
    }
    if (op & 0xff00) == 0x9900 {
        return 73;
    }
    if (op & 0xff00) == 0x9b00 {
        return 74;
    }
    if (op & 0xff00) == 0x9700 {
        return 75;
    }
    if (op & 0xfe08) == 0xfc00 {
        return 76;
    }
    if (op & 0xfe08) == 0xfe00 {
        return 77;
    }
    if op == 0x9588 || op == 0x95e8 || op == 0x95f8 {
        return 78;
    }
    if (op & 0xfe0f) == 0x9200 {
        return 79;
    }
    if (op & 0xfe0f) == 0x920c {
        return 80;
    }
    if (op & 0xfe0f) == 0x920d {
        return 81;
    }
    if (op & 0xfe0f) == 0x920e {
        return 82;
    }
    if (op & 0xfe0f) == 0x8208 {
        return 83;
    }
    if (op & 0xfe0f) == 0x9209 {
        return 84;
    }
    if (op & 0xfe0f) == 0x920a {
        return 85;
    }
    if (op & 0xd208) == 0x8208 && q != 0 {
        return 86;
    }
    if (op & 0xfe0f) == 0x8200 {
        return 87;
    }
    if (op & 0xfe0f) == 0x9201 {
        return 88;
    }
    if (op & 0xfe0f) == 0x9202 {
        return 89;
    }
    if (op & 0xd208) == 0x8200 && q != 0 {
        return 90;
    }
    if (op & 0xfc00) == 0x1800 {
        return 91;
    }
    if (op & 0xf000) == 0x5000 {
        return 92;
    }
    if (op & 0xfe0f) == 0x9402 {
        return 93;
    }
    if op == 0x95a8 {
        return 94;
    }
    if (op & 0xfe0f) == 0x9204 {
        return 95;
    }
    255
}
static TABLE: std::sync::OnceLock<Box<[u8; 65536]>> = std::sync::OnceLock::new();
#[inline(always)]
fn table() -> &'static [u8; 65536] {
    TABLE.get_or_init(|| {
        let mut t = Box::new([255u8; 65536]);
        for op in 0..=0xffffu16 {
            t[op as usize] = classify(op);
        }
        t
    })
}

pub fn step<I: Io + ?Sized>(cpu: &mut Cpu, io: &mut I) {
    let op = cpu.prog_word(cpu.pc);
    let o = op as i32;
    let rd = ((o & 0x1f0) >> 4) as usize; // dddd d
    let rr = ((o & 0xf) | ((o & 0x200) >> 5)) as usize; // r rrrr
    let rdh = (((o & 0xf0) >> 4) + 16) as usize; // registo alto (16..31)
    let k8 = (o & 0xf) | ((o & 0xf00) >> 4); // constante de 8 bits
    let q = ((o & 7) | ((o & 0xc00) >> 7) | ((o & 0x2000) >> 8)) as u16; // deslocamento LDD/STD
    let sreg0 = cpu.data[SREG] as i32;
    macro_rules! d {
        ($i:expr) => {
            cpu.get($i) as i32
        };
    }
    macro_rules! setsreg {
        ($v:expr) => {
            cpu.data[SREG] = ($v) as u8
        };
    }
    macro_rules! skip {
        () => {{
            let n = if two_word(cpu.prog_word(cpu.pc + 1)) { 2 } else { 1 };
            cpu.pc += n;
            cpu.cycles += n as u64;
        }};
    }
    macro_rules! push_ret {
        ($ret:expr) => {{
            let ret: i64 = $ret;
            let sp = cpu.sp() as usize;
            cpu.set(sp, ret as u8);
            cpu.set(sp.wrapping_sub(1), (ret >> 8) as u8);
            if cpu.pc22 {
                cpu.set(sp.wrapping_sub(2), (ret >> 16) as u8);
            }
            let n = if cpu.pc22 { 3 } else { 2 };
            cpu.set_sp((sp as u16).wrapping_sub(n));
        }};
    }
    macro_rules! sub_flags {
        // SUB/SUBI/CP/CPI: R = a − b (com o resultado inteiro do JS)
        ($a:expr, $b:expr, $r:expr) => {{
            let (a, bb, r) = ($a, $b, $r);
            let mut s = sreg0 & 0xc0;
            s |= b(r == 0, 2);
            s |= b(128 & r != 0, 4);
            s |= b((a ^ bb) & (a ^ r) & 128 != 0, 8);
            s |= s_flag(s);
            s |= b(bb > a, 1);
            s |= b(1 & ((!a & bb) | (bb & r) | (r & !a)) != 0, 0x20);
            s
        }};
    }
    macro_rules! sbc_flags {
        // SBC/SBCI/CPC: R = a − b − C; o Z só fica se já estava
        ($a:expr, $b:expr, $r:expr) => {{
            let (a, bb, r) = ($a, $b, $r);
            let mut s = (sreg0 & 0xc0) | b(r == 0 && (sreg0 >> 1) & 1 != 0, 2) | b(bb + (sreg0 & 1) > a, 1);
            s |= b(128 & r != 0, 4);
            s |= b((a ^ bb) & (a ^ r) & 128 != 0, 8);
            s |= s_flag(s);
            s |= b(1 & ((!a & bb) | (bb & r) | (r & !a)) != 0, 0x20);
            s
        }};
    }
    macro_rules! logic_flags {
        ($r:expr) => {{
            let r = $r;
            let mut s = sreg0 & 0xe1;
            s |= b(r == 0, 2);
            s |= b(128 & r != 0, 4);
            s |= s_flag(s);
            s
        }};
    }

    let k = table()[op as usize];
    if k == 0 {
        // ADC
        let (dv, r) = (d!(rd), d!(rr));
        let sum = dv + r + (sreg0 & 1);
        let rv = sum & 255;
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xc0;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= b((rv ^ r) & (dv ^ rv) & 128 != 0, 8);
        s |= s_flag(s);
        s |= b(sum & 256 != 0, 1);
        s |= b(1 & ((dv & r) | (r & !rv) | (!rv & dv)) != 0, 0x20);
        setsreg!(s);
    } else if k == 1 {
        // ADD
        let (dv, r) = (d!(rd), d!(rr));
        let rv = (dv + r) & 255;
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xc0;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= b((rv ^ r) & (rv ^ dv) & 128 != 0, 8);
        s |= s_flag(s);
        s |= b((dv + r) & 256 != 0, 1);
        s |= b(1 & ((dv & r) | (r & !rv) | (!rv & dv)) != 0, 0x20);
        setsreg!(s);
    } else if k == 2 {
        // ADIW
        let addr = (2 * ((o & 0x30) >> 4) + 24) as usize;
        let value = cpu.get16(addr) as i32;
        let rv = (value + ((o & 0xf) | ((o & 0xc0) >> 2))) & 0xffff;
        cpu.set16(addr, rv as u16);
        let mut s = sreg0 & 0xe0;
        s |= b(rv == 0, 2);
        s |= b(0x8000 & rv != 0, 4);
        s |= b(!value & rv & 0x8000 != 0, 8);
        s |= s_flag(s);
        s |= b(!rv & value & 0x8000 != 0, 1);
        setsreg!(s);
        cpu.cycles += 1;
    } else if k == 3 {
        // AND
        let rv = d!(rd) & d!(rr);
        cpu.set(rd, rv as u8);
        setsreg!(logic_flags!(rv));
    } else if k == 4 {
        // ANDI
        let rv = d!(rdh) & k8;
        cpu.set(rdh, rv as u8);
        setsreg!(logic_flags!(rv));
    } else if k == 5 {
        // ASR
        let value = d!(rd);
        let rv = (value >> 1) | (128 & value);
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xe0;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= value & 1;
        s |= b(((s >> 2) & 1) ^ (s & 1) != 0, 8);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 6 {
        // BCLR
        cpu.data[SREG] &= !(1u8 << ((o & 0x70) >> 4));
    } else if k == 7 {
        // BLD
        let bit = o & 7;
        let v = (!(1 << bit) & d!(rd)) | (((sreg0 >> 6) & 1) << bit);
        cpu.set(rd, v as u8);
    } else if k == 8 {
        // BRBC
        if sreg0 & (1 << (o & 7)) == 0 {
            cpu.pc += (((o & 0x1f8) >> 3) - b(o & 0x200 != 0, 0x40)) as i64;
            cpu.cycles += 1;
        }
    } else if k == 9 {
        // BRBS
        if sreg0 & (1 << (o & 7)) != 0 {
            cpu.pc += (((o & 0x1f8) >> 3) - b(o & 0x200 != 0, 0x40)) as i64;
            cpu.cycles += 1;
        }
    } else if k == 10 {
        // BSET
        cpu.data[SREG] |= 1u8 << ((o & 0x70) >> 4);
    } else if k == 11 {
        // BST
        let bit = o & 7;
        setsreg!((sreg0 & 0xbf) | b((d!(rd) >> bit) & 1 != 0, 0x40));
    } else if k == 12 {
        // CALL
        let k = cpu.prog_word(cpu.pc + 1) as i64 | (((o & 1) as i64) << 16) | (((o & 0x1f0) as i64) << 13);
        push_ret!(cpu.pc + 2);
        cpu.pc = k - 1;
        cpu.cycles += if cpu.pc22 { 4 } else { 3 };
    } else if k == 13 {
        // CBI
        let a = (((o & 0xf8) >> 3) + 32) as u16;
        let mask = 1u8 << (o & 7);
        let r = cpu.read_data(io, a);
        cpu.write_data(io, a, r & !mask, mask);
    } else if k == 14 {
        // COM
        let rv = 255 - d!(rd);
        cpu.set(rd, rv as u8);
        let mut s = (sreg0 & 0xe1) | 1;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 15 {
        // CP
        let (a, bb) = (d!(rd), d!(rr));
        setsreg!(sub_flags!(a, bb, a - bb));
    } else if k == 16 {
        // CPC
        let (a, bb) = (d!(rd), d!(rr));
        let r = a - bb - (sreg0 & 1);
        setsreg!(sbc_flags!(a, bb, r));
    } else if k == 17 {
        // CPI
        let a = d!(rdh);
        setsreg!(sub_flags!(a, k8, a - k8));
    } else if k == 18 {
        // CPSE
        if d!(rd) == d!(rr) {
            skip!();
        }
    } else if k == 19 {
        // DEC
        let value = d!(rd);
        let rv = value - 1;
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xe1;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= b(value == 128, 8);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 20 {
        // EICALL
        let ret = cpu.pc + 1;
        let sp = cpu.sp() as usize;
        let eind = cpu.get(0x5c) as i64;
        cpu.set(sp, ret as u8);
        cpu.set(sp.wrapping_sub(1), (ret >> 8) as u8);
        cpu.set(sp.wrapping_sub(2), (ret >> 16) as u8);
        cpu.set_sp((sp as u16).wrapping_sub(3));
        cpu.pc = ((eind << 16) | cpu.get16(30) as i64) - 1;
        cpu.cycles += 3;
    } else if k == 21 {
        // EIJMP
        let eind = cpu.get(0x5c) as i64;
        cpu.pc = ((eind << 16) | cpu.get16(30) as i64) - 1;
        cpu.cycles += 1;
    } else if k == 22 {
        // ELPM
        let rampz = cpu.get(0x5b) as usize;
        let v = cpu.prog_byte((rampz << 16) | cpu.get16(30) as usize);
        cpu.set(0, v);
        cpu.cycles += 2;
    } else if k == 23 {
        // ELPM(REG)
        let rampz = cpu.get(0x5b) as usize;
        let v = cpu.prog_byte((rampz << 16) | cpu.get16(30) as usize);
        cpu.set(rd, v);
        cpu.cycles += 2;
    } else if k == 24 {
        // ELPM(INC)
        let rampz = cpu.get(0x5b) as usize;
        let i = cpu.get16(30);
        let v = cpu.prog_byte((rampz << 16) | i as usize);
        cpu.set(rd, v);
        cpu.set16(30, i.wrapping_add(1));
        if i == 0xffff {
            let pages = (cpu.prog_bytes_len() >> 16).max(1);
            cpu.set(0x5b, ((rampz + 1) % pages) as u8);
        }
        cpu.cycles += 2;
    } else if k == 25 {
        // EOR
        let rv = d!(rd) ^ d!(rr);
        cpu.set(rd, rv as u8);
        setsreg!(logic_flags!(rv));
    } else if k == 26 {
        // FMUL
        let v1 = d!((((o & 0x70) >> 4) + 16) as usize);
        let v2 = d!(((o & 7) + 16) as usize);
        let rv = (v1 * v2) << 1;
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv == 0, 2) | b((v1 * v2) & 0x8000 != 0, 1));
        cpu.cycles += 1;
    } else if k == 27 {
        // FMULS
        let v1 = cpu.get((((o & 0x70) >> 4) + 16) as usize) as i8 as i32;
        let v2 = cpu.get(((o & 7) + 16) as usize) as i8 as i32;
        let rv = (v1 * v2) << 1;
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv == 0, 2) | b((v1 * v2) & 0x8000 != 0, 1));
        cpu.cycles += 1;
    } else if k == 28 {
        // FMULSU (o avr8js tem o Z invertido: mantido para dar o mesmo)
        let v1 = cpu.get((((o & 0x70) >> 4) + 16) as usize) as i8 as i32;
        let v2 = d!(((o & 7) + 16) as usize);
        let rv = (v1 * v2) << 1;
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv != 0, 2) | b((v1 * v2) & 0x8000 != 0, 1));
        cpu.cycles += 1;
    } else if k == 29 {
        // ICALL
        push_ret!(cpu.pc + 1);
        cpu.pc = cpu.get16(30) as i64 - 1;
        cpu.cycles += if cpu.pc22 { 3 } else { 2 };
    } else if k == 30 {
        // IJMP
        cpu.pc = cpu.get16(30) as i64 - 1;
        cpu.cycles += 1;
    } else if k == 31 {
        // IN
        let a = (((o & 0xf) | ((o & 0x600) >> 5)) + 32) as u16;
        let v = cpu.read_data(io, a);
        cpu.set(rd, v);
    } else if k == 32 {
        // INC
        let dv = d!(rd);
        let r = (dv + 1) & 255;
        cpu.set(rd, r as u8);
        let mut s = sreg0 & 0xe1;
        s |= b(r == 0, 2);
        s |= b(128 & r != 0, 4);
        s |= b(dv == 127, 8);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 33 {
        // JMP
        cpu.pc = (cpu.prog_word(cpu.pc + 1) as i64 | (((o & 1) as i64) << 16) | (((o & 0x1f0) as i64) << 13)) - 1;
        cpu.cycles += 2;
    } else if k == 34 {
        // LAC
        let clear = cpu.get(rd);
        let z = cpu.get16(30);
        let value = cpu.read_data(io, z);
        cpu.write_data(io, z, value & (255 - clear), 0xff);
        cpu.set(rd, value);
    } else if k == 35 {
        // LAS
        let set = cpu.get(rd);
        let z = cpu.get16(30);
        let value = cpu.read_data(io, z);
        cpu.write_data(io, z, value | set, 0xff);
        cpu.set(rd, value);
    } else if k == 36 {
        // LAT
        let r = cpu.get(rd);
        let z = cpu.get16(30);
        let rv = cpu.read_data(io, z);
        cpu.write_data(io, z, r ^ rv, 0xff);
        cpu.set(rd, rv);
    } else if k == 37 {
        // LDI
        cpu.set(rdh, k8 as u8);
    } else if k == 38 {
        // LDS
        cpu.cycles += 1;
        let a = cpu.prog_word(cpu.pc + 1);
        let v = cpu.read_data(io, a);
        cpu.set(rd, v);
        cpu.pc += 1;
    } else if k == 39 {
        // LD X
        cpu.cycles += 1;
        let x = cpu.get16(26);
        let v = cpu.read_data(io, x);
        cpu.set(rd, v);
    } else if k == 40 {
        // LD X+
        let x = cpu.get16(26);
        cpu.cycles += 1;
        let v = cpu.read_data(io, x);
        cpu.set(rd, v);
        cpu.set16(26, x.wrapping_add(1));
    } else if k == 41 {
        // LD −X
        let x = cpu.get16(26).wrapping_sub(1);
        cpu.set16(26, x);
        cpu.cycles += 1;
        let v = cpu.read_data(io, x);
        cpu.set(rd, v);
    } else if k == 42 {
        // LD Y
        cpu.cycles += 1;
        let y = cpu.get16(28);
        let v = cpu.read_data(io, y);
        cpu.set(rd, v);
    } else if k == 43 {
        // LD Y+
        let y = cpu.get16(28);
        cpu.cycles += 1;
        let v = cpu.read_data(io, y);
        cpu.set(rd, v);
        cpu.set16(28, y.wrapping_add(1));
    } else if k == 44 {
        // LD −Y
        let y = cpu.get16(28).wrapping_sub(1);
        cpu.set16(28, y);
        cpu.cycles += 1;
        let v = cpu.read_data(io, y);
        cpu.set(rd, v);
    } else if k == 45 {
        // LDD Y+q
        cpu.cycles += 1;
        let a = cpu.get16(28).wrapping_add(q);
        let v = cpu.read_data(io, a);
        cpu.set(rd, v);
    } else if k == 46 {
        // LD Z
        cpu.cycles += 1;
        let z = cpu.get16(30);
        let v = cpu.read_data(io, z);
        cpu.set(rd, v);
    } else if k == 47 {
        // LD Z+
        let z = cpu.get16(30);
        cpu.cycles += 1;
        let v = cpu.read_data(io, z);
        cpu.set(rd, v);
        cpu.set16(30, z.wrapping_add(1));
    } else if k == 48 {
        // LD −Z
        let z = cpu.get16(30).wrapping_sub(1);
        cpu.set16(30, z);
        cpu.cycles += 1;
        let v = cpu.read_data(io, z);
        cpu.set(rd, v);
    } else if k == 49 {
        // LDD Z+q
        cpu.cycles += 1;
        let a = cpu.get16(30).wrapping_add(q);
        let v = cpu.read_data(io, a);
        cpu.set(rd, v);
    } else if k == 50 {
        // LPM
        let v = cpu.prog_byte(cpu.get16(30) as usize);
        cpu.set(0, v);
        cpu.cycles += 2;
    } else if k == 51 {
        // LPM Rd, Z
        let v = cpu.prog_byte(cpu.get16(30) as usize);
        cpu.set(rd, v);
        cpu.cycles += 2;
    } else if k == 52 {
        // LPM Rd, Z+
        let i = cpu.get16(30);
        let v = cpu.prog_byte(i as usize);
        cpu.set(rd, v);
        cpu.set16(30, i.wrapping_add(1));
        cpu.cycles += 2;
    } else if k == 53 {
        // LSR
        let value = d!(rd);
        let rv = value >> 1;
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xe0;
        s |= b(rv == 0, 2);
        s |= value & 1;
        s |= b(((s >> 2) & 1) ^ (s & 1) != 0, 8);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 54 {
        // MOV
        let v = cpu.get(rr);
        cpu.set(rd, v);
    } else if k == 55 {
        // MOVW
        let r2 = 2 * (o & 0xf) as usize;
        let d2 = 2 * ((o & 0xf0) >> 4) as usize;
        let (a, bb) = (cpu.get(r2), cpu.get(r2 + 1));
        cpu.set(d2, a);
        cpu.set(d2 + 1, bb);
    } else if k == 56 {
        // MUL
        let rv = d!(rd) * d!(rr);
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv == 0, 2) | b(0x8000 & rv != 0, 1));
        cpu.cycles += 1;
    } else if k == 57 {
        // MULS
        let rv = (cpu.get(rdh) as i8 as i32) * (cpu.get(((o & 0xf) + 16) as usize) as i8 as i32);
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv == 0, 2) | b(0x8000 & rv != 0, 1));
        cpu.cycles += 1;
    } else if k == 58 {
        // MULSU
        let rv = (cpu.get((((o & 0x70) >> 4) + 16) as usize) as i8 as i32) * d!(((o & 7) + 16) as usize);
        cpu.set16(0, rv as u16);
        setsreg!((sreg0 & 0xfc) | b(0xffff & rv == 0, 2) | b(0x8000 & rv != 0, 1));
        cpu.cycles += 1;
    } else if k == 59 {
        // NEG (no avr8js o V nunca fica: R é negativo)
        let value = d!(rd);
        let rv = -value;
        cpu.set(rd, rv as u8);
        let mut s = sreg0 & 0xc0;
        s |= b(rv == 0, 2);
        s |= b(128 & rv != 0, 4);
        s |= b(rv == 128, 8);
        s |= s_flag(s);
        s |= b(rv != 0, 1);
        s |= b(1 & (rv | value) != 0, 0x20);
        setsreg!(s);
    } else if k == 60 {
        // NOP
    } else if k == 61 {
        // OR
        let rv = d!(rd) | d!(rr);
        cpu.set(rd, rv as u8);
        setsreg!(logic_flags!(rv));
    } else if k == 62 {
        // ORI (SBR)
        let rv = d!(rdh) | k8;
        cpu.set(rdh, rv as u8);
        setsreg!(logic_flags!(rv));
    } else if k == 63 {
        // OUT
        let a = (((o & 0xf) | ((o & 0x600) >> 5)) + 32) as u16;
        let v = cpu.get(rd);
        cpu.write_data(io, a, v, 0xff);
    } else if k == 64 {
        // POP
        let v = cpu.sp().wrapping_add(1);
        cpu.set_sp(v);
        let x = cpu.get(v as usize);
        cpu.set(rd, x);
        cpu.cycles += 1;
    } else if k == 65 {
        // PUSH
        let v = cpu.sp();
        let x = cpu.get(rd);
        cpu.set(v as usize, x);
        cpu.set_sp(v.wrapping_sub(1));
        cpu.cycles += 1;
    } else if k == 66 {
        // RCALL
        let k = ((o & 0x7ff) - b(o & 0x800 != 0, 0x800)) as i64;
        push_ret!(cpu.pc + 1);
        cpu.pc += k;
        cpu.cycles += if cpu.pc22 { 3 } else { 2 };
    } else if k == 67 {
        // RET / RETI
        let n = if cpu.pc22 { 3 } else { 2 };
        let i = cpu.sp().wrapping_add(n);
        cpu.set_sp(i);
        let i = i as usize;
        cpu.pc = ((cpu.get(i.wrapping_sub(1)) as i64) << 8) + cpu.get(i) as i64 - 1;
        if cpu.pc22 {
            cpu.pc |= (cpu.get(i.wrapping_sub(2)) as i64) << 16;
        }
        cpu.cycles += if cpu.pc22 { 4 } else { 3 };
        if op == 0x9518 {
            cpu.data[SREG] |= 0x80;
        }
    } else if k == 68 {
        // RJMP
        cpu.pc += ((o & 0x7ff) - b(o & 0x800 != 0, 0x800)) as i64;
        cpu.cycles += 1;
    } else if k == 69 {
        // ROR
        let dv = d!(rd);
        let r = (dv >> 1) | ((sreg0 & 1) << 7);
        cpu.set(rd, r as u8);
        let mut s = sreg0 & 0xe0;
        s |= b(r == 0, 2);
        s |= b(128 & r != 0, 4);
        s |= b(1 & dv != 0, 1);
        s |= b(((s >> 2) & 1) ^ (s & 1) != 0, 8);
        s |= s_flag(s);
        setsreg!(s);
    } else if k == 70 {
        // SBC
        let (a, bb) = (d!(rd), d!(rr));
        let r = a - bb - (sreg0 & 1);
        cpu.set(rd, r as u8);
        setsreg!(sbc_flags!(a, bb, r));
    } else if k == 71 {
        // SBCI
        let a = d!(rdh);
        let r = a - k8 - (sreg0 & 1);
        cpu.set(rdh, r as u8);
        setsreg!(sbc_flags!(a, k8, r));
    } else if k == 72 {
        // SBI
        let t = (((o & 0xf8) >> 3) + 32) as u16;
        let mask = 1u8 << (o & 7);
        let v = cpu.read_data(io, t);
        cpu.write_data(io, t, v | mask, mask);
        cpu.cycles += 1;
    } else if k == 73 {
        // SBIC
        let v = cpu.read_data(io, (((o & 0xf8) >> 3) + 32) as u16);
        if v & (1u8 << (o & 7)) == 0 {
            skip!();
        }
    } else if k == 74 {
        // SBIS
        let v = cpu.read_data(io, (((o & 0xf8) >> 3) + 32) as u16);
        if v & (1u8 << (o & 7)) != 0 {
            skip!();
        }
    } else if k == 75 {
        // SBIW
        let i = (2 * ((o & 0x30) >> 4) + 24) as usize;
        let a = cpu.get16(i) as i32;
        let l = (o & 0xf) | ((o & 0xc0) >> 2);
        let rv = a - l;
        cpu.set16(i, rv as u16);
        let mut s = sreg0 & 0xc0;
        s |= b(rv == 0, 2);
        s |= b(0x8000 & rv != 0, 4);
        s |= b(a & !rv & 0x8000 != 0, 8);
        s |= s_flag(s);
        s |= b(l > a, 1);
        s |= b(1 & ((!a & l) | (l & rv) | (rv & !a)) != 0, 0x20);
        setsreg!(s);
        cpu.cycles += 1;
    } else if k == 76 {
        // SBRC
        if d!(rd) & (1 << (o & 7)) == 0 {
            skip!();
        }
    } else if k == 77 {
        // SBRS
        if d!(rd) & (1 << (o & 7)) != 0 {
            skip!();
        }
    } else if k == 78 {
        // SLEEP, SPM, SPM Z+ (não implementados, como no avr8js)
    } else if k == 79 {
        // STS
        let v = cpu.get(rd);
        let a = cpu.prog_word(cpu.pc + 1);
        cpu.write_data(io, a, v, 0xff);
        cpu.pc += 1;
        cpu.cycles += 1;
    } else if k == 80 {
        // ST X
        let (x, v) = (cpu.get16(26), cpu.get(rd));
        cpu.write_data(io, x, v, 0xff);
        cpu.cycles += 1;
    } else if k == 81 {
        // ST X+
        let (x, v) = (cpu.get16(26), cpu.get(rd));
        cpu.write_data(io, x, v, 0xff);
        cpu.set16(26, x.wrapping_add(1));
        cpu.cycles += 1;
    } else if k == 82 {
        // ST −X
        let v = cpu.get(rd);
        let x = cpu.get16(26).wrapping_sub(1);
        cpu.set16(26, x);
        cpu.write_data(io, x, v, 0xff);
        cpu.cycles += 1;
    } else if k == 83 {
        // ST Y
        let (y, v) = (cpu.get16(28), cpu.get(rd));
        cpu.write_data(io, y, v, 0xff);
        cpu.cycles += 1;
    } else if k == 84 {
        // ST Y+
        let (y, v) = (cpu.get16(28), cpu.get(rd));
        cpu.write_data(io, y, v, 0xff);
        cpu.set16(28, y.wrapping_add(1));
        cpu.cycles += 1;
    } else if k == 85 {
        // ST −Y
        let v = cpu.get(rd);
        let y = cpu.get16(28).wrapping_sub(1);
        cpu.set16(28, y);
        cpu.write_data(io, y, v, 0xff);
        cpu.cycles += 1;
    } else if k == 86 {
        // STD Y+q
        let (a, v) = (cpu.get16(28).wrapping_add(q), cpu.get(rd));
        cpu.write_data(io, a, v, 0xff);
        cpu.cycles += 1;
    } else if k == 87 {
        // ST Z
        let (z, v) = (cpu.get16(30), cpu.get(rd));
        cpu.write_data(io, z, v, 0xff);
        cpu.cycles += 1;
    } else if k == 88 {
        // ST Z+
        let (z, v) = (cpu.get16(30), cpu.get(rd));
        cpu.write_data(io, z, v, 0xff);
        cpu.set16(30, z.wrapping_add(1));
        cpu.cycles += 1;
    } else if k == 89 {
        // ST −Z
        let v = cpu.get(rd);
        let z = cpu.get16(30).wrapping_sub(1);
        cpu.set16(30, z);
        cpu.write_data(io, z, v, 0xff);
        cpu.cycles += 1;
    } else if k == 90 {
        // STD Z+q
        let (a, v) = (cpu.get16(30).wrapping_add(q), cpu.get(rd));
        cpu.write_data(io, a, v, 0xff);
        cpu.cycles += 1;
    } else if k == 91 {
        // SUB
        let (a, bb) = (d!(rd), d!(rr));
        let r = a - bb;
        cpu.set(rd, r as u8);
        setsreg!(sub_flags!(a, bb, r));
    } else if k == 92 {
        // SUBI
        let a = d!(rdh);
        let r = a - k8;
        cpu.set(rdh, r as u8);
        setsreg!(sub_flags!(a, k8, r));
    } else if k == 93 {
        // SWAP
        let i = cpu.get(rd);
        cpu.set(rd, (i << 4) | (i >> 4));
    } else if k == 94 {
        // WDR
        io.watchdog_reset(cpu);
    } else if k == 95 {
        // XCH
        let z = cpu.get16(30) as usize;
        let (v1, v2) = (cpu.get(rd), cpu.get(z));
        cpu.set(z, v1);
        cpu.set(rd, v2);
    }
    let n = cpu.prog.len() as i64;
    cpu.pc = (cpu.pc + 1) % n;
    cpu.cycles += 1;
}
