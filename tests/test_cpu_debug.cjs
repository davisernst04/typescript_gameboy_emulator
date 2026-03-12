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
    addEventListener: () => {},
    getElementById: () => ({
        getContext: () => ({
            createImageData: () => ({ data: new Uint8Array(160 * 144 * 4) }),
            putImageData: () => {}
        })
    })
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock fetch
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

const originalLog = console.log;
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

async function testCpuInstrs() {
    emulator.init();
    const loaded = await emulator.loadRom('roms/cpu_instrs.gb');
    if (!loaded) return;
    
    let prevPcs = [];
    let stuckCount = 0;
    
    for (let frame = 0; frame < 600; frame++) {
        let frameCycles = 0;
        while (frameCycles < 17556) {
            cpu.step();
            frameCycles += cpu.reg.m;
        }
        
        // Track last 10 PCs
        prevPcs.push(cpu.reg.pc);
        if (prevPcs.length > 10) prevPcs.shift();
        
        // Check if stuck in tight loop
        if (prevPcs.length === 10 && prevPcs.every(pc => pc === prevPcs[0])) {
            stuckCount++;
        }
        
        if (serialOutput.includes('Failed')) break;
        if (stuckCount > 10) break;
    }
    
    process.stdout.write(serialOutput);
    process.stderr.write(`\n\nFinal PC: 0x${cpu.reg.pc.toString(16).padStart(4, '0')}\n`);
    process.stderr.write(`Registers: A=0x${cpu.reg.a.toString(16).padStart(2,'0')} F=0x${cpu.reg.f.toString(16).padStart(2,'0')}\n`);
    process.stderr.write(`BC=0x${cpu.bc.toString(16).padStart(4,'0')} DE=0x${cpu.de.toString(16).padStart(4,'0')} HL=0x${cpu.hl.toString(16).padStart(4,'0')}\n`);
    process.stderr.write(`SP=0x${cpu.reg.sp.toString(16).padStart(4,'0')} IME=${cpu.reg.ime} HALT=${cpu.halt}\n`);
    
    // Try to read what instruction is at that PC
    const opcode = mmu.rb(cpu.reg.pc);
    process.stderr.write(`Opcode at PC: 0x${opcode.toString(16).padStart(2,'0')}\n`);
}

testCpuInstrs().catch(console.error);
