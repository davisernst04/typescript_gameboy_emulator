/**
 * Interface for Memory Banking Controllers (MBC).
 */
export interface IMBC {
  /**
   * Reads a byte from the cartridge ROM or RAM.
   * @param addr - The address to read from.
   * @returns The byte at the given address.
   */
  readByte(addr: number): number;

  /**
   * Writes a byte to the MBC registers or cartridge RAM.
   * @param addr - The address to write to.
   * @param value - The value to write.
   */
  writeByte(addr: number, value: number): void;
}

/**
 * MBC0: No banking support.
 * Used for small ROMs up to 32KB.
 */
export class MBC0 implements IMBC {
  private rom: Uint8Array;

  constructor(rom: Uint8Array) {
    this.rom = rom;
  }

  readByte(addr: number): number {
    if (addr >= 0x0000 && addr <= 0x7fff) {
      return this.rom[addr] ?? 0xff;
    }
    return 0xff;
  }

  writeByte(_addr: number, _value: number): void {
    // MBC0 does not support banking or RAM writes via registers.
  }
}

/**
 * MBC1: Basic ROM and RAM banking support.
 * Supports up to 2MB ROM and 32KB RAM.
 */
export class MBC1 implements IMBC {
  private rom: Uint8Array;
  private ram: Uint8Array;
  private ramEnabled: boolean = false;
  private romBankLow: number = 1;
  private romBankHigh: number = 0;
  private romBanks: number;
  private ramBanks: number;
  private mode: number = 0; // 0: ROM Banking Mode, 1: RAM Banking Mode

  constructor(rom: Uint8Array, ramSize: number, romBanks: number, ramBanks: number) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
    this.romBanks = romBanks;
    this.ramBanks = ramBanks;
  }

  readByte(addr: number): number {
    // 0x0000 - 0x3FFF: ROM Bank 00 (Fixed, but can be banked in Mode 1)
    if (addr >= 0x0000 && addr <= 0x3fff) {
      let bank = 0;
      if (this.mode === 1) {
        bank = (this.romBankHigh << 5);
      }
      bank %= this.romBanks;
      const offset = (bank * 16384) + addr;
      return this.rom[offset] ?? 0xff;
    }
    // 0x4000 - 0x7FFF: ROM Bank 01-7F (Switchable)
    if (addr >= 0x4000 && addr <= 0x7fff) {
      let bank = (this.romBankHigh << 5) | this.romBankLow;
      bank %= this.romBanks;
      const offset = (bank * 16384) + (addr - 0x4000);
      return this.rom[offset] ?? 0xff;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-03 (Switchable)
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled || this.ram.length === 0) return 0xff;
      let bank = 0;
      if (this.mode === 1) {
        bank = this.romBankHigh;
      }
      bank %= this.ramBanks || 1;
      const offset = (bank * 8192) + (addr - 0xa000);
      return this.ram[offset % this.ram.length] ?? 0xff;
    }
    return 0xff;
  }

  writeByte(addr: number, value: number): void {
    // 0x0000 - 0x1FFF: RAM Enable
    if (addr >= 0x0000 && addr <= 0x1fff) {
      this.ramEnabled = (value & 0x0f) === 0x0a;
    }
    // 0x2000 - 0x3FFF: ROM Bank Number
    else if (addr >= 0x2000 && addr <= 0x3fff) {
      this.romBankLow = value & 0x1f;
      if (this.romBankLow === 0) this.romBankLow = 1;
    }
    // 0x4000 - 0x5FFF: RAM Bank Number / Upper Bits of ROM Bank Number
    else if (addr >= 0x4000 && addr <= 0x5fff) {
      this.romBankHigh = value & 0x03;
    }
    // 0x6000 - 0x7FFF: Banking Mode Select
    else if (addr >= 0x6000 && addr <= 0x7fff) {
      this.mode = value & 0x01;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-03 (Switchable)
    else if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled || this.ram.length === 0) return;
      let bank = 0;
      if (this.mode === 1) {
        bank = this.romBankHigh;
      }
      bank %= this.ramBanks || 1;
      const offset = (bank * 8192) + (addr - 0xa000);
      this.ram[offset % this.ram.length] = value;
    }
  }
}

/**
 * MBC3: ROM and RAM banking with Real Time Clock (RTC) support.
 * Supports up to 2MB ROM and 32KB RAM.
 */
export class MBC3 implements IMBC {
  private rom: Uint8Array;
  private ram: Uint8Array;
  private ramEnabled: boolean = false;
  private romBank: number = 1;
  private ramBank: number = 0;
  private romBanks: number;
  private ramBanks: number;
  private rtcRegisters: Uint8Array = new Uint8Array(5); // S, M, H, DL, DH
  private latchValue: number = 0xff;

