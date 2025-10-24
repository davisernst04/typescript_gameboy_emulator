# Game Boy Emulator

A Game Boy emulator written in TypeScript using Next.js that accurately emulates the original Nintendo Game Boy hardware.

## Features

- **CPU Emulation**: Full Sharp LR35902 CPU emulation (8-bit processor based on Z80)
- **Graphics**: PPU (Picture Processing Unit) with support for backgrounds, sprites, and window
- **Memory Management**: Complete memory map implementation including ROM, RAM, and memory banking
- **Input Handling**: Support for all Game Boy buttons (D-pad, A, B, Start, Select)
- **Audio**: Sound processing unit with 4 audio channels (2 square waves, 1 wave, 1 noise)
- **Save States**: Save and load game progress at any time
- **ROM Support**: Compatible with .gb ROM files
- **Debugger**: Built-in debugger with breakpoints and memory inspection

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Game Boy ROM files (.gb format)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gameboy-emulator.git
cd gameboy-emulator

# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the emulator.

### Building for Production

```bash
# Build the application
npm run build
# or
yarn build

# Start the production server
npm start
# or
yarn start
```

### Usage

1. Open the application in your browser
2. Click "Load ROM" or drag and drop a .gb ROM file
3. The emulator will start automatically
4. Use the on-screen controls or keyboard to play

```bash
# Run with debugger tools (development mode)
npm run dev
```

## Controls

| Game Boy Button | Keyboard Key |
|----------------|--------------|
| D-Pad Up       | W / Arrow Up |
| D-Pad Down     | S / Arrow Down |
| D-Pad Left     | A / Arrow Left |
| D-Pad Right    | D / Arrow Right |
| A Button       | J / Z |
| B Button       | K / X |
| Start          | Enter |
| Select         | Shift |

## Architecture

### Components

- **CPU**: Implements the Sharp LR35902 instruction set with all opcodes and CB-prefixed opcodes
- **MMU**: Memory Management Unit handling memory mapping and banking controllers (MBC1, MBC3, MBC5)
- **PPU**: Picture Processing Unit rendering backgrounds, sprites, and the window layer
- **APU**: Audio Processing Unit for sound generation
- **Timer**: Implements the Game Boy's timer and divider registers
- **Joypad**: Input handling and interrupt generation

### Memory Map

```
0x0000-0x3FFF: ROM Bank 0
0x4000-0x7FFF: ROM Bank 1-N (switchable)
0x8000-0x9FFF: Video RAM
0xA000-0xBFFF: External RAM
0xC000-0xDFFF: Work RAM
0xE000-0xFDFF: Echo RAM
0xFE00-0xFE9F: Sprite Attribute Table
0xFF00-0xFF7F: I/O Registers
0xFF80-0xFFFE: High RAM
0xFFFF: Interrupt Enable Register
```

## Compatibility

Currently tested and compatible with:
- Tetris
- Dr. Mario
- Super Mario Land
- The Legend of Zelda: Link's Awakening
- Pokemon Red/Blue

## Known Issues

- [List any known bugs or limitations]
- Game Boy Color (GBC) games are not yet supported
- Some audio edge cases may not be perfectly accurate

## Running Tests

```bash
# Run the test suite
npm test
# or
yarn test

# Run tests in watch mode
npm run test:watch
# or
yarn test:watch
```

## Development

### Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── page.tsx      # Main emulator page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   │   ├── Emulator.tsx  # Main emulator component
│   │   ├── Screen.tsx    # Display canvas
│   │   └── Controls.tsx  # Input controls
│   ├── lib/
│   │   ├── cpu/          # CPU implementation
│   │   ├── ppu/          # Graphics rendering
│   │   ├── apu/          # Audio processing
│   │   ├── mmu/          # Memory management
│   │   └── cartridge/    # ROM loading and MBC
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── tests/                # Test ROMs and specs
└── README.md
```

### Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Resources

- [Pan Docs](https://gbdev.io/pandocs/) - Comprehensive Game Boy technical documentation
- [Game Boy CPU Manual](http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf)
- [Blargg's Test ROMs](https://github.com/retrio/gb-test-roms) - CPU and hardware test suite
- [The Ultimate Game Boy Talk](https://www.youtube.com/watch?v=HyzD8pNlpwI) - Detailed hardware overview

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Nintendo for the original Game Boy hardware
- The Game Boy development community for extensive documentation
- Test ROM creators for validation tools

## Legal Notice

This emulator is for educational purposes only. You must own the physical Game Boy cartridge to legally use ROM files. This project is not affiliated with or endorsed by Nintendo.
