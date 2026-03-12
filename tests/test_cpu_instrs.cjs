const fs = require('fs');
const path = require('path');

// Mock browser globals BEFORE requiring the bundle
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

// Mock fetch to load local ROMs
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

// Silence debug logging
const originalLog = console.log;
console.log = function(...args) {
    const str = args.join(' ');
    // Only print if it's part of the test output (contains 'cpu_instrs', 'ok', 'Failed')
    if (str.includes('cpu_instrs') || str.includes(':ok') || str.includes(':') && /^\d+:/.test(str) || str.includes('Failed') || str.includes('===')) {
        originalLog.apply(console, args);
    }
};

const { emulator, cpu, mmu, gpu, log } = require('../dist/node_test_bundle.cjs');

// Capture output from serial port (0xFF01/0xFF02)
let serialOutput = '';
let testNumber = 0;
const originalRb = mmu.rb.bind(mmu);
const originalWb = mmu.wb.bind(mmu);

mmu.rb = (addr) => originalRb(addr);
mmu.wb = (addr, val) => {
    if (addr === 0xFF01) {
        // Serial data register
        serialOutput += String.fromCharCode(val);
    }
    return originalWb(addr, val);
};

async function testCpuInstrs() {
    console.log('=== CPU Instructions Test ROM ===\n');
    emulator.init();
    
    const romUrl = 'roms/cpu_instrs.gb';
    const loaded = await emulator.loadRom(romUrl);
    if (!loaded) {
        console.error('Failed to load ROM');
        return;
    }

    console.log('ROM loaded. Running test...\n');
    
    let frameCount = 0;
    const maxFrames = 1000; // Run for longer
    let prevPc = 0;
    let prevPcCount = 0;
    const maxStuckFrames = 30;
    
    for (let frame = 0; frame < maxFrames; frame++) {
        let frameCycles = 0;
        let stepsInFrame = 0;
        while (frameCycles < 17556 && stepsInFrame < 50000) {
            cpu.step();
            frameCycles += cpu.reg.m;
            stepsInFrame++;
        }
        
        frameCount++;
        
        // Check for stuck state
        if (cpu.reg.pc === prevPc) {
            prevPcCount++;
            if (prevPcCount > maxStuckFrames) {
                break;
            }
        } else {
            prevPcCount = 0;
        }
        prevPc = cpu.reg.pc;
        
        // If we see "Failed X tests", we can break early
        if (serialOutput.includes('Failed') && serialOutput.includes('tests')) {
            break;
        }
    }
    
    process.stdout.write(serialOutput);
    
    console.log('\n\n=== Test Complete ===');
    console.log(`Frames run: ${frameCount}`);
    console.log(`Final PC: 0x${cpu.reg.pc.toString(16).padStart(4, '0')}`);
    console.log(`Registers: A=0x${cpu.reg.a.toString(16).padStart(2,'0')} F=0x${cpu.reg.f.toString(16).padStart(2,'0')} BC=0x${cpu.bc.toString(16).padStart(4,'0')} DE=0x${cpu.de.toString(16).padStart(4,'0')} HL=0x${cpu.hl.toString(16).padStart(4,'0')}`);
}

testCpuInstrs().catch(console.error);
