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
  winy: 0,
  winx: 0,
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
        log.out("GPU", "Failed to get 2D context");
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
    } else {
      log.out("GPU", 'Canvas element "screen" not found or not supported');
    }
    gpu.curline = 0;
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
    gpu.winy = 0;
    gpu.winx = 0;
    gpu.scanrow.fill(0);
    gpu.objdata = [];
    for (let i = 0; i < 40; i++) {
      gpu.objdata[i] = { "y": -16, "x": -8, "tile": 0, "palette": 0, "yflip": 0, "xflip": 0, "prio": 0, "num": i };
    }
    gpu.objdatasorted = [];
    gpu.bgtilebase = 0;
    gpu.bgmapbase = 6144;
    gpu.wintilebase = 6144;
    log.out("GPU", "GPU reset");
  },
  checkStat: () => {
    if (!gpu.lcdon) return;
    let stat = gpu.reg[1];
    let interrupt = false;
    if (stat & 64 && gpu.curline === gpu.raster) {
      stat |= 4;
      interrupt = true;
    } else {
      stat &= ~4;
    }
    if (stat & 32 && gpu.linemode === 2) interrupt = true;
    if (stat & 16 && gpu.linemode === 1) interrupt = true;
    if (stat & 8 && gpu.linemode === 0) interrupt = true;
    gpu.reg[1] = gpu.reg[1] & 128 | stat & 127;
    if (interrupt) mmu.intf |= 2;
  },
  checkline: () => {
    if (!gpu.lcdon) return;
    gpu.modeclocks += cpu.reg.t;
    switch (gpu.linemode) {
      case 2:
        if (gpu.modeclocks >= 80) {
          gpu.modeclocks -= 80;
          gpu.linemode = 3;
        }
        break;
      case 3:
        if (gpu.modeclocks >= 172) {
          gpu.modeclocks -= 172;
          gpu.linemode = 0;
          gpu.renderScanline();
          gpu.checkStat();
        }
        break;
      case 0:
        if (gpu.modeclocks >= 204) {
          gpu.modeclocks -= 204;
          gpu.curline++;
          if (gpu.curline === 144) {
            gpu.linemode = 1;
            if (gpu.canvas && gpu.canvas.putImageData) {
              gpu.canvas.putImageData(gpu.screen, 0, 0);
            }
            mmu.intf |= 1;
          } else {
            gpu.linemode = 2;
          }
          gpu.checkStat();
        }
        break;
      case 1:
        if (gpu.modeclocks >= 456) {
          gpu.modeclocks -= 456;
          gpu.curline++;
          if (gpu.curline > 153) {
            gpu.curline = 0;
            gpu.linemode = 2;
          }
          gpu.checkStat();
        }
        break;
    }
  },
  renderScanline: () => {
    let linebase = gpu.curline * 160 * 4;
    if (gpu.bgon) {
      let mapbase = gpu.bgmapbase + ((gpu.curline + gpu.yscrl & 255) >> 3 << 5);
      let y = gpu.curline + gpu.yscrl & 7;
      let x = gpu.xscrl & 7;
      let t = gpu.xscrl >> 3 & 31;
      for (let i = 0; i < 160; i++) {
        let tile = gpu.vram[mapbase + t];
        if (gpu.bgtilebase === 2048 && tile < 128) tile += 256;
        let color_idx = gpu.tilemap[tile][y][x];
        gpu.scanrow[i] = color_idx;
        let color = gpu.palette.bg[color_idx];
        gpu.screen.data[linebase] = color;
        gpu.screen.data[linebase + 1] = color;
        gpu.screen.data[linebase + 2] = color;
        gpu.screen.data[linebase + 3] = 255;
        linebase += 4;
        x++;
        if (x === 8) {
          x = 0;
          t = t + 1 & 31;
        }
      }
    }
    if (gpu.winon && gpu.curline >= gpu.winy) {
      let winY = gpu.curline - gpu.winy;
      let mapbase = gpu.wintilebase + (winY >> 3 << 5);
      let y = winY & 7;
      let winXStart = gpu.winx - 7;
      for (let i = 0; i < 160; i++) {
        if (i < winXStart) continue;
        let t = i - winXStart >> 3;
        let x = i - winXStart & 7;
        let tile = gpu.vram[mapbase + t];
        if (gpu.bgtilebase === 2048 && tile < 128) tile += 256;
        let color_idx = gpu.tilemap[tile][y][x];
        gpu.scanrow[i] = color_idx;
        let color = gpu.palette.bg[color_idx];
        let lb = (gpu.curline * 160 + i) * 4;
        gpu.screen.data[lb] = color;
        gpu.screen.data[lb + 1] = color;
        gpu.screen.data[lb + 2] = color;
        gpu.screen.data[lb + 3] = 255;
      }
    }
    if (gpu.objon) {
      let height = gpu.objsize ? 16 : 8;
      let spritesOnLine = [];
      for (let i = 0; i < 40; i++) {
        let obj = gpu.objdata[i];
        let oamX = obj.x + 8;
        if (oamX > 0 && oamX < 168 && obj.y <= gpu.curline && obj.y + height > gpu.curline) {
          spritesOnLine.push(obj);
        }
      }
      if (spritesOnLine.length > 0) {
        console.log(`[GPU] Line ${gpu.curline} sprites:`, spritesOnLine.length);
      }
      spritesOnLine.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.num - b.num;
      });
      if (spritesOnLine.length > 10) {
        spritesOnLine = spritesOnLine.slice(0, 10);
      }
      if (gpu.curline === 72 && spritesOnLine.length > 0) {
        console.log("[GPU] Line 72 sprites:", spritesOnLine.map(function(o) {
          return { x: o.x, y: o.y, tile: o.tile, pal: o.palette };
        }));
      }
      for (let i = spritesOnLine.length - 1; i >= 0; i--) {
        let obj = spritesOnLine[i];
        let tileIdx = obj.tile;
        let lineOffset = gpu.curline - obj.y;
        if (height === 16) {
          tileIdx &= 254;
          if (obj.yflip) {
            if (lineOffset < 8) tileIdx |= 1;
            lineOffset = 7 - lineOffset % 8;
          } else {
            if (lineOffset >= 8) tileIdx |= 1;
            lineOffset %= 8;
          }
        } else {
          if (obj.yflip) {
            lineOffset = 7 - lineOffset;
          }
        }
        let pal = obj.palette ? gpu.palette.obj1 : gpu.palette.obj0;
        for (let x = 0; x < 8; x++) {
          let canvas_x = obj.x + x;
          if (canvas_x >= 0 && canvas_x < 160) {
            let color_idx = obj.xflip ? gpu.tilemap[tileIdx][lineOffset][7 - x] : gpu.tilemap[tileIdx][lineOffset][x];
            if (color_idx !== 0 && (obj.prio === 0 || gpu.scanrow[canvas_x] === 0)) {
              let color = pal[color_idx];
              let linebase2 = (gpu.curline * 160 + canvas_x) * 4;
              gpu.screen.data[linebase2] = color;
              gpu.screen.data[linebase2 + 1] = color;
              gpu.screen.data[linebase2 + 2] = color;
              gpu.screen.data[linebase2 + 3] = 255;
            }
          }
        }
      }
    }
  },
  updatetile: (addr, _val) => {
    let saddr = addr & 8191;
    if (saddr & 1) saddr--;
    let tile = saddr >> 4 & 511;
    let y = saddr >> 1 & 7;
    for (let x = 0; x < 8; x++) {
      let sx = 1 << 7 - x;
      gpu.tilemap[tile][y][x] = (gpu.vram[saddr] & sx ? 1 : 0) | (gpu.vram[saddr + 1] & sx ? 2 : 0);
    }
  },
  updateoam: (addr, val) => {
    let oam_addr = addr - 65024;
    let obj = oam_addr >> 2;
    if (obj < 40) {
      switch (oam_addr & 3) {
        case 0:
          gpu.objdata[obj].y = val - 16;
          break;
        case 1:
          gpu.objdata[obj].x = val - 8;
          break;
        case 2:
          gpu.objdata[obj].tile = val;
          break;
        case 3:
          gpu.objdata[obj].palette = val & 16 ? 1 : 0;
          gpu.objdata[obj].yflip = val & 32 ? 1 : 0;
          gpu.objdata[obj].xflip = val & 64 ? 1 : 0;
          gpu.objdata[obj].prio = val & 128 ? 1 : 0;
          break;
      }
    }
  },
  rb: (addr) => {
    let gaddr = addr - 65344;
    switch (gaddr) {
      case 0:
        return (gpu.lcdon ? 128 : 0) | (gpu.bgtilebase === 0 ? 16 : 0) | (gpu.bgmapbase === 7168 ? 8 : 0) | (gpu.objsize ? 4 : 0) | (gpu.objon ? 2 : 0) | (gpu.bgon ? 1 : 0);
      case 1:
        return gpu.reg[1] & 120 | (gpu.curline === gpu.raster ? 4 : 0) | gpu.linemode;
      case 2:
        return gpu.yscrl;
      case 3:
        return gpu.xscrl;
      case 4:
        return gpu.curline;
      case 5:
        return gpu.raster;
      case 10:
        return gpu.winy;
      case 11:
        return gpu.winx;
      default:
        return gpu.reg[gaddr];
    }
  },
  wb: (addr, val) => {
    let gaddr = addr - 65344;
    gpu.reg[gaddr] = val;
    switch (gaddr) {
      case 0:
        console.log("[GPU] LCDC write:", val.toString(16), "lcdon:", !!(val & 128), "objon:", !!(val & 2), "bgon:", !!(val & 1));
        const wason = gpu.lcdon;
        gpu.lcdon = val & 128 ? 1 : 0;
        if (wason && !gpu.lcdon) {
          gpu.curline = 0;
          gpu.linemode = 0;
          gpu.modeclocks = 0;
        }
        gpu.bgtilebase = val & 16 ? 0 : 2048;
        gpu.bgmapbase = val & 8 ? 7168 : 6144;
        gpu.wintilebase = val & 64 ? 7168 : 6144;
        gpu.winon = val & 32 ? 1 : 0;
        gpu.objsize = val & 4 ? 1 : 0;
        gpu.objon = val & 2 ? 1 : 0;
        gpu.bgon = val & 1 ? 1 : 0;
        if (gpu.objon) {
          const nonzero = gpu.objdata.filter((o) => o.y > -16 || o.x > -8);
          console.log("[GPU] objon=1, nonzero OAM:", nonzero.length, nonzero.slice(0, 5));
        }
        break;
      case 2:
        gpu.yscrl = val;
        break;
      case 3:
        gpu.xscrl = val;
        break;
      case 4:
        gpu.curline = 0;
        break;
      case 5:
        gpu.raster = val;
        break;
      case 10:
        gpu.winy = val;
        break;
      case 11:
        gpu.winx = val;
        break;
      case 7:
        for (let i = 0; i < 4; i++) {
          let c = val >> i * 2 & 3;
          gpu.palette.bg[i] = [255, 192, 96, 0][c];
        }
        break;
      case 8:
        for (let i = 0; i < 4; i++) {
          let c = val >> i * 2 & 3;
          gpu.palette.obj0[i] = [255, 192, 96, 0][c];
        }
        break;
      case 9:
        for (let i = 0; i < 4; i++) {
          let c = val >> i * 2 & 3;
          gpu.palette.obj1[i] = [255, 192, 96, 0][c];
        }
        break;
    }
  }
};

