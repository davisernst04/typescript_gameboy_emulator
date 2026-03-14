import { IMBC, MBC0, MBC1, MBC3, MBC5 } from './mbc.js';

/**
 * Interface representing a Game Boy cartridge.
 */
export interface ICartridge {
  rom: Uint8Array;
  mbc: IMBC;
  title: string;
  type: number;
  typeName: string;
  romSize: number;
  ramSize: number;
  romBanks: number;
  ramBanks: number;
  headerChecksum: number;
  isHeaderChecksumValid: boolean;
  globalChecksum: number;
  isGlobalChecksumValid: boolean;
  isLogoValid: boolean;
}

/**
 * Nintendo Logo sequence found in Game Boy ROM header (0x0104 - 0x0133).
 */
const NINTENDO_LOGO = new Uint8Array([
  0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D,
  0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E, 0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99,
  0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC, 0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E,
]);

/**
 * Mapping of cartridge type codes to human-readable names.
 */
const CARTRIDGE_TYPE_MAP: Record<number, string> = {
  0x00: 'ROM ONLY',
  0x01: 'MBC1',
  0x02: 'MBC1+RAM',
  0x03: 'MBC1+RAM+BATTERY',
  0x05: 'MBC2',
  0x06: 'MBC2+BATTERY',
  0x08: 'ROM+RAM',
  0x09: 'ROM+RAM+BATTERY',
  0x0B: 'MMM01',
  0x0C: 'MMM01+RAM',
  0x0D: 'MMM01+RAM+BATTERY',
  0x0F: 'MBC3+TIMER+BATTERY',
  0x10: 'MBC3+TIMER+RAM+BATTERY',
  0x11: 'MBC3',
  0x12: 'MBC3+RAM',
  0x13: 'MBC3+RAM+BATTERY',
  0x19: 'MBC5',
  0x1A: 'MBC5+RAM',
  0x1B: 'MBC5+RAM+BATTERY',
  0x1C: 'MBC5+RUMBLE',
  0x1D: 'MBC5+RUMBLE+RAM',
  0x1E: 'MBC5+RUMBLE+RAM+BATTERY',
  0x20: 'MBC6',
  0x22: 'MBC7+SENSOR+RUMBLE+RAM+BATTERY',
  0xFC: 'POCKET CAMERA',
  0xFD: 'BANDAI TAMA5',
  0xFE: 'HuC3',
  0xFF: 'HuC1+RAM+BATTERY',
};

/**
 * Mapping of ROM size codes to number of banks.
 */
const ROM_BANKS_MAP: Record<number, number> = {
  0x00: 2,   // 32KB
  0x01: 4,   // 64KB
  0x02: 8,   // 128KB
  0x03: 16,  // 256KB
  0x04: 32,  // 512KB
  0x05: 64,  // 1MB
  0x06: 128, // 2MB
  0x07: 256, // 4MB
  0x08: 512, // 8MB
  0x52: 72,  // 1.1MB
  0x53: 80,  // 1.2MB
  0x54: 96,  // 1.5MB
};

/**
 * Mapping of RAM size codes to number of banks.
 */
const RAM_BANKS_MAP: Record<number, number> = {
  0x00: 0,
  0x01: 1, // 2KB (partial bank)
  0x02: 1, // 8KB
  0x03: 4, // 32KB
  0x04: 16, // 128KB
  0x05: 8, // 64KB
};

/**
 * Mapping of RAM size codes to total bytes.
 */
const RAM_SIZE_MAP: Record<number, number> = {
  0x00: 0,
  0x01: 2048,
  0x02: 8192,
  0x03: 32768,
  0x04: 131072,
  0x05: 65536,
};

/**
 * Parses the ROM header to extract cartridge information.
 * 
 * @param rom - The ROM data as a Uint8Array.
 * @returns Partial ICartridge information from the header.
 */
