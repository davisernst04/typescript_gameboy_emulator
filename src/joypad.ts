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
  select: 0x30, // Bits 4 and 5 of 0xFF00

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
    });
    window.addEventListener('keyup', (e) => {
      joypad.keyUp(e.code);
    });
    log.out('JOY', 'Joypad event listeners attached.');
  },

  /**
   * Reads from the 0xFF00 register.
   * @param regVal - The current value of the 0xFF00 register (bits 4 and 5 indicate which buttons to read).
   * @returns The value to be returned when reading from 0xFF00.
   */
  rb: (regVal?: number): number => {
    const rv = (regVal === undefined) ? joypad.select : regVal;
    let res = 0x0F;
    // Bit 4 LOW: Select Directions
    if (!(rv & 0x10)) {
      res &= joypad.directions;
    }
    // Bit 5 LOW: Select Buttons
    if (!(rv & 0x20)) {
      res &= joypad.buttons;
    }
    
    const finalVal = 0xC0 | (rv & 0x30) | res;
    return finalVal;
  },

  keyDown: (code: string) => {
    let pressed = true;
    switch (code) {
      case 'ArrowRight': joypad.directions &= ~0x01; break; // Right
      case 'ArrowLeft':  joypad.directions &= ~0x02; break; // Left
      case 'ArrowUp':    joypad.directions &= ~0x04; break; // Up
      case 'ArrowDown':  joypad.directions &= ~0x08; break; // Down
      case 'KeyZ':       joypad.buttons    &= ~0x01; break; // A
      case 'KeyX':       joypad.buttons    &= ~0x02; break; // B
      case 'ShiftLeft':
      case 'ShiftRight': joypad.buttons    &= ~0x04; break; // Select
      case 'Enter':      joypad.buttons    &= ~0x08; break; // Start
      default: pressed = false; break;
    }
    if (pressed) {
      console.log(`Joypad key down: ${code}`);
      mmu.intf |= 0x10; // Joypad interrupt
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
