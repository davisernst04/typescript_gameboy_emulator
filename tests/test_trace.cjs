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
    if (addr === 0xFF01) {
        serialOutput += String.fromCharCode(val);
    }
    return originalWb(addr, val);
};

async function test() {
    emulator.init();
    await emulator.loadRom('roms/cpu_instrs.gb');
    
    // Run until we get stable output
    for (let i = 0; i < 100000; i++) {
        cpu.step();
        if (serialOutput.includes('02:') && serialOutput.length > 20) {
            break;
        }
    }
    
    // Now trace what's happening - look for tight loop
    let trace = [];
    let prevPc = -1;
    let sameCount = 0;
    
    for (let i = 0; i < 50; i++) {
        let pc = cpu.reg.pc;
        let op = mmu.rb(pc);
        let flags = `Z=${(cpu.reg.f & 0x80) ? 1 : 0} N=${(cpu.reg.f & 0x40) ? 1 : 0} H=${(cpu.reg.f & 0x20) ? 1 : 0} C=${(cpu.reg.f & 0x10) ? 1 : 0}`;
        let regs = `A=${cpu.reg.a.toString(16).padStart(2,'0')} B=${cpu.reg.b.toString(16).padStart(2,'0')} C=${cpu.reg.c.toString(16).padStart(2,'0')} DE=${cpu.de.toString(16).padStart(4,'0')} HL=${cpu.hl.toString(16).padStart(4,'0')}`;
        
        trace.push(`PC:${pc.toString(16).padStart(4,'0')} OP:${op.toString(16).padStart(2,'0')} ${flags} | ${regs}`);
        
        if (pc === prevPc) {
            sameCount++;
        } else {
            sameCount = 0;
        }
        prevPc = pc;
        
        cpu.step();
    }
    
    process.stdout.write('Serial output:\n' + serialOutput + '\n\n');
    process.stdout.write('Instruction trace:\n');
    trace.forEach((line, idx) => {
        if (idx % 10 === 0) process.stdout.write('\n');
        process.stdout.write(line + '\n');
    });
}

test().catch(console.error);