// src/mbc.ts
var MBC0 = class {
  rom;
  constructor(rom) {
    this.rom = rom;
  }
  readByte(addr) {
    if (addr >= 0 && addr <= 32767) {
      return this.rom[addr] ?? 255;
    }
    return 255;
  }
  writeByte(_addr, _value) {
  }
};
var MBC1 = class {
  rom;
  ram;
  ramEnabled = false;
  romBank = 1;
  ramBank = 0;
  mode = 0;
  // 0: ROM Banking Mode, 1: RAM Banking Mode
  constructor(rom, ramSize) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
  }
  readByte(addr) {
    if (addr >= 0 && addr <= 16383) {
      return this.rom[addr] ?? 255;
    }
    if (addr >= 16384 && addr <= 32767) {
      const bank = this.romBank;
      const offset = bank * 16384 + (addr - 16384);
      return this.rom[offset] ?? 255;
    }
    if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled || this.ram.length === 0) return 255;
      const bank = this.mode === 1 ? this.ramBank : 0;
      const offset = bank * 8192 + (addr - 40960);
      return this.ram[offset % this.ram.length] ?? 255;
    }
    return 255;
  }
  writeByte(addr, value) {
    if (addr >= 0 && addr <= 8191) {
      this.ramEnabled = (value & 15) === 10;
    } else if (addr >= 8192 && addr <= 16383) {
      let bank = value & 31;
      if (bank === 0) bank = 1;
      this.romBank = this.romBank & 96 | bank;
    } else if (addr >= 16384 && addr <= 24575) {
      const bits = value & 3;
      if (this.mode === 0) {
        this.romBank = this.romBank & 31 | bits << 5;
      } else {
        this.ramBank = bits;
      }
    } else if (addr >= 24576 && addr <= 32767) {
      this.mode = value & 1;
    } else if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled || this.ram.length === 0) return;
      const bank = this.mode === 1 ? this.ramBank : 0;
      const offset = bank * 8192 + (addr - 40960);
      this.ram[offset % this.ram.length] = value;
    }
  }
};
var MBC3 = class {
  rom;
  ram;
  ramEnabled = false;
  romBank = 1;
  ramBank = 0;
  rtcRegisters = new Uint8Array(5);
  // S, M, H, DL, DH
  latchValue = 255;
  constructor(rom, ramSize) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
  }
  readByte(addr) {
    if (addr >= 0 && addr <= 16383) {
      return this.rom[addr] ?? 255;
    }
    if (addr >= 16384 && addr <= 32767) {
      const offset = this.romBank * 16384 + (addr - 16384);
      return this.rom[offset] ?? 255;
    }
    if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled) return 255;
      if (this.ramBank <= 3) {
        if (this.ram.length === 0) return 255;
        const offset = this.ramBank * 8192 + (addr - 40960);
        return this.ram[offset % this.ram.length] ?? 255;
      } else if (this.ramBank >= 8 && this.ramBank <= 12) {
        return this.rtcRegisters[this.ramBank - 8];
      }
    }
    return 255;
  }
  writeByte(addr, value) {
    if (addr >= 0 && addr <= 8191) {
      this.ramEnabled = (value & 15) === 10;
    } else if (addr >= 8192 && addr <= 16383) {
      this.romBank = value & 127;
      if (this.romBank === 0) this.romBank = 1;
    } else if (addr >= 16384 && addr <= 24575) {
      this.ramBank = value;
    } else if (addr >= 24576 && addr <= 32767) {
      if (this.latchValue === 0 && value === 1) {
      }
      this.latchValue = value;
    } else if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled) return;
      if (this.ramBank <= 3) {
        if (this.ram.length === 0) return;
        const offset = this.ramBank * 8192 + (addr - 40960);
        this.ram[offset % this.ram.length] = value;
      } else if (this.ramBank >= 8 && this.ramBank <= 12) {
        this.rtcRegisters[this.ramBank - 8] = value;
      }
    }
  }
};
var MBC5 = class {
  rom;
  ram;
  ramEnabled = false;
  romBank = 1;
  ramBank = 0;
  constructor(rom, ramSize) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
  }
  readByte(addr) {
    if (addr >= 0 && addr <= 16383) {
      return this.rom[addr] ?? 255;
    }
    if (addr >= 16384 && addr <= 32767) {
      const offset = this.romBank * 16384 + (addr - 16384);
      return this.rom[offset] ?? 255;
    }
    if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled || this.ram.length === 0) return 255;
      const offset = this.ramBank * 8192 + (addr - 40960);
      return this.ram[offset % this.ram.length] ?? 255;
    }
    return 255;
  }
  writeByte(addr, value) {
    if (addr >= 0 && addr <= 8191) {
      this.ramEnabled = (value & 15) === 10;
    } else if (addr >= 8192 && addr <= 12287) {
      this.romBank = this.romBank & 256 | value;
    } else if (addr >= 12288 && addr <= 16383) {
      this.romBank = this.romBank & 255 | (value & 1) << 8;
    } else if (addr >= 16384 && addr <= 24575) {
      this.ramBank = value & 15;
    } else if (addr >= 40960 && addr <= 49151) {
      if (!this.ramEnabled || this.ram.length === 0) return;
      const offset = this.ramBank * 8192 + (addr - 40960);
      this.ram[offset % this.ram.length] = value;
    }
  }
};

