# Cartridge Loader Specification

## Overview

The Cartridge Loader is responsible for loading ROM files, parsing their header information, and providing the MMU with necessary data to configure Memory Banking Controllers (MBCs) and other hardware features.

## Header Parsing (0x0100 - 0x014F)

- `0x0100 - 0x0103`: Entry point (usually `0x00 0xC3 <low_addr> <high_addr>`).
- `0x0104 - 0x0133`: Nintendo Logo (must match internal logo for validation).
- `0x0134 - 0x0143`: Game Title.
- `0x0147`: Cartridge Type (identifies MBC and hardware features like RAM/Battery).
- `0x0148`: ROM Size (indicates number of ROM banks).
- `0x0149`: RAM Size (indicates number of RAM banks).
- `0x014A`: Destination Code (Japan vs Non-Japan).
- `0x014B`: Old Licensee Code.
- `0x014C`: Mask ROM Version Number.
- `0x014D`: Header Checksum.
- `0x014E - 0x014F`: Global Checksum.

## Key Features

- **ROM Size Calculation**: Supports up to 2^n * 32KB.
- **RAM Size Calculation**: Supports up to 128KB (MBC5).
- **Cartridge Type Mapping**: Mapping hex codes to MBC implementation types.
- **Checksum Verification**: Validating both header and global checksums.

## Constraints
- Must handle both `.gb` and `.gbc` file extensions (Game Boy and Game Boy Color).
- Should be flexible to handle large ROM files (e.g., 8MB).
- Should operate in both Browser (using `FileReader` or `fetch`) and Node.js environments (using `fs`).
