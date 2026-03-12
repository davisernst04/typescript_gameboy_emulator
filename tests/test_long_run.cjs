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
const originalWb = mmu.wb.bind(mmu);
mmu.wb = (addr, val) => {
    if (addr === 0xFF01) serialOutput += String.fromCharCode(val);
    return originalWb(addr, val);
};

async function test() {
    emulator.init();
    await emulator.loadRom('roms/cpu_instrs.gb');
    
    // Run longer
    let stepCount = 0;
    let lastPc = -1;
    let sameCount = 0;
    
    while (stepCount < 10000000 && sameCount < 100000) {
        cpu.step();
        stepCount++;
        
        if (cpu.reg.pc === lastPc) {
            sameCount++;
        } else {
            sameCount = 0;
        }
        lastPc = cpu.reg.pc;
        
        if (serialOutput.includes('Failed')) break;
    }
    
    console.log = console.error;
    console.log('\nSteps executed:', stepCount.toLocaleString());
    console.log('Serial output length:', serialOutput.length);
    console.log('Final PC: 0x' + cpu.reg.pc.toString(16).padStart(4, '0'));
    console.log('Same PC count:', sameCount);
    
    if (sameCount >= 100000) {
        console.log('CPU stuck at PC 0x' + cpu.reg.pc.toString(16).padStart(4, '0'));
        console.log('A=0x' + cpu.reg.a.toString(16).padStart(2, '0'));
        console.log('Flags: Z=' + ((cpu.reg.f & 0x80) ? 1 : 0) + ' N=' + ((cpu.reg.f & 0x40) ? 1 : 0) + ' H=' + ((cpu.reg.f & 0x20) ? 1 : 0) + ' C=' + ((cpu.reg.f & 0x10) ? 1 : 0));
    }
    
    process.stdout.write('\n' + serialOutput);
}

test().catch(console.error);