  constructor(rom: Uint8Array, ramSize: number, romBanks: number, ramBanks: number) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
    this.romBanks = romBanks;
    this.ramBanks = ramBanks;
  }

  readByte(addr: number): number {
    // 0x0000 - 0x3FFF: ROM Bank 00 (Fixed)
    if (addr >= 0x0000 && addr <= 0x3fff) {
      return this.rom[addr] ?? 0xff;
    }
    // 0x4000 - 0x7FFF: ROM Bank 01-7F (Switchable)
    if (addr >= 0x4000 && addr <= 0x7fff) {
      const bank = this.romBank % this.romBanks;
      const offset = (bank * 16384) + (addr - 0x4000);
      return this.rom[offset] ?? 0xff;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-03 or RTC Registers
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled) return 0xff;
      if (this.ramBank <= 0x03) {
        if (this.ram.length === 0) return 0xff;
        const bank = this.ramBank % (this.ramBanks || 1);
        const offset = (bank * 8192) + (addr - 0xa000);
        return this.ram[offset % this.ram.length] ?? 0xff;
      } else if (this.ramBank >= 0x08 && this.ramBank <= 0x0c) {
        return this.rtcRegisters[this.ramBank - 0x08];
      }
    }
    return 0xff;
  }

  writeByte(addr: number, value: number): void {
    // 0x0000 - 0x1FFF: RAM and RTC Enable
    if (addr >= 0x0000 && addr <= 0x1fff) {
      this.ramEnabled = (value & 0x0f) === 0x0a;
    }
    // 0x2000 - 0x3FFF: ROM Bank Number
    else if (addr >= 0x2000 && addr <= 0x3fff) {
      this.romBank = value & 0x7f;
      if (this.romBank === 0) this.romBank = 1;
    }
    // 0x4000 - 0x5FFF: RAM Bank Number / RTC Register Select
    else if (addr >= 0x4000 && addr <= 0x5fff) {
      this.ramBank = value;
    }
    // 0x6000 - 0x7FFF: Latch Clock Data
    else if (addr >= 0x6000 && addr <= 0x7fff) {
      if (this.latchValue === 0x00 && value === 0x01) {
        // Latch RTC data (TODO: implement real clock)
      }
      this.latchValue = value;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-03 or RTC Registers
    else if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled) return;
      if (this.ramBank <= 0x03) {
        if (this.ram.length === 0) return;
        const bank = this.ramBank % (this.ramBanks || 1);
        const offset = (bank * 8192) + (addr - 0xa000);
        this.ram[offset % this.ram.length] = value;
      } else if (this.ramBank >= 0x08 && this.ramBank <= 0x0c) {
        this.rtcRegisters[this.ramBank - 0x08] = value;
      }
    }
  }
}

/**
 * MBC5: Advanced ROM and RAM banking.
 * Supports up to 8MB ROM and 128KB RAM.
 */
export class MBC5 implements IMBC {
  private rom: Uint8Array;
  private ram: Uint8Array;
  private ramEnabled: boolean = false;
  private romBank: number = 1;
  private ramBank: number = 0;
  private romBanks: number;
  private ramBanks: number;

  constructor(rom: Uint8Array, ramSize: number, romBanks: number, ramBanks: number) {
    this.rom = rom;
    this.ram = new Uint8Array(ramSize);
    this.romBanks = romBanks;
    this.ramBanks = ramBanks;
  }

  readByte(addr: number): number {
    // 0x0000 - 0x3FFF: ROM Bank 00 (Fixed)
    if (addr >= 0x0000 && addr <= 0x3fff) {
      return this.rom[addr] ?? 0xff;
    }
    // 0x4000 - 0x7FFF: ROM Bank 000-1FF (Switchable)
    if (addr >= 0x4000 && addr <= 0x7fff) {
      const bank = this.romBank % this.romBanks;
      const offset = (bank * 16384) + (addr - 0x4000);
      return this.rom[offset] ?? 0xff;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-0F (Switchable)
    if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled || this.ram.length === 0) return 0xff;
      const bank = this.ramBank % (this.ramBanks || 1);
      const offset = (bank * 8192) + (addr - 0xa000);
      return this.ram[offset % this.ram.length] ?? 0xff;
    }
    return 0xff;
  }

  writeByte(addr: number, value: number): void {
    // 0x0000 - 0x1FFF: RAM Enable
    if (addr >= 0x0000 && addr <= 0x1fff) {
      this.ramEnabled = (value & 0x0f) === 0x0a;
    }
    // 0x2000 - 0x2FFF: ROM Bank Number (Lower 8 bits)
    else if (addr >= 0x2000 && addr <= 0x2fff) {
      this.romBank = (this.romBank & 0x100) | value;
    }
    // 0x3000 - 0x3FFF: ROM Bank Number (9th bit)
    else if (addr >= 0x3000 && addr <= 0x3fff) {
      this.romBank = (this.romBank & 0xff) | ((value & 0x01) << 8);
    }
    // 0x4000 - 0x5FFF: RAM Bank Number
    else if (addr >= 0x4000 && addr <= 0x5fff) {
      this.ramBank = value & 0x0f;
    }
    // 0xA000 - 0xBFFF: RAM Bank 00-0F (Switchable)
    else if (addr >= 0xa000 && addr <= 0xbfff) {
      if (!this.ramEnabled || this.ram.length === 0) return;
      const bank = this.ramBank % (this.ramBanks || 1);
      const offset = (bank * 8192) + (addr - 0xa000);
      this.ram[offset % this.ram.length] = value;
    }
  }
}
