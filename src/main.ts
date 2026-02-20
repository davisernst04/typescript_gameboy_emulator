import { cpu } from "./lib/cpu";
import { gpu } from "./lib/gpu";
import { mmu } from "./lib/mmu";
import { log } from "./lib/log";

console.log("Initializing GameBoy Emulator...");

const canvas = document.getElementById("gameboy") as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(0, 0, 160, 144);
  }
}

// Reset everything
log.reset();
gpu.reset();
mmu.reset();
cpu.reset();

console.log("Emulator initialized.");
