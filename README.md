# TypeScript GameBoy Emulator

A Game Boy emulator written in TypeScript. Available as an NPM package for use in browser applications and Node.js projects.

[![npm version](https://img.shields.io/badge/npm-1.0.0-blue)](https://www.npmjs.com/package/gameboy_emulator_core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

## Features

- **CPU:** Sharp LR35902 instruction set
- **GPU:** Scanline rendering with support for backgrounds, windows and sprites
- **Memory Banking:** MBC0, MBC1, MBC3 and MBC5 implementations
- **Sprite Priority:** DMG priority logic based on OAM index
- **Environment Agnostic:** Works in both browsers and Node.js environments

## Installation

```bash
npm install davisernst04/typescript_gameboy_emulator
```

## Usage

### Example of it used in the Browser

```typescript
import { emulator, loadRom, joypad } from 'gameboy_emulator_core';

// Load a ROM file
const romBuffer = await fetch('path/to/game.gb').then(r => r.arrayBuffer());
const rom = new Uint8Array(romBuffer);

// Load the cartridge
const cartridge = loadRom(rom);

// Initialize and run the emulator
emulator.init(cartridge);

// Start the emulation loop
function gameLoop() {
    emulator.step();
    requestAnimationFrame(gameLoop);
}
gameLoop();
```

### Rendering to Canvas

```typescript
import { gpu } from 'gameboy_emulator_core';

const canvas = document.getElementById('gameboy-screen') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Get the rendered frame buffer
const frameBuffer = gpu.getFrameBuffer(); // 160x144 pixels

// Render to canvas
const imageData = ctx.createImageData(160, 144);
imageData.data.set(frameBuffer);
ctx.putImageData(imageData, 0, 0);
```

### Input Handling

```typescript
import { joypad } from 'gameboy_emulator_core';

// Map keyboard inputs to GameBoy buttons
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':    joypad.pressUp(); break;
        case 'ArrowDown':  joypad.pressDown(); break;
        case 'ArrowLeft':  joypad.pressLeft(); break;
        case 'ArrowRight': joypad.pressRight(); break;
        case 'z':          joypad.pressA(); break;
        case 'x':          joypad.pressB(); break;
        case 'Enter':      joypad.pressStart(); break;
        case ' ':          joypad.pressSelect(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowUp':    joypad.releaseUp(); break;
        case 'ArrowDown':  joypad.releaseDown(); break;
        case 'ArrowLeft':  joypad.releaseLeft(); break;
        case 'ArrowRight': joypad.releaseRight(); break;
        case 'z':          joypad.releaseA(); break;
        case 'x':          joypad.releaseB(); break;
        case 'Enter':      joypad.releaseStart(); break;
        case ' ':          joypad.releaseSelect(); break;
    }
});
```

### Direct Component Access

```typescript
import { cpu, mmu, gpu } from 'gameboy_emulator_core';

// Access CPU state
console.log(`PC: ${cpu.pc}, A: ${cpu.a}, F: ${cpu.f}`);

// Read/write memory directly
const byte = mmu.readByte(0x8000);
mmu.writeByte(0x8000, 0xFF);

// Access GPU state
console.log(`Current scanline: ${gpu.ly}`);
console.log(`LCD enabled: ${gpu.lcdc.lcdEnable}`);
```

## API Reference

### Main Exports

```typescript
export { cpu } from './cpu.js';     // Control processing unit
export { gpu } from './gpu.js';     // Graphics processing unit
export { mmu } from './mmu.js';     // Memory management unit
export { log } from './log.js';     // Logging utilities
export { joypad } from './joypad.js';   // Input handling
export { loadRom, ICartridge } from './cartridge.js';  // ROM loading
export { emulator } from './main.js';   // Main emulator
```

### `emulator`

The main orchestrator that manages the emulation loop.

```typescript
emulator.init(cartridge: ICartridge): void  // Initialize with a loaded ROM
emulator.step(): void                       // Execute one frame of emulation
emulator.reset(): void                      // Reset the emulator state
```

### `loadRom(rom: Uint8Array): ICartridge`

Loads a GameBoy ROM and returns a cartridge object with the appropriate memory bank controller (MBC) initialized.

### `cpu`

The Sharp LR35902 CPU implementation.

```typescript
cpu.pc: number      // Program counter
cpu.sp: number      // Stack pointer
cpu.a, cpu.b, cpu.c, cpu.d, cpu.e, cpu.h, cpu.l: number  // Registers
cpu.f: number       // Flags register
cpu.clock: number   // Clock cycles counter
```

### `gpu`

The graphics processing unit for rendering.

```typescript
gpu.getFrameBuffer(): Uint8Array  // Get the current 160x144 frame (RGBA)
gpu.ly: number                    // Current scanline
gpu.lcdc: object                  // LCD control register state
```

### `mmu`

Memory management unit for reading/writing system memory.

```typescript
mmu.readByte(address: number): number
mmu.writeByte(address: number, value: number): void
mmu.readWord(address: number): number
mmu.writeWord(address: number, value: number): void
```

### `joypad`

Input handling for the GameBoy buttons.

```typescript
joypad.pressA(): void
joypad.pressB(): void
joypad.pressStart(): void
joypad.pressSelect(): void
joypad.pressUp(): void
joypad.pressDown(): void
joypad.pressLeft(): void
joypad.pressRight(): void

joypad.releaseA(): void
joypad.releaseB(): void
joypad.releaseStart(): void
joypad.releaseSelect(): void
joypad.releaseUp(): void
joypad.releaseDown(): void
joypad.releaseLeft(): void
joypad.releaseRight(): void
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Install Dependencies

```bash
npm install
```

### Build

Compile the TypeScript source:

```bash
npm run build
```

This generates the compiled JavaScript in `dist/` with type definitions.

### Run Tests

Validate the emulator against test ROMs:

```bash
npm test
```

This runs Blargg's `cpu_instrs.gb` test suite in a headless Node.js environment.

### Linting

```bash
npm run lint
```

### Clean Build

```bash
npm run clean
```

## Browser Requirements

- **Chrome/Edge:** 88+
- **Firefox:** 85+
- **Safari:** 14+

Requires ES6 module support and `BigInt64Array` for cycle-accurate timing.


## Project Structure

```
src/                 Pure TypeScript emulator core logic
tests/               Node.js validation and regression scripts
scripts/             Build and bundling scripts
dist/                Build outputs (Generated JavaScript + type definitions)
roms/                Test ROMs used for development
```

## Known Limitations

- **Audio:** APU (Audio Processing Unit) is not yet implemented
- **CGB Features:** Limited to DMG-compatible modes; full Game Boy Color support is in progress

## Legal Note

This emulator is provided for educational and personal development purposes. Please only use ROMs that you are legally entitled to possess.


## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Davis Ernst
