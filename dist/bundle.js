// src/log.ts
var log = {
  start: 0,
  reset: () => {
    const date = /* @__PURE__ */ new Date();
    log.start = date.getTime();
  },
  out: (module, message) => {
    const date = /* @__PURE__ */ new Date();
    console.log(`[${(date.getTime() - log.start) / 1e3}] ${module}: ${message}`);
  }
};

// src/gpu.ts
var gpu = {
  vram: new Uint8Array(8192),
  oam: new Uint8Array(160),
  reg: new Uint8Array(64),
  tilemap: [],
  objdata: [],
  objdatasorted: [],
  canvas: {},
  screen: {},
  palette: {
    bg: new Uint8Array(4),
    obj0: new Uint8Array(4),
    obj1: new Uint8Array(4)
  },
  scanrow: new Uint8Array(160),
  curline: 0,
  curscan: 0,
  linemode: 0,
  modeclocks: 0,
  yscrl: 0,
  xscrl: 0,
  raster: 0,
  ints: 0,
  lcdon: 0,
  bgon: 0,
  objon: 0,
  winon: 0,
  objsize: 0,
  bgtilebase: 0,
  bgmapbase: 6144,
  wintilebase: 6144,
  reset: () => {
    gpu.vram.fill(0);
    gpu.oam.fill(0);
    gpu.reg.fill(0);
    for (let i = 0; i < 4; i++) {
      gpu.palette.bg[i] = 255;
      gpu.palette.obj0[i] = 255;
      gpu.palette.obj1[i] = 255;
    }
    for (let i = 0; i < 512; i++) {
      gpu.tilemap[i] = [];
      for (let j = 0; j < 8; j++) {
        gpu.tilemap[i][j] = [];
        for (let k = 0; k < 8; k++) {
          gpu.tilemap[i][j][k] = 0;
        }
      }
    }
    log.out("GPU", "Initializing screen");
    let c = document.getElementById("screen");
    if (c && c.getContext) {
      gpu.canvas = c.getContext("2d");
      if (!gpu.canvas) {
        throw new Error("GPU: Canvas context cannot be created");
      } else {
        if (gpu.canvas.createImageData) {
          gpu.screen = gpu.canvas.createImageData(160, 144);
        } else if (gpu.canvas.getImageData) {
          gpu.screen = gpu.canvas.getImageData(0, 0, 160, 144);
        } else {
          gpu.screen = { width: 160, height: 144, data: new Uint8ClampedArray(160 * 144 * 4) };
        }
        for (let i = 0; i < gpu.screen.data.length; i++) {
          gpu.screen.data[i] = 255;
        }
        gpu.canvas.putImageData(gpu.screen, 0, 0);
      }
    }
    gpu.curline = 0;
    gpu.curscan = 0;
    gpu.linemode = 2;
    gpu.modeclocks = 0;
    gpu.yscrl = 0;
    gpu.xscrl = 0;
    gpu.raster = 0;
    gpu.ints = 0;
    gpu.lcdon = 0;
    gpu.bgon = 0;
    gpu.objon = 0;
    gpu.winon = 0;
    gpu.objsize = 0;
    gpu.scanrow.fill(0);
    for (let i = 0; i < 40; i++) {
      gpu.objdata[i] = { "y": -16, "x": -8, "tile": 0, "palette": 0, "yflip": 0, "xflip": 0, "prio": 0, "num": i };
    }
    gpu.bgtilebase = 0;
    gpu.bgmapbase = 6144;
    gpu.wintilebase = 6144;
    log.out("GPU", "GPU reset");
  },
  checkline: () => {
    gpu.modeclocks += cpu.reg.m;
    switch (gpu.linemode) {
      case 0:
        if (gpu.modeclocks >= 51) {
          gpu.modeclocks = 0;
          gpu.curline++;
          gpu.curscan += 640;
          if (gpu.curline === 144) {
            gpu.linemode = 1;
            gpu.canvas.putImageData(gpu.screen, 0, 0);
            mmu.intf |= 1;
          } else {
            gpu.linemode = 2;
          }
        }
        break;
      case 1:
        if (gpu.modeclocks >= 114) {
          gpu.modeclocks = 0;
          gpu.curline++;
          if (gpu.curline > 153) {
            gpu.curline = 0;
            gpu.curscan = 0;
            gpu.linemode = 2;
          }
        }
        break;
      // OAM-read mode
      case 2:
        if (gpu.modeclocks >= 20) {
          gpu.modeclocks = 0;
          gpu.linemode = 3;
        }
        break;
      // Render scanline
      case 3:
        if (gpu.modeclocks >= 43) {
          gpu.modeclocks = 0;
          gpu.linemode = 0;
          if (gpu.lcdon) {
            if (gpu.bgon) {
              let linebase = gpu.curscan;
              let mapbase = gpu.bgmapbase + ((gpu.curline + gpu.yscrl & 255) >> 3 << 5);
              let y = gpu.curline + gpu.yscrl & 7;
              let x = gpu.xscrl & 7;
              let t = gpu.xscrl >> 3 & 31;
              let w = 160;
              if (gpu.bgtilebase) {
                let tile = gpu.vram[mapbase + t];
                if (tile < 128) tile += 256;
                let tilerow = gpu.tilemap[tile][y];
                do {
                  gpu.scanrow[160 - x] = tilerow[x];
                  let color = gpu.palette.bg[tilerow[x]];
                  gpu.screen.data[linebase] = color;
                  gpu.screen.data[linebase + 1] = color;
                  gpu.screen.data[linebase + 2] = color;
                  gpu.screen.data[linebase + 3] = 255;
                  x++;
                  if (x === 8) {
                    x = 0;
                    t = t + 1 & 31;
                    tile = gpu.vram[mapbase + t];
                    if (tile < 128) tile += 256;
                    tilerow = gpu.tilemap[tile][y];
                  }
                  linebase += 4;
                } while (--w);
              } else {
                let tile = gpu.vram[mapbase + t];
                let tilerow = gpu.tilemap[tile][y];
                do {
                  gpu.scanrow[160 - x] = tilerow[x];
                  let color = gpu.palette.bg[tilerow[x]];
                  gpu.screen.data[linebase] = color;
                  gpu.screen.data[linebase + 1] = color;
                  gpu.screen.data[linebase + 2] = color;
                  gpu.screen.data[linebase + 3] = 255;
                  x++;
                  if (x === 8) {
                    x = 0;
                    t = t + 1 & 31;
                    tile = gpu.vram[mapbase + t];
                    tilerow = gpu.tilemap[tile][y];
                  }
                  linebase += 4;
                } while (--w);
              }
            }
            if (gpu.objon) {
              let cnt = 0;
              if (gpu.objsize) {
                for (let i = 0; i < 40; i++) {
                }
              } else {
                let tilerow;
                let obj;
                let pal;
                let x;
                let linebase = gpu.curscan;
                for (let i = 0; i < 40; i++) {
                  obj = gpu.objdatasorted[i];
                  if (obj.y <= gpu.curline && obj.y + 8 > gpu.curline) {
                    if (obj.yflip) {
                      tilerow = gpu.tilemap[obj.tile][7 - (gpu.curline - obj.y)];
                    } else {
                      tilerow = gpu.tilemap[obj.tile][gpu.curline - obj.y];
                    }
                    if (obj.palette) {
                      pal = gpu.palette.obj1;
                    } else {
                      pal = gpu.palette.obj0;
                    }
                    linebase = (gpu.curline * 160 + obj.x) * 4;
                    if (obj.xflip) {
                      for (x = 0; x < 8; x++) {
                        if (obj.x + x >= 0 && obj.x + x < 160) {
                          if (tilerow[7 - x] && (obj.prio === 0 || !gpu.scanrow[x])) {
                            let color = pal[tilerow[7 - x]];
                            gpu.screen.data[linebase] = color;
                            gpu.screen.data[linebase + 1] = color;
                            gpu.screen.data[linebase + 2] = color;
                            gpu.screen.data[linebase + 3] = 255;
                          }
                        }
                        linebase += 4;
                      }
                    } else {
                      for (x = 0; x < 8; x++) {
                        if (obj.x + x >= 0 && obj.x + x < 160) {
                          if (tilerow[x] && (obj.prio === 0 || !gpu.scanrow[x])) {
                            let color = pal[tilerow[x]];
                            gpu.screen.data[linebase] = color;
                            gpu.screen.data[linebase + 1] = color;
                            gpu.screen.data[linebase + 2] = color;
                            gpu.screen.data[linebase + 3] = 255;
                          }
                        }
                        linebase += 4;
                      }
                    }
                    cnt++;
                    if (cnt > 10) {
                      break;
                    }
                  }
                }
              }
            }
          }
          break;
        }
    }
  },
  updatetile: (addr, _val) => {
    let saddr = addr & 8191;
    if (saddr & 1) {
      saddr--;
    }
    let tile = saddr >> 4 & 511;
    let y = saddr >> 1 & 7;
    let sx;
    for (let x = 0; x < 8; x++) {
      sx = 1 << 7 - x;
      gpu.tilemap[tile][y][x] = (gpu.vram[saddr] & sx ? 1 : 0) | (gpu.vram[saddr + 1] & sx ? 2 : 0);
    }
  },
  updateoam: (addr, val) => {
    addr -= 65024;
    let obj = addr >> 2;
    if (obj < 40) {
      switch (addr & 3) {
        case 0:
          gpu.objdata[obj].y = val - 16;
          break;
        case 1:
          gpu.objdata[obj].x = val - 8;
          break;
        case 2:
          if (gpu.objsize) {
            gpu.objdata[obj].tile = val & 254;
          } else {
            gpu.objdata[obj].tile = val;
          }
          break;
        case 3:
          gpu.objdata[obj].palette = val & 16 ? 1 : 0;
          gpu.objdata[obj].yflip = val & 32 ? 1 : 0;
          gpu.objdata[obj].xflip = val & 64 ? 1 : 0;
          gpu.objdata[obj].prio = val & 128 ? 1 : 0;
          break;
      }
    }
    gpu.objdatasorted = gpu.objdata;
    gpu.objdatasorted.sort((a, b) => {
      if (a.x > b.x) {
        return -1;
      }
      if (a.x < b.x) {
        return 1;
      }
      return 0;
    });
  },
  rb: (addr) => {
    let gaddr = addr - 65344;
    switch (gaddr) {
      case 0:
        return (gpu.lcdon ? 128 : 0) | (gpu.bgtilebase == 0 ? 16 : 0) | (gpu.bgmapbase == 7168 ? 8 : 0) | (gpu.objsize ? 4 : 0) | (gpu.objon ? 2 : 0) | (gpu.bgon ? 1 : 0);
      case 1:
        return (gpu.curline == gpu.raster ? 4 : 0) | gpu.linemode;
      case 2:
        return gpu.yscrl;
      case 3:
        return gpu.xscrl;
      case 4:
        return gpu.curline;
      case 5:
        return gpu.raster;
      default:
        return gpu.reg[gaddr];
    }
  },
  wb: (addr, val) => {
    let gaddr = addr - 65344;
    gpu.reg[gaddr] = val;
    switch (gaddr) {
      case 0:
        gpu.lcdon = val & 128 ? 1 : 0;
        gpu.bgtilebase = val & 16 ? 0 : 2048;
        gpu.bgmapbase = val & 8 ? 7168 : 6144;
        gpu.objsize = val & 4 ? 1 : 0;
        gpu.objon = val & 2 ? 1 : 0;
        gpu.bgon = val & 1 ? 1 : 0;
        break;
      case 2:
        gpu.yscrl = val;
        break;
      case 3:
        gpu.xscrl = val;
        break;
      case 5:
        gpu.raster = val;
        break;
      case 6:
        let v;
        for (let i = 0; i < 160; i++) {
          v = mmu.rb((val << 8) + i);
          gpu.oam[i] = v;
          gpu.updateoam(65024 + i, v);
        }
        break;
      case 7:
        for (let i = 0; i < 4; i++) {
          switch (val >> i * 2 & 3) {
            case 0:
              gpu.palette.bg[i] = 255;
              break;
            case 1:
              gpu.palette.bg[i] = 192;
              break;
            case 2:
              gpu.palette.bg[i] = 96;
              break;
            case 3:
              gpu.palette.bg[i] = 0;
              break;
          }
        }
        break;
      case 8:
        for (let i = 0; i < 4; i++) {
          switch (val >> i * 2 & 3) {
            case 0:
              gpu.palette.obj0[i] = 255;
              break;
            case 1:
              gpu.palette.obj0[i] = 192;
              break;
            case 2:
              gpu.palette.obj0[i] = 96;
              break;
            case 3:
              gpu.palette.obj0[i] = 0;
              break;
          }
        }
        break;
      case 9:
        for (let i = 0; i < 4; i++) {
          switch (val >> i * 2 & 3) {
            case 0:
              gpu.palette.obj1[i] = 255;
              break;
            case 1:
              gpu.palette.obj1[i] = 192;
              break;
            case 2:
              gpu.palette.obj1[i] = 96;
              break;
            case 3:
              gpu.palette.obj1[i] = 0;
              break;
          }
        }
        break;
    }
  }
};

