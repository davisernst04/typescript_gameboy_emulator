# Sharp LR35902 CPU Architecture Research

## Overview
The Sharp LR35902 is an 8-bit CPU used in the Nintendo Game Boy. It is a hybrid of the Intel 8080 and Zilog Z80 architectures.

## Registers
| Register | Size | Description |
| :--- | :--- | :--- |
| **A** | 8-bit | Accumulator |
| **F** | 8-bit | Flags |
| **B, C** | 8-bit | General purpose (can be paired as BC) |
| **D, E** | 8-bit | General purpose (can be paired as DE) |
| **H, L** | 8-bit | General purpose (can be paired as HL) |
| **SP** | 16-bit | Stack Pointer |
| **PC** | 16-bit | Program Counter |

## Flags (F Register)
| Bit | Name | Description |
| :--- | :--- | :--- |
| 7 | **Z** | Zero Flag - Set if result is 0. |
| 6 | **N** | Subtract Flag - Set if last operation was subtraction. |
| 5 | **H** | Half-Carry Flag - Set if carry from bit 3 to 4. |
| 4 | **C** | Carry Flag - Set if carry from bit 7 or borrow. |
| 3-0 | - | Always zero. |

## Interrupts
| Name | Vector | Priority |
| :--- | :--- | :--- |
| V-Blank | 0x0040 | 1 |
| LCD STAT | 0x0048 | 2 |
| Timer | 0x0050 | 3 |
| Serial | 0x0058 | 4 |
| Joypad | 0x0060 | 5 |

### Interrupt Registers
- **IME**: Interrupt Master Enable (Internal flag, set by EI/DI).
- **IE (0xFFFF)**: Interrupt Enable.
- **IF (0xFF0F)**: Interrupt Flag (Requests).

## Timing
- **Clock Speed**: 4.194304 MHz.
- **M-cycles**: Machine cycles (1 M-cycle = 4 T-states).
- **Memory Access**: 1 per M-cycle.

## Implementation Notes & Issues
- Existing `fz` helper in `src/cpu.ts` resets all flags, which might be incorrect for opcodes that should preserve certain flags.
- `fz` currently does not handle the **Half-Carry (H)** flag.
- 16-bit registers are currently implemented as separate 8-bit registers in `cpu.reg`, which requires manual pairing (e.g., `(cpu.reg.h << 8) + cpu.reg.l`).
- CPU loop in `src/cpu.ts` uses `cpu.reg.m` and `cpu.reg.t` for cycle counting, but it needs to be verified against official timings.
