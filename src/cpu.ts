import { mmu } from "./mmu";

const cpu = {
  // Internal State
  clock: {
    m: 0,
    t: 0,
  },

  registers: {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    h: 0,
    l: 0,
    f: 0,
    sp: 0,
    pc: 0,
    m: 0,
    t: 0,
    ime: 0,
  },
  halt: 0,
  stop: 0,

  reset: () => {
    cpu.registers.a = 0;
    cpu.registers.b = 0;

    cpu.registers.c = 0;
    cpu.registers.d = 0;
    cpu.registers.e = 0;
    cpu.registers.h = 0;
    cpu.registers.l = 0;
    cpu.registers.f = 0;
    cpu.registers.sp = 0;
    cpu.registers.pc = 0;
    cpu.registers.m = 0;
    cpu.registers.t = 0;
  },

  addEToA: () => {
    cpu.registers.a += cpu.registers.e;
    cpu.registers.f = 0;
    if (!(cpu.registers.a & 255)) {
      cpu.registers.f |= 0x80;
    }
    if (cpu.registers.a > 255) {
      cpu.registers.f |= 0x10;
    }

    cpu.registers.a &= 255;
    cpu.registers.m = 1;
    cpu.registers.t = 4;
  },

  compareBToA: () => {
    let i = cpu.registers.a;
    i -= cpu.registers.b;
    cpu.registers.f |= 0x40;

    if (!(i & 255)) {
      cpu.registers.f |= 0x80;
    }

    if (i < 0) {
      cpu.registers.f |= 0x10;
    }

    cpu.registers.m = 1;
    cpu.registers.t = 4;
  },

  pushBC: () => {
    cpu.registers.sp--;
  },

  NOP: () => {
    cpu.registers.m = 1;
    cpu.registers.t = 4;
  },

  ops: {
    // Load opcode
    LOADrr_b_b: () => {
      cpu.registers.b = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_c: () => {
      cpu.registers.b = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_d: () => {
      cpu.registers.b = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_e: () => {
      cpu.registers.b = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_h: () => {
      cpu.registers.b = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_l: () => {
      cpu.registers.b = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_b_a: () => {
      cpu.registers.b = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_b: () => {
      cpu.registers.c = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_c: () => {
      cpu.registers.c = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_d: () => {
      cpu.registers.c = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_e: () => {
      cpu.registers.c = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_h: () => {
      cpu.registers.c = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_l: () => {
      cpu.registers.c = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_c_a: () => {
      cpu.registers.c = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_b: () => {
      cpu.registers.d = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_c: () => {
      cpu.registers.d = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_d: () => {
      cpu.registers.d = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_e: () => {
      cpu.registers.d = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_h: () => {
      cpu.registers.d = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_l: () => {
      cpu.registers.d = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_d_a: () => {
      cpu.registers.d = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_b: () => {
      cpu.registers.e = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_c: () => {
      cpu.registers.e = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_d: () => {
      cpu.registers.e = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_e: () => {
      cpu.registers.e = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_h: () => {
      cpu.registers.e = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_l: () => {
      cpu.registers.e = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_e_a: () => {
      cpu.registers.e = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_b: () => {
      cpu.registers.h = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_c: () => {
      cpu.registers.h = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_d: () => {
      cpu.registers.h = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_e: () => {
      cpu.registers.h = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_h: () => {
      cpu.registers.h = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_l: () => {
      cpu.registers.h = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_h_a: () => {
      cpu.registers.h = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_b: () => {
      cpu.registers.l = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_lc: () => {
      cpu.registers.l = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_d: () => {
      cpu.registers.l = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_e: () => {
      cpu.registers.l = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_h: () => {
      cpu.registers.l = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_l: () => {
      cpu.registers.l = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_l_a: () => {
      cpu.registers.l = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_b: () => {
      cpu.registers.a = cpu.registers.b;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_c: () => {
      cpu.registers.a = cpu.registers.c;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_d: () => {
      cpu.registers.a = cpu.registers.d;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_e: () => {
      cpu.registers.a = cpu.registers.e;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_h: () => {
      cpu.registers.a = cpu.registers.h;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_l: () => {
      cpu.registers.a = cpu.registers.l;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },
    LOADrr_a_a: () => {
      cpu.registers.a = cpu.registers.a;
      cpu.registers.m = 1;
      cpu.registers.t = 4;
    },

    LOADrm_b_hl: () => {
      cpu.registers.b = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_c_hl: () => {
      cpu.registers.c = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_d_hl: () => {
      cpu.registers.d = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_e_hl: () => {
      cpu.registers.e = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_h_hl: () => {
      cpu.registers.h = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_l_hl: () => {
      cpu.registers.l = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADrm_a_hl: () => {
      cpu.registers.a = mmu.rb((cpu.registers.h << 8) + cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_b: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.b);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_c: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.c);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_d: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.d);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_e: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.e);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_h: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.h);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_l: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.l);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
    LOADmr_hl_a: () => {
      mmu.wb((cpu.registers.h << 8) + cpu.registers.l, cpu.registers.a);
      cpu.registers.m = 2;
      cpu.registers.t = 8;
    },
  },
};
