import { cpu } from './cpu';
import { gpu } from './gpu';
import { mmu } from './mmu';
import { log } from './log';

export { cpu, gpu, mmu, log };

export const emulator = {
  init: () => {
    log.reset();
    mmu.reset();
    cpu.reset();
    gpu.reset();
    log.out('EMU', 'Emulator initialized.');
  },

  loadRom: async (url: string) => {
    try {
      log.out('EMU', `Fetching ROM from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ROM: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      const romData = new Uint8Array(buffer);
      await mmu.load(romData);
      log.out('EMU', `ROM loaded: ${romData.length} bytes.`);
      return true;
    } catch (error) {
      log.out('EMU', `Error loading ROM: ${error}`);
      return false;
    }
  },

  run: async () => {
    emulator.init();
    // Default ROM to load for testing
    const romUrl = '/roms/test.gb'; 
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
    requestAnimationFrame(emulator.loop);
  }
};

// Start the emulator when the window loads
window.onload = () => {
  emulator.run();
};
