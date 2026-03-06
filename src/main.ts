import { cpu } from './cpu';
import { gpu } from './gpu';
import { mmu } from './mmu';
import { log } from './log';

export const emulator = {
  init: () => {
    log.reset();
    mmu.reset();
    cpu.reset();
    gpu.reset();
    log.out('EMU', 'Emulator initialized.');
  },

  run: () => {
    emulator.init();
    emulator.loop();
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
