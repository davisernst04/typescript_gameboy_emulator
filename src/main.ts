import { cpu } from './cpu';
import { gpu } from './gpu';
import { mmu } from './mmu';
import { log } from './log';
import { loadRom, ICartridge } from './cartridge';
import { joypad } from './joypad';

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

  run: async () => {
    emulator.init();
    // Default ROM to load for testing
    const romUrl = 'ttt.gb'; 
    const loaded = await emulator.loadRom(romUrl);
    if (loaded) {
      log.out('EMU', 'Starting emulation loop.');
      emulator.loop();
    } else {
      log.out('EMU', 'Failed to load ROM. Emulation not started.');
    }
  },

  loop: () => {
    // Run for ~17556 m-cycles per frame
    let frameCycles = 0;
    while (frameCycles < 17556) {
      cpu.step();
      frameCycles += cpu.reg.m;
    }
    
    // Optional: Log every 60 frames to see if loop is running
    if ((emulator as any)._frameCount === undefined) (emulator as any)._frameCount = 0;
    (emulator as any)._frameCount++;
    if ((emulator as any)._frameCount % 60 === 0) {
      log.out('EMU', `Frame ${(emulator as any)._frameCount} rendered.`);
    }

    requestAnimationFrame(emulator.loop);
  }
};

// Start the emulator
const start = () => {
  log.out('EMU', 'Window/DOM loaded, starting emulator...');
  emulator.run();
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  window.addEventListener('DOMContentLoaded', start);
}
