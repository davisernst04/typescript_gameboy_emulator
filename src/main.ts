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
  }
};

// Start the emulator when the window loads
window.onload = () => {
  emulator.init();
};