import { gpu } from "./gpu.js";
import { IMBC, MBC0 } from "./mbc.js";
import { joypad } from "./joypad.js";

/**
 * Memory Management Unit (MMU) for the Game Boy.
 * Handles memory mapping and access to different hardware components.
 */
export class MMU {
  private bios = new Uint8Array([
    0x31, 0xfe, 0xff, 0xaf, 0x21, 0xff, 0x9f, 0x32, 0xcb, 0x7c, 0x20, 0xfb,
    0x21, 0x26, 0xff, 0x0e, 0x11, 0x3e, 0x80, 0x32, 0xe2, 0x0c, 0x3e, 0xf3,
    0xe2, 0x32, 0x3e, 0x77, 0x77, 0x3e, 0xfc, 0xe0, 0x47, 0x11, 0x04, 0x01,
    0x21, 0x10, 0x80, 0x1a, 0xcd, 0x95, 0x00, 0xcd, 0x96, 0x00, 0x13, 0x7b,
    0xfe, 0x34, 0x20, 0xf3, 0x11, 0xd8, 0x00, 0x06, 0x08, 0x1a, 0x13, 0x22,
    0x23, 0x05, 0x20, 0xf9, 0x3e, 0x19, 0xea, 0x10, 0x99, 0x21, 0x2f, 0x99,
    0x0e, 0x0c, 0x3d, 0x28, 0x08, 0x32, 0x0d, 0x20, 0xf9, 0x2e, 0x0f, 0x18,
    0xf3, 0x67, 0x3e, 0x64, 0x57, 0xe0, 0x42, 0x3e, 0x91, 0xe0, 0x40, 0x04,
    0x1e, 0x02, 0x0e, 0x0c, 0xf0, 0x44, 0xfe, 0x90, 0x20, 0xfa, 0x0d, 0x20,
    0xf7, 0x1d, 0x20, 0xf2, 0x0e, 0x13, 0x24, 0x7c, 0x1e, 0x83, 0xfe, 0x62,
    0x28, 0x06, 0x1e, 0xc1, 0xfe, 0x64, 0x20, 0x06, 0x7b, 0xe2, 0x0c, 0x3e,
    0x87, 0xf2, 0xf0, 0x42, 0x90, 0xe0, 0x42, 0x15, 0x20, 0xd2, 0x05, 0x20,
    0x4f, 0x16, 0x20, 0x18, 0xcb, 0x4f, 0x06, 0x04, 0xc5, 0xcb, 0x11, 0x17,
    0xc1, 0xcb, 0x11, 0x17, 0x05, 0x20, 0xf5, 0x22, 0x23, 0x22, 0x23, 0xc9,
    0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83,
    0x00, 0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e,
    0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63,
    0x6e, 0x0e, 0xec, 0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
    0x3c, 0x42, 0xb9, 0xa5, 0xb9, 0xa5, 0x42, 0x4c, 0x21, 0x04, 0x01, 0x11,
    0xa8, 0x00, 0x1a, 0x13, 0xbe, 0x20, 0xfb, 0x23, 0x7d, 0xfe, 0x34, 0x20,
    0xf5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xfb, 0x86, 0x20, 0xfe,
    0x3e, 0x01, 0xe0, 0x50,
  ]);

  public mbc: IMBC = new MBC0(new Uint8Array(0));
  public wram = new Uint8Array(8192);
  public zram = new Uint8Array(128);

  public inbios = 1;
  public inte = 0;
  public intf = 0;

  // Timer registers
  public div = 0;
  public tima = 0;
  public tma = 0;
  public tac = 0;
  public div_cnt = 0;
  public tima_cnt = 0;

  // Serial registers / debug capture
  public serialData = 0;
  public serialControl = 0;
  public serialOutput = "";

  // CGB speed switch (KEY1 / FF4D)
  public cgbDoubleSpeed = 0;
  public cgbPrepareSpeedSwitch = 0;

  constructor() {
    this.reset();
  }

  /**
   * Resets the memory to its initial state.
   */
  reset() {
    this.wram.fill(0);
    this.zram.fill(0);
    // CPU reset starts from the post-boot register state at 0x0100,
    // so the boot ROM must already be unmapped.
    this.inbios = 0;
    this.inte = 0;
    this.intf = 0;
    this.div = 0;
    this.tima = 0;
    this.tma = 0;
    this.tac = 0;
    this.div_cnt = 0;
    this.tima_cnt = 0;
    this.serialData = 0;
    this.serialControl = 0;
    this.serialOutput = "";
    this.cgbDoubleSpeed = 0;
    this.cgbPrepareSpeedSwitch = 0;
  }

