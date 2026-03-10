# Implementation Plan: CPU Emulation

## Roadmap

1.  **Architecture:** Understand the Sharp LR35902 CPU architecture.
    - [x] Research registers and flags.
    - [x] Research interrupt handling.
    - [x] Research instruction cycle and timing.
2.  **Instruction Set:** Implement the full instruction set (both standard and CB-prefixed opcodes). [x]
3.  **CPU Loop:** Implement the main CPU loop with accurate cycle counting.
    - [x] Implement `step` function with cycle counting.
    - [x] Implement interrupt handling (IME, IE, IF).
    - [x] Handle HALT and STOP states.
    - [x] Implement EI/DI delay.
4.  **Verification:** Add unit and integration tests for all CPU operations.

## Milestones

- [x] registers and basic fetch-decode-execute loop.
- [x] Implement all 8-bit opcodes.
- [x] Implement CB-prefixed opcodes.
- [x] Implement CPU loop and cycle counting.
- [ ] Verify using Blargg's CPU test ROMs.