// src/mmu.ts
var mmu = {
  bios: new Uint8Array([
    49,
    254,
    255,
    175,
    33,
    255,
    159,
    50,
    203,
    124,
    32,
    251,
    33,
    38,
    255,
    14,
    17,
    62,
    128,
    50,
    226,
    12,
    62,
    243,
    226,
    50,
    62,
    119,
    119,
    62,
    252,
    224,
    71,
    17,
    4,
    1,
    33,
    16,
    128,
    26,
    205,
    149,
    0,
    205,
    150,
    0,
    19,
    123,
    254,
    52,
    32,
    243,
    17,
    216,
    0,
    6,
    8,
    26,
    19,
    34,
    35,
    5,
    32,
    249,
    62,
    25,
    234,
    16,
    153,
    33,
    47,
    153,
    14,
    12,
    61,
    40,
    8,
    50,
    13,
    32,
    249,
    46,
    15,
    24,
    243,
    103,
    62,
    100,
    87,
    224,
    66,
    62,
    145,
    224,
    64,
    4,
    30,
    2,
    14,
    12,
    240,
    68,
    254,
    144,
    32,
    250,
    13,
    32,
    247,
    29,
    32,
    242,
    14,
    19,
    36,
    124,
    30,
    131,
    254,
    98,
    40,
    6,
    30,
    193,
    254,
    100,
    32,
    6,
    123,
    226,
    12,
    62,
    135,
    242,
    240,
    66,
    144,
    224,
    66,
    21,
    32,
    210,
    5,
    32,
    79,
    22,
    32,
    24,
    203,
    79,
    6,
    4,
    197,
    203,
    17,
    23,
    193,
    203,
    17,
    23,
    5,
    32,
    245,
    34,
    35,
    34,
    35,
    201,
    206,
    237,
    102,
    102,
    204,
    13,
    0,
    11,
    3,
    115,
    0,
    131,
    0,
    12,
    0,
    13,
    0,
    8,
    17,
    31,
    136,
    137,
    0,
    14,
    220,
    204,
    110,
    230,
    221,
    221,
    217,
    153,
    187,
    187,
    103,
    99,
    110,
    14,
    236,
    204,
    221,
    220,
    153,
    159,
    187,
    185,
    51,
    62,
    60,
    66,
    185,
    165,
    185,
    165,
    66,
    76,
    33,
    4,
    1,
    17,
    168,
    0,
    26,
    19,
    190,
    32,
    254,
    35,
    125,
    254,
    52,
    32,
    245,
    6,
    25,
    120,
    134,
    35,
    5,
    32,
    251,
    134,
    32,
    254,
    62,
    1,
    224,
    80
  ]),
  rom: new Uint8Array(0),
  eram: new Uint8Array(8192),
  wram: new Uint8Array(8192),
  zram: new Uint8Array(128),
  inbios: 1,
  inte: 0,
  intf: 0,
  reset: () => {
    mmu.eram.fill(0);
    mmu.wram.fill(0);
    mmu.zram.fill(0);
    mmu.inbios = 1;
    mmu.inte = 0;
    mmu.intf = 0;
  },
  load: async (rom) => {
    if (typeof rom === "string") {
      const bytes = new Uint8Array(rom.length);
      for (let i = 0; i < rom.length; i++) bytes[i] = rom.charCodeAt(i);
      mmu.rom = bytes;
    } else {
      mmu.rom = rom;
    }
  },
  rb: (addr) => {
    switch (addr & 61440) {
      // BIOS / ROM0
      case 0:
        if (mmu.inbios && addr < 256) return mmu.bios[addr];
        return mmu.rom[addr] || 0;
      case 4096:
      case 8192:
      case 12288:
        return mmu.rom[addr] || 0;
      // ROM1
      case 16384:
      case 20480:
      case 24576:
      case 28672:
        return mmu.rom[addr] || 0;
      // VRAM
      case 32768:
      case 36864:
        return gpu.vram[addr & 8191];
      // ERAM
      case 40960:
      case 45056:
        return mmu.eram[addr & 8191];
      // WRAM
      case 49152:
      case 53248:
        return mmu.wram[addr & 8191];
      case 57344:
        return mmu.wram[addr & 8191];
      // F000 range
      case 61440:
        if (addr >= 65024 && addr <= 65183) {
          return gpu.oam[addr & 255];
        } else if (addr >= 65280 && addr <= 65407) {
          if (addr >= 65344 && addr <= 65359) return gpu.rb(addr);
          if (addr === 65295) return mmu.intf;
          return 255;
        } else if (addr >= 65408 && addr <= 65534) {
          return mmu.zram[addr & 127];
        } else if (addr === 65535) {
          return mmu.inte;
        }
    }
    return 255;
  },
  rw: (addr) => {
    return mmu.rb(addr) | mmu.rb(addr + 1) << 8;
  },
  wb: (addr, val) => {
    switch (addr & 61440) {
      // VRAM
      case 32768:
      case 36864:
        gpu.vram[addr & 8191] = val;
        gpu.updatetile(addr, val);
        break;
      // ERAM
      case 40960:
      case 45056:
        mmu.eram[addr & 8191] = val;
        break;
      // WRAM
      case 49152:
      case 53248:
        mmu.wram[addr & 8191] = val;
        break;
      case 57344:
        mmu.wram[addr & 8191] = val;
        break;
      // F000 range
      case 61440:
        if (addr >= 65024 && addr <= 65183) {
          gpu.oam[addr & 255] = val;
          gpu.updateoam(addr, val);
        } else if (addr >= 65280 && addr <= 65407) {
          if (addr >= 65344 && addr <= 65359) gpu.wb(addr, val);
          else if (addr === 65295) mmu.intf = val;
          else if (addr === 65360 && val === 1) mmu.inbios = 0;
        } else if (addr >= 65408 && addr <= 65534) {
          mmu.zram[addr & 127] = val;
        } else if (addr === 65535) {
          mmu.inte = val;
        }
        break;
    }
    return val;
  },
  ww: (addr, val) => {
    mmu.wb(addr, val & 255);
    mmu.wb(addr + 1, val >> 8 & 255);
    return val;
  }
};

