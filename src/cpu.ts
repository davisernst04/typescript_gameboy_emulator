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
    LD_b_b: () => {
      cpu.reg.b = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_c: () => {
      cpu.reg.b = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_d: () => {
      cpu.reg.b = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_e: () => {
      cpu.reg.b = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_h: () => {
      cpu.reg.b = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_l: () => {
      cpu.reg.b = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_b_a: () => {
      cpu.reg.b = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_b: () => {
      cpu.reg.c = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_c: () => {
      cpu.reg.c = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_d: () => {
      cpu.reg.c = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_e: () => {
      cpu.reg.c = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_h: () => {
      cpu.reg.c = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_l: () => {
      cpu.reg.c = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_c_a: () => {
      cpu.reg.c = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_b: () => {
      cpu.reg.d = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_c: () => {
      cpu.reg.d = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_d: () => {
      cpu.reg.d = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_e: () => {
      cpu.reg.d = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_h: () => {
      cpu.reg.d = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_l: () => {
      cpu.reg.d = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_d_a: () => {
      cpu.reg.d = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_b: () => {
      cpu.reg.e = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_c: () => {
      cpu.reg.e = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_d: () => {
      cpu.reg.e = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_e: () => {
      cpu.reg.e = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_h: () => {
      cpu.reg.e = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_l: () => {
      cpu.reg.e = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_e_a: () => {
      cpu.reg.e = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_b: () => {
      cpu.reg.h = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_c: () => {
      cpu.reg.h = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_d: () => {
      cpu.reg.h = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_e: () => {
      cpu.reg.h = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_h: () => {
      cpu.reg.h = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_l: () => {
      cpu.reg.h = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_h_a: () => {
      cpu.reg.h = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_b: () => {
      cpu.reg.l = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_lc: () => {
      cpu.reg.l = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_d: () => {
      cpu.reg.l = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_e: () => {
      cpu.reg.l = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_h: () => {
      cpu.reg.l = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_l: () => {
      cpu.reg.l = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_l_a: () => {
      cpu.reg.l = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_b: () => {
      cpu.reg.a = cpu.reg.b;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_c: () => {
      cpu.reg.a = cpu.reg.c;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_d: () => {
      cpu.reg.a = cpu.reg.d;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_e: () => {
      cpu.reg.a = cpu.reg.e;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_h: () => {
      cpu.reg.a = cpu.reg.h;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_l: () => {
      cpu.reg.a = cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_a_a: () => {
      cpu.reg.a = cpu.reg.a;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    LD_b_hl: () => {
      cpu.reg.b = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_c_hl: () => {
      cpu.reg.c = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_d_hl: () => {
      cpu.reg.d = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_e_hl: () => {
      cpu.reg.e = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_h_hl: () => {
      cpu.reg.h = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_l_hl: () => {
      cpu.reg.l = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_hl: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_b: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.b);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_c: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_d: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.d);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_e: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.e);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_h: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.h);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_l: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.l);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_b_n: () => {
      cpu.reg.b = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_c_n: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_d_n: () => {
      cpu.reg.d = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_e_n: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_h_n: () => {
      cpu.reg.h = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_l_n: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_n: () => {
      cpu.reg.a = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_n: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LD_bc_a: () => {
      mmu.wb((cpu.reg.b << 8) + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_de_a: () => {
      mmu.wb((cpu.reg.d << 8) + cpu.reg.e, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD__nn_a: () => {
      mmu.wb(mmu.rw(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LD_a_bc: () => {
      cpu.reg.a = mmu.rb((cpu.reg.b << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_a_de: () => {
      cpu.reg.a = mmu.rb((cpu.reg.d << 8) + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_a_nn: () => {
      cpu.reg.a = mmu.rb(mmu.rw(cpu.reg.pc));
      cpu.reg.pc += 2;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    LD_bc_nn: () => {
      cpu.reg.c = mmu.rb(cpu.reg.pc);
      cpu.reg.b = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LD_de_nn: () => {
      cpu.reg.e = mmu.rb(cpu.reg.pc);
      cpu.reg.d = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LD_hl_nn: () => {
      cpu.reg.l = mmu.rb(cpu.reg.pc);
      cpu.reg.h = mmu.rb(cpu.reg.pc + 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LD_sp_nn: () => {
      cpu.reg.sp = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.m = 3;
      cpu.reg.t = 3;
    },

    LD_hl_mnn: () => {
      let i = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      cpu.reg.l = mmu.rb(i);
      cpu.reg.h = mmu.rb(i + 1);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },

    LD_mnn_hl: () => {
      let i = mmu.rw(cpu.reg.pc);
      cpu.reg.pc += 2;
      mmu.ww(i, (cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },
    LD_hl_inc_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.l = (cpu.reg.l + 1) & 255;
      if (!cpu.reg.l) {
        cpu.reg.h = (cpu.reg.h + 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_a_hl_inc: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = (cpu.reg.l + 1) & 255;

      if (!cpu.reg.l) {
        cpu.reg.h = (cpu.reg.h + 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_dec_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.l = (cpu.reg.l - 1) & 255;
      if (cpu.reg.l == 255) {
        cpu.reg.h = (cpu.reg.h - 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_a_hl_dec: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = (cpu.reg.l - 1) & 255;

      if (cpu.reg.l == 255) {
        cpu.reg.h = (cpu.reg.h - 1) & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_a_IO_n: () => {
      cpu.reg.a = mmu.rb(0xff00 + mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_IO_n_a: () => {
      mmu.wb(0xff00 + mmu.rb(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    LD_a_IO_c: () => {
      cpu.reg.a = mmu.rb(0xff00 + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_IO_c_a: () => {
      mmu.wb(0xff00 + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    LD_hl_sp_n: () => {
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
    SWAP_b: () => {
      let tr = cpu.reg.b;
      cpu.reg.b = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.b ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_c: () => {
      let tr = cpu.reg.c;
      cpu.reg.c = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.c ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_d: () => {
      let tr = cpu.reg.d;
      cpu.reg.d = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.d ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_e: () => {
      let tr = cpu.reg.e;
      cpu.reg.e = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.e ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SWAP_h: () => {
      let tr = cpu.reg.h;
      cpu.reg.h = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.h ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_l: () => {
      let tr = cpu.reg.l;
      cpu.reg.l = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.l ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_a: () => {
      let tr = cpu.reg.a;
      cpu.reg.a = ((tr & 0xf) << 4) | ((tr & 0xf0) >> 4);
      cpu.reg.f = cpu.reg.a ? 0 : 0x80;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    // Data processing next
    ADD_a_b: () => {
      cpu.reg.a += cpu.reg.b;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    ADD_a_c: () => {
      cpu.reg.a += cpu.reg.c;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_d: () => {
      cpu.reg.a += cpu.reg.d;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_e: () => {
      cpu.reg.a += cpu.reg.e;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_h: () => {
      cpu.reg.a += cpu.reg.h;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_l: () => {
      cpu.reg.a += cpu.reg.l;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_a: () => {
      cpu.reg.a += cpu.reg.a;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    ADD_a_hl: () => {
      cpu.reg.a += mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    ADD_a_n: () => {
      cpu.reg.a += mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    ADD_hl_bc: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.b << 8) + cpu.reg.c;

      if (hl > 65535) {
        cpu.reg.f |= 0x10;
      } else {
        cpu.reg.f &= 0xef;
      }

      cpu.reg.h = (hl >> 8) & 255;
      cpu.reg.l = hl & 255;

      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    ADD_hl_de: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.d << 8) + cpu.reg.e;

      if (hl > 65535) {
        cpu.reg.f |= 0x10;
      } else {
        cpu.reg.f &= 0xef;
      }

      cpu.reg.h = (hl >> 8) & 255;
      cpu.reg.l = hl & 255;

      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    ADD_hl_hl: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.h << 8) + cpu.reg.l;

      if (hl > 65535) {
        cpu.reg.f |= 0x10;
      } else {
        cpu.reg.f &= 0xef;
      }

      cpu.reg.h = (hl >> 8) & 255;
      cpu.reg.l = hl & 255;

      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    ADD_hl_sp: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += cpu.reg.sp;

      if (hl > 65535) {
        cpu.reg.f |= 0x10;
      } else {
        cpu.reg.f &= 0xef;
      }
      cpu.reg.h = (hl >> 8) & 255;
      cpu.reg.l = hl & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    ADD_sp_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i -= 256;
      }
      cpu.reg.pc++;
      cpu.reg.sp += i;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },

    ADC_a_b: () => {
      cpu.reg.a += cpu.reg.b;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    ADC_a_c: () => {
      cpu.reg.a += cpu.reg.c;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_d: () => {
      cpu.reg.a += cpu.reg.d;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_e: () => {
      cpu.reg.a += cpu.reg.e;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_h: () => {
      cpu.reg.a += cpu.reg.h;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_l: () => {
      cpu.reg.a += cpu.reg.l;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_a: () => {
      cpu.reg.a += cpu.reg.a;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    ADC_a_hl: () => {
      cpu.reg.a += mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    ADC_a_n: () => {
      cpu.reg.a += mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a += cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);

      if (cpu.reg.a > 255) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    SUB_a_b: () => {
      cpu.reg.a -= cpu.reg.b;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SUB_a_c: () => {
      cpu.reg.a -= cpu.reg.c;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SUB_a_d: () => {
      cpu.reg.a -= cpu.reg.d;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SUB_a_e: () => {
      cpu.reg.a -= cpu.reg.e;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SUB_a_h: () => {
      cpu.reg.a -= cpu.reg.h;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_l: () => {
      cpu.reg.a -= cpu.reg.l;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_a: () => {
      cpu.reg.a -= cpu.reg.a;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SUB_a_hl: () => {
      cpu.reg.a -= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    SUB_a_n: () => {
      cpu.reg.a -= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    SBC_a_b: () => {
      cpu.reg.a -= cpu.reg.b;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_c: () => {
      cpu.reg.a -= cpu.reg.c;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SBC_a_d: () => {
      cpu.reg.a -= cpu.reg.d;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_e: () => {
      cpu.reg.a -= cpu.reg.e;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_h: () => {
      cpu.reg.a -= cpu.reg.h;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_l: () => {
      cpu.reg.a -= cpu.reg.l;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_a: () => {
      cpu.reg.a -= cpu.reg.a;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    SBC_a_hl: () => {
      cpu.reg.a -= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;

      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    SBC_a_n: () => {
      cpu.reg.a -= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a -= cpu.reg.f & 0x10 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);

      if (cpu.reg.a < 0) {
        cpu.reg.f |= 0x10;
      }

      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    CP_a_b: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.b;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    CP_a_c: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.c;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    CP_a_d: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.d;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CP_a_e: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.e;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CP_a_h: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.h;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CP_a_l: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.l;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CP_a_a: () => {
      let i = cpu.reg.a;
      i -= cpu.reg.a;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    CP_a_hl: () => {
      let i = cpu.reg.a;
      i -= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    
    CP_a_n: () => {
      let i = cpu.reg.a;
      i -= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.ops.fz(i, 1);
      if (i < 0) {
        cpu.reg.f |= 0x10;
      }

      i &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },

    AND_a_b: () => {
      cpu.reg.a &= cpu.reg.b;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_c: () => {
      cpu.reg.a &= cpu.reg.c;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_d: () => {
      cpu.reg.a &= cpu.reg.d;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_e: () => {
      cpu.reg.a &= cpu.reg.e;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_h: () => {
      cpu.reg.a &= cpu.reg.h;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_l: () => {
      cpu.reg.a &= cpu.reg.l;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_a: () => {
      cpu.reg.a &= cpu.reg.a;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_hl: () => {
      cpu.reg.a &= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    AND_a_n: () => {
      cpu.reg.a &= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    
    OR_a_b: () => {
      cpu.reg.a |= cpu.reg.b;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    OR_a_c: () => {
      cpu.reg.a |= cpu.reg.c;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    OR_a_d: () => {
      cpu.reg.a |= cpu.reg.d;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    OR_a_e: () => {
      cpu.reg.a |= cpu.reg.e;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    OR_a_h: () => {
      cpu.reg.a |= cpu.reg.h;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    OR_a_l: () => {
      cpu.reg.a |= cpu.reg.l;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    OR_a_a: () => {
      cpu.reg.a |= cpu.reg.a;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    OR_a_hl: () => {
      cpu.reg.a |= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    OR_a_n: () => {
      cpu.reg.a |= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    
    XOR_a_b: () => {
      cpu.reg.a ^= cpu.reg.b;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    XOR_a_c: () => {
      cpu.reg.a ^= cpu.reg.c;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    XOR_a_d: () => {
      cpu.reg.a ^= cpu.reg.d;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    XOR_a_e: () => {
      cpu.reg.a ^= cpu.reg.e;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    XOR_a_h: () => {
      cpu.reg.a ^= cpu.reg.h;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    XOR_a_l: () => {
      cpu.reg.a ^= cpu.reg.l;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    XOR_a_a: () => {
      cpu.reg.a ^= cpu.reg.a;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    XOR_a_hl: () => {
      cpu.reg.a ^= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    XOR_a_n: () => {
      cpu.reg.a ^= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },


    INC_b: () => {
      cpu.reg.b++;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    INC_c: () => {
      cpu.reg.c++;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    INC_d: () => {
      cpu.reg.d++;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    INC_e: () => {
      cpu.reg.e++;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    INC_h: () => {
      cpu.reg.h++;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    INC_l: () => {
      cpu.reg.l++;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    INC_a: () => {
      cpu.reg.a++; 
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    INC_hlm: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l) + 1;
      i &= 255;
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.ops.fz(i);

      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    
    DEC_b: () => {
      cpu.reg.b--;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_c: () => {
      cpu.reg.c--;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    DEC_d: () => {
      cpu.reg.d--;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    DEC_e: () => {
      cpu.reg.e--;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_h: () => {
      cpu.reg.h--;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_l: () => {
      cpu.reg.l--;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_a: () => {
      cpu.reg.a--;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    DEC_hlm: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l) - 1;
      i &= 255;
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.ops.fz(i);

      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },

    INC_bc: () => {
      cpu.reg.c = (cpu.reg.c + 1) & 255;
      
      if (!cpu.reg.c) {
        cpu.reg.b = (cpu.reg.b + 1) & 255;
      }

      cpu.reg.m = 1;
    },
    
    INC_de: () => {
      cpu.reg.e = (cpu.reg.e + 1) & 255;
      
      if (!cpu.reg.e) {
        cpu.reg.d = (cpu.reg.d + 1) & 255;
      }

      cpu.reg.m = 1;
    },
    
    INC_hl: () => {
      cpu.reg.l = (cpu.reg.l + 1) & 255;
      
      if (!cpu.reg.e) {
        cpu.reg.h = (cpu.reg.h + 1) & 255;
      }

      cpu.reg.m = 1;
    },

    INC_sp: () => {
      cpu.reg.sp = (cpu.reg.sp + 1) & 65535;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    
    DEC_bc: () => {
      cpu.reg.c = (cpu.reg.c - 1) & 255;
      
      if (!cpu.reg.c) {
        cpu.reg.b = (cpu.reg.b - 1) & 255;
      }

      cpu.reg.m = 1;
    },
    
    DEC_de: () => {
      cpu.reg.e = (cpu.reg.e - 1) & 255;
      
      if (!cpu.reg.e) {
        cpu.reg.d = (cpu.reg.d - 1) & 255;
      }

      cpu.reg.m = 1;
    },
    
    DEC_hl: () => {
      cpu.reg.l = (cpu.reg.l - 1) & 255;
      
      if (!cpu.reg.e) {
        cpu.reg.h = (cpu.reg.h - 1) & 255;
      }

      cpu.reg.m = 1;
    },

    DEC_sp: () => {
      cpu.reg.sp = (cpu.reg.sp - 1) & 65535;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },

    // Bit Manipulation 

    BIT0_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x01);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT0_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x01);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT1_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x02);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT1_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x02);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT2_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x03);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT2_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x03);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT3_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x04);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT3_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x04);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT4_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x05);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT4_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x05);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT5_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x06);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT5_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x06);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT6_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x07);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT6_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x07);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 
    
    BIT7_b: () => {
      cpu.ops.fz(cpu.reg.b & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_c: () => {
      cpu.ops.fz(cpu.reg.c & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_d: () => {
      cpu.ops.fz(cpu.reg.d & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_e: () => {
      cpu.ops.fz(cpu.reg.e & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_h: () => {
      cpu.ops.fz(cpu.reg.h & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_l: () => {
      cpu.ops.fz(cpu.reg.l & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_a: () => {
      cpu.ops.fz(cpu.reg.a & 0x08);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    }, 
    BIT7_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 0x08);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    }, 

    // Helper Functions
    fz: (i: number, as: number = 0) => {
      cpu.reg.f = 0;
      if (!(i & 255)) {
        cpu.reg.f |= 0x80;
      }
      cpu.reg.f |= as ? 0x40 : 0;
    },

    MAPcb: () => {
      let i = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.pc &= 65535;

      // FINISH LATER
    },

    XX: () => {
      let opc = cpu.reg.pc - 1;
      alert("Instruction at " + opc.toString(16) + ", ending execution.");
      cpu.stop = 1;
    },
  },

  map: [],
  cbmap: [],
};

cpu.map = [];
