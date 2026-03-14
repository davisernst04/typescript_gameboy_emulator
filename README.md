# TypeScript Game Boy Emulator

A Nintendo Game Boy emulator written in TypeScript.

This project focuses on emulating the original DMG-01 hardware closely enough to run real Game Boy ROMs in the browser and to validate CPU behaviour with Node-based test harnesses. The core logic lives in `src/emulator/`, the browser bundle is served through Vite, and ROM-driven validation scripts are included for low level testing.

## Current status

- Browser emulator loads and runs ROMs through a file picker
- CPU, MMU, GPU, cartridge loading, and joypad plumbing are implemented in TypeScript
- Passes `cpu_instrs.gb`
- Includes Node-side test runners for ROM-based CPU verification

## Project structure

```text
src/emulator/                 Emulator core (TypeScript only)
tests/               Node-side validation and debugging scripts
scripts/             Build and utility scripts (.cjs)
dist/                Generated browser and Node bundles (ignored)
roms/                Local test ROMs used during development
```

## Requirements

- Node.js 18+
- npm

Install dependencies:

```bash
npm install
```

## Running in the browser

Start the local dev server:

```bash
npm run dev
```

This bundles the emulator and starts Vite. Open the local URL shown in the terminal, then:

1. Choose a `.gb` ROM using the file input
2. The ROM is read into memory in the browser
3. Emulation starts automatically

## Running Node-based ROM tests

The repository includes Node test harnesses for validating emulator behaviour without the browser.

Build the Node bundle:

```bash
npm run bundle:node
```

Run the main CPU instruction test:

```bash
node tests/test_cpu_instrs.cjs
```

This executes the bundled emulator against `roms/cpu_instrs.gb` and prints the serial output emitted by the test ROM.

## Loading ROMs

### Browser

Use the ROM file picker in the page and select any local `.gb` file.

### Node test flow

The test scripts load ROMs directly from the repository, for example:

- `roms/cpu_instrs.gb`
- `roms/test.gb`

If you want to validate a different ROM in Node, update the ROM path inside the relevant test script.

## Controls

Keyboard controls currently map as follows:

- Arrow keys — D-pad
- `Z` — A
- `X` — B
- `Enter` — Start
- `Left Shift` / `Right Shift` — Select

## Scripts

From `package.json`:

```bash
npm run dev         # bundle browser code and start Vite
npm run build       # type-check/build and create production output
npm run bundle      # build browser bundle only
npm run bundle:node # build Node test bundle
```

## Implementation notes

Core emulator modules:

- `src/emulator/cpu.ts` — Sharp LR35902 CPU emulation
- `src/emulator/mmu.ts` — memory map and hardware register plumbing
- `src/emulator/gpu.ts` — display pipeline and frame generation
- `src/emulator/cartridge.ts` / `src/emulator/mbc.ts` — ROM loading and bank controller support
- `src/emulator/joypad.ts` — keyboard input mapped to Game Boy buttons
- `src/emulator/main.ts` — emulator bootstrap and browser integration

## Known limitations

- Compatibility is still in progress. Some games may not boot correctly, may exhibit graphical or gameplay glitches, or may behave differently from original hardware.
- Audio output is not implemented yet, so sound is currently unavailable.

## Credits

Useful references and validation sources for this project include:

- [Pan Docs](https://gbdev.io/pandocs/)
- [Blargg's Game Boy test ROMs](https://github.com/retrio/gb-test-roms)
- [gameboy.js](https://github.com/juchi/gameboy.js)
- [Gameboy Emulation in Javascript Guide](https://imrannazar.com/series/gameboy-emulation-in-javascript)

## License

Licensed under the ISC License.

## Legal note

This emulator is provided for educational and personal development purposes. Use only ROMs you are legally entitled to possess and run.
