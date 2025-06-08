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
    LDb_b: () => {
      cpu.reg.b = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_c: () => {
      cpu.reg.b = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_d: () => {
      cpu.reg.b = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_e: () => {
      cpu.reg.b = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_h: () => {
      cpu.reg.b = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_l: () => {
      cpu.reg.b = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDb_a: () => {
      cpu.reg.b = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_b: () => {
      cpu.reg.c = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_c: () => {
      cpu.reg.c = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_d: () => {
      cpu.reg.c = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_e: () => {
      cpu.reg.c = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_h: () => {
      cpu.reg.c = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_l: () => {
      cpu.reg.c = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDc_a: () => {
      cpu.reg.c = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_b: () => {
      cpu.reg.d = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_c: () => {
      cpu.reg.d = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_d: () => {
      cpu.reg.d = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_e: () => {
      cpu.reg.d = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_h: () => {
      cpu.reg.d = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_l: () => {
      cpu.reg.d = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDd_a: () => {
      cpu.reg.d = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_b: () => {
      cpu.reg.e = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_c: () => {
      cpu.reg.e = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_d: () => {
      cpu.reg.e = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_e: () => {
      cpu.reg.e = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_h: () => {
      cpu.reg.e = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_l: () => {
      cpu.reg.e = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDe_a: () => {
      cpu.reg.e = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_b: () => {
      cpu.reg.h = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_c: () => {
      cpu.reg.h = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_d: () => {
      cpu.reg.h = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_e: () => {
      cpu.reg.h = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_h: () => {
      cpu.reg.h = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_l: () => {
      cpu.reg.h = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDh_a: () => {
      cpu.reg.h = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_b: () => {
      cpu.reg.l = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDlc: () => {
      cpu.reg.l = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_d: () => {
      cpu.reg.l = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_e: () => {
      cpu.reg.l = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_h: () => {
      cpu.reg.l = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_l: () => {
      cpu.reg.l = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDl_a: () => {
      cpu.reg.l = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_b: () => {
      cpu.reg.a = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_c: () => {
      cpu.reg.a = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_d: () => {
      cpu.reg.a = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_e: () => {
      cpu.reg.a = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_h: () => {
      cpu.reg.a = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_l: () => {
      cpu.reg.a = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LDa_a: () => {
      cpu.reg.a = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    LDb_hl: () => {
      cpu.reg.b = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDc_hl: () => {
      cpu.reg.c = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDd_hl: () => {
      cpu.reg.d = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDe_hl: () => {
      cpu.reg.e = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDh_hl: () => {
      cpu.reg.h = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDl_hl: () => {
      cpu.reg.l = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDa_hl: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_b: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.b);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_c: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_d: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.d);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_e: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.e);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_h: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.h);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_l: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LDb_n: () => {
      cpu.reg.b = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LDc_n: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDd_n: () => {
      cpu.reg.d = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDe_n: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDh_n: () => {
      cpu.reg.h = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDl_n: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDa_n: () => {
      cpu.reg.a = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDhl_n: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LDbc_a: () => {
      mmu.wb((cpu.reg.b << 8) + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LDde_a: () => {
      mmu.wb((cpu.reg.d << 8) + cpu.reg.e, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_nn_a: () => {
      mmu.wb(mmu.rw(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LDa_bc: () => {
      cpu.reg.a = mmu.rb((cpu.reg.b << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LDa_de: () => {
      cpu.reg.a = mmu.rb((cpu.reg.d << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LDa_nn: () => {
      cpu.reg.a = mmu.rb(mmu.rw(cpu.reg.pc));
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LDbc_nn: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.b = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LDde_nn: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.d = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LDhl_nn: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.h = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LDsp_nn: () => {
      cpu.reg.sp = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.m = 3;
      cpu.reg.t = 3;
    },

    LDhl_mnn: () => {
      let i = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.l = mmu.rb(i);
      cpu.reg.h = mmu.rb(i + 1);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },

    LDmnn_hl: () => {
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
