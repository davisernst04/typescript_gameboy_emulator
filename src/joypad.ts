import { mmu } from "./mmu";

/**
 * Joypad handling for the Game Boy.
 * The joypad is accessed via the 0xFF00 register.
 */
export const joypad = {
  // Current state of the joypad buttons (0 = pressed, 1 = released)
  // Bits: 3: Start/Down, 2: Select/Up, 1: B/Left, 0: A/Right
  buttons: 0x0F,
  directions: 0x0F,

  reset: () => {
    joypad.buttons = 0x0F;
    joypad.directions = 0x0F;
  },

  /**
   * Reads from the 0xFF00 register.
   * @param regVal - The current value of the 0xFF00 register (bits 4 and 5 indicate which buttons to read).
   * @returns The value to be returned when reading from 0xFF00.
   */
  rb: (regVal: number): number => {
    let result = regVal & 0x30;
    
    if (!(regVal & 0x10)) {
      // Read directions
      result |= joypad.directions;
    }
    
    if (!(regVal & 0x20)) {
      // Read buttons
      result |= joypad.buttons;
    }
    
    // Unused bits are usually high
    return result | 0xC0;
  },

  keyDown: (code: string) => {
    switch (code) {
      case 'ArrowRight': joypad.directions &= ~0x01; break; // Right
      case 'ArrowLeft':  joypad.directions &= ~0x02; break; // Left
      case 'ArrowUp':    joypad.directions &= ~0x04; break; // Up
      case 'ArrowDown':  joypad.directions &= ~0x08; break; // Down
      case 'KeyZ':       joypad.buttons    &= ~0x01; break; // A
      case 'KeyX':       joypad.buttons    &= ~0x02; break; // B
      case 'ShiftRight': joypad.buttons    &= ~0x04; break; // Select
      case 'Enter':      joypad.buttons    &= ~0x08; break; // Start
      default: return;
    }
    mmu.intf |= 0x10; // Joypad interrupt
  },

  keyUp: (code: string) => {
    switch (code) {
      case 'ArrowRight': joypad.directions |= 0x01; break; // Right
      case 'ArrowLeft':  joypad.directions |= 0x02; break; // Left
      case 'ArrowUp':    joypad.directions |= 0x04; break; // Up
      case 'ArrowDown':  joypad.directions |= 0x08; break; // Down
      case 'KeyZ':       joypad.buttons    |= 0x01; break; // A
      case 'KeyX':       joypad.buttons    |= 0x02; break; // B
      case 'ShiftRight': joypad.buttons    |= 0x04; break; // Select
      case 'Enter':      joypad.buttons    |= 0x08; break; // Start
      default: return;
    }
  }
};
