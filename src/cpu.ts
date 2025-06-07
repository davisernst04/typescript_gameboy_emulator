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

  NOP: () => {
    cpu.registers.m = 1;
    cpu.registers.t = 4;
  },
};
