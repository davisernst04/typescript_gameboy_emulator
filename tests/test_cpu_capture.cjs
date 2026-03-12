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

console.log = () => {}; // Silence main logs

const { emulator, cpu, mmu, gpu, log } = require('../dist/node_test_bundle.cjs');

// Capture output from serial port (0xFF01/0xFF02)
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
    
    const romUrl = 'roms/cpu_instrs.gb';
    const loaded = await emulator.loadRom(romUrl);
    if (!loaded) {
        process.stderr.write('Failed to load ROM\n');
        return;
    }

    let frameCount = 0;
    const maxFrames = 1000;
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
        
        if (cpu.reg.pc === prevPc) {
            prevPcCount++;
            if (prevPcCount > maxStuckFrames) {
                break;
            }
        } else {
            prevPcCount = 0;
        }
        prevPc = cpu.reg.pc;
        
        if (serialOutput.includes('Failed') && serialOutput.includes('tests')) {
            break;
        }
    }
    
    // Write raw serial output
    process.stdout.write(serialOutput);
}

testCpuInstrs().catch(console.error);