export const parseHeader = (rom: Uint8Array) => {
  // Title (0x0134 - 0x0143)
  let title = '';
  for (let i = 0x0134; i <= 0x0143; i++) {
    if (rom[i] === 0) break;
    title += String.fromCharCode(rom[i]);
  }

  const type = rom[0x0147];
  const typeName = CARTRIDGE_TYPE_MAP[type] || 'UNKNOWN';
  const romSizeCode = rom[0x0148];
  const ramSizeCode = rom[0x0149];

  const romBanks = ROM_BANKS_MAP[romSizeCode] || 0;
  const ramBanks = RAM_BANKS_MAP[ramSizeCode] || 0;
  const ramSize = RAM_SIZE_MAP[ramSizeCode] || 0;
  const romSize = romBanks * 16384;

  // Header Checksum (0x014D)
  let checksum = 0;
  for (let i = 0x0134; i <= 0x014C; i++) {
    checksum = (checksum - rom[i] - 1) & 0xFF;
  }
  const headerChecksum = rom[0x014D];
  const isHeaderChecksumValid = checksum === headerChecksum;

  // Global Checksum (0x014E-014F)
  let gChecksum = 0;
  for (let i = 0; i < rom.length; i++) {
    if (i !== 0x014E && i !== 0x014F) {
      gChecksum = (gChecksum + rom[i]) & 0xFFFF;
    }
  }
  const globalChecksum = (rom[0x014E] << 8) | rom[0x014F];
  const isGlobalChecksumValid = gChecksum === globalChecksum;

  // Nintendo Logo Verification (0x0104-0x0133)
  let isLogoValid = true;
  for (let i = 0; i < NINTENDO_LOGO.length; i++) {
    if (rom[0x0104 + i] !== NINTENDO_LOGO[i]) {
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
    isLogoValid,
  };
};

/**
 * Loads a ROM from a given source (URL, path, or Uint8Array).
 * Supports both Browser and Node.js environments.
 * 
 * @param source - The source of the ROM data.
 * @returns A promise that resolves to an ICartridge object.
 */
export const loadRom = async (source: string | Uint8Array): Promise<ICartridge> => {
  let rom: Uint8Array;

  if (typeof source === 'string') {
    // Check if we are in a browser environment
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch ROM from ${source}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      rom = new Uint8Array(buffer);
    } else {
      // Assume Node.js environment
      try {
        // Use eval('require') to hide this from bundlers like Turbopack/Webpack
        const fs = eval('require')('fs');
        const buffer = fs.readFileSync(source);
        rom = new Uint8Array(buffer);
      } catch (error) {
        throw new Error(`Failed to read ROM from disk at ${source}: ${error}`);
      }
    }
  } else if (source instanceof Uint8Array) {
    rom = source;
  } else {
    throw new Error('Invalid ROM source provided. Expected string or Uint8Array.');
  }

  // Parse header information
  const headerInfo = parseHeader(rom);

  const cartridge: ICartridge = {
    rom,
    mbc: createMBC(rom, headerInfo.type, headerInfo.ramSize, headerInfo.romBanks, headerInfo.ramBanks),
    ...headerInfo,
  };

  return cartridge;
};

/**
 * Creates the appropriate MBC instance based on the cartridge type.
 * 
 * @param rom - The ROM data.
 * @param type - The cartridge type code from the header.
 * @param ramSize - The RAM size in bytes.
 * @param romBanks - Number of ROM banks.
 * @param ramBanks - Number of RAM banks.
 * @returns An instance of a class implementing IMBC.
 */
const createMBC = (rom: Uint8Array, type: number, ramSize: number, romBanks: number, ramBanks: number): IMBC => {
  switch (type) {
    case 0x00: // ROM ONLY
    case 0x08: // ROM+RAM
    case 0x09: // ROM+RAM+BATTERY
      return new MBC0(rom);
    case 0x01: // MBC1
    case 0x02: // MBC1+RAM
    case 0x03: // MBC1+RAM+BATTERY
      return new MBC1(rom, ramSize, romBanks, ramBanks);
    case 0x0f: // MBC3+TIMER+BATTERY
    case 0x10: // MBC3+TIMER+RAM+BATTERY
    case 0x11: // MBC3
    case 0x12: // MBC3+RAM
    case 0x13: // MBC3+RAM+BATTERY
      return new MBC3(rom, ramSize, romBanks, ramBanks);
    case 0x19: // MBC5
    case 0x1a: // MBC5+RAM
    case 0x1b: // MBC5+RAM+BATTERY
    case 0x1c: // MBC5+RUMBLE
    case 0x1d: // MBC5+RUMBLE+RAM
    case 0x1e: // MBC5+RUMBLE+RAM+BATTERY
      return new MBC5(rom, ramSize, romBanks, ramBanks);
    default:
      console.warn(`Unsupported cartridge type: 0x${type.toString(16)}. Defaulting to MBC0.`);
      return new MBC0(rom);
  }
};
