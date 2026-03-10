# Implementation Plan: Cartridge Loader

## Phase 1: Core Loader Utility
- [x] Implement `loadRom` function supporting `Uint8Array`.
- [x] Support both Browser and Node.js environments.
- [x] Create `ICartridge` structure.

## Phase 2: ROM Header Parsing
- [x] Implement `parseHeader` to extract title, MBC type, ROM/RAM sizes.
- [x] Mapping logic for all known cartridge hex types.
- [x] Calculate number of ROM and RAM banks.

## Phase 3: Checksum & Validation
- [x] Implement Header Checksum (0x014D) verification logic.
- [x] Implement Global Checksum (0x014E-014F) verification.
- [x] Logic for verifying Nintendo Logo.

## Verification
- [x] Unit tests for `parseHeader` using different ROM headers.
- [x] Verify correctness by comparing output to `rom-info` or similar tools.
- [ ] Integration test: Cartridge loader properly configures the MMU.
