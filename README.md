# TypeScript Game Boy Emulator Core

A high-fidelity DMG-01 (Game Boy) emulator core written in pure TypeScript.

This repository contains the core logic for emulating Sharp LR35902 CPU, MMU, GPU, and Memory Bank Controllers. It is designed to be environment-agnostic, supporting both browser-based execution and Node.js-based validation.

## Current Status

- **CPU:** Standard-compliant instruction set, passing Blargg's `cpu_instrs.gb` (tests 01-09).
- **GPU:** Scanline-based rendering with support for backgrounds, windows, and sprites (8x8 and 8x16 modes).
- **Sprite Priority:** DMG-accurate priority logic based on OAM index.
- **Banking:** MBC0, MBC1, MBC3 (with RTC support), and MBC5 implementations.
- **Validation:** Integrated Node.js test harness for ROM-based verification.

## Project Structure

```text
src/                 Pure TypeScript emulator core logic
tests/               Node.js validation and regression scripts
scripts/             Build and bundling scripts (esbuild)
dist/                Build outputs (Generated JavaScript bundles)
roms/                Test ROMs used for development
```

## Requirements

- Node.js 18+
- npm

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Build for the browser
The project uses a build-first workflow. To generate the browser-ready bundle:
```bash
npm run build
```
This will create a `dist/` directory containing `bundle.js` and a bare-bones `index.html`.

### 3. Run the emulator
Open the generated `dist/index.html` file directly in any modern browser:
```bash
# Example for Linux
firefox dist/index.html
```

**Note:** If you encounter CORS errors or the emulator fails to load, use a local web server to serve the `dist` directory:
```bash
npx serve dist/
```
Use the file picker to load a `.gb` or `.gbc` ROM.

## Development & Testing

### Running CPU Tests
Validate the emulator's logic against industry-standard test ROMs:
```bash
npm test
```
This builds the Node-compatible bundle and executes `roms/cpu_instrs.gb` in a headless environment.

### Linting
```bash
npm run lint
```

## Controls

The default keyboard mapping is:

- **D-Pad:** Arrow Keys
- **A Button:** `Z`
- **B Button:** `X`
- **Start:** `Enter`
- **Select:** `Space`

## Scripts

- `npm run build`: Compiles the emulator core into `dist/bundle.js` and prepares the browser UI.
- `npm test`: Runs the automated CPU instruction test suite.
- `npm run bundle:node`: Builds the Node.js-specific bundle used for test harnesses.
- `npm run lint`: Performs static analysis on the source code.

## Known Limitations

- **Audio:** APU (Audio Processing Unit) is not yet implemented.
- **CGB Features:** Limited to DMG-compatible modes; full Game Boy Color support is in progress.

## Legal Note

This emulator is provided for educational and personal development purposes. Please only use ROMs that you are legally entitled to possess.

## License

Licensed under the ISC License.
