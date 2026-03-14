import { cpu } from './cpu.js';
import { gpu } from './gpu.js';
import { mmu } from './mmu.js';
import { log } from './log.js';
import { loadRom, ICartridge } from './cartridge.js';
import { joypad } from './joypad.js';

export { cpu, gpu, mmu, log, joypad };

export const emulator = {
  init: () => {
    log.reset();
    mmu.reset();
    cpu.reset();
    gpu.reset();
    joypad.reset();
    joypad.init();
    log.out('EMU', 'Emulator initialized.');
  },

  loadRom: async (source: string | Uint8Array) => {
    try {
      log.out('EMU', `Loading ROM from ${typeof source === 'string' ? source : 'Uint8Array'}...`);
      const cartridge: ICartridge = await loadRom(source);
      mmu.setMBC(cartridge.mbc);
      log.out('EMU', `ROM loaded: ${cartridge.rom.length} bytes.`);
      return true;
    } catch (error) {
      log.out('EMU', `Error loading ROM: ${error}`);
      return false;
    }
  },

  _rafId: 0 as number,

  run: async (source: string | Uint8Array) => {
    // Cancel any running loop first
    if (emulator._rafId) {
      cancelAnimationFrame(emulator._rafId);
      emulator._rafId = 0;
    }
    emulator.init();
    const loaded = await emulator.loadRom(source);
    if (loaded) {
      log.out('EMU', 'Starting emulation loop.');
      emulator.loop();
    } else {
      log.out('EMU', 'Failed to load ROM. Emulation not started.');
    }
  },

  loop: () => {
    let frameCycles = 0;
    while (frameCycles < 17556) {
      cpu.step();
      frameCycles += cpu.reg.m;
    }

    if ((emulator as any)._frameCount === undefined) (emulator as any)._frameCount = 0;
    (emulator as any)._frameCount++;
    if ((emulator as any)._frameCount % 60 === 0) {
      log.out('EMU', `Frame ${(emulator as any)._frameCount} rendered.`);
    }

    emulator._rafId = requestAnimationFrame(emulator.loop);
  }
};

// Start the emulator — waits for ROM file selection
export const start = () => {
  log.out('EMU', 'Ready. Select a ROM to begin.');
};

start();

