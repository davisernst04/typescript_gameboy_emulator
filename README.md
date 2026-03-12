# TypeScript Game Boy Emulator

A compact Nintendo Game Boy emulator written in TypeScript.

This project focuses on emulating the original DMG-01 hardware closely enough to run real Game Boy ROMs in the browser and to validate CPU behaviour with Node-based test harnesses. It is a practical emulator project rather than a framework or tutorial app: the core logic lives in `src/`, the browser bundle is served through Vite, and ROM-driven validation scripts are included for low-level testing.

## Current status

- Browser emulator loads and runs ROMs through a file picker
- CPU, MMU, GPU, cartridge loading, and joypad plumbing are implemented in TypeScript
- Passes `cpu_instrs.gb`
- Includes Node-side test runners for ROM-based CPU verification

## Project structure

```text
src/                 Emulator core (CPU, MMU, GPU, MBC, cartridge, joypad)
dist/                Built browser output
roms/                Local test ROMs used during development
build_browser_bundle.js
build_node_bundle.js Build scripts for browser and Node bundles
test_*.js / test_*.ts Node-side validation and debugging scripts
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

For a production-style build:

```bash
npm run build
```

## Running Node-based ROM tests

The repository includes Node test harnesses for validating emulator behaviour without the browser.

Build the Node bundle:

```bash
node build_node_bundle.js
```

Run the main CPU instruction test:

```bash
node test_cpu_instrs.js
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
npm run dev     # bundle browser code and start Vite
npm run build   # type-check/build and create production output
npm run bundle  # build browser bundle only
```

## Implementation notes

Core emulator modules:

- `src/cpu.ts` — Sharp LR35902 CPU emulation
- `src/mmu.ts` — memory map and hardware register plumbing
- `src/gpu.ts` — display pipeline and frame generation
- `src/cartridge.ts` / `src/mbc.ts` — ROM loading and bank controller support
- `src/joypad.ts` — keyboard input mapped to Game Boy buttons
- `src/main.ts` — emulator bootstrap and browser integration

## Credits

Useful references and validation sources for this project include:

- [Pan Docs](https://gbdev.io/pandocs/)
- [Blargg's Game Boy test ROMs](https://github.com/retrio/gb-test-roms)
- The wider gbdev community documentation

## License

Licensed under the ISC License. See `package.json` for the declared project license.

## Legal note

This emulator is provided for educational and personal development purposes. Use only ROMs you are legally entitled to possess and run.