  /**
   * Sets the Memory Banking Controller (MBC).
   * @param mbc - The MBC to use.
   */
  setMBC(mbc: IMBC) {
    this.mbc = mbc;
  }

  /**
   * Reads a byte from the given address.
   * @param addr - The memory address to read from.
   * @returns The byte at the given address.
   */
  rb(addr: number): number {
    switch (addr & 0xf000) {
      // 0x0000 - 0x3FFF: ROM Bank 0 (BIOS if inbios and addr < 0x100)
      case 0x0000:
        if (this.inbios && addr < 0x0100) return this.bios[addr];
        return this.mbc.readByte(addr);
      case 0x1000:
      case 0x2000:
      case 0x3000:
        return this.mbc.readByte(addr);

      // 0x4000 - 0x7FFF: ROM Bank 01-NN
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        return this.mbc.readByte(addr);

      // 0x8000 - 0x9FFF: VRAM
      case 0x8000:
      case 0x9000:
        return gpu.vram[addr & 0x1fff];

      // 0xA000 - 0xBFFF: External RAM (ERAM)
      case 0xa000:
      case 0xb000:
        return this.mbc.readByte(addr);

      // 0xC000 - 0xDFFF: Work RAM (WRAM)
      case 0xc000:
      case 0xd000:
        return this.wram[addr & 0x1fff];

      // 0xE000 - 0xFDFF: Echo RAM (Mirror of WRAM 0xC000-0xDDFF)
      case 0xe000:
        return this.wram[addr & 0x1fff];

      // 0xF000 range: OAM, I/O, HRAM, IE
      case 0xf000:
        if (addr >= 0xfe00 && addr <= 0xfe9f) {
          // OAM (Object Attribute Memory)
          return gpu.oam[addr & 0xff];
        } else if (addr >= 0xfea0 && addr <= 0xfeff) {
          // Prohibited area
          return 0xff;
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
          // I/O Registers
          if (addr === 0xff00) return joypad.rb(joypad.select);
          if (addr === 0xff01) return this.serialData;
          if (addr === 0xff02) return this.serialControl;
          if (addr === 0xff04) return this.div;
          if (addr === 0xff05) return this.tima;
          if (addr === 0xff06) return this.tma;
          if (addr === 0xff07) return this.tac | 0xf8;
          if (addr === 0xff0f) return this.intf | 0xe0;
          if (addr === 0xff4d) return 0x7e | (this.cgbDoubleSpeed ? 0x80 : 0) | (this.cgbPrepareSpeedSwitch ? 0x01 : 0);
          if (addr >= 0xff40 && addr <= 0xff4f) return gpu.rb(addr);
          return 0xff; // TODO: implement other I/O
        } else if (addr >= 0xff80 && addr <= 0xfffe) {
          // HRAM (High RAM / Zero Page RAM)
          return this.zram[addr & 0x7f];
        } else if (addr === 0xffff) {
          // IE (Interrupt Enable Register)
          return this.inte | 0xe0;
        } else if (addr >= 0xe000 && addr <= 0xfdff) {
            // Mirror of WRAM (continuation of Echo RAM)
            return this.wram[addr & 0x1fff];
        }
    }
    return 0xff;
  }

  /**
   * Reads a word from the given address.
   * @param addr - The memory address to read from.
   * @returns The word at the given address.
   */
  rw(addr: number): number {
    return this.rb(addr) | (this.rb(addr + 1) << 8);
  }

