import { mmu } from "./mmu";
import { gpu } from "./gpu";

/**
 * CPU object.
 */
export const cpu = {
  // Flag Constants
  FLAGS: {
    Z: 0x80,
    N: 0x40,
    H: 0x20,
    C: 0x10,
  },

  // Internal State
  clock: {
    m: 0,
    t: 0,
  },

  reg: {
    a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, f: 0,
    sp: 0, pc: 0,
    m: 0, t: 0,
    ime: 0,
    ime_cnt: 0,
  },

  // 16-bit register accessors
  get bc(): number { return (cpu.reg.b << 8) | cpu.reg.c; },
  set bc(val: number) { cpu.reg.b = (val >> 8) & 0xFF; cpu.reg.c = val & 0xFF; },
  get de(): number { return (cpu.reg.d << 8) | cpu.reg.e; },
  set de(val: number) { cpu.reg.d = (val >> 8) & 0xFF; cpu.reg.e = val & 0xFF; },
  get hl(): number { return (cpu.reg.h << 8) | cpu.reg.l; },
  set hl(val: number) { cpu.reg.h = (val >> 8) & 0xFF; cpu.reg.l = val & 0xFF; },
  get af(): number { return (cpu.reg.a << 8) | cpu.reg.f; },
  set af(val: number) { cpu.reg.a = (val >> 8) & 0xFF; cpu.reg.f = val & 0xF0; },
  get sp(): number { return cpu.reg.sp; },
  set sp(val: number) { cpu.reg.sp = val & 0xFFFF; },

  halt: 0,
  haltBug: 0,
  stop: 0,

  reset: () => {
    cpu.reg.a = 0x01;
    cpu.reg.f = 0xB0;
    cpu.reg.b = 0x00;
    cpu.reg.c = 0x13;
    cpu.reg.d = 0x00;
    cpu.reg.e = 0xD8;
    cpu.reg.h = 0x01;
    cpu.reg.l = 0x4D;
    cpu.reg.sp = 0xFFFE;
    cpu.reg.pc = 0x0100;
    cpu.reg.m = 0;
    cpu.reg.t = 0;
    cpu.reg.ime = 0;
    cpu.reg.ime_cnt = 0;
    cpu.halt = 0;
    cpu.haltBug = 0;
    cpu.stop = 0;
    cpu.clock.m = 0;
    cpu.clock.t = 0;
  },

  step: () => {
    // STOP mode: CPU waits for joypad interrupt (bit 4 of intf/inte)
    if (cpu.stop) {
      if ((mmu.intf & mmu.inte) & 0x10) {
        cpu.stop = 0;
      } else {
        cpu.reg.m = 1;
        cpu.reg.t = 4;
        cpu.clock.m += cpu.reg.m;
        cpu.clock.t += cpu.reg.t;
        // Timers and GPU are stopped in STOP mode
        return;
      }
    }

    if (cpu.interrupts()) {
      // Interrupt was serviced, it took its own cycles.
    } else if (cpu.halt) {
      cpu.reg.m = 1;
    } else {
      const pc = cpu.reg.pc;
      const opcode = mmu.rb(pc);
      if (!cpu.haltBug) {
        cpu.reg.pc = (cpu.reg.pc + 1) & 0xffff;
      } else {
        cpu.haltBug = 0;
      }
      if (cpu.map[opcode]) {
        cpu.map[opcode]();
      } else {
        cpu.ops.XX();
      }
    }

    if (cpu.reg.ime_cnt > 0) {
      cpu.reg.ime_cnt--;
      if (cpu.reg.ime_cnt === 0) cpu.reg.ime = 1;
    }

    cpu.reg.t = cpu.reg.m * 4;
    cpu.clock.m += cpu.reg.m;
    cpu.clock.t += cpu.reg.t;

    gpu.checkline();
    mmu.updateTimer(cpu.reg.m);
  },

  interrupts: () => {
    const requested = mmu.intf & 0x1F;
    const fired = (mmu.inte & requested) & 0x1F;

    // HALT exits as soon as any interrupt is requested, even if IME=0
    // and even if the interrupt is not enabled in IE. Only enabled
    // interrupts are actually serviced.
    if (cpu.halt && requested) {
      cpu.halt = 0;

      // With IME=0, HALT still wakes when an interrupt becomes pending.
      // If the pending interrupt is also enabled, the classic HALT bug
      // applies: the next opcode is fetched without incrementing PC.
      if (!cpu.reg.ime) {
        if (fired) cpu.haltBug = 1;
        cpu.reg.m = 1;
        return true;
      }

      if (!fired) {
        cpu.reg.m = 1;
        return true;
      }
    }

    if (fired && cpu.reg.ime) {
      for (let i = 0; i < 5; i++) {
        if (fired & (1 << i)) {
          cpu.serviceInterrupt(i);
          return true;
        }
      }
    }

    return false;
  },

  serviceInterrupt: (i: number) => {
    cpu.reg.ime = 0;
    cpu.reg.ime_cnt = 0;
    cpu.halt = 0;
    mmu.intf &= ~(1 << i);

    cpu.reg.sp = (cpu.reg.sp - 2) & 0xFFFF;
    mmu.ww(cpu.reg.sp, cpu.reg.pc);

    switch (i) {
      case 0: cpu.reg.pc = 0x0040; break; // V-Blank
      case 1: cpu.reg.pc = 0x0048; break; // LCD STAT
      case 2: cpu.reg.pc = 0x0050; break; // Timer
      case 3: cpu.reg.pc = 0x0058; break; // Serial
      case 4: cpu.reg.pc = 0x0060; break; // Joypad
    }

    cpu.reg.m = 5;
  },

  ops: {
    XX: () => {
      console.error("Unknown opcode at " + (cpu.reg.pc - 1).toString(16));
      cpu.stop = 1;
    },

    NOP: () => { cpu.reg.m = 1; cpu.reg.t = 4; },

    // 8-bit Loads
    LD_r_r: (r1: string, r2: string) => { (cpu.reg as any)[r1] = (cpu.reg as any)[r2]; cpu.reg.m = 1; cpu.reg.t = 4; },
    LD_r_n: (r: string) => { (cpu.reg as any)[r] = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_r_hl: (r: string) => { (cpu.reg as any)[r] = mmu.rb(cpu.hl); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_hl_r: (r: string) => { mmu.wb(cpu.hl, (cpu.reg as any)[r]); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_hl_n: () => { mmu.wb(cpu.hl, mmu.rb(cpu.reg.pc)); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; },
    LD_a_bc: () => { cpu.reg.a = mmu.rb(cpu.bc); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_a_de: () => { cpu.reg.a = mmu.rb(cpu.de); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_a_nn: () => { cpu.reg.a = mmu.rb(mmu.rw(cpu.reg.pc)); cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF; cpu.reg.m = 4; cpu.reg.t = 16; },
    LD_bc_a: () => { mmu.wb(cpu.bc, cpu.reg.a); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_de_a: () => { mmu.wb(cpu.de, cpu.reg.a); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_nn_a: () => { mmu.wb(mmu.rw(cpu.reg.pc), cpu.reg.a); cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF; cpu.reg.m = 4; cpu.reg.t = 16; },
    LD_a_ff00n: () => { cpu.reg.a = mmu.rb(0xFF00 + mmu.rb(cpu.reg.pc)); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; },
    LD_ff00n_a: () => { mmu.wb(0xFF00 + mmu.rb(cpu.reg.pc), cpu.reg.a); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; },
    LD_a_ff00c: () => { cpu.reg.a = mmu.rb(0xFF00 + cpu.reg.c); cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_ff00c_a: () => { mmu.wb(0xFF00 + cpu.reg.c, cpu.reg.a); cpu.reg.m = 2; cpu.reg.t = 8; },
    LDI_hl_a: () => { mmu.wb(cpu.hl, cpu.reg.a); cpu.hl = (cpu.hl + 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },
    LDI_a_hl: () => { cpu.reg.a = mmu.rb(cpu.hl); cpu.hl = (cpu.hl + 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },
    LDD_hl_a: () => { mmu.wb(cpu.hl, cpu.reg.a); cpu.hl = (cpu.hl - 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },
    LDD_a_hl: () => { cpu.reg.a = mmu.rb(cpu.hl); cpu.hl = (cpu.hl - 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },

    // 16-bit Loads
    LD_rr_nn: (rr: string) => { (cpu as any)[rr] = mmu.rw(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; },
    LD_nn_sp: () => { mmu.ww(mmu.rw(cpu.reg.pc), cpu.reg.sp); cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF; cpu.reg.m = 5; cpu.reg.t = 20; },
    LD_sp_hl: () => { cpu.reg.sp = cpu.hl; cpu.reg.m = 2; cpu.reg.t = 8; },
    LD_hl_sp_n: () => {
      const imm = mmu.rb(cpu.reg.pc);
      const n = imm > 127 ? imm - 256 : imm;
      cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;

      const sp = cpu.reg.sp;
      const result = (sp + n) & 0xFFFF;

      cpu.reg.f = 0;
      // H/C are computed from the low-byte add using the immediate's raw 8-bit value.
      if (((sp & 0xF) + (imm & 0xF)) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (((sp & 0xFF) + imm) > 0xFF) cpu.reg.f |= cpu.FLAGS.C;

      cpu.hl = result;
      cpu.reg.m = 3; cpu.reg.t = 12;
    },
    PUSH_rr: (rr: string) => {
      cpu.reg.sp = (cpu.reg.sp - 2) & 0xFFFF;
      mmu.ww(cpu.reg.sp, (cpu as any)[rr]);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    POP_rr: (rr: string) => {
      const val = mmu.rw(cpu.reg.sp);
      if (rr === 'af') cpu.af = val;
      else (cpu as any)[rr] = val;
      cpu.reg.sp = (cpu.reg.sp + 2) & 0xFFFF;
      cpu.reg.m = 3; cpu.reg.t = 12;
    },

    // 8-bit Arithmetic/Logic
    ADD_a_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF)) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    ADD_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF)) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    ADD_a_n: () => {
      let val = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF)) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    ADC_a_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF) + carry) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    ADC_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF) + carry) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    ADC_a_n: () => {
      let val = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 0xFF)) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0xF) + (val & 0xF) + carry) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SUB_a_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    SUB_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SUB_a_n: () => {
      let val = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SBC_a_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F) - carry) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    SBC_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F) - carry) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SBC_a_n: () => {
      let val = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F) - carry) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 0xFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    AND_a_r: (r: string) => {
      cpu.reg.a &= (cpu.reg as any)[r];
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    AND_a_hl: () => {
      cpu.reg.a &= mmu.rb(cpu.hl);
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    AND_a_n: () => {
      cpu.reg.a &= mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    XOR_a_r: (r: string) => {
      cpu.reg.a ^= (cpu.reg as any)[r];
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    XOR_a_hl: () => {
      cpu.reg.a ^= mmu.rb(cpu.hl);
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    XOR_a_n: () => {
      cpu.reg.a ^= mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    OR_a_r: (r: string) => {
      cpu.reg.a |= (cpu.reg as any)[r];
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    OR_a_hl: () => {
      cpu.reg.a |= mmu.rb(cpu.hl);
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    OR_a_n: () => {
      cpu.reg.a |= mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    CP_a_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    CP_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    CP_a_n: () => {
      let val = mmu.rb(cpu.reg.pc); cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if ((res & 0xFF) === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if (((cpu.reg.a & 0x0F) - (val & 0x0F)) < 0) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    INC_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = (val + 1) & 0xFF;
      cpu.reg.f &= cpu.FLAGS.C;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 0x0F) === 0x0F) cpu.reg.f |= cpu.FLAGS.H;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    INC_hlm: () => {
      let val = mmu.rb(cpu.hl);
      let res = (val + 1) & 0xFF;
      cpu.reg.f &= cpu.FLAGS.C;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 0x0F) === 0x0F) cpu.reg.f |= cpu.FLAGS.H;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 3; cpu.reg.t = 12;
    },
    DEC_r: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = (val - 1) & 0xFF;
      cpu.reg.f &= cpu.FLAGS.C;
      cpu.reg.f |= cpu.FLAGS.N;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 0x0F) === 0) cpu.reg.f |= cpu.FLAGS.H;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    DEC_hlm: () => {
      let val = mmu.rb(cpu.hl);
      let res = (val - 1) & 0xFF;
      cpu.reg.f &= cpu.FLAGS.C;
      cpu.reg.f |= cpu.FLAGS.N;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 0x0F) === 0) cpu.reg.f |= cpu.FLAGS.H;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 3; cpu.reg.t = 12;
    },

    // 16-bit Arithmetic
    ADD_hl_rr: (rr: string) => {
      let val = (cpu as any)[rr];
      let res = cpu.hl + val;
      cpu.reg.f &= cpu.FLAGS.Z; // Z is preserved
      if (((cpu.hl & 0xFFF) + (val & 0xFFF)) > 0xFFF) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 0xFFFF) cpu.reg.f |= cpu.FLAGS.C;
      cpu.hl = res & 0xFFFF;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    ADD_sp_n: () => {
      const imm = mmu.rb(cpu.reg.pc);
      const n = imm > 127 ? imm - 256 : imm;
      cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;

      const sp = cpu.reg.sp;
      const result = (sp + n) & 0xFFFF;

      cpu.reg.f = 0;
      if (((sp & 0xF) + (imm & 0xF)) > 0xF) cpu.reg.f |= cpu.FLAGS.H;
      if (((sp & 0xFF) + (imm & 0xFF)) > 0xFF) cpu.reg.f |= cpu.FLAGS.C;

      cpu.reg.sp = result;
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    INC_rr: (rr: string) => { (cpu as any)[rr] = ((cpu as any)[rr] + 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },
    DEC_rr: (rr: string) => { (cpu as any)[rr] = ((cpu as any)[rr] - 1) & 0xFFFF; cpu.reg.m = 2; cpu.reg.t = 8; },

    // Rotates and Shifts
    RLCA: () => {
      let carry = (cpu.reg.a & 0x80) ? 1 : 0;
      cpu.reg.a = ((cpu.reg.a << 1) | carry) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      // Z flag is always 0 for RLCA
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    RLA: () => {
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (cpu.reg.a & 0x80) ? 1 : 0;
      cpu.reg.a = ((cpu.reg.a << 1) | carry) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      // Z flag is always 0 for RLA
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    RRCA: () => {
      let carry = (cpu.reg.a & 0x01) ? 1 : 0;
      cpu.reg.a = ((cpu.reg.a >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      // Z flag is always 0 for RRCA
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    RRA: () => {
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (cpu.reg.a & 0x01) ? 1 : 0;
      cpu.reg.a = ((cpu.reg.a >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      // Z flag is always 0 for RRA
      cpu.reg.m = 1; cpu.reg.t = 4;
    },

    RLC: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (val & 0x80) ? 1 : 0;
      let res = ((val << 1) | carry) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    RLC_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (val & 0x80) ? 1 : 0;
      let res = ((val << 1) | carry) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    RL: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (val & 0x80) ? 1 : 0;
      let res = ((val << 1) | carry) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    RL_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (val & 0x80) ? 1 : 0;
      let res = ((val << 1) | carry) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    RRC: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    RRC_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    RR: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    RR_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (cpu.reg.f & cpu.FLAGS.C) ? 1 : 0;
      let newCarry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (carry << 7)) & 0xFF;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    SLA: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (val & 0x80) ? 1 : 0;
      let res = (val << 1) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SLA_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (val & 0x80) ? 1 : 0;
      let res = (val << 1) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    SRA: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (val & 0x80)) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SRA_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (val & 0x01) ? 1 : 0;
      let res = ((val >> 1) | (val & 0x80)) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    SRL: (r: string) => {
      let val = (cpu.reg as any)[r];
      let carry = (val & 0x01) ? 1 : 0;
      let res = (val >> 1) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SRL_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = (val & 0x01) ? 1 : 0;
      let res = (val >> 1) & 0xFF;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (res === 0) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },
    SWAP: (r: string) => {
      let val = (cpu.reg as any)[r];
      let res = ((val & 0xF) << 4) | (val >> 4);
      cpu.reg.f = (res === 0) ? cpu.FLAGS.Z : 0;
      (cpu.reg as any)[r] = res;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    SWAP_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = ((val & 0xF) << 4) | (val >> 4);
      cpu.reg.f = (res === 0) ? cpu.FLAGS.Z : 0;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4; cpu.reg.t = 16;
    },

    // Bit Ops
    BIT: (b: number, r: string) => {
      let val = (cpu.reg as any)[r];
      cpu.reg.f = (cpu.reg.f & cpu.FLAGS.C) | cpu.FLAGS.H;
      if (!((val >> b) & 1)) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2; cpu.reg.t = 8;
    },
    BIT_hl: (b: number) => {
      let val = mmu.rb(cpu.hl);
      cpu.reg.f = (cpu.reg.f & cpu.FLAGS.C) | cpu.FLAGS.H;
      if (!((val >> b) & 1)) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 3; cpu.reg.t = 12;
    },
    SET: (b: number, r: string) => { (cpu.reg as any)[r] |= (1 << b); cpu.reg.m = 2; cpu.reg.t = 8; },
    SET_hl: (b: number) => { mmu.wb(cpu.hl, mmu.rb(cpu.hl) | (1 << b)); cpu.reg.m = 4; cpu.reg.t = 16; },
    RES: (b: number, r: string) => { (cpu.reg as any)[r] &= ~(1 << b); cpu.reg.m = 2; cpu.reg.t = 8; },
    RES_hl: (b: number) => { mmu.wb(cpu.hl, mmu.rb(cpu.hl) & ~(1 << b)); cpu.reg.m = 4; cpu.reg.t = 16; },

    // Jumps and Calls
    JP_nn: () => { cpu.reg.pc = mmu.rw(cpu.reg.pc); cpu.reg.m = 4; cpu.reg.t = 16; },
    JP_cc_nn: (cc: () => any) => {
      if (cc()) { cpu.reg.pc = mmu.rw(cpu.reg.pc); cpu.reg.m = 4; cpu.reg.t = 16; }
      else { cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; }
    },
    JP_hl: () => { cpu.reg.pc = cpu.hl; cpu.reg.m = 1; cpu.reg.t = 4; },
    JR_n: () => {
      let n = mmu.rb(cpu.reg.pc); if (n > 127) n -= 256;
      cpu.reg.pc = (cpu.reg.pc + 1 + n) & 0xFFFF;
      cpu.reg.m = 3; cpu.reg.t = 12;
    },
    JR_cc_n: (cc: () => any) => {
      let n = mmu.rb(cpu.reg.pc); if (n > 127) n -= 256;
      cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      if (cc()) { cpu.reg.pc = (cpu.reg.pc + n) & 0xFFFF; cpu.reg.m = 3; cpu.reg.t = 12; }
      else { cpu.reg.m = 2; cpu.reg.t = 8; }
    },
    CALL_nn: () => {
      cpu.reg.sp = (cpu.reg.sp - 2) & 0xFFFF;
      mmu.ww(cpu.reg.sp, (cpu.reg.pc + 2) & 0xFFFF);
      cpu.reg.pc = mmu.rw(cpu.reg.pc);
      cpu.reg.m = 6; cpu.reg.t = 24;
    },
    CALL_cc_nn: (cc: () => any) => {
      if (cc()) {
        cpu.reg.sp = (cpu.reg.sp - 2) & 0xFFFF;
        mmu.ww(cpu.reg.sp, (cpu.reg.pc + 2) & 0xFFFF);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m = 6; cpu.reg.t = 24;
      } else {
        cpu.reg.pc = (cpu.reg.pc + 2) & 0xFFFF;
        cpu.reg.m = 3; cpu.reg.t = 12;
      }
    },
    RET: () => { cpu.reg.pc = mmu.rw(cpu.reg.sp); cpu.reg.sp = (cpu.reg.sp + 2) & 0xFFFF; cpu.reg.m = 4; cpu.reg.t = 16; },
    RET_cc: (cc: () => any) => {
      if (cc()) { cpu.reg.pc = mmu.rw(cpu.reg.sp); cpu.reg.sp = (cpu.reg.sp + 2) & 0xFFFF; cpu.reg.m = 5; cpu.reg.t = 20; }
      else { cpu.reg.m = 2; cpu.reg.t = 8; }
    },
    RETI: () => { cpu.reg.ime = 1; cpu.reg.pc = mmu.rw(cpu.reg.sp); cpu.reg.sp = (cpu.reg.sp + 2) & 0xFFFF; cpu.reg.m = 4; cpu.reg.t = 16; },
    RST: (n: number) => {
      cpu.reg.sp = (cpu.reg.sp - 2) & 0xFFFF;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = n;
      cpu.reg.m = 4; cpu.reg.t = 16;
    },

    // Misc
    DAA: () => {
      let a = cpu.reg.a;
      if (!(cpu.reg.f & cpu.FLAGS.N)) {
        if ((cpu.reg.f & cpu.FLAGS.H) || (a & 0x0F) > 9) a += 6;
        if ((cpu.reg.f & cpu.FLAGS.C) || a > 0x9F) {
          a += 0x60;
          cpu.reg.f |= cpu.FLAGS.C;
        }
      } else {
        if (cpu.reg.f & cpu.FLAGS.H) a = (a - 6) & 0xFF;
        if (cpu.reg.f & cpu.FLAGS.C) a -= 0x60;
      }

      cpu.reg.a = a & 0xFF;
      cpu.reg.f &= ~(cpu.FLAGS.Z | cpu.FLAGS.H);
      if (cpu.reg.a === 0) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CPL: () => { cpu.reg.a ^= 0xFF; cpu.reg.f |= (cpu.FLAGS.N | cpu.FLAGS.H); cpu.reg.m = 1; cpu.reg.t = 4; },
    SCF: () => { cpu.reg.f &= ~cpu.FLAGS.N; cpu.reg.f &= ~cpu.FLAGS.H; cpu.reg.f |= cpu.FLAGS.C; cpu.reg.m = 1; cpu.reg.t = 4; },
    CCF: () => { cpu.reg.f &= ~cpu.FLAGS.N; cpu.reg.f &= ~cpu.FLAGS.H; cpu.reg.f ^= cpu.FLAGS.C; cpu.reg.m = 1; cpu.reg.t = 4; },
    DI: () => { cpu.reg.ime = 0; cpu.reg.ime_cnt = 0; cpu.reg.m = 1; cpu.reg.t = 4; },
    EI: () => { cpu.reg.ime_cnt = 2; cpu.reg.m = 1; cpu.reg.t = 4; },
    HALT: () => {
      if (!cpu.reg.ime && ((mmu.inte & mmu.intf) & 0x1F)) {
        cpu.haltBug = 1;
      } else {
        cpu.halt = 1;
      }
      cpu.reg.m = 1; cpu.reg.t = 4;
    },
    STOP: () => {
      if (mmu.cgbPrepareSpeedSwitch) {
        mmu.cgbDoubleSpeed ^= 1;
        mmu.cgbPrepareSpeedSwitch = 0;
        cpu.stop = 0;
      } else {
        console.log('STOP at PC=' + (cpu.reg.pc - 1).toString(16));
        cpu.stop = 1;
      }
      cpu.reg.m = 1; cpu.reg.t = 4;
    },

    MAPcb: () => {
      let opcode = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = (cpu.reg.pc + 1) & 0xFFFF;
      if (cpu.cbmap[opcode]) {
        cpu.cbmap[opcode]();
      } else {
        cpu.ops.XX();
      }
    },
  },

  map: [] as (() => void)[],
  cbmap: [] as (() => void)[],
};

// Map Initialization
const cZ = () => (cpu.reg.f & cpu.FLAGS.Z);
const cNZ = () => !(cpu.reg.f & cpu.FLAGS.Z);
const cC = () => (cpu.reg.f & cpu.FLAGS.C);
const cNC = () => !(cpu.reg.f & cpu.FLAGS.C);

cpu.map = new Array(256).fill(cpu.ops.XX);
cpu.cbmap = new Array(256).fill(cpu.ops.XX);

// Populate map
const regs = ['b', 'c', 'd', 'e', 'h', 'l', 'hl', 'a'];
cpu.map[0x00] = cpu.ops.NOP;
cpu.map[0x10] = cpu.ops.STOP;
cpu.map[0x76] = cpu.ops.HALT;

// LD r,r
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    if (i === 6 && j === 6) continue; // HALT
    let r1 = regs[i];
    let r2 = regs[j];
    if (r1 === 'hl') {
        cpu.map[0x40 + i * 8 + j] = () => cpu.ops.LD_hl_r(r2);
    } else if (r2 === 'hl') {
        cpu.map[0x40 + i * 8 + j] = () => cpu.ops.LD_r_hl(r1);
    } else {
        cpu.map[0x40 + i * 8 + j] = () => cpu.ops.LD_r_r(r1, r2);
    }
  }
}
cpu.map[0x36] = cpu.ops.LD_hl_n;

// LD r,n
for (let i = 0; i < 8; i++) {
    let r = regs[i];
    if (r === 'hl') continue;
    cpu.map[0x06 + i * 8] = () => cpu.ops.LD_r_n(r);
}

// Arithmetic
for (let i = 0; i < 8; i++) {
    let r = regs[i];
    if (r === 'hl') {
        cpu.map[0x80 + i] = cpu.ops.ADD_a_hl;
        cpu.map[0x88 + i] = cpu.ops.ADC_a_hl;
        cpu.map[0x90 + i] = cpu.ops.SUB_a_hl;
        cpu.map[0x98 + i] = cpu.ops.SBC_a_hl;
        cpu.map[0xA0 + i] = cpu.ops.AND_a_hl;
        cpu.map[0xA8 + i] = cpu.ops.XOR_a_hl;
        cpu.map[0xB0 + i] = cpu.ops.OR_a_hl;
        cpu.map[0xB8 + i] = cpu.ops.CP_a_hl;
    } else {
        cpu.map[0x80 + i] = () => cpu.ops.ADD_a_r(r);
        cpu.map[0x88 + i] = () => cpu.ops.ADC_a_r(r);
        cpu.map[0x90 + i] = () => cpu.ops.SUB_a_r(r);
        cpu.map[0x98 + i] = () => cpu.ops.SBC_a_r(r);
        cpu.map[0xA0 + i] = () => cpu.ops.AND_a_r(r);
        cpu.map[0xA8 + i] = () => cpu.ops.XOR_a_r(r);
        cpu.map[0xB0 + i] = () => cpu.ops.OR_a_r(r);
        cpu.map[0xB8 + i] = () => cpu.ops.CP_a_r(r);
    }
}
cpu.map[0xC6] = cpu.ops.ADD_a_n;
cpu.map[0xCE] = cpu.ops.ADC_a_n;
cpu.map[0xD6] = cpu.ops.SUB_a_n;
cpu.map[0xDE] = cpu.ops.SBC_a_n;
cpu.map[0xE6] = cpu.ops.AND_a_n;
cpu.map[0xEE] = cpu.ops.XOR_a_n;
cpu.map[0xF6] = cpu.ops.OR_a_n;
cpu.map[0xFE] = cpu.ops.CP_a_n;

for (let i = 0; i < 8; i++) {
    let r = regs[i];
    if (r === 'hl') {
        cpu.map[0x34] = cpu.ops.INC_hlm;
        cpu.map[0x35] = cpu.ops.DEC_hlm;
    } else {
        cpu.map[0x04 + i * 8] = () => cpu.ops.INC_r(r);
        cpu.map[0x05 + i * 8] = () => cpu.ops.DEC_r(r);
    }
}

// 16-bit loads
cpu.map[0x01] = () => cpu.ops.LD_rr_nn('bc');
cpu.map[0x11] = () => cpu.ops.LD_rr_nn('de');
cpu.map[0x21] = () => cpu.ops.LD_rr_nn('hl');
cpu.map[0x31] = () => cpu.ops.LD_rr_nn('sp');
cpu.map[0x08] = cpu.ops.LD_nn_sp;
cpu.map[0xF9] = cpu.ops.LD_sp_hl;
cpu.map[0xF8] = cpu.ops.LD_hl_sp_n;

cpu.map[0xC5] = () => cpu.ops.PUSH_rr('bc');
cpu.map[0xD5] = () => cpu.ops.PUSH_rr('de');
cpu.map[0xE5] = () => cpu.ops.PUSH_rr('hl');
cpu.map[0xF5] = () => cpu.ops.PUSH_rr('af');
cpu.map[0xC1] = () => cpu.ops.POP_rr('bc');
cpu.map[0xD1] = () => cpu.ops.POP_rr('de');
cpu.map[0xE1] = () => cpu.ops.POP_rr('hl');
cpu.map[0xF1] = () => cpu.ops.POP_rr('af');

// 16-bit arithmetic
cpu.map[0x09] = () => cpu.ops.ADD_hl_rr('bc');
cpu.map[0x19] = () => cpu.ops.ADD_hl_rr('de');
cpu.map[0x29] = () => cpu.ops.ADD_hl_rr('hl');
cpu.map[0x39] = () => cpu.ops.ADD_hl_rr('sp');
cpu.map[0xE8] = cpu.ops.ADD_sp_n;
cpu.map[0x03] = () => cpu.ops.INC_rr('bc');
cpu.map[0x13] = () => cpu.ops.INC_rr('de');
cpu.map[0x23] = () => cpu.ops.INC_rr('hl');
cpu.map[0x33] = () => cpu.ops.INC_rr('sp');
cpu.map[0x0B] = () => cpu.ops.DEC_rr('bc');
cpu.map[0x1B] = () => cpu.ops.DEC_rr('de');
cpu.map[0x2B] = () => cpu.ops.DEC_rr('hl');
cpu.map[0x3B] = () => cpu.ops.DEC_rr('sp');

// Special Loads
cpu.map[0x0A] = cpu.ops.LD_a_bc;
cpu.map[0x1A] = cpu.ops.LD_a_de;
cpu.map[0xFA] = cpu.ops.LD_a_nn;
cpu.map[0x02] = cpu.ops.LD_bc_a;
cpu.map[0x12] = cpu.ops.LD_de_a;
cpu.map[0xEA] = cpu.ops.LD_nn_a;
cpu.map[0xF2] = cpu.ops.LD_a_ff00c;
cpu.map[0xE2] = cpu.ops.LD_ff00c_a;
cpu.map[0xF0] = cpu.ops.LD_a_ff00n;
cpu.map[0xE0] = cpu.ops.LD_ff00n_a;
cpu.map[0x22] = cpu.ops.LDI_hl_a;
cpu.map[0x2A] = cpu.ops.LDI_a_hl;
cpu.map[0x32] = cpu.ops.LDD_hl_a;
cpu.map[0x3A] = cpu.ops.LDD_a_hl;

// Rotates
cpu.map[0x07] = cpu.ops.RLCA;
cpu.map[0x17] = cpu.ops.RLA;
cpu.map[0x0F] = cpu.ops.RRCA;
cpu.map[0x1F] = cpu.ops.RRA;

// Jumps
cpu.map[0xC3] = cpu.ops.JP_nn;
cpu.map[0xC2] = () => cpu.ops.JP_cc_nn(cNZ);
cpu.map[0xCA] = () => cpu.ops.JP_cc_nn(cZ);
cpu.map[0xD2] = () => cpu.ops.JP_cc_nn(cNC);
cpu.map[0xDA] = () => cpu.ops.JP_cc_nn(cC);
cpu.map[0xE9] = cpu.ops.JP_hl;
cpu.map[0x18] = cpu.ops.JR_n;
cpu.map[0x20] = () => cpu.ops.JR_cc_n(cNZ);
cpu.map[0x28] = () => cpu.ops.JR_cc_n(cZ);
cpu.map[0x30] = () => cpu.ops.JR_cc_n(cNC);
cpu.map[0x38] = () => cpu.ops.JR_cc_n(cC);

// Calls
cpu.map[0xCD] = cpu.ops.CALL_nn;
cpu.map[0xC4] = () => cpu.ops.CALL_cc_nn(cNZ);
cpu.map[0xCC] = () => cpu.ops.CALL_cc_nn(cZ);
cpu.map[0xD4] = () => cpu.ops.CALL_cc_nn(cNC);
cpu.map[0xDC] = () => cpu.ops.CALL_cc_nn(cC);

// Returns
cpu.map[0xC9] = cpu.ops.RET;
cpu.map[0xC0] = () => cpu.ops.RET_cc(cNZ);
cpu.map[0xC8] = () => cpu.ops.RET_cc(cZ);
cpu.map[0xD0] = () => cpu.ops.RET_cc(cNC);
cpu.map[0xD8] = () => cpu.ops.RET_cc(cC);
cpu.map[0xD9] = cpu.ops.RETI;

// RST
for (let i = 0; i < 8; i++) cpu.map[0xC7 + i * 8] = () => cpu.ops.RST(i * 8);

// CB
cpu.map[0xCB] = cpu.ops.MAPcb;

// Misc
cpu.map[0x27] = cpu.ops.DAA;
cpu.map[0x2F] = cpu.ops.CPL;
cpu.map[0x37] = cpu.ops.SCF;
cpu.map[0x3F] = cpu.ops.CCF;
cpu.map[0xF3] = cpu.ops.DI;
cpu.map[0xFB] = cpu.ops.EI;

// CB MAP
for (let i = 0; i < 8; i++) {
    let r = regs[i];
    if (r === 'hl') {
        cpu.cbmap[0x00 + i] = cpu.ops.RLC_hl;
        cpu.cbmap[0x08 + i] = cpu.ops.RRC_hl;
        cpu.cbmap[0x10 + i] = cpu.ops.RL_hl;
        cpu.cbmap[0x18 + i] = cpu.ops.RR_hl;
        cpu.cbmap[0x20 + i] = cpu.ops.SLA_hl;
        cpu.cbmap[0x28 + i] = cpu.ops.SRA_hl;
        cpu.cbmap[0x30 + i] = cpu.ops.SWAP_hl;
        cpu.cbmap[0x38 + i] = cpu.ops.SRL_hl;
    } else {
        cpu.cbmap[0x00 + i] = () => cpu.ops.RLC(r);
        cpu.cbmap[0x08 + i] = () => cpu.ops.RRC(r);
        cpu.cbmap[0x10 + i] = () => cpu.ops.RL(r);
        cpu.cbmap[0x18 + i] = () => cpu.ops.RR(r);
        cpu.cbmap[0x20 + i] = () => cpu.ops.SLA(r);
        cpu.cbmap[0x28 + i] = () => cpu.ops.SRA(r);
        cpu.cbmap[0x30 + i] = () => cpu.ops.SWAP(r);
        cpu.cbmap[0x38 + i] = () => cpu.ops.SRL(r);
    }
}

for (let b = 0; b < 8; b++) {
    for (let i = 0; i < 8; i++) {
        let r = regs[i];
        if (r === 'hl') {
            cpu.cbmap[0x40 + b * 8 + i] = () => cpu.ops.BIT_hl(b);
            cpu.cbmap[0x80 + b * 8 + i] = () => cpu.ops.RES_hl(b);
            cpu.cbmap[0xC0 + b * 8 + i] = () => cpu.ops.SET_hl(b);
        } else {
            cpu.cbmap[0x40 + b * 8 + i] = () => cpu.ops.BIT(b, r);
            cpu.cbmap[0x80 + b * 8 + i] = () => cpu.ops.RES(b, r);
            cpu.cbmap[0xC0 + b * 8 + i] = () => cpu.ops.SET(b, r);
        }
    }
}

