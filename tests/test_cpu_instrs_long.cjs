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
    // Suppress all logs for now
};

const { emulator, cpu, mmu, gpu, log } = require('../dist/node_test_bundle.cjs');

// Capture output from serial port (0xFF01/0xFF02)
let serialOutput = '';
const originalRb = mmu.rb.bind(mmu);
const originalWb = mmu.wb.bind(mmu);

mmu.rb = (addr) => originalRb(addr);
mmu.wb = (addr, val) => {
    if (addr === 0xFF01) {
        serialOutput += String.fromCharCode(val);
    }
    return originalWb(addr, val);
};

async function testCpuInstrs() {
    process.stdout.write('CPU Test ROM Running...\n');
    emulator.init();
    
    const romUrl = 'roms/cpu_instrs.gb';
    const loaded = await emulator.loadRom(romUrl);
    if (!loaded) {
        console.error('Failed to load ROM');
        return;
    }
    
    let totalFrames = 0;
    const maxFrames = 600; // Run for 10 seconds
    let prevPc = -1;
    let pcStuckFrames = 0;
    let lastOutputLen = 0;
    
    for (let frame = 0; frame < maxFrames; frame++) {
        let frameCycles = 0;
        while (frameCycles < 17556) {
            cpu.step();
            frameCycles += cpu.reg.m;
        }
        totalFrames++;
        
        // Print new output
        if (serialOutput.length > lastOutputLen) {
            process.stdout.write(serialOutput.slice(lastOutputLen));
            lastOutputLen = serialOutput.length;
        }
        
        // Check for PC stuck
        if (cpu.reg.pc === prevPc) {
            pcStuckFrames++;
        } else {
            pcStuckFrames = 0;
        }
        prevPc = cpu.reg.pc;
        
        // Break if done or stuck
        if (serialOutput.includes('Failed') || pcStuckFrames > 200) {
            break;
        }
        
        if (frame % 100 === 0 && frame > 0) {
            process.stderr.write(`[Frame ${frame}] Output length: ${serialOutput.length}, PC: 0x${cpu.reg.pc.toString(16)}\n`);
        }
    }
    
    process.stdout.write('\n');
    process.stderr.write(`\n=== Test Finished ===\n`);
    process.stderr.write(`Total frames: ${totalFrames}\n`);
    process.stderr.write(`Serial output length: ${serialOutput.length}\n`);
    process.stderr.write(`Final PC: 0x${cpu.reg.pc.toString(16).padStart(4, '0')}\n`);
}

testCpuInstrs().catch(console.error);
