import { mmu } from "./mmu";
import { log } from "./log";

/**
 * Joypad handling for the Game Boy.
 * The joypad is accessed via the 0xFF00 register.
 */
export const joypad = {
  // Current state of the joypad buttons (0 = pressed, 1 = released)
  // Bits: 3: Start/Down, 2: Select/Up, 1: B/Left, 0: A/Right
  buttons: 0x0F,
  directions: 0x0F,
  select: 0x30, // Bits 4 and 5 are selection bits (1 = not selected)

  reset: () => {
    joypad.buttons = 0x0F;
    joypad.directions = 0x0F;
    joypad.select = 0x30;
  },

  /**
   * Initializes the joypad by setting up event listeners.
   */
  init: () => {
    window.addEventListener('keydown', (e) => {
      joypad.keyDown(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', 'Enter'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      joypad.keyUp(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', 'Enter'].includes(e.code)) {
        e.preventDefault();
      }
    });
    log.out('JOY', 'Joypad event listeners attached.');
  },

  /**
   * Reads from the 0xFF00 register.
   * @returns The value to be returned when reading from 0xFF00.
   */
  rb: (): number => {
    let res = 0x0F;
    // P15 (bit 5) LOW: Select Buttons
    if (!(joypad.select & 0x20)) {
      res &= joypad.buttons;
    }
    // P14 (bit 4) LOW: Select Directions
    if (!(joypad.select & 0x10)) {
      res &= joypad.directions;
    }
    
    // Bits 6 and 7 are always 1 on Game Boy.
    // Bits 4 and 5 reflect the selector bits.
    // Bits 0-3 reflect the button state (0 = pressed).
    return 0xC0 | joypad.select | res;
  },

  keyDown: (code: string) => {
    let pressed = true;
    switch (code) {
      case 'ArrowRight': joypad.directions &= ~0x01; break; // Right / A
      case 'ArrowLeft':  joypad.directions &= ~0x02; break; // Left / B
      case 'ArrowUp':    joypad.directions &= ~0x04; break; // Up / Select
      case 'ArrowDown':  joypad.directions &= ~0x08; break; // Down / Start
      case 'KeyZ':       joypad.buttons    &= ~0x01; break; // A
      case 'KeyX':       joypad.buttons    &= ~0x02; break; // B
      case 'ShiftLeft':
      case 'ShiftRight': joypad.buttons    &= ~0x04; break; // Select
      case 'Enter':      joypad.buttons    &= ~0x08; break; // Start
      default: pressed = false; break;
    }
    if (pressed) {
      // console.log(`Joypad key down: ${code}`);
      if (mmu) {
        mmu.intf |= 0x10; // Request Joypad interrupt (bit 4 of 0xFF0F)
      }
    }
  },

  keyUp: (code: string) => {
    switch (code) {
      case 'ArrowRight': joypad.directions |= 0x01; break; // Right
      case 'ArrowLeft':  joypad.directions |= 0x02; break; // Left
      case 'ArrowUp':    joypad.directions |= 0x04; break; // Up
      case 'ArrowDown':  joypad.directions |= 0x08; break; // Down
      case 'KeyZ':       joypad.buttons    |= 0x01; break; // A
      case 'KeyX':       joypad.buttons    |= 0x02; break; // B
      case 'ShiftLeft':
      case 'ShiftRight': joypad.buttons    |= 0x04; break; // Select
      case 'Enter':      joypad.buttons    |= 0x08; break; // Start
      default: break;
    }
  }
};
