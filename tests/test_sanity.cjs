const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = { 
    onload: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
};
global.document = {
    readyState: 'complete',
    getElementById: () => ({
        getContext: () => ({
            createImageData: () => ({ data: new Uint8Array(160 * 144 * 4) }),
            putImageData: () => {}
        })
    })
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

global.fetch = (url) => {
    const romPath = path.join(__dirname, '..', url);
    return Promise.resolve({
        ok: true,
        arrayBuffer: () => {
            const buffer = fs.readFileSync(romPath);
            return Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
    });
};

console.log = function(...args) { };

const { emulator, cpu, mmu, gpu, log } = require('../dist/node_test_bundle.cjs');

// Test basic instruction execution
emulator.init();

console.log = console.error; // Re-enable for debugging

console.log('\n=== Quick CPU Sanity Checks ===\n');

// Check initial registers
console.log(`Initial state: PC=0x${cpu.reg.pc.toString(16)}, A=0x${cpu.reg.a.toString(16)}, IME=${cpu.reg.ime}`);

// Test 1: NOP should not change anything
let savedPC = cpu.reg.pc;
cpu.step(); // This should execute at BIOS
console.log(`After step: PC=0x${cpu.reg.pc.toString(16)}, cycles=${cpu.reg.m}`);

// We're in BIOS. Let's load the test ROM
async function test() {
    await emulator.loadRom('roms/cpu_instrs.gb');
    console.log(`\nAfter loading ROM: PC=0x${cpu.reg.pc.toString(16)}`);
    
    // Now let's manually step through a few instructions and see what's happening
    let opcodeTrace = [];
    for (let i = 0; i < 100; i++) {
        let opcode = mmu.rb(cpu.reg.pc);
        opcodeTrace.push(`0x${cpu.reg.pc.toString(16).padStart(4,'0')}:0x${opcode.toString(16).padStart(2,'0')}`);
        cpu.step();
    }
    
    console.log('\nFirst 100 instructions:');
    for (let i = 0; i < opcodeTrace.length; i += 10) {
        console.log(opcodeTrace.slice(i, i+10).join('  '));
    }
    
    console.log(`\nAfter 100 steps: PC=0x${cpu.reg.pc.toString(16)}, A=0x${cpu.reg.a.toString(16)}`);
}

test();
