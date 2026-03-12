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
    
    for (let i = 0; i < 100000; i++) {
        cpu.step();
        if (serialOutput.includes('02:') && serialOutput.length > 20) break;
    }
    
    // Find where the loop stuck
    console.log = console.error;
    
    let lastPCs = [];
    for (let i = 0; i < 100; i++) {
        lastPCs.push(cpu.reg.pc);
        cpu.step();
    }
    
    // Check what PC is stuck on
    const uniquePCs = [...new Set(lastPCs)];
    console.log('\nUnique PCs in last 100 steps:', uniquePCs.map(x => '0x' + x.toString(16).padStart(4,'0')).join(', '));
    
    // Examine those addresses
    console.log('\nMemory at stuck addresses:');
    for (let pc of uniquePCs.slice(0, 5)) {
        let bytes = [];
        for (let i = 0; i < 5; i++) {
            bytes.push('0x' + mmu.rb((pc + i) & 0xFFFF).toString(16).padStart(2, '0'));
        }
        console.log(`0x${pc.toString(16).padStart(4, '0')}: ${bytes.join(' ')}`);
    }
}

test().catch(console.error);