// src/joypad.ts
var joypad = {
  // Current state of the joypad buttons (0 = pressed, 1 = released)
  // Bits: 3: Start/Down, 2: Select/Up, 1: B/Left, 0: A/Right
  buttons: 15,
  directions: 15,
  select: 48,
  // Bits 4 and 5 of 0xFF00
  reset: () => {
    joypad.buttons = 15;
    joypad.directions = 15;
    joypad.select = 48;
  },
  /**
   * Initializes the joypad by setting up event listeners.
   */
  init: () => {
    window.addEventListener("keydown", (e) => {
      joypad.keyDown(e.code);
    });
    window.addEventListener("keyup", (e) => {
      joypad.keyUp(e.code);
    });
    log.out("JOY", "Joypad event listeners attached.");
  },
  /**
   * Reads from the 0xFF00 register.
   * Bits 4 and 5 select which button group to read:
   * - Bit 4 LOW (0x10): Read direction buttons
   * - Bit 5 LOW (0x20): Read action buttons
   * @param regVal - The current value of the 0xFF00 register (bits 4 and 5 indicate which buttons to read).
   * @returns The value to be returned when reading from 0xFF00.
   */
  rb: (regVal) => {
    const rv = regVal === void 0 ? joypad.select : regVal;
    let res = 15;
    if (!(rv & 16)) {
      res &= joypad.directions;
    }
    if (!(rv & 32)) {
      res &= joypad.buttons;
    }
    const finalVal = 192 | rv & 48 | res;
    return finalVal;
  },
  keyDown: (code) => {
    let pressed = true;
    switch (code) {
      case "ArrowRight":
        joypad.directions &= ~1;
        break;
      // Right
      case "ArrowLeft":
        joypad.directions &= ~2;
        break;
      // Left
      case "ArrowUp":
        joypad.directions &= ~4;
        break;
      // Up
      case "ArrowDown":
        joypad.directions &= ~8;
        break;
      // Down
      case "KeyZ":
        joypad.buttons &= ~1;
        break;
      // A
      case "KeyX":
        joypad.buttons &= ~2;
        break;
      // B
      case "ShiftLeft":
      case "ShiftRight":
        joypad.buttons &= ~4;
        break;
      // Select
      case "Enter":
        joypad.buttons &= ~8;
        break;
      // Start
      default:
        pressed = false;
        break;
    }
    if (pressed) {
      console.log(`Joypad key down: ${code}`);
      mmu.intf |= 16;
    }
  },
  keyUp: (code) => {
    switch (code) {
      case "ArrowRight":
        joypad.directions |= 1;
        break;
      // Right
      case "ArrowLeft":
        joypad.directions |= 2;
        break;
      // Left
      case "ArrowUp":
        joypad.directions |= 4;
        break;
      // Up
      case "ArrowDown":
        joypad.directions |= 8;
        break;
      // Down
      case "KeyZ":
        joypad.buttons |= 1;
        break;
      // A
      case "KeyX":
        joypad.buttons |= 2;
        break;
      // B
      case "ShiftLeft":
      case "ShiftRight":
        joypad.buttons |= 4;
        break;
      // Select
      case "Enter":
        joypad.buttons |= 8;
        break;
      // Start
      default:
        break;
    }
  }
};

// src/mmu.ts
var MMU = class {
  bios = new Uint8Array([
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
    251,
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
  ]);
  mbc = new MBC0(new Uint8Array(0));
  wram = new Uint8Array(8192);
  zram = new Uint8Array(128);
  inbios = 1;
  inte = 0;
  intf = 0;
  // Timer registers
  div = 0;
  tima = 0;
  tma = 0;
  tac = 0;
  div_cnt = 0;
  tima_cnt = 0;
  constructor() {
    this.reset();
  }
  /**
   * Resets the memory to its initial state.
   */
  reset() {
    this.wram.fill(0);
    this.zram.fill(0);
    this.inbios = 1;
    this.inte = 0;
    this.intf = 0;
    this.div = 0;
    this.tima = 0;
    this.tma = 0;
    this.tac = 0;
    this.div_cnt = 0;
    this.tima_cnt = 0;
  }
  /**
   * Sets the Memory Banking Controller (MBC).
   * @param mbc - The MBC to use.
   */
  setMBC(mbc) {
    this.mbc = mbc;
  }
  /**
   * Reads a byte from the given address.
   * @param addr - The memory address to read from.
   * @returns The byte at the given address.
   */
  rb(addr) {
    switch (addr & 61440) {
      // 0x0000 - 0x3FFF: ROM Bank 0 (BIOS if inbios and addr < 0x100)
      case 0:
        if (this.inbios && addr < 256) return this.bios[addr];
        return this.mbc.readByte(addr);
      case 4096:
      case 8192:
      case 12288:
        return this.mbc.readByte(addr);
      // 0x4000 - 0x7FFF: ROM Bank 01-NN
      case 16384:
      case 20480:
      case 24576:
      case 28672:
        return this.mbc.readByte(addr);
      // 0x8000 - 0x9FFF: VRAM
      case 32768:
      case 36864:
        return gpu.vram[addr & 8191];
      // 0xA000 - 0xBFFF: External RAM (ERAM)
      case 40960:
      case 45056:
        return this.mbc.readByte(addr);
      // 0xC000 - 0xDFFF: Work RAM (WRAM)
      case 49152:
      case 53248:
        return this.wram[addr & 8191];
      // 0xE000 - 0xFDFF: Echo RAM (Mirror of WRAM 0xC000-0xDDFF)
      case 57344:
        return this.wram[addr & 8191];
      // 0xF000 range: OAM, I/O, HRAM, IE
      case 61440:
        if (addr >= 65024 && addr <= 65183) {
          return gpu.oam[addr & 255];
        } else if (addr >= 65184 && addr <= 65279) {
          return 255;
        } else if (addr >= 65280 && addr <= 65407) {
          if (addr >= 65344 && addr <= 65359) return gpu.rb(addr);
          if (addr === 65295) return this.intf;
          if (addr === 65280) return joypad.rb(joypad.select);
          if (addr === 65284) return this.div;
          if (addr === 65285) return this.tima;
          if (addr === 65286) return this.tma;
          if (addr === 65287) return this.tac;
          return 255;
        } else if (addr >= 65408 && addr <= 65534) {
          return this.zram[addr & 127];
        } else if (addr === 65535) {
          return this.inte;
        } else if (addr >= 57344 && addr <= 65023) {
          return this.wram[addr & 8191];
        }
    }
    return 255;
  }
  /**
   * Reads a word from the given address.
   * @param addr - The memory address to read from.
   * @returns The word at the given address.
   */
  rw(addr) {
    return this.rb(addr) | this.rb(addr + 1) << 8;
  }
  /**
   * Writes a byte to the given address.
   * @param addr - The memory address to write to.
   * @param val - The byte value to write.
   * @returns The written value.
   */
  wb(addr, val) {
    switch (addr & 61440) {
      // 0x0000 - 0x7FFF: ROM area (MBC registers)
      case 0:
      case 4096:
      case 8192:
      case 12288:
      case 16384:
      case 20480:
      case 24576:
      case 28672:
        this.mbc.writeByte(addr, val);
        break;
      // 0x8000 - 0x9FFF: VRAM
      case 32768:
      case 36864:
        gpu.vram[addr & 8191] = val;
        gpu.updatetile(addr, val);
        break;
      // 0xA000 - 0xBFFF: External RAM (ERAM)
      case 40960:
      case 45056:
        this.mbc.writeByte(addr, val);
        break;
      // 0xC000 - 0xDFFF: Work RAM (WRAM)
      case 49152:
      case 53248:
        this.wram[addr & 8191] = val;
        break;
      // 0xE000 - 0xFDFF: Echo RAM (Mirror of WRAM 0xC000-0xDDFF)
      case 57344:
        this.wram[addr & 8191] = val;
        break;
      // 0xF000 range: OAM, I/O, HRAM, IE
      case 61440:
        if (addr >= 65024 && addr <= 65183) {
          gpu.oam[addr & 255] = val;
          gpu.updateoam(addr, val);
        } else if (addr >= 65184 && addr <= 65279) {
          break;
        } else if (addr >= 65280 && addr <= 65407) {
          if (addr === 65350) {
            for (let i = 0; i < 160; i++) {
              const v = this.rb((val << 8) + i);
              gpu.oam[i] = v;
              gpu.updateoam(65024 + i, v);
            }
          } else if (addr === 65280) {
            joypad.select = val & 48;
          } else if (addr === 65284) {
            this.div = 0;
            this.div_cnt = 0;
          } else if (addr === 65285) {
            this.tima = val;
          } else if (addr === 65286) {
            this.tma = val;
          } else if (addr === 65287) {
            this.tac = val & 7;
          } else if (addr >= 65344 && addr <= 65359) {
            gpu.wb(addr, val);
          } else if (addr === 65295) {
            this.intf = val;
          } else if (addr === 65360 && val === 1) {
            this.inbios = 0;
          }
        } else if (addr >= 65408 && addr <= 65534) {
          this.zram[addr & 127] = val;
        } else if (addr === 65535) {
          this.inte = val;
        } else if (addr >= 57344 && addr <= 65023) {
          this.wram[addr & 8191] = val;
        }
        break;
    }
    return val;
  }
  /**
   * Updates the Game Boy timers.
   * @param m - Number of m-cycles that passed.
   */
  updateTimer(m) {
    this.div_cnt += m;
    while (this.div_cnt >= 64) {
      this.div = this.div + 1 & 255;
      this.div_cnt -= 64;
    }
    if (this.tac & 4) {
      this.tima_cnt += m;
      let threshold = 0;
      switch (this.tac & 3) {
        case 0:
          threshold = 256;
          break;
        // 4096Hz
        case 1:
          threshold = 4;
          break;
        // 262144Hz
        case 2:
          threshold = 16;
          break;
        // 65536Hz
        case 3:
          threshold = 64;
          break;
      }
      while (this.tima_cnt >= threshold) {
        this.tima = this.tima + 1 & 255;
        if (this.tima === 0) {
          this.tima = this.tma;
          this.intf |= 4;
        }
        this.tima_cnt -= threshold;
      }
    }
  }
  /**
   * Writes a word to the given address.
   * @param addr - The memory address to write to.
   * @param val - The word value to write.
   * @returns The written value.
   */
  ww(addr, val) {
    this.wb(addr, val & 255);
    this.wb(addr + 1, val >> 8 & 255);
    return val;
  }
};
var mmu = new MMU();