// src/cpu.ts
var cpu = {
  // Internal State
  clock: {
    m: 0,
    t: 0
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
    ime: 0
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
    cpu.reg.ime = 1;
    cpu.halt = 0;
    cpu.stop = 0;
    cpu.clock.m = 0;
    cpu.clock.t = 0;
  },
  step: () => {
    if (cpu.stop) return;
    if (cpu.halt) {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    } else {
      let opcode = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      if (cpu.map[opcode]) {
        cpu.map[opcode]();
      } else {
        cpu.ops.XX();
      }
    }
    cpu.clock.m += cpu.reg.m;
    cpu.clock.t += cpu.reg.t;
    gpu.checkline();
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
    LD_l_c: () => {
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
    LD_nn_a: () => {
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
      cpu.reg.l = cpu.reg.l + 1 & 255;
      if (!cpu.reg.l) {
        cpu.reg.h = cpu.reg.h + 1 & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_hl_inc: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = cpu.reg.l + 1 & 255;
      if (!cpu.reg.l) {
        cpu.reg.h = cpu.reg.h + 1 & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_dec_a: () => {
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, cpu.reg.a);
      cpu.reg.l = cpu.reg.l - 1 & 255;
      if (cpu.reg.l == 255) {
        cpu.reg.h = cpu.reg.h - 1 & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_hl_dec: () => {
      cpu.reg.a = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.l = cpu.reg.l - 1 & 255;
      if (cpu.reg.l == 255) {
        cpu.reg.h = cpu.reg.h - 1 & 255;
      }
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_IO_n: () => {
      cpu.reg.a = mmu.rb(65280 + mmu.rb(cpu.reg.pc));
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_IO_n_a: () => {
      mmu.wb(65280 + mmu.rb(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_a_IO_c: () => {
      cpu.reg.a = mmu.rb(65280 + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_IO_c_a: () => {
      mmu.wb(65280 + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_sp_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(i + 1 & 255);
      }
      cpu.reg.pc++;
      i += cpu.reg.sp;
      cpu.reg.h = i >> 8 & 255;
      cpu.reg.l = i & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_nn_sp: () => {
      cpu.reg.pc += 2;
      mmu.ww(mmu.rw(cpu.reg.pc), cpu.reg.sp);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },
    SWAP_b: () => {
      let tr = cpu.reg.b;
      cpu.reg.b = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.b ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_c: () => {
      let tr = cpu.reg.c;
      cpu.reg.c = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.c ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_d: () => {
      let tr = cpu.reg.d;
      cpu.reg.d = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.d ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_e: () => {
      let tr = cpu.reg.e;
      cpu.reg.e = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.e ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_h: () => {
      let tr = cpu.reg.h;
      cpu.reg.h = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.h ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_l: () => {
      let tr = cpu.reg.l;
      cpu.reg.l = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.l ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SWAP_a: () => {
      let tr = cpu.reg.a;
      cpu.reg.a = (tr & 15) << 4 | (tr & 240) >> 4;
      cpu.reg.f = cpu.reg.a ? 0 : 128;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    // Data processing next
    ADD_a_b: () => {
      cpu.reg.a += cpu.reg.b;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_c: () => {
      cpu.reg.a += cpu.reg.c;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_d: () => {
      cpu.reg.a += cpu.reg.d;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_e: () => {
      cpu.reg.a += cpu.reg.e;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_h: () => {
      cpu.reg.a += cpu.reg.h;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_l: () => {
      cpu.reg.a += cpu.reg.l;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_a: () => {
      cpu.reg.a += cpu.reg.a;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_hl: () => {
      cpu.reg.a += mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADD_hl_bc: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.b << 8) + cpu.reg.c;
      if (hl > 65535) {
        cpu.reg.f |= 16;
      } else {
        cpu.reg.f &= 239;
      }
      cpu.reg.h = hl >> 8 & 255;
      cpu.reg.l = hl & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    ADD_hl_de: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.d << 8) + cpu.reg.e;
      if (hl > 65535) {
        cpu.reg.f |= 16;
      } else {
        cpu.reg.f &= 239;
      }
      cpu.reg.h = hl >> 8 & 255;
      cpu.reg.l = hl & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    ADD_hl_hl: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += (cpu.reg.h << 8) + cpu.reg.l;
      if (hl > 65535) {
        cpu.reg.f |= 16;
      } else {
        cpu.reg.f &= 239;
      }
      cpu.reg.h = hl >> 8 & 255;
      cpu.reg.l = hl & 255;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    ADD_hl_sp: () => {
      let hl = (cpu.reg.h << 8) + cpu.reg.l;
      hl += cpu.reg.sp;
      if (hl > 65535) {
        cpu.reg.f |= 16;
      } else {
        cpu.reg.f &= 239;
      }
      cpu.reg.h = hl >> 8 & 255;
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
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_c: () => {
      cpu.reg.a += cpu.reg.c;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_d: () => {
      cpu.reg.a += cpu.reg.d;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_e: () => {
      cpu.reg.a += cpu.reg.e;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_h: () => {
      cpu.reg.a += cpu.reg.h;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_l: () => {
      cpu.reg.a += cpu.reg.l;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_a: () => {
      cpu.reg.a += cpu.reg.a;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_hl: () => {
      cpu.reg.a += mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADC_a_n: () => {
      cpu.reg.a += mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a += cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a);
      if (cpu.reg.a > 255) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SUB_a_b: () => {
      cpu.reg.a -= cpu.reg.b;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_c: () => {
      cpu.reg.a -= cpu.reg.c;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_d: () => {
      cpu.reg.a -= cpu.reg.d;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_e: () => {
      cpu.reg.a -= cpu.reg.e;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_h: () => {
      cpu.reg.a -= cpu.reg.h;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_l: () => {
      cpu.reg.a -= cpu.reg.l;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_a: () => {
      cpu.reg.a -= cpu.reg.a;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_hl: () => {
      cpu.reg.a -= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SBC_a_b: () => {
      cpu.reg.a -= cpu.reg.b;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_c: () => {
      cpu.reg.a -= cpu.reg.c;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_d: () => {
      cpu.reg.a -= cpu.reg.d;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_e: () => {
      cpu.reg.a -= cpu.reg.e;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_h: () => {
      cpu.reg.a -= cpu.reg.h;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_l: () => {
      cpu.reg.a -= cpu.reg.l;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_a: () => {
      cpu.reg.a -= cpu.reg.a;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_hl: () => {
      cpu.reg.a -= mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
      }
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SBC_a_n: () => {
      cpu.reg.a -= mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.a -= cpu.reg.f & 16 ? 1 : 0;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) {
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
        cpu.reg.f |= 16;
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
      cpu.reg.c = cpu.reg.c + 1 & 255;
      if (!cpu.reg.c) {
        cpu.reg.b = cpu.reg.b + 1 & 255;
      }
      cpu.reg.m = 1;
    },
    INC_de: () => {
      cpu.reg.e = cpu.reg.e + 1 & 255;
      if (!cpu.reg.e) {
        cpu.reg.d = cpu.reg.d + 1 & 255;
      }
      cpu.reg.m = 1;
    },
    INC_hl: () => {
      cpu.reg.l = cpu.reg.l + 1 & 255;
      if (!cpu.reg.e) {
        cpu.reg.h = cpu.reg.h + 1 & 255;
      }
      cpu.reg.m = 1;
    },
    INC_sp: () => {
      cpu.reg.sp = cpu.reg.sp + 1 & 65535;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_bc: () => {
      cpu.reg.c = cpu.reg.c - 1 & 255;
      if (!cpu.reg.c) {
        cpu.reg.b = cpu.reg.b - 1 & 255;
      }
      cpu.reg.m = 1;
    },
    DEC_de: () => {
      cpu.reg.e = cpu.reg.e - 1 & 255;
      if (!cpu.reg.e) {
        cpu.reg.d = cpu.reg.d - 1 & 255;
      }
      cpu.reg.m = 1;
    },
    DEC_hl: () => {
      cpu.reg.l = cpu.reg.l - 1 & 255;
      if (!cpu.reg.e) {
        cpu.reg.h = cpu.reg.h - 1 & 255;
      }
      cpu.reg.m = 1;
    },
    DEC_sp: () => {
      cpu.reg.sp = cpu.reg.sp - 1 & 65535;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    // Bit Manipulation 
    BIT0_b: () => {
      cpu.ops.fz(cpu.reg.b & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_c: () => {
      cpu.ops.fz(cpu.reg.c & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_d: () => {
      cpu.ops.fz(cpu.reg.d & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_e: () => {
      cpu.ops.fz(cpu.reg.e & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_h: () => {
      cpu.ops.fz(cpu.reg.h & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_l: () => {
      cpu.ops.fz(cpu.reg.l & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_a: () => {
      cpu.ops.fz(cpu.reg.a & 1);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT0_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 1);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT1_b: () => {
      cpu.ops.fz(cpu.reg.b & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_c: () => {
      cpu.ops.fz(cpu.reg.c & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_d: () => {
      cpu.ops.fz(cpu.reg.d & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_e: () => {
      cpu.ops.fz(cpu.reg.e & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_h: () => {
      cpu.ops.fz(cpu.reg.h & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_l: () => {
      cpu.ops.fz(cpu.reg.l & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_a: () => {
      cpu.ops.fz(cpu.reg.a & 2);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT1_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 2);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT2_b: () => {
      cpu.ops.fz(cpu.reg.b & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_c: () => {
      cpu.ops.fz(cpu.reg.c & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_d: () => {
      cpu.ops.fz(cpu.reg.d & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_e: () => {
      cpu.ops.fz(cpu.reg.e & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_h: () => {
      cpu.ops.fz(cpu.reg.h & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_l: () => {
      cpu.ops.fz(cpu.reg.l & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_a: () => {
      cpu.ops.fz(cpu.reg.a & 3);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT2_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 3);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT3_b: () => {
      cpu.ops.fz(cpu.reg.b & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_c: () => {
      cpu.ops.fz(cpu.reg.c & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_d: () => {
      cpu.ops.fz(cpu.reg.d & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_e: () => {
      cpu.ops.fz(cpu.reg.e & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_h: () => {
      cpu.ops.fz(cpu.reg.h & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_l: () => {
      cpu.ops.fz(cpu.reg.l & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_a: () => {
      cpu.ops.fz(cpu.reg.a & 4);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT3_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 4);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT4_b: () => {
      cpu.ops.fz(cpu.reg.b & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_c: () => {
      cpu.ops.fz(cpu.reg.c & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_d: () => {
      cpu.ops.fz(cpu.reg.d & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_e: () => {
      cpu.ops.fz(cpu.reg.e & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_h: () => {
      cpu.ops.fz(cpu.reg.h & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_l: () => {
      cpu.ops.fz(cpu.reg.l & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_a: () => {
      cpu.ops.fz(cpu.reg.a & 5);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT4_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 5);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT5_b: () => {
      cpu.ops.fz(cpu.reg.b & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_c: () => {
      cpu.ops.fz(cpu.reg.c & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_d: () => {
      cpu.ops.fz(cpu.reg.d & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_e: () => {
      cpu.ops.fz(cpu.reg.e & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_h: () => {
      cpu.ops.fz(cpu.reg.h & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_l: () => {
      cpu.ops.fz(cpu.reg.l & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_a: () => {
      cpu.ops.fz(cpu.reg.a & 6);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT5_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 6);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT6_b: () => {
      cpu.ops.fz(cpu.reg.b & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_c: () => {
      cpu.ops.fz(cpu.reg.c & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_d: () => {
      cpu.ops.fz(cpu.reg.d & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_e: () => {
      cpu.ops.fz(cpu.reg.e & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_h: () => {
      cpu.ops.fz(cpu.reg.h & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_l: () => {
      cpu.ops.fz(cpu.reg.l & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_a: () => {
      cpu.ops.fz(cpu.reg.a & 7);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT6_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 7);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    BIT7_b: () => {
      cpu.ops.fz(cpu.reg.b & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_c: () => {
      cpu.ops.fz(cpu.reg.c & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_d: () => {
      cpu.ops.fz(cpu.reg.d & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_e: () => {
      cpu.ops.fz(cpu.reg.e & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_h: () => {
      cpu.ops.fz(cpu.reg.h & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_l: () => {
      cpu.ops.fz(cpu.reg.l & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_a: () => {
      cpu.ops.fz(cpu.reg.a & 8);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT7_hl: () => {
      cpu.ops.fz(mmu.rb((cpu.reg.h << 8) + cpu.reg.l) & 8);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RLA: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a << 1) + ci;
      cpu.reg.a &= 255;
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RLCA: () => {
      let ci = cpu.reg.a & 128 ? 1 : 0;
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a << 1) + ci;
      cpu.reg.a &= 255;
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RRA: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a >> 1) + ci;
      cpu.reg.a &= 255;
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RRCA: () => {
      let ci = cpu.reg.a & 1 ? 128 : 0;
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a >> 1) + ci;
      cpu.reg.a &= 255;
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RL_b: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.b & 128 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b << 1) + ci;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_c: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.c & 128 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c << 1) + ci;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_d: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.d & 128 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d << 1) + ci;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_e: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.e & 128 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e << 1) + ci;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_h: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.h & 128 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h << 1) + ci;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_l: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.l & 128 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l << 1) + ci;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_a: () => {
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a << 1) + ci;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_hl: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      let ci = cpu.reg.f & 16 ? 1 : 0;
      let co = i & 128 ? 16 : 0;
      i = (i << 1) + ci;
      i &= 255;
      cpu.ops.fz(i);
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RLC_b: () => {
      let ci = cpu.reg.b & 128 ? 1 : 0;
      let co = cpu.reg.b & 128 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b << 1) + ci;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_c: () => {
      let ci = cpu.reg.c & 128 ? 1 : 0;
      let co = cpu.reg.c & 128 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c << 1) + ci;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_d: () => {
      let ci = cpu.reg.d & 128 ? 1 : 0;
      let co = cpu.reg.d & 128 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d << 1) + ci;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_e: () => {
      let ci = cpu.reg.e & 128 ? 1 : 0;
      let co = cpu.reg.e & 128 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e << 1) + ci;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_h: () => {
      let ci = cpu.reg.h & 128 ? 1 : 0;
      let co = cpu.reg.h & 128 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h << 1) + ci;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_l: () => {
      let ci = cpu.reg.l & 128 ? 1 : 0;
      let co = cpu.reg.l & 128 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l << 1) + ci;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_a: () => {
      let ci = cpu.reg.a & 128 ? 1 : 0;
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a << 1) + ci;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_hl: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      let ci = i & 128 ? 1 : 0;
      let co = i & 128 ? 16 : 0;
      i = (i << 8) + ci;
      i &= 255;
      cpu.ops.fz(i);
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RR_b: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.b & 1 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b >> 1) + ci;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_c: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.c & 1 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c >> 1) + ci;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_d: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.d & 1 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d >> 1) + ci;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_e: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.e & 1 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e >> 1) + ci;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_h: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.h & 1 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h >> 1) + ci;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_l: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.l & 1 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l >> 1) + ci;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_a: () => {
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a >> 1) + ci;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_hl: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      let ci = cpu.reg.f & 16 ? 128 : 0;
      let co = i & 1 ? 16 : 0;
      i = (i >> 1) + ci;
      i &= 255;
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.ops.fz(i);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RRC_b: () => {
      let ci = cpu.reg.b & 1 ? 128 : 0;
      let co = cpu.reg.b & 1 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b >> 1) + ci;
      cpu.reg.b &= 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_c: () => {
      let ci = cpu.reg.c & 1 ? 128 : 0;
      let co = cpu.reg.c & 1 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c >> 1) + ci;
      cpu.reg.c &= 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_d: () => {
      let ci = cpu.reg.d & 1 ? 128 : 0;
      let co = cpu.reg.d & 1 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d >> 1) + ci;
      cpu.reg.d &= 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_e: () => {
      let ci = cpu.reg.e & 1 ? 128 : 0;
      let co = cpu.reg.e & 1 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e >> 1) + ci;
      cpu.reg.e &= 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_h: () => {
      let ci = cpu.reg.h & 1 ? 128 : 0;
      let co = cpu.reg.h & 1 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h >> 1) + ci;
      cpu.reg.h &= 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_l: () => {
      let ci = cpu.reg.l & 1 ? 128 : 0;
      let co = cpu.reg.l & 1 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l >> 1) + ci;
      cpu.reg.l &= 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_a: () => {
      let ci = cpu.reg.a & 1 ? 128 : 0;
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a >> 1) + ci;
      cpu.reg.a &= 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_hl: () => {
      let i = mmu.rb((cpu.reg.h << 8) + cpu.reg.l);
      let ci = i & 1 ? 128 : 0;
      let co = i & 1 ? 16 : 0;
      i = (i >> 1) + ci;
      i &= 255;
      mmu.wb((cpu.reg.h << 8) + cpu.reg.l, i);
      cpu.ops.fz(i);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    SLA_b: () => {
      let co = cpu.reg.b & 128 ? 16 : 0;
      cpu.reg.b = cpu.reg.b << 1 & 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_c: () => {
      let co = cpu.reg.c & 128 ? 16 : 0;
      cpu.reg.c = cpu.reg.c << 1 & 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_d: () => {
      let co = cpu.reg.d & 128 ? 16 : 0;
      cpu.reg.d = cpu.reg.d << 1 & 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_e: () => {
      let co = cpu.reg.e & 128 ? 16 : 0;
      cpu.reg.e = cpu.reg.e << 1 & 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_b: () => {
      let co = cpu.reg.b & 128 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_c: () => {
      let co = cpu.reg.c & 128 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_d: () => {
      let co = cpu.reg.d & 128 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_e: () => {
      let co = cpu.reg.e & 128 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_h: () => {
      let co = cpu.reg.h & 128 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_l: () => {
      let co = cpu.reg.l & 128 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLL_a: () => {
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a << 1 | 1) & 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_h: () => {
      let co = cpu.reg.h & 128 ? 16 : 0;
      cpu.reg.h = cpu.reg.h << 1 & 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_l: () => {
      let co = cpu.reg.l & 128 ? 16 : 0;
      cpu.reg.l = cpu.reg.l << 1 & 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_a: () => {
      let co = cpu.reg.a & 128 ? 16 : 0;
      cpu.reg.a = cpu.reg.a << 1 & 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_b: () => {
      let ci = cpu.reg.b & 128;
      let co = cpu.reg.b & 1 ? 16 : 0;
      cpu.reg.b = (cpu.reg.b >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_c: () => {
      let ci = cpu.reg.c & 128;
      let co = cpu.reg.c & 1 ? 16 : 0;
      cpu.reg.c = (cpu.reg.c >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_d: () => {
      let ci = cpu.reg.d & 128;
      let co = cpu.reg.d & 1 ? 16 : 0;
      cpu.reg.d = (cpu.reg.d >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_e: () => {
      let ci = cpu.reg.e & 128;
      let co = cpu.reg.e & 1 ? 16 : 0;
      cpu.reg.e = (cpu.reg.e >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_h: () => {
      let ci = cpu.reg.h & 128;
      let co = cpu.reg.h & 1 ? 16 : 0;
      cpu.reg.h = (cpu.reg.h >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_l: () => {
      let ci = cpu.reg.l & 128;
      let co = cpu.reg.l & 1 ? 16 : 0;
      cpu.reg.l = (cpu.reg.l >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_a: () => {
      let ci = cpu.reg.a & 128;
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = (cpu.reg.a >> 1 | ci) & 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_b: () => {
      let co = cpu.reg.b & 1 ? 16 : 0;
      cpu.reg.b = cpu.reg.b >> 1 & 255;
      cpu.ops.fz(cpu.reg.b);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_c: () => {
      let co = cpu.reg.c & 1 ? 16 : 0;
      cpu.reg.c = cpu.reg.c >> 1 & 255;
      cpu.ops.fz(cpu.reg.c);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_d: () => {
      let co = cpu.reg.d & 1 ? 16 : 0;
      cpu.reg.d = cpu.reg.d >> 1 & 255;
      cpu.ops.fz(cpu.reg.d);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_e: () => {
      let co = cpu.reg.e & 1 ? 16 : 0;
      cpu.reg.e = cpu.reg.e >> 1 & 255;
      cpu.ops.fz(cpu.reg.e);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_h: () => {
      let co = cpu.reg.h & 1 ? 16 : 0;
      cpu.reg.h = cpu.reg.h >> 1 & 255;
      cpu.ops.fz(cpu.reg.h);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_l: () => {
      let co = cpu.reg.l & 1 ? 16 : 0;
      cpu.reg.l = cpu.reg.l >> 1 & 255;
      cpu.ops.fz(cpu.reg.l);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_a: () => {
      let co = cpu.reg.a & 1 ? 16 : 0;
      cpu.reg.a = cpu.reg.a >> 1 & 255;
      cpu.ops.fz(cpu.reg.a);
      cpu.reg.f = (cpu.reg.f & 239) + co;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    CPL: () => {
      cpu.reg.a = ~cpu.reg.a & 255;
      cpu.ops.fz(cpu.reg.a, 1);
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    NEG: () => {
      cpu.reg.a = 0 - cpu.reg.a;
      cpu.ops.fz(cpu.reg.a, 1);
      if (cpu.reg.a < 0) cpu.reg.f |= 16;
      cpu.reg.a &= 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    CCF: () => {
      let ci = cpu.reg.f & 16 ? 0 : 16;
      cpu.reg.f = (cpu.reg.f & 239) + ci;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SCF: () => {
      cpu.reg.f |= 16;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    PUSH_bc: () => {
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.b);
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.c);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    PUSH_de: () => {
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.d);
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.e);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    PUSH_hl: () => {
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.h);
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.l);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    PUSH_af: () => {
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.a);
      cpu.reg.sp--;
      mmu.wb(cpu.reg.sp, cpu.reg.f);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    POP_bc: () => {
      cpu.reg.c = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.b = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    POP_de: () => {
      cpu.reg.e = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.d = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    POP_hl: () => {
      cpu.reg.l = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.h = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    POP_af: () => {
      cpu.reg.f = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.a = mmu.rb(cpu.reg.sp);
      cpu.reg.sp++;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    JP_nn: () => {
      cpu.reg.pc = mmu.rw(cpu.reg.pc);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    JP_hl: () => {
      cpu.reg.pc = cpu.reg.h << 8 | cpu.reg.l;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    JPNZ_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 128) === 0) {
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m++;
        cpu.reg.t += 4;
      } else {
        cpu.reg.pc += 2;
      }
    },
    JPZ_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 128) === 128) {
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m++;
        cpu.reg.t = 4;
      } else {
        cpu.reg.pc += 2;
      }
    },
    JPNC_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 16) === 0) {
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m++;
        cpu.reg.t += 4;
      } else {
        cpu.reg.pc += 2;
      }
    },
    JPC_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 16) === 16) {
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m++;
        cpu.reg.t += 4;
      } else {
        cpu.reg.pc += 2;
      }
    },
    JR_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      cpu.reg.pc += i;
      cpu.reg.m++;
      cpu.reg.t += 4;
    },
    JRNZ_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      if ((cpu.reg.f & 128) === 0) {
        cpu.reg.pc += i;
        cpu.reg.m++;
        cpu.reg.t += 4;
      }
    },
    JRZ_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      if ((cpu.reg.f & 128) === 128) {
        cpu.reg.pc += i;
        cpu.reg.m++;
        cpu.reg.t += 4;
      }
    },
    JRNC_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      if ((cpu.reg.f & 16) === 0) {
        cpu.reg.pc += i;
        cpu.reg.m++;
        cpu.reg.t += 4;
      }
    },
    JRC_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      if ((cpu.reg.f & 16) === 16) {
        cpu.reg.pc += i;
        cpu.reg.m++;
        cpu.reg.t += 4;
      }
    },
    DJNZ_n: () => {
      let i = mmu.rb(cpu.reg.pc);
      if (i > 127) {
        i = -(~i + 1 & 255);
      }
      cpu.reg.pc++;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
      cpu.reg.b--;
      if (cpu.reg.b !== 0) {
        cpu.reg.pc += i;
        cpu.reg.m++;
        cpu.reg.t += 4;
      }
    },
    CALL_nn: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc + 2);
      cpu.reg.pc = mmu.rw(cpu.reg.pc);
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },
    CALLNZ_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 128) === 0) {
        cpu.reg.sp -= 2;
        mmu.ww(cpu.reg.sp, cpu.reg.pc + 2);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      } else {
        cpu.reg.pc += 2;
      }
    },
    CALLZ_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 128) === 128) {
        cpu.reg.sp -= 2;
        mmu.ww(cpu.reg.sp, cpu.reg.pc + 2);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      } else {
        cpu.reg.pc += 2;
      }
    },
    CALLNC_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 16) === 0) {
        cpu.reg.sp -= 2;
        mmu.ww(cpu.reg.sp, cpu.reg.pc + 2);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      } else {
        cpu.reg.pc += 2;
      }
    },
    CALLC_nn: () => {
      cpu.reg.m = 3;
      cpu.reg.t = 12;
      if ((cpu.reg.f & 16) === 16) {
        cpu.reg.sp -= 2;
        mmu.ww(cpu.reg.sp, cpu.reg.pc + 2);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      } else {
        cpu.reg.pc += 2;
      }
    },
    RET: () => {
      cpu.reg.pc = mmu.rw(cpu.reg.sp);
      cpu.reg.sp += 2;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RETI: () => {
      cpu.reg.ime = 1;
      cpu.reg.pc = mmu.rw(cpu.reg.sp);
      cpu.reg.sp += 2;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RETNZ: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
      if ((cpu.reg.f & 128) === 0) {
        cpu.reg.pc = mmu.rw(cpu.reg.sp);
        cpu.reg.sp += 2;
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      }
    },
    RETZ: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
      if ((cpu.reg.f & 128) === 128) {
        cpu.reg.pc = mmu.rw(cpu.reg.sp);
        cpu.reg.sp += 2;
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      }
    },
    RETNC: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
      if ((cpu.reg.f & 16) === 0) {
        cpu.reg.pc = mmu.rw(cpu.reg.sp);
        cpu.reg.sp += 2;
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      }
    },
    RETC: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
      if ((cpu.reg.f & 16) === 16) {
        cpu.reg.pc = mmu.rw(cpu.reg.sp);
        cpu.reg.sp += 2;
        cpu.reg.m += 2;
        cpu.reg.t += 8;
      }
    },
    RST00: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 0;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST08: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 8;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST10: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 16;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST18: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 24;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST20: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 32;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST28: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 40;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST30: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 48;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST38: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 56;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST40: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 64;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST48: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 72;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST50: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 80;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST58: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 88;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    RST60: () => {
      cpu.reg.sp -= 2;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = 96;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    NOP: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    HALT: () => {
      cpu.halt = 1;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DI: () => {
      cpu.reg.ime = 0;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    EI: () => {
      cpu.reg.ime = 1;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    // Helper Functions
    fz: (i, as = 0) => {
      cpu.reg.f = 0;
      if (!(i & 255)) {
        cpu.reg.f |= 128;
      }
      cpu.reg.f |= as ? 64 : 0;
    },
    MAPcb: () => {
      let i = mmu.rb(cpu.reg.pc);
      cpu.reg.pc++;
      cpu.reg.pc &= 65535;
      if (cpu.cbmap[i]) {
        cpu.cbmap[i]();
      } else {
        alert(i);
      }
    },
    XX: () => {
      let opc = cpu.reg.pc - 1;
      alert("Instruction at " + opc.toString(16) + ", ending execution.");
      cpu.stop = 1;
    }
  },
  map: [],
  cbmap: []
};
cpu.map = [
  // 00
  cpu.ops.NOP,
  cpu.ops.LD_bc_nn,
  cpu.ops.LD_bc_a,
  cpu.ops.INC_bc,
  cpu.ops.INC_b,
  cpu.ops.DEC_b,
  cpu.ops.LD_b_n,
  cpu.ops.RLCA,
  cpu.ops.LD_nn_sp,
  cpu.ops.ADD_hl_bc,
  cpu.ops.LD_a_bc,
  cpu.ops.DEC_bc,
  cpu.ops.INC_c,
  cpu.ops.DEC_c,
  cpu.ops.LD_c_n,
  cpu.ops.RRCA,
  // 10
  cpu.ops.DJNZ_n,
  cpu.ops.LD_de_nn,
  cpu.ops.LD_de_a,
  cpu.ops.INC_d,
  cpu.ops.DEC_d,
  cpu.ops.LD_d_n,
  cpu.ops.RLA,
  cpu.ops.JR_n,
  cpu.ops.ADD_hl_de,
  cpu.ops.LD_a_de,
  cpu.ops.DEC_de,
  cpu.ops.INC_e,
  cpu.ops.DEC_e,
  cpu.ops.LD_e_n,
  cpu.ops.RRA,
  // 20
  cpu.ops.JRNZ_n,
  cpu.ops.LD_hl_nn,
  cpu.ops.LD_hl_inc_a,
  cpu.ops.INC_hl,
  cpu.ops.INC_h,
  cpu.ops.DEC_h,
  cpu.ops.LD_h_n,
  cpu.ops.XX,
  cpu.ops.JRZ_n,
  cpu.ops.ADD_hl_hl,
  cpu.ops.LD_a_hl_inc,
  cpu.ops.DEC_hl,
  cpu.ops.INC_l,
  cpu.ops.DEC_l,
  cpu.ops.LD_l_n,
  cpu.ops.CPL,
  // 30
  cpu.ops.JRNC_n,
  cpu.ops.LD_sp_nn,
  cpu.ops.LD_hl_dec_a,
  cpu.ops.INC_sp,
  cpu.ops.INC_hlm,
  cpu.ops.DEC_hlm,
  cpu.ops.LD_hl_mnn,
  cpu.ops.SCF,
  cpu.ops.JRC_n,
  cpu.ops.ADD_hl_sp,
  cpu.ops.LD_a_hl_dec,
  cpu.ops.DEC_sp,
  cpu.ops.INC_a,
  cpu.ops.DEC_a,
  cpu.ops.LD_a_n,
  cpu.ops.CCF,
  // 40
  cpu.ops.LD_b_b,
  cpu.ops.LD_b_c,
  cpu.ops.LD_b_d,
  cpu.ops.LD_b_e,
  cpu.ops.LD_b_h,
  cpu.ops.LD_b_l,
  cpu.ops.LD_b_hl,
  cpu.ops.LD_b_a,
  cpu.ops.LD_c_b,
  cpu.ops.LD_c_c,
  cpu.ops.LD_c_d,
  cpu.ops.LD_c_e,
  cpu.ops.LD_c_h,
  cpu.ops.LD_c_l,
  cpu.ops.LD_c_hl,
  cpu.ops.LD_c_a,
  // 50
  cpu.ops.LD_d_b,
  cpu.ops.LD_d_c,
  cpu.ops.LD_d_d,
  cpu.ops.LD_d_e,
  cpu.ops.LD_d_h,
  cpu.ops.LD_d_l,
  cpu.ops.LD_d_hl,
  cpu.ops.LD_d_a,
  cpu.ops.LD_e_b,
  cpu.ops.LD_e_c,
  cpu.ops.LD_e_d,
  cpu.ops.LD_e_e,
  cpu.ops.LD_e_h,
  cpu.ops.LD_e_l,
  cpu.ops.LD_e_hl,
  cpu.ops.LD_e_a,
  // 60
  cpu.ops.LD_h_b,
  cpu.ops.LD_h_c,
  cpu.ops.LD_h_d,
  cpu.ops.LD_h_e,
  cpu.ops.LD_h_h,
  cpu.ops.LD_h_l,
  cpu.ops.LD_h_hl,
  cpu.ops.LD_h_a,
  cpu.ops.LD_l_b,
  cpu.ops.LD_l_c,
  cpu.ops.LD_l_d,
  cpu.ops.LD_l_e,
  cpu.ops.LD_l_h,
  cpu.ops.LD_l_l,
  cpu.ops.LD_l_hl,
  cpu.ops.LD_l_a,
  // 70
  cpu.ops.LD_hl_b,
  cpu.ops.LD_hl_c,
  cpu.ops.LD_hl_d,
  cpu.ops.LD_hl_e,
  cpu.ops.LD_hl_h,
  cpu.ops.LD_hl_l,
  cpu.ops.HALT,
  cpu.ops.LD_hl_a,
  cpu.ops.LD_a_b,
  cpu.ops.LD_a_c,
  cpu.ops.LD_a_d,
  cpu.ops.LD_a_e,
  cpu.ops.LD_a_h,
  cpu.ops.LD_a_l,
  cpu.ops.LD_a_hl,
  cpu.ops.LD_a_a,
  // 80
  cpu.ops.ADD_a_b,
  cpu.ops.ADD_a_c,
  cpu.ops.ADD_a_d,
  cpu.ops.ADD_a_e,
  cpu.ops.ADD_a_h,
  cpu.ops.ADD_a_l,
  cpu.ops.ADD_a_hl,
  cpu.ops.ADD_a_a,
  cpu.ops.ADC_a_b,
  cpu.ops.ADC_a_c,
  cpu.ops.ADC_a_d,
  cpu.ops.ADC_a_e,
  cpu.ops.ADC_a_h,
  cpu.ops.ADC_a_l,
  cpu.ops.ADC_a_hl,
  cpu.ops.ADC_a_a,
  // 90
  cpu.ops.SUB_a_b,
  cpu.ops.SUB_a_c,
  cpu.ops.SUB_a_d,
  cpu.ops.SUB_a_e,
  cpu.ops.SUB_a_h,
  cpu.ops.SUB_a_l,
  cpu.ops.SUB_a_hl,
  cpu.ops.SUB_a_a,
  cpu.ops.SBC_a_b,
  cpu.ops.SBC_a_c,
  cpu.ops.SBC_a_d,
  cpu.ops.SBC_a_e,
  cpu.ops.SBC_a_h,
  cpu.ops.SBC_a_l,
  cpu.ops.SBC_a_hl,
  cpu.ops.SBC_a_a,
  // A0
  cpu.ops.AND_a_b,
  cpu.ops.AND_a_c,
  cpu.ops.AND_a_d,
  cpu.ops.AND_a_e,
  cpu.ops.AND_a_h,
  cpu.ops.AND_a_l,
  cpu.ops.AND_a_hl,
  cpu.ops.AND_a_a,
  cpu.ops.XOR_a_b,
  cpu.ops.XOR_a_c,
  cpu.ops.XOR_a_d,
  cpu.ops.XOR_a_e,
  cpu.ops.XOR_a_h,
  cpu.ops.XOR_a_l,
  cpu.ops.XOR_a_hl,
  cpu.ops.XOR_a_a,
  //B0
  cpu.ops.OR_a_b,
  cpu.ops.OR_a_c,
  cpu.ops.OR_a_d,
  cpu.ops.OR_a_e,
  cpu.ops.OR_a_h,
  cpu.ops.OR_a_l,
  cpu.ops.OR_a_hl,
  cpu.ops.OR_a_a,
  cpu.ops.CP_a_b,
  cpu.ops.CP_a_c,
  cpu.ops.CP_a_d,
  cpu.ops.CP_a_e,
  cpu.ops.CP_a_h,
  cpu.ops.CP_a_l,
  cpu.ops.CP_a_hl,
  cpu.ops.CP_a_a,
  // C0
  cpu.ops.RETNZ,
  cpu.ops.POP_bc,
  cpu.ops.JPNZ_nn,
  cpu.ops.JP_nn,
  cpu.ops.CALLNZ_nn,
  cpu.ops.PUSH_bc,
  cpu.ops.ADD_a_n,
  cpu.ops.RST00,
  cpu.ops.RETZ,
  cpu.ops.RET,
  cpu.ops.JPZ_nn,
  cpu.ops.MAPcb,
  cpu.ops.CALLZ_nn,
  cpu.ops.CALL_nn,
  cpu.ops.ADC_a_n,
  cpu.ops.RST08,
  // D0
  cpu.ops.RETNC,
  cpu.ops.POP_de,
  cpu.ops.JPNC_nn,
  cpu.ops.XX,
  cpu.ops.CALLNC_nn,
  cpu.ops.PUSH_de,
  cpu.ops.SUB_a_n,
  cpu.ops.RST10,
  cpu.ops.RETC,
  cpu.ops.RETI,
  cpu.ops.JPC_nn,
  cpu.ops.XX,
  cpu.ops.CALLC_nn,
  cpu.ops.XX,
  cpu.ops.SBC_a_n,
  cpu.ops.RST18,
  // E0
  cpu.ops.LD_IO_n_a,
  cpu.ops.POP_hl,
  cpu.ops.LD_IO_c_a,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.PUSH_hl,
  cpu.ops.AND_a_n,
  cpu.ops.RST20,
  cpu.ops.ADD_sp_n,
  cpu.ops.JP_hl,
  cpu.ops.LD_nn_a,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.OR_a_n,
  cpu.ops.RST28,
  // F0
  cpu.ops.LD_a_IO_n,
  cpu.ops.POP_af,
  cpu.ops.LD_a_IO_c,
  cpu.ops.DI,
  cpu.ops.XX,
  cpu.ops.PUSH_af,
  cpu.ops.XOR_a_n,
  cpu.ops.RST30,
  cpu.ops.LD_hl_sp_n,
  cpu.ops.XX,
  cpu.ops.LD_a_nn,
  cpu.ops.EI,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.CP_a_n,
  cpu.ops.RST38
];
cpu.cbmap = [
  // CB00
  cpu.ops.RLC_b,
  cpu.ops.RLC_c,
  cpu.ops.RLC_d,
  cpu.ops.RLC_e,
  cpu.ops.RLC_h,
  cpu.ops.RLC_l,
  cpu.ops.RLC_hl,
  cpu.ops.RLC_a,
  cpu.ops.RRC_b,
  cpu.ops.RRC_c,
  cpu.ops.RRC_d,
  cpu.ops.RRC_e,
  cpu.ops.RRC_h,
  cpu.ops.RRC_l,
  cpu.ops.RRC_hl,
  cpu.ops.RRC_a,
  // CB10
  cpu.ops.RL_b,
  cpu.ops.RL_c,
  cpu.ops.RL_d,
  cpu.ops.RL_e,
  cpu.ops.RL_h,
  cpu.ops.RL_l,
  cpu.ops.RL_hl,
  cpu.ops.RL_a,
  cpu.ops.RR_b,
  cpu.ops.RR_c,
  cpu.ops.RR_d,
  cpu.ops.RR_e,
  cpu.ops.RR_h,
  cpu.ops.RR_l,
  cpu.ops.RR_hl,
  cpu.ops.RR_a,
  // CB20
  cpu.ops.SLA_b,
  cpu.ops.SLA_c,
  cpu.ops.SLA_d,
  cpu.ops.SLA_e,
  cpu.ops.SLA_h,
  cpu.ops.SLA_l,
  cpu.ops.XX,
  cpu.ops.SLA_a,
  cpu.ops.SRA_b,
  cpu.ops.SRA_c,
  cpu.ops.SRA_d,
  cpu.ops.SRA_e,
  cpu.ops.SRA_h,
  cpu.ops.SRA_l,
  cpu.ops.XX,
  cpu.ops.SRA_a,
  // CB30
  cpu.ops.SWAP_b,
  cpu.ops.SWAP_c,
  cpu.ops.SWAP_d,
  cpu.ops.SWAP_e,
  cpu.ops.SWAP_h,
  cpu.ops.SWAP_l,
  cpu.ops.XX,
  cpu.ops.SWAP_a,
  cpu.ops.SRL_b,
  cpu.ops.SRL_c,
  cpu.ops.SRL_d,
  cpu.ops.SRL_e,
  cpu.ops.SRL_h,
  cpu.ops.SRL_l,
  cpu.ops.XX,
  cpu.ops.SRL_a,
  // CB40
  cpu.ops.BIT0_b,
  cpu.ops.BIT0_c,
  cpu.ops.BIT0_d,
  cpu.ops.BIT0_e,
  cpu.ops.BIT0_h,
  cpu.ops.BIT0_l,
  cpu.ops.BIT0_hl,
  cpu.ops.BIT0_a,
  cpu.ops.BIT1_b,
  cpu.ops.BIT1_c,
  cpu.ops.BIT1_d,
  cpu.ops.BIT1_e,
  cpu.ops.BIT1_h,
  cpu.ops.BIT1_l,
  cpu.ops.BIT1_hl,
  cpu.ops.BIT1_a,
  // CB50
  cpu.ops.BIT2_b,
  cpu.ops.BIT2_c,
  cpu.ops.BIT2_d,
  cpu.ops.BIT2_e,
  cpu.ops.BIT2_h,
  cpu.ops.BIT2_l,
  cpu.ops.BIT2_hl,
  cpu.ops.BIT2_a,
  cpu.ops.BIT3_b,
  cpu.ops.BIT3_c,
  cpu.ops.BIT3_d,
  cpu.ops.BIT3_e,
  cpu.ops.BIT3_h,
  cpu.ops.BIT3_l,
  cpu.ops.BIT3_hl,
  cpu.ops.BIT3_a,
  // CB60
  cpu.ops.BIT4_b,
  cpu.ops.BIT4_c,
  cpu.ops.BIT4_d,
  cpu.ops.BIT4_e,
  cpu.ops.BIT4_h,
  cpu.ops.BIT4_l,
  cpu.ops.BIT4_hl,
  cpu.ops.BIT4_a,
  cpu.ops.BIT5_b,
  cpu.ops.BIT5_c,
  cpu.ops.BIT5_d,
  cpu.ops.BIT5_e,
  cpu.ops.BIT5_h,
  cpu.ops.BIT5_l,
  cpu.ops.BIT5_hl,
  cpu.ops.BIT5_a,
  // CB70
  cpu.ops.BIT6_b,
  cpu.ops.BIT6_c,
  cpu.ops.BIT6_d,
  cpu.ops.BIT6_e,
  cpu.ops.BIT6_h,
  cpu.ops.BIT6_l,
  cpu.ops.BIT6_hl,
  cpu.ops.BIT6_a,
  cpu.ops.BIT7_b,
  cpu.ops.BIT7_c,
  cpu.ops.BIT7_d,
  cpu.ops.BIT7_e,
  cpu.ops.BIT7_h,
  cpu.ops.BIT7_l,
  cpu.ops.BIT7_hl,
  cpu.ops.BIT7_a,
  // CB80
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CB90
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBA0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBB0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBC0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBD0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBE0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  // CBF0
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX,
  cpu.ops.XX
];

// src/main.ts
var emulator = {
  init: () => {
    log.reset();
    mmu.reset();
    cpu.reset();
    gpu.reset();
    log.out("EMU", "Emulator initialized.");
  },
  loadRom: async (url) => {
    try {
      log.out("EMU", `Fetching ROM from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ROM: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      const romData = new Uint8Array(buffer);
      await mmu.load(romData);
      log.out("EMU", `ROM loaded: ${romData.length} bytes.`);
      return true;
    } catch (error) {
      log.out("EMU", `Error loading ROM: ${error}`);
      return false;
    }
  },
  run: async () => {
    emulator.init();
    const romUrl = "/roms/test.gb";
    const loaded = await emulator.loadRom(romUrl);
    if (loaded) {
      log.out("EMU", "Starting emulation loop.");
      emulator.loop();
    } else {
      log.out("EMU", "Failed to load ROM. Emulation not started.");
    }
  },
  loop: () => {
    let frameCycles = 0;
    while (frameCycles < 17556) {
      cpu.step();
      frameCycles += cpu.reg.m;
    }
    requestAnimationFrame(emulator.loop);
  }
};
window.onload = () => {
  emulator.run();
};
export {
  emulator
};
