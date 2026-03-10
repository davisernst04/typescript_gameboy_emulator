# Implementation Plan: Memory MMU

## Phase 1: Basic Memory Mapping (0x0000 - 0xFFFF)
- [x] Create `MMU` class structure.
- [x] Implement `readByte` and `writeByte` for all core memory regions.
- [x] Implement Work RAM (WRAM) and High RAM (HRAM).
- [x] Implement I/O register mapping.

## Phase 2: Memory Banking Controller (MBC) Architecture
- [x] Create `IMBC` interface.
- [x] Implement `MBC0` (No Banking).
- [x] Implement `MBC1` support for ROM and RAM banking.
- [x] Add support for MBC3 (including RTC registers if needed).
- [x] Add support for MBC5.

## Phase 3: Hardware Registers & Advanced Features
- [x] Implement DMA transfer (0xFF46) logic.
- [ ] Handle special hardware register interactions.

## Verification
- [ ] Unit tests for `MMU` class.
- [ ] Validation of banking logic using Blargg's test ROMs.
- [ ] Cycle accuracy check for DMA transfers.