// src/cpu.ts
var cpu = {
  // Flag Constants
  FLAGS: {
    Z: 128,
    N: 64,
    H: 32,
    C: 16
  },
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
    ime: 0,
    ime_cnt: 0
  },
  // 16-bit register accessors
  get bc() {
    return cpu.reg.b << 8 | cpu.reg.c;
  },
  set bc(val) {
    cpu.reg.b = val >> 8 & 255;
    cpu.reg.c = val & 255;
  },
  get de() {
    return cpu.reg.d << 8 | cpu.reg.e;
  },
  set de(val) {
    cpu.reg.d = val >> 8 & 255;
    cpu.reg.e = val & 255;
  },
  get hl() {
    return cpu.reg.h << 8 | cpu.reg.l;
  },
  set hl(val) {
    cpu.reg.h = val >> 8 & 255;
    cpu.reg.l = val & 255;
  },
  get af() {
    return cpu.reg.a << 8 | cpu.reg.f;
  },
  set af(val) {
    cpu.reg.a = val >> 8 & 255;
    cpu.reg.f = val & 240;
  },
  halt: 0,
  stop: 0,
  reset: () => {
    cpu.reg.a = 1;
    cpu.reg.f = 176;
    cpu.reg.b = 0;
    cpu.reg.c = 19;
    cpu.reg.d = 0;
    cpu.reg.e = 216;
    cpu.reg.h = 1;
    cpu.reg.l = 77;
    cpu.reg.sp = 65534;
    cpu.reg.pc = 256;
    cpu.reg.m = 0;
    cpu.reg.t = 0;
    cpu.reg.ime = 0;
    cpu.reg.ime_cnt = 0;
    cpu.halt = 0;
    cpu.stop = 0;
    cpu.clock.m = 0;
    cpu.clock.t = 0;
  },
  step: () => {
    if (cpu.stop) {
      if (mmu.intf & mmu.inte & 16) {
        cpu.stop = 0;
      } else {
        cpu.reg.m = 1;
        cpu.reg.t = 4;
        cpu.clock.m += cpu.reg.m;
        cpu.clock.t += cpu.reg.t;
        return;
      }
    }
    if (cpu.interrupts()) {
    } else if (cpu.halt) {
      cpu.reg.m = 1;
    } else {
      let opcode = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
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
    if (cpu.reg.ime) {
      let fired = mmu.inte & mmu.intf & 31;
      if (fired) {
        for (let i = 0; i < 5; i++) {
          if (fired & 1 << i) {
            cpu.serviceInterrupt(i);
            return true;
          }
        }
      }
    } else {
      if (mmu.inte & mmu.intf) {
        cpu.halt = 0;
      }
    }
    return false;
  },
  serviceInterrupt: (i) => {
    cpu.reg.ime = 0;
    cpu.reg.ime_cnt = 0;
    cpu.halt = 0;
    mmu.intf &= ~(1 << i);
    cpu.reg.sp = cpu.reg.sp - 2 & 65535;
    mmu.ww(cpu.reg.sp, cpu.reg.pc);
    switch (i) {
      case 0:
        cpu.reg.pc = 64;
        break;
      // V-Blank
      case 1:
        cpu.reg.pc = 72;
        break;
      // LCD STAT
      case 2:
        cpu.reg.pc = 80;
        break;
      // Timer
      case 3:
        cpu.reg.pc = 88;
        break;
      // Serial
      case 4:
        cpu.reg.pc = 96;
        break;
    }
    cpu.reg.m = 5;
  },
  ops: {
    XX: () => {
      console.error("Unknown opcode at " + (cpu.reg.pc - 1).toString(16));
      cpu.stop = 1;
    },
    NOP: () => {
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    // 8-bit Loads
    LD_r_r: (r1, r2) => {
      cpu.reg[r1] = cpu.reg[r2];
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    LD_r_n: (r) => {
      cpu.reg[r] = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_r_hl: (r) => {
      cpu.reg[r] = mmu.rb(cpu.hl);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_r: (r) => {
      mmu.wb(cpu.hl, cpu.reg[r]);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_n: () => {
      mmu.wb(cpu.hl, mmu.rb(cpu.reg.pc));
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_a_bc: () => {
      cpu.reg.a = mmu.rb(cpu.bc);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_de: () => {
      cpu.reg.a = mmu.rb(cpu.de);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_a_nn: () => {
      cpu.reg.a = mmu.rb(mmu.rw(cpu.reg.pc));
      cpu.reg.pc = cpu.reg.pc + 2 & 65535;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    LD_bc_a: () => {
      mmu.wb(cpu.bc, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_de_a: () => {
      mmu.wb(cpu.de, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_nn_a: () => {
      mmu.wb(mmu.rw(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc = cpu.reg.pc + 2 & 65535;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    LD_a_ff00n: () => {
      cpu.reg.a = mmu.rb(65280 + mmu.rb(cpu.reg.pc));
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_ff00n_a: () => {
      mmu.wb(65280 + mmu.rb(cpu.reg.pc), cpu.reg.a);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_a_ff00c: () => {
      cpu.reg.a = mmu.rb(65280 + cpu.reg.c);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_ff00c_a: () => {
      mmu.wb(65280 + cpu.reg.c, cpu.reg.a);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDI_hl_a: () => {
      mmu.wb(cpu.hl, cpu.reg.a);
      cpu.hl = cpu.hl + 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDI_a_hl: () => {
      cpu.reg.a = mmu.rb(cpu.hl);
      cpu.hl = cpu.hl + 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDD_hl_a: () => {
      mmu.wb(cpu.hl, cpu.reg.a);
      cpu.hl = cpu.hl - 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LDD_a_hl: () => {
      cpu.reg.a = mmu.rb(cpu.hl);
      cpu.hl = cpu.hl - 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    // 16-bit Loads
    LD_rr_nn: (rr) => {
      cpu[rr] = mmu.rw(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 2 & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    LD_nn_sp: () => {
      mmu.ww(mmu.rw(cpu.reg.pc), cpu.reg.sp);
      cpu.reg.pc = cpu.reg.pc + 2 & 65535;
      cpu.reg.m = 5;
      cpu.reg.t = 20;
    },
    LD_sp_hl: () => {
      cpu.reg.sp = cpu.hl;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    LD_hl_sp_n: () => {
      let n = mmu.rb(cpu.reg.pc);
      if (n > 127) n -= 256;
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.f = 0;
      if ((cpu.reg.sp & 15) + (n & 15) > 15) cpu.reg.f |= cpu.FLAGS.H;
      if ((cpu.reg.sp & 255) + (n & 255) > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.hl = cpu.reg.sp + n & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    PUSH_rr: (rr) => {
      cpu.reg.sp = cpu.reg.sp - 2 & 65535;
      mmu.ww(cpu.reg.sp, cpu[rr]);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    POP_rr: (rr) => {
      cpu[rr] = mmu.rw(cpu.reg.sp);
      cpu.reg.sp = cpu.reg.sp + 2 & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    // 8-bit Arithmetic/Logic
    ADD_a_r: (r) => {
      let val = cpu.reg[r];
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADD_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADD_a_n: () => {
      let val = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      let res = cpu.reg.a + val;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADC_a_r: (r) => {
      let val = cpu.reg[r];
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) + carry > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    ADC_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) + carry > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADC_a_n: () => {
      let val = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a + val + carry;
      cpu.reg.f = 0;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) + (val & 15) + carry > 15) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SUB_a_r: (r) => {
      let val = cpu.reg[r];
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SUB_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SUB_a_n: () => {
      let val = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SBC_a_r: (r) => {
      let val = cpu.reg[r];
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15) + carry) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SBC_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15) + carry) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SBC_a_n: () => {
      let val = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let res = cpu.reg.a - val - carry;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15) + carry) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.a = res & 255;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    AND_a_r: (r) => {
      cpu.reg.a &= cpu.reg[r];
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    AND_a_hl: () => {
      cpu.reg.a &= mmu.rb(cpu.hl);
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    AND_a_n: () => {
      cpu.reg.a &= mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.f = cpu.FLAGS.H;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    XOR_a_r: (r) => {
      cpu.reg.a ^= cpu.reg[r];
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    XOR_a_hl: () => {
      cpu.reg.a ^= mmu.rb(cpu.hl);
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    XOR_a_n: () => {
      cpu.reg.a ^= mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    OR_a_r: (r) => {
      cpu.reg.a |= cpu.reg[r];
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    OR_a_hl: () => {
      cpu.reg.a |= mmu.rb(cpu.hl);
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    OR_a_n: () => {
      cpu.reg.a |= mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.f = 0;
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    CP_a_r: (r) => {
      let val = cpu.reg[r];
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CP_a_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    CP_a_n: () => {
      let val = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      let res = cpu.reg.a - val;
      cpu.reg.f = cpu.FLAGS.N;
      if (!(res & 255)) cpu.reg.f |= cpu.FLAGS.Z;
      if ((cpu.reg.a & 15) < (val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      if (res < 0) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    INC_r: (r) => {
      let val = cpu.reg[r];
      let res = val + 1 & 255;
      cpu.reg.f &= cpu.FLAGS.C;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 15) === 15) cpu.reg.f |= cpu.FLAGS.H;
      cpu.reg[r] = res;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    INC_hlm: () => {
      let val = mmu.rb(cpu.hl);
      let res = val + 1 & 255;
      cpu.reg.f &= cpu.FLAGS.C;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      if ((val & 15) === 15) cpu.reg.f |= cpu.FLAGS.H;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    DEC_r: (r) => {
      let val = cpu.reg[r];
      let res = val - 1 & 255;
      cpu.reg.f &= cpu.FLAGS.C;
      cpu.reg.f |= cpu.FLAGS.N;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      if (!(val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      cpu.reg[r] = res;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DEC_hlm: () => {
      let val = mmu.rb(cpu.hl);
      let res = val - 1 & 255;
      cpu.reg.f &= cpu.FLAGS.C;
      cpu.reg.f |= cpu.FLAGS.N;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      if (!(val & 15)) cpu.reg.f |= cpu.FLAGS.H;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    // 16-bit Arithmetic
    ADD_hl_rr: (rr) => {
      let val = cpu[rr];
      let res = cpu.hl + val;
      cpu.reg.f &= cpu.FLAGS.Z;
      if ((cpu.hl & 4095) + (val & 4095) > 4095) cpu.reg.f |= cpu.FLAGS.H;
      if (res > 65535) cpu.reg.f |= cpu.FLAGS.C;
      cpu.hl = res & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    ADD_sp_n: () => {
      let n = mmu.rb(cpu.reg.pc);
      if (n > 127) n -= 256;
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      cpu.reg.f = 0;
      if ((cpu.reg.sp & 15) + (n & 15) > 15) cpu.reg.f |= cpu.FLAGS.H;
      if ((cpu.reg.sp & 255) + (n & 255) > 255) cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.sp = cpu.reg.sp + n & 65535;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    INC_rr: (rr) => {
      cpu[rr] = cpu[rr] + 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    DEC_rr: (rr) => {
      cpu[rr] = cpu[rr] - 1 & 65535;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    // Rotates and Shifts
    RLCA: () => {
      let carry = cpu.reg.a & 128 ? 1 : 0;
      cpu.reg.a = (cpu.reg.a << 1 | carry) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      cpu.reg.f &= ~cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RLA: () => {
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = cpu.reg.a & 128 ? 1 : 0;
      cpu.reg.a = (cpu.reg.a << 1 | carry) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      cpu.reg.f &= ~cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RRCA: () => {
      let carry = cpu.reg.a & 1 ? 1 : 0;
      cpu.reg.a = (cpu.reg.a >> 1 | carry << 7) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      cpu.reg.f &= ~cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RRA: () => {
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = cpu.reg.a & 1 ? 1 : 0;
      cpu.reg.a = (cpu.reg.a >> 1 | carry << 7) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      cpu.reg.f &= ~cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    RLC: (r) => {
      let val = cpu.reg[r];
      let carry = val & 128 ? 1 : 0;
      let res = (val << 1 | carry) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RLC_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = val & 128 ? 1 : 0;
      let res = (val << 1 | carry) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RL: (r) => {
      let val = cpu.reg[r];
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = val & 128 ? 1 : 0;
      let res = (val << 1 | carry) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RL_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = val & 128 ? 1 : 0;
      let res = (val << 1 | carry) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RRC: (r) => {
      let val = cpu.reg[r];
      let carry = val & 1 ? 1 : 0;
      let res = (val >> 1 | carry << 7) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RRC_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = val & 1 ? 1 : 0;
      let res = (val >> 1 | carry << 7) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RR: (r) => {
      let val = cpu.reg[r];
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = val & 1 ? 1 : 0;
      let res = (val >> 1 | carry << 7) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RR_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = cpu.reg.f & cpu.FLAGS.C ? 1 : 0;
      let newCarry = val & 1 ? 1 : 0;
      let res = (val >> 1 | carry << 7) & 255;
      cpu.reg.f = newCarry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    SLA: (r) => {
      let val = cpu.reg[r];
      let carry = val & 128 ? 1 : 0;
      let res = val << 1 & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SLA_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = val & 128 ? 1 : 0;
      let res = val << 1 & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    SRA: (r) => {
      let val = cpu.reg[r];
      let carry = val & 1 ? 1 : 0;
      let res = (val >> 1 | val & 128) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRA_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = val & 1 ? 1 : 0;
      let res = (val >> 1 | val & 128) & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    SRL: (r) => {
      let val = cpu.reg[r];
      let carry = val & 1 ? 1 : 0;
      let res = val >> 1 & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SRL_hl: () => {
      let val = mmu.rb(cpu.hl);
      let carry = val & 1 ? 1 : 0;
      let res = val >> 1 & 255;
      cpu.reg.f = carry ? cpu.FLAGS.C : 0;
      if (!res) cpu.reg.f |= cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    SWAP: (r) => {
      let val = cpu.reg[r];
      let res = (val & 15) << 4 | val >> 4;
      cpu.reg.f = res ? 0 : cpu.FLAGS.Z;
      cpu.reg[r] = res;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SWAP_hl: () => {
      let val = mmu.rb(cpu.hl);
      let res = (val & 15) << 4 | val >> 4;
      cpu.reg.f = res ? 0 : cpu.FLAGS.Z;
      mmu.wb(cpu.hl, res);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    // Bit Ops
    BIT: (b, r) => {
      let val = cpu.reg[r];
      cpu.reg.f = cpu.reg.f & cpu.FLAGS.C | cpu.FLAGS.H;
      if (!(val >> b & 1)) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    BIT_hl: (b) => {
      let val = mmu.rb(cpu.hl);
      cpu.reg.f = cpu.reg.f & cpu.FLAGS.C | cpu.FLAGS.H;
      if (!(val >> b & 1)) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    SET: (b, r) => {
      cpu.reg[r] |= 1 << b;
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    SET_hl: (b) => {
      mmu.wb(cpu.hl, mmu.rb(cpu.hl) | 1 << b);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RES: (b, r) => {
      cpu.reg[r] &= ~(1 << b);
      cpu.reg.m = 2;
      cpu.reg.t = 8;
    },
    RES_hl: (b) => {
      mmu.wb(cpu.hl, mmu.rb(cpu.hl) & ~(1 << b));
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    // Jumps and Calls
    JP_nn: () => {
      cpu.reg.pc = mmu.rw(cpu.reg.pc);
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    JP_cc_nn: (cc) => {
      if (cc()) {
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m = 4;
        cpu.reg.t = 16;
      } else {
        cpu.reg.pc = cpu.reg.pc + 2 & 65535;
        cpu.reg.m = 3;
        cpu.reg.t = 12;
      }
    },
    JP_hl: () => {
      cpu.reg.pc = cpu.hl;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    JR_n: () => {
      let n = mmu.rb(cpu.reg.pc);
      if (n > 127) n -= 256;
      cpu.reg.pc = cpu.reg.pc + 1 + n & 65535;
      cpu.reg.m = 3;
      cpu.reg.t = 12;
    },
    JR_cc_n: (cc) => {
      let n = mmu.rb(cpu.reg.pc);
      if (n > 127) n -= 256;
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      if (cc()) {
        cpu.reg.pc = cpu.reg.pc + n & 65535;
        cpu.reg.m = 3;
        cpu.reg.t = 12;
      } else {
        cpu.reg.m = 2;
        cpu.reg.t = 8;
      }
    },
    CALL_nn: () => {
      cpu.reg.sp = cpu.reg.sp - 2 & 65535;
      mmu.ww(cpu.reg.sp, cpu.reg.pc + 2 & 65535);
      cpu.reg.pc = mmu.rw(cpu.reg.pc);
      cpu.reg.m = 6;
      cpu.reg.t = 24;
    },
    CALL_cc_nn: (cc) => {
      if (cc()) {
        cpu.reg.sp = cpu.reg.sp - 2 & 65535;
        mmu.ww(cpu.reg.sp, cpu.reg.pc + 2 & 65535);
        cpu.reg.pc = mmu.rw(cpu.reg.pc);
        cpu.reg.m = 6;
        cpu.reg.t = 24;
      } else {
        cpu.reg.pc = cpu.reg.pc + 2 & 65535;
        cpu.reg.m = 3;
        cpu.reg.t = 12;
      }
    },
    RET: () => {
      cpu.reg.pc = mmu.rw(cpu.reg.sp);
      cpu.reg.sp = cpu.reg.sp + 2 & 65535;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RET_cc: (cc) => {
      if (cc()) {
        cpu.reg.pc = mmu.rw(cpu.reg.sp);
        cpu.reg.sp = cpu.reg.sp + 2 & 65535;
        cpu.reg.m = 5;
        cpu.reg.t = 20;
      } else {
        cpu.reg.m = 2;
        cpu.reg.t = 8;
      }
    },
    RETI: () => {
      cpu.reg.ime = 1;
      cpu.reg.pc = mmu.rw(cpu.reg.sp);
      cpu.reg.sp = cpu.reg.sp + 2 & 65535;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    RST: (n) => {
      cpu.reg.sp = cpu.reg.sp - 2 & 65535;
      mmu.ww(cpu.reg.sp, cpu.reg.pc);
      cpu.reg.pc = n;
      cpu.reg.m = 4;
      cpu.reg.t = 16;
    },
    // Misc
    DAA: () => {
      let a = cpu.reg.a;
      let d = 0;
      if (cpu.reg.f & cpu.FLAGS.H || !(cpu.reg.f & cpu.FLAGS.N) && (a & 15) > 9) d |= 6;
      if (cpu.reg.f & cpu.FLAGS.C || !(cpu.reg.f & cpu.FLAGS.N) && a > 153) {
        d |= 96;
        cpu.reg.f |= cpu.FLAGS.C;
      }
      cpu.reg.a = (cpu.reg.f & cpu.FLAGS.N ? a - d : a + d) & 255;
      cpu.reg.f &= ~(cpu.FLAGS.Z | cpu.FLAGS.H);
      if (!cpu.reg.a) cpu.reg.f |= cpu.FLAGS.Z;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CPL: () => {
      cpu.reg.a ^= 255;
      cpu.reg.f |= cpu.FLAGS.N | cpu.FLAGS.H;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    SCF: () => {
      cpu.reg.f &= ~cpu.FLAGS.N;
      cpu.reg.f &= ~cpu.FLAGS.H;
      cpu.reg.f |= cpu.FLAGS.C;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    CCF: () => {
      cpu.reg.f &= ~cpu.FLAGS.N;
      cpu.reg.f &= ~cpu.FLAGS.H;
      cpu.reg.f ^= cpu.FLAGS.C;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    DI: () => {
      cpu.reg.ime = 0;
      cpu.reg.ime_cnt = 0;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    EI: () => {
      cpu.reg.ime_cnt = 1;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    HALT: () => {
      cpu.halt = 1;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    STOP: () => {
      console.log("STOP at PC=" + (cpu.reg.pc - 1).toString(16));
      cpu.stop = 1;
      cpu.reg.m = 1;
      cpu.reg.t = 4;
    },
    MAPcb: () => {
      let opcode = mmu.rb(cpu.reg.pc);
      cpu.reg.pc = cpu.reg.pc + 1 & 65535;
      if (cpu.cbmap[opcode]) {
        cpu.cbmap[opcode]();
      } else {
        cpu.ops.XX();
      }
    }
  },
  map: [],
  cbmap: []
};
var cZ = () => cpu.reg.f & cpu.FLAGS.Z;
var cNZ = () => !(cpu.reg.f & cpu.FLAGS.Z);
var cC = () => cpu.reg.f & cpu.FLAGS.C;
var cNC = () => !(cpu.reg.f & cpu.FLAGS.C);
cpu.map = new Array(256).fill(cpu.ops.XX);
cpu.cbmap = new Array(256).fill(cpu.ops.XX);
var regs = ["b", "c", "d", "e", "h", "l", "hl", "a"];
cpu.map[0] = cpu.ops.NOP;
cpu.map[16] = cpu.ops.STOP;
cpu.map[118] = cpu.ops.HALT;
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8; j++) {
    if (i === 6 && j === 6) continue;
    let r1 = regs[i];
    let r2 = regs[j];
    if (r1 === "hl") {
      cpu.map[64 + i * 8 + j] = () => cpu.ops.LD_hl_r(r2);
    } else if (r2 === "hl") {
      cpu.map[64 + i * 8 + j] = () => cpu.ops.LD_r_hl(r1);
    } else {
      cpu.map[64 + i * 8 + j] = () => cpu.ops.LD_r_r(r1, r2);
    }
  }
}
cpu.map[54] = cpu.ops.LD_hl_n;
for (let i = 0; i < 8; i++) {
  let r = regs[i];
  if (r === "hl") continue;
  cpu.map[6 + i * 8] = () => cpu.ops.LD_r_n(r);
}
for (let i = 0; i < 8; i++) {
  let r = regs[i];
  if (r === "hl") {
    cpu.map[128 + i] = cpu.ops.ADD_a_hl;
    cpu.map[136 + i] = cpu.ops.ADC_a_hl;
    cpu.map[144 + i] = cpu.ops.SUB_a_hl;
    cpu.map[152 + i] = cpu.ops.SBC_a_hl;
    cpu.map[160 + i] = cpu.ops.AND_a_hl;
    cpu.map[168 + i] = cpu.ops.XOR_a_hl;
    cpu.map[176 + i] = cpu.ops.OR_a_hl;
    cpu.map[184 + i] = cpu.ops.CP_a_hl;
  } else {
    cpu.map[128 + i] = () => cpu.ops.ADD_a_r(r);
    cpu.map[136 + i] = () => cpu.ops.ADC_a_r(r);
    cpu.map[144 + i] = () => cpu.ops.SUB_a_r(r);
    cpu.map[152 + i] = () => cpu.ops.SBC_a_r(r);
    cpu.map[160 + i] = () => cpu.ops.AND_a_r(r);
    cpu.map[168 + i] = () => cpu.ops.XOR_a_r(r);
    cpu.map[176 + i] = () => cpu.ops.OR_a_r(r);
    cpu.map[184 + i] = () => cpu.ops.CP_a_r(r);
  }
}
cpu.map[198] = cpu.ops.ADD_a_n;
cpu.map[206] = cpu.ops.ADC_a_n;
cpu.map[214] = cpu.ops.SUB_a_n;
cpu.map[222] = cpu.ops.SBC_a_n;
cpu.map[230] = cpu.ops.AND_a_n;
cpu.map[238] = cpu.ops.XOR_a_n;
cpu.map[246] = cpu.ops.OR_a_n;
cpu.map[254] = cpu.ops.CP_a_n;
for (let i = 0; i < 8; i++) {
  let r = regs[i];
  if (r === "hl") {
    cpu.map[52] = cpu.ops.INC_hlm;
    cpu.map[53] = cpu.ops.DEC_hlm;
  } else {
    cpu.map[4 + i * 8] = () => cpu.ops.INC_r(r);
    cpu.map[5 + i * 8] = () => cpu.ops.DEC_r(r);
  }
}
cpu.map[1] = () => cpu.ops.LD_rr_nn("bc");
cpu.map[17] = () => cpu.ops.LD_rr_nn("de");
cpu.map[33] = () => cpu.ops.LD_rr_nn("hl");
cpu.map[49] = () => cpu.ops.LD_rr_nn("sp");
cpu.map[8] = cpu.ops.LD_nn_sp;
cpu.map[249] = cpu.ops.LD_sp_hl;
cpu.map[248] = cpu.ops.LD_hl_sp_n;
cpu.map[197] = () => cpu.ops.PUSH_rr("bc");
cpu.map[213] = () => cpu.ops.PUSH_rr("de");
cpu.map[229] = () => cpu.ops.PUSH_rr("hl");
cpu.map[245] = () => cpu.ops.PUSH_rr("af");
cpu.map[193] = () => cpu.ops.POP_rr("bc");
cpu.map[209] = () => cpu.ops.POP_rr("de");
cpu.map[225] = () => cpu.ops.POP_rr("hl");
cpu.map[241] = () => cpu.ops.POP_rr("af");
cpu.map[9] = () => cpu.ops.ADD_hl_rr("bc");
cpu.map[25] = () => cpu.ops.ADD_hl_rr("de");
cpu.map[41] = () => cpu.ops.ADD_hl_rr("hl");
cpu.map[57] = () => cpu.ops.ADD_hl_rr("sp");
cpu.map[232] = cpu.ops.ADD_sp_n;
cpu.map[3] = () => cpu.ops.INC_rr("bc");
cpu.map[19] = () => cpu.ops.INC_rr("de");
cpu.map[35] = () => cpu.ops.INC_rr("hl");
cpu.map[51] = () => cpu.ops.INC_rr("sp");
cpu.map[11] = () => cpu.ops.DEC_rr("bc");
cpu.map[27] = () => cpu.ops.DEC_rr("de");
cpu.map[43] = () => cpu.ops.DEC_rr("hl");
cpu.map[59] = () => cpu.ops.DEC_rr("sp");
cpu.map[10] = cpu.ops.LD_a_bc;
cpu.map[26] = cpu.ops.LD_a_de;
cpu.map[250] = cpu.ops.LD_a_nn;
cpu.map[2] = cpu.ops.LD_bc_a;
cpu.map[18] = cpu.ops.LD_de_a;
cpu.map[234] = cpu.ops.LD_nn_a;
cpu.map[242] = cpu.ops.LD_a_ff00c;
cpu.map[226] = cpu.ops.LD_ff00c_a;
cpu.map[240] = cpu.ops.LD_a_ff00n;
cpu.map[224] = cpu.ops.LD_ff00n_a;
cpu.map[34] = cpu.ops.LDI_hl_a;
cpu.map[42] = cpu.ops.LDI_a_hl;
cpu.map[50] = cpu.ops.LDD_hl_a;
cpu.map[58] = cpu.ops.LDD_a_hl;
cpu.map[7] = cpu.ops.RLCA;
cpu.map[23] = cpu.ops.RLA;
cpu.map[15] = cpu.ops.RRCA;
cpu.map[31] = cpu.ops.RRA;
cpu.map[195] = cpu.ops.JP_nn;
cpu.map[194] = () => cpu.ops.JP_cc_nn(cNZ);
cpu.map[202] = () => cpu.ops.JP_cc_nn(cZ);
cpu.map[210] = () => cpu.ops.JP_cc_nn(cNC);
cpu.map[218] = () => cpu.ops.JP_cc_nn(cC);
cpu.map[233] = cpu.ops.JP_hl;
cpu.map[24] = cpu.ops.JR_n;
cpu.map[32] = () => cpu.ops.JR_cc_n(cNZ);
cpu.map[40] = () => cpu.ops.JR_cc_n(cZ);
cpu.map[48] = () => cpu.ops.JR_cc_n(cNC);
cpu.map[56] = () => cpu.ops.JR_cc_n(cC);
cpu.map[205] = cpu.ops.CALL_nn;
cpu.map[196] = () => cpu.ops.CALL_cc_nn(cNZ);
cpu.map[204] = () => cpu.ops.CALL_cc_nn(cZ);
cpu.map[212] = () => cpu.ops.CALL_cc_nn(cNC);
cpu.map[220] = () => cpu.ops.CALL_cc_nn(cC);
cpu.map[201] = cpu.ops.RET;
cpu.map[192] = () => cpu.ops.RET_cc(cNZ);
cpu.map[200] = () => cpu.ops.RET_cc(cZ);
cpu.map[208] = () => cpu.ops.RET_cc(cNC);
cpu.map[216] = () => cpu.ops.RET_cc(cC);
cpu.map[217] = cpu.ops.RETI;
for (let i = 0; i < 8; i++) cpu.map[199 + i * 8] = () => cpu.ops.RST(i * 8);
cpu.map[203] = cpu.ops.MAPcb;
cpu.map[39] = cpu.ops.DAA;
cpu.map[47] = cpu.ops.CPL;
cpu.map[55] = cpu.ops.SCF;
cpu.map[63] = cpu.ops.CCF;
cpu.map[243] = cpu.ops.DI;
cpu.map[251] = cpu.ops.EI;
for (let i = 0; i < 8; i++) {
  let r = regs[i];
  if (r === "hl") {
    cpu.cbmap[0 + i] = cpu.ops.RLC_hl;
    cpu.cbmap[8 + i] = cpu.ops.RRC_hl;
    cpu.cbmap[16 + i] = cpu.ops.RL_hl;
    cpu.cbmap[24 + i] = cpu.ops.RR_hl;
    cpu.cbmap[32 + i] = cpu.ops.SLA_hl;
    cpu.cbmap[40 + i] = cpu.ops.SRA_hl;
    cpu.cbmap[48 + i] = cpu.ops.SWAP_hl;
    cpu.cbmap[56 + i] = cpu.ops.SRL_hl;
  } else {
    cpu.cbmap[0 + i] = () => cpu.ops.RLC(r);
    cpu.cbmap[8 + i] = () => cpu.ops.RRC(r);
    cpu.cbmap[16 + i] = () => cpu.ops.RL(r);
    cpu.cbmap[24 + i] = () => cpu.ops.RR(r);
    cpu.cbmap[32 + i] = () => cpu.ops.SLA(r);
    cpu.cbmap[40 + i] = () => cpu.ops.SRA(r);
    cpu.cbmap[48 + i] = () => cpu.ops.SWAP(r);
    cpu.cbmap[56 + i] = () => cpu.ops.SRL(r);
  }
}
for (let b = 0; b < 8; b++) {
  for (let i = 0; i < 8; i++) {
    let r = regs[i];
    if (r === "hl") {
      cpu.cbmap[64 + b * 8 + i] = () => cpu.ops.BIT_hl(b);
      cpu.cbmap[128 + b * 8 + i] = () => cpu.ops.RES_hl(b);
      cpu.cbmap[192 + b * 8 + i] = () => cpu.ops.SET_hl(b);
    } else {
      cpu.cbmap[64 + b * 8 + i] = () => cpu.ops.BIT(b, r);
      cpu.cbmap[128 + b * 8 + i] = () => cpu.ops.RES(b, r);
      cpu.cbmap[192 + b * 8 + i] = () => cpu.ops.SET(b, r);
    }
  }
}

// src/cartridge.ts
var NINTENDO_LOGO = new Uint8Array([
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
  62
]);
var CARTRIDGE_TYPE_MAP = {
  0: "ROM ONLY",
  1: "MBC1",
  2: "MBC1+RAM",
  3: "MBC1+RAM+BATTERY",
  5: "MBC2",
  6: "MBC2+BATTERY",
  8: "ROM+RAM",
  9: "ROM+RAM+BATTERY",
  11: "MMM01",
  12: "MMM01+RAM",
  13: "MMM01+RAM+BATTERY",
  15: "MBC3+TIMER+BATTERY",
  16: "MBC3+TIMER+RAM+BATTERY",
  17: "MBC3",
  18: "MBC3+RAM",
  19: "MBC3+RAM+BATTERY",
  25: "MBC5",
  26: "MBC5+RAM",
  27: "MBC5+RAM+BATTERY",
  28: "MBC5+RUMBLE",
  29: "MBC5+RUMBLE+RAM",
  30: "MBC5+RUMBLE+RAM+BATTERY",
  32: "MBC6",
  34: "MBC7+SENSOR+RUMBLE+RAM+BATTERY",
  252: "POCKET CAMERA",
  253: "BANDAI TAMA5",
  254: "HuC3",
  255: "HuC1+RAM+BATTERY"
};
var ROM_BANKS_MAP = {
  0: 2,
  // 32KB
  1: 4,
  // 64KB
  2: 8,
  // 128KB
  3: 16,
  // 256KB
  4: 32,
  // 512KB
  5: 64,
  // 1MB
  6: 128,
  // 2MB
  7: 256,
  // 4MB
  8: 512,
  // 8MB
  82: 72,
  // 1.1MB
  83: 80,
  // 1.2MB
  84: 96
  // 1.5MB
};
var RAM_BANKS_MAP = {
  0: 0,
  1: 1,
  // 2KB (partial bank)
  2: 1,
  // 8KB
  3: 4,
  // 32KB
  4: 16,
  // 128KB
  5: 8
  // 64KB
};
var RAM_SIZE_MAP = {
  0: 0,
  1: 2048,
  2: 8192,
  3: 32768,
  4: 131072,
  5: 65536
};
var parseHeader = (rom) => {
  let title = "";
  for (let i = 308; i <= 323; i++) {
    if (rom[i] === 0) break;
    title += String.fromCharCode(rom[i]);
  }
  const type = rom[327];
  const typeName = CARTRIDGE_TYPE_MAP[type] || "UNKNOWN";
  const romSizeCode = rom[328];
  const ramSizeCode = rom[329];
  const romBanks = ROM_BANKS_MAP[romSizeCode] || 0;
  const ramBanks = RAM_BANKS_MAP[ramSizeCode] || 0;
  const ramSize = RAM_SIZE_MAP[ramSizeCode] || 0;
  const romSize = romBanks * 16384;
  let checksum = 0;
  for (let i = 308; i <= 332; i++) {
    checksum = checksum - rom[i] - 1 & 255;
  }
  const headerChecksum = rom[333];
  const isHeaderChecksumValid = checksum === headerChecksum;
  let gChecksum = 0;
  for (let i = 0; i < rom.length; i++) {
    if (i !== 334 && i !== 335) {
      gChecksum = gChecksum + rom[i] & 65535;
    }
  }
  const globalChecksum = rom[334] << 8 | rom[335];
  const isGlobalChecksumValid = gChecksum === globalChecksum;
  let isLogoValid = true;
  for (let i = 0; i < NINTENDO_LOGO.length; i++) {
    if (rom[260 + i] !== NINTENDO_LOGO[i]) {
      isLogoValid = false;
      break;
    }
  }
  return {
    title,
    type,
    typeName,
    romSize,
    ramSize,
    romBanks,
    ramBanks,
    headerChecksum,
    isHeaderChecksumValid,
    globalChecksum,
    isGlobalChecksumValid,
    isLogoValid
  };
};
var loadRom = async (source) => {
  let rom;
  if (typeof source === "string") {
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch ROM from ${source}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      rom = new Uint8Array(buffer);
    } else {
      try {
        const fs = await import("fs");
        const buffer = fs.readFileSync(source);
        rom = new Uint8Array(buffer);
      } catch (error) {
        throw new Error(`Failed to read ROM from disk at ${source}: ${error}`);
      }
    }
  } else if (source instanceof Uint8Array) {
    rom = source;
  } else {
    throw new Error("Invalid ROM source provided. Expected string or Uint8Array.");
  }
  const headerInfo = parseHeader(rom);
  const cartridge = {
    rom,
    mbc: createMBC(rom, headerInfo.type, headerInfo.ramSize),
    ...headerInfo
  };
  return cartridge;
};
var createMBC = (rom, type, ramSize) => {
  switch (type) {
    case 0:
    // ROM ONLY
    case 8:
    // ROM+RAM
    case 9:
      return new MBC0(rom);
    case 1:
    // MBC1
    case 2:
    // MBC1+RAM
    case 3:
      return new MBC1(rom, ramSize);
    case 15:
    // MBC3+TIMER+BATTERY
    case 16:
    // MBC3+TIMER+RAM+BATTERY
    case 17:
    // MBC3
    case 18:
    // MBC3+RAM
    case 19:
      return new MBC3(rom, ramSize);
    case 25:
    // MBC5
    case 26:
    // MBC5+RAM
    case 27:
    // MBC5+RAM+BATTERY
    case 28:
    // MBC5+RUMBLE
    case 29:
    // MBC5+RUMBLE+RAM
    case 30:
      return new MBC5(rom, ramSize);
    default:
      console.warn(`Unsupported cartridge type: 0x${type.toString(16)}. Defaulting to MBC0.`);
      return new MBC0(rom);
  }
};

// src/main.ts
var emulator = {
  init: () => {
    log.reset();
    mmu.reset();
    cpu.reset();
    gpu.reset();
    joypad.reset();
    joypad.init();
    log.out("EMU", "Emulator initialized.");
  },
  loadRom: async (source) => {
    try {
      log.out("EMU", `Loading ROM from ${typeof source === "string" ? source : "Uint8Array"}...`);
      const cartridge = await loadRom(source);
      mmu.setMBC(cartridge.mbc);
      log.out("EMU", `ROM loaded: ${cartridge.rom.length} bytes.`);
      return true;
    } catch (error) {
      log.out("EMU", `Error loading ROM: ${error}`);
      return false;
    }
  },
  _rafId: 0,
  run: async (source) => {
    if (emulator._rafId) {
      cancelAnimationFrame(emulator._rafId);
      emulator._rafId = 0;
    }
    emulator.init();
    const loaded = await emulator.loadRom(source);
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
    if (emulator._frameCount === void 0) emulator._frameCount = 0;
    emulator._frameCount++;
    if (emulator._frameCount % 60 === 0) {
      log.out("EMU", `Frame ${emulator._frameCount} rendered.`);
    }
    emulator._rafId = requestAnimationFrame(emulator.loop);
  }
};
var start = () => {
  log.out("EMU", "Ready. Select a ROM to begin.");
};
if (document.readyState === "complete" || document.readyState === "interactive") {
  start();
} else {
  window.addEventListener("DOMContentLoaded", start);
}
window.loadRomFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const bytes = new Uint8Array(e.target.result);
    emulator.run(bytes);
  };
  reader.readAsArrayBuffer(file);
};
export {
  cpu,
  emulator,
  gpu,
  joypad,
  log,
  mmu
};
