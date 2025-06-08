import { mmu } from "./mmu";

const cpu = {
  // Internal State
  clock: {
    m: 0,
    t: 0,
  },

  reg: {
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
    cpu.reg.a = 0;
    cpu.reg.b = 0;

    cpu.reg.c = 0;
    cpu.reg.d = 0;
    cpu.reg.e = 0;
    cpu.reg.h = 0;
    cpu.reg.l = 0;
    cpu.reg.f = 0;
    cpu.reg.sp = 0;
    cpu.reg.pc = 0;
    cpu.reg.m = 0;
    cpu.reg.t = 0;
  },

  addEToA: () => {
    cpu.reg.a += cpu.reg.e;
    cpu.reg.f = 0;
    if (!(cpu.reg.a & 255)) {
      cpu.reg.f |= 0x80;
    }
    if (cpu.reg.a > 255) {
      cpu.reg.f |= 0x10;
    }

    cpu.reg.a &= 255;
    cpu.reg.m = 1;
    cpu.reg.t = 4;
  },

  compareBToA: () => {
    let i = cpu.reg.a;
    i -= cpu.reg.b;
    cpu.reg.f |= 0x40;

    if (!(i & 255)) {
      cpu.reg.f |= 0x80;
    }

    if (i < 0) {
      cpu.reg.f |= 0x10;
    }

    cpu.reg.m = 1;
    cpu.reg.t = 4;
  },

  pushBC: () => {
    cpu.reg.sp--;
  },

  NOP: () => {
    cpu.reg.m = 1;
    cpu.reg.t = 4;
  },

  ops: {
    // Load opcode
    LOADrr_b_b: () => {
      cpu.reg.b = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_c: () => {
      cpu.reg.b = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_d: () => {
      cpu.reg.b = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_e: () => {
      cpu.reg.b = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_h: () => {
      cpu.reg.b = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_l: () => {
      cpu.reg.b = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_b_a: () => {
      cpu.reg.b = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_b: () => {
      cpu.reg.c = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_c: () => {
      cpu.reg.c = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_d: () => {
      cpu.reg.c = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_e: () => {
      cpu.reg.c = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_h: () => {
      cpu.reg.c = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_l: () => {
      cpu.reg.c = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_c_a: () => {
      cpu.reg.c = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_b: () => {
      cpu.reg.d = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_c: () => {
      cpu.reg.d = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_d: () => {
      cpu.reg.d = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_e: () => {
      cpu.reg.d = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_h: () => {
      cpu.reg.d = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_l: () => {
      cpu.reg.d = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_d_a: () => {
      cpu.reg.d = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_b: () => {
      cpu.reg.e = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_c: () => {
      cpu.reg.e = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_d: () => {
      cpu.reg.e = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_e: () => {
      cpu.reg.e = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_h: () => {
      cpu.reg.e = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_l: () => {
      cpu.reg.e = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_e_a: () => {
      cpu.reg.e = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_b: () => {
      cpu.reg.h = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_c: () => {
      cpu.reg.h = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_d: () => {
      cpu.reg.h = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_e: () => {
      cpu.reg.h = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_h: () => {
      cpu.reg.h = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_l: () => {
      cpu.reg.h = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_h_a: () => {
      cpu.reg.h = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_b: () => {
      cpu.reg.l = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_lc: () => {
      cpu.reg.l = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_d: () => {
      cpu.reg.l = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_e: () => {
      cpu.reg.l = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_h: () => {
      cpu.reg.l = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_l: () => {
      cpu.reg.l = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_l_a: () => {
      cpu.reg.l = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_b: () => {
      cpu.reg.a = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_c: () => {
      cpu.reg.a = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_d: () => {
      cpu.reg.a = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_e: () => {
      cpu.reg.a = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_h: () => {
      cpu.reg.a = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_l: () => {
      cpu.reg.a = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LOADrr_a_a: () => {
      cpu.reg.a = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    LOADrm_b_hl: () => {
      cpu.reg.b = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_c_hl: () => {
      cpu.reg.c = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_d_hl: () => {
      cpu.reg.d = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_e_hl: () => {
      cpu.reg.e = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_h_hl: () => {
      cpu.reg.h = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_l_hl: () => {
      cpu.reg.l = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrm_a_hl: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_b: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.b);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_c: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_d: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.d);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_e: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.e);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_h: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.h);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_l: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmr_hl_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrn_b: () => {
      cpu.reg.b = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrn_c: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrn_d: () => {
      cpu.reg.d = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrn_e: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrn_h: () => {
      cpu.reg.h = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrn_l: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADrn_a: () => {
      cpu.reg.a = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmn_hl: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LOADmr_bc_a: () => {
      mmu.wb((cpu.reg.b << 8) + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADmr_de_a: () => {
      mmu.wb((cpu.reg.d << 8) + cpu.reg.e, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmmr_a: () => {
      mmu.wb(mmu.rw(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LOADrm_a_bc: () => {
      cpu.reg.a = mmu.rb((cpu.reg.b << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrm_a_de: () => {
      cpu.reg.a = mmu.rb((cpu.reg.d << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrmm_a: () => {
      cpu.reg.a = mmu.rb(mmu.rw(cpu.reg.pc));
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LOADrnrn_bc: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.b = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LOADrnrn_de: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.d = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LOADrnrn_hl: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.h = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LOADrm_sp: () => {
      cpu.reg.sp = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.m = 3;
      cpu.reg.t = 3;
    },

    LOADmm_m_hl: () => {
      let i = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.l = mmu.rb(i);
      cpu.reg.h = mmu.rb(i + 1);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },

    LOADm_mm_hl: () => {
      let i = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      mmu.ww(i, (cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },
    LOADmir_hl_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.l = (cpu.reg.l + 1) & 255;
      if (!cpu.reg.l) {
        cpu.reg.h = (cpu.reg.h + 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrmi_a_hl: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = (cpu.reg.l + 1) & 255;

      if (!cpu.reg.l) {
        cpu.reg.h = (cpu.reg.h + 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADmdr_hl_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.l = (cpu.reg.l - 1) & 255;
      if (cpu.reg.l == 255) {
        cpu.reg.h = (cpu.reg.h - 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrmd_a_hl: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = (cpu.reg.l - 1) & 255;

      if (cpu.reg.l == 255) {
        cpu.reg.h = (cpu.reg.h - 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrmn_a_IO: () => {
      cpu.reg.a = mmu.rb(0xff00 + mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LOADmnr_IO_a: () => {
      mmu.wb(0xff00 + mmu.rb(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LOADrnr_a_IO_c: () => {
      cpu.reg.a = mmu.rb(0xff00 + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LOADnrr_IO_c_a: () => {
      mmu.wb(0xff00 + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LOADrspn_hl_sp: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -((i + 1) & 255);
      }
      cpu.reg.pc++;
      i += cpu.reg.sp;
      cpu.reg.h = (i >> 8) & 255;
      cpu.reg.l = i & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
  },
};
