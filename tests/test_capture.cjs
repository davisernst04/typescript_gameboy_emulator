const fs = require('fs');
const path = require('path');

global.window = { onload: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
global.document = { readyState: 'complete', getElementById: () => ({ getContext: () => ({ createImageData: () => ({ data: new Uint8Array(160 * 144 * 4) }), putImageData: () => {} }) }) };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.fetch = (url) => {
    const romPath = path.join(__dirname, '..', url);
    return Promise.resolve({ ok: true, arrayBuffer: () => { const buffer = fs.readFileSync(romPath); return Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)); } });
};

console.log = function(...args) { };

const { emulator, cpu, mmu, gpu, log } = require('../dist/node_test_bundle.cjs');

let serialOutput = '';
let lastLen = 0;
const originalWb = mmu.wb.bind(mmu);
mmu.wb = (addr, val) => {
    if (addr === 0xFF01) {
        serialOutput += String.fromCharCode(val);
    }
    return originalWb(addr, val);
};

async function test() {
    emulator.init();
    await emulator.loadRom('roms/cpu_instrs.gb');
    
    // Run test and capture output line by line
    let steps = 0;
    let prevPc = -1;
    let sameCount = 0;
    const maxSteps = 10000000;
    
    console.log = console.error;
    
    while (steps < maxSteps && sameCount < 200000) {
        cpu.step();
        steps++;
        
        // Output any new text
        if (serialOutput.length > lastLen) {
            let newText = serialOutput.slice(lastLen);
            process.stdout.write(newText);
            lastLen = serialOutput.length;
        }
        
        if (cpu.reg.pc === prevPc) {
            sameCount++;
        } else {
            sameCount = 0;
        }
        prevPc = cpu.reg.pc;
    }
    
    console.log('\n\n=== Test Finished ===');
    console.log(`Steps: ${steps.toLocaleString()}`);
    console.log(`Stuck count: ${sameCount}`);
    console.log(`Serial output: "${serialOutput.slice(-100)}"`);
    console.log(`Final PC: 0x${cpu.reg.pc.toString(16).padStart(4,'0')}`);
}

test().catch(console.error);
