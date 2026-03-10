# Memory Management Unit (MMU) Specification

## Overview

The MMU is responsible for managing the Game Boy's 16-bit address space (0x0000 to 0xFFFF). It handles access to ROM, RAM, I/O registers, and coordinates with Memory Banking Controllers (MBCs) for expanded storage.

## Memory Map

- `0x0000 - 0x3FFF`: 16KB ROM Bank 00 (Fixed)
- `0x4000 - 0x7FFF`: 16KB ROM Bank 01..NN (Switchable via MBC)
- `0x8000 - 0x9FFF`: 8KB Video RAM (VRAM)
- `0xA000 - 0xBFFF`: 8KB External RAM (Switchable via MBC)
- `0xC000 - 0xCFFF`: 4KB Work RAM Bank 0 (WRAM)
- `0xD000 - 0xDFFF`: 4KB Work RAM Bank 1 (WRAM)
- `0xE000 - 0xFDFF`: Mirror of `0xC000 - 0xDDFF` (Prohibited area)
- `0xFE00 - 0xFE9F`: Sprite Attribute Table (OAM)
- `0xFEA0 - 0xFEFF`: Prohibited area
- `0xFF00 - 0xFF7F`: I/O Registers
- `0xFF80 - 0xFFFE`: High RAM (HRAM)
- `0xFFFF`: Interrupt Enable Register

## Key Components

### Memory Banking Controllers (MBC)
- **MBC0**: No banking (up to 32KB ROM).
- **MBC1**: Common MBC supporting up to 2MB ROM and 32KB RAM.
- **MBC3**: Supports Real Time Clock (RTC).
- **MBC5**: Most advanced MBC with improved banking limits.

### Direct Memory Access (DMA)
- Support for OAM DMA transfer (0xFF46) to quickly move sprite data from ROM/RAM to OAM.

## Constraints
- Memory access must be cycle-accurate where possible.
- Invalid memory access should be handled gracefully (usually returning 0xFF).