  /**
   * Writes a byte to the given address.
   * @param addr - The memory address to write to.
   * @param val - The byte value to write.
   * @returns The written value.
   */
  wb(addr: number, val: number): number {
    switch (addr & 0xf000) {
      // 0x0000 - 0x7FFF: ROM area (MBC registers)
      case 0x0000:
      case 0x1000:
      case 0x2000:
      case 0x3000:
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        this.mbc.writeByte(addr, val);
        break;

      // 0x8000 - 0x9FFF: VRAM
      case 0x8000:
      case 0x9000:
        gpu.vram[addr & 0x1fff] = val;
        gpu.updatetile(addr, val);
        break;

      // 0xA000 - 0xBFFF: External RAM (ERAM)
      case 0xa000:
      case 0xb000:
        this.mbc.writeByte(addr, val);
        break;

      // 0xC000 - 0xDFFF: Work RAM (WRAM)
      case 0xc000:
      case 0xd000:
        this.wram[addr & 0x1fff] = val;
        break;

      // 0xE000 - 0xFDFF: Echo RAM (Mirror of WRAM 0xC000-0xDDFF)
      case 0xe000:
        this.wram[addr & 0x1fff] = val;
        break;

      // 0xF000 range: OAM, I/O, HRAM, IE
      case 0xf000:
        if (addr >= 0xfe00 && addr <= 0xfe9f) {
          // OAM (Object Attribute Memory)
          gpu.oam[addr & 0xff] = val;
          gpu.updateoam(addr, val);
        } else if (addr >= 0xfea0 && addr <= 0xfeff) {
          // Prohibited area - do nothing
          break;
        } else if (addr >= 0xff00 && addr <= 0xff7f) {
          // I/O Registers
          if (addr === 0xff46) {
            // DMA Transfer
            for (let i = 0; i < 160; i++) {
              const v = this.rb((val << 8) + i);
              gpu.oam[i] = v;
              gpu.updateoam(0xfe00 + i, v);
            }
          } else if (addr === 0xff00) {
            // Only bits 4 and 5 are writable
            joypad.select = val & 0x30;
          } else if (addr === 0xff01) {
            this.serialData = val & 0xff;
          } else if (addr === 0xff02) {
            this.serialControl = val & 0xff;
            if (this.serialControl === 0x81) {
              const ch = String.fromCharCode(this.serialData);
              this.serialOutput += ch;
              console.log(ch);
            }
          } else if (addr === 0xff04) {
            this.div = 0;
            this.div_cnt = 0;
          } else if (addr === 0xff05) {
            this.tima = val;
          } else if (addr === 0xff06) {
            this.tma = val;
          } else if (addr === 0xff07) {
            this.tac = val & 7;
          } else if (addr === 0xff0f) {
            this.intf = val & 0x1F;
          } else if (addr === 0xff4d) {
            this.cgbPrepareSpeedSwitch = val & 0x01;
          } else if (addr >= 0xff40 && addr <= 0xff4f) {
            gpu.wb(addr, val);
          } else if (addr === 0xff50 && val === 1) {
            this.inbios = 0;
          }
        } else if (addr >= 0xff80 && addr <= 0xfffe) {
          // HRAM (High RAM / Zero Page RAM)
          this.zram[addr & 0x7f] = val;
        } else if (addr === 0xffff) {
          // IE (Interrupt Enable Register)
          this.inte = val;
        } else if (addr >= 0xe000 && addr <= 0xfdff) {
            // Mirror of WRAM (continuation of Echo RAM)
            this.wram[addr & 0x1fff] = val;
        }
        break;
    }
    return val;
  }

  /**
   * Updates the Game Boy timers.
   * @param m - Number of m-cycles that passed.
   */
  updateTimer(m: number) {
    // DIV increments at 16384Hz (every 64 m-cycles)
    this.div_cnt += m;
    while (this.div_cnt >= 64) {
      this.div = (this.div + 1) & 0xff;
      this.div_cnt -= 64;
    }

    // Timer enabled?
    if (this.tac & 0x04) {
      this.tima_cnt += m;
      let threshold = 0;
      switch (this.tac & 0x03) {
        case 0: threshold = 256; break; // 4096Hz
        case 1: threshold = 4; break;   // 262144Hz
        case 2: threshold = 16; break;  // 65536Hz
        case 3: threshold = 64; break;  // 16384Hz
      }

      while (this.tima_cnt >= threshold) {
        this.tima = (this.tima + 1) & 0xff;
        if (this.tima === 0) {
          // Overflow: reload and fire interrupt
          this.tima = this.tma;
          this.intf |= 0x04; // Timer interrupt
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
  ww(addr: number, val: number): number {
    this.wb(addr, val & 0xff);
    this.wb(addr + 1, (val >> 8) & 0xff);
    return val;
  }
}

export const mmu = new MMU();
