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
    const romPath = path.join(__dirname, url);
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
    // Only print if it's part of the test output
    if (str.includes('===') || str.includes('CPU') || str.includes('ROM')) {
        originalLog.apply(console, args);
    }
};

const { emulator, cpu, mmu, gpu, log } = require('./node_test_bundle_new.js');

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
    console.log('=== CPU Instructions Test ROM ===\n');
    emulator.init();
    
    const romUrl = 'roms/cpu_instrs.gb';
    const loaded = await emulator.loadRom(romUrl);
    if (!loaded) {
        console.error('Failed to load ROM');
        return;
    }

    console.log('ROM loaded. Running test (~300 frames)...\n');
    
    let totalSteps = 0;
    let totalFrames = 0;
    const maxFrames = 300;
    let prevPc = -1;
    let pcStuckCount = 0;
    
    for (let frame = 0; frame < maxFrames; frame++) {
        let frameCycles = 0;
        while (frameCycles < 17556) {
            cpu.step();
            frameCycles += cpu.reg.m;
            totalSteps++;
        }
        totalFrames++;
        
        // Check for PC stuck
        if (cpu.reg.pc === prevPc) {
            pcStuckCount++;
        } else {
            pcStuckCount = 0;
        }
        prevPc = cpu.reg.pc;
        
        if (pcStuckCount > 100 || serialOutput.includes('Failed')) {
            break;
        }
        
        if (frame % 50 === 0 && frame > 0) {
            process.stderr.write(`Frame ${frame}, steps: ${totalSteps}\n`);
        }
    }
    
    process.stdout.write('\n');
    process.stdout.write(serialOutput);
    
    console.log('\n=== Test Complete ===');
    console.log(`Total frames: ${totalFrames}`);
    console.log(`Total steps: ${totalSteps}`);
    console.log(`Final PC: 0x${cpu.reg.pc.toString(16).padStart(4, '0')}`);
}

testCpuInstrs().catch(console.error);
