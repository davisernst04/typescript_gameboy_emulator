const fs = require('fs');
const path = require('path');

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

console.log = () => {};

const { emulator, cpu, mmu, gpu, log } = require('./node_test_bundle_new.js');

let serialOutput = [];
let stepCount = 0;
let lastOutputLen = 0;
let prevPc = 0;

const originalWb = mmu.wb.bind(mmu);
const originalStep = cpu.step.bind(cpu);

mmu.wb = (addr, val) => {
    if (addr === 0xFF01) {
        serialOutput.push(val);
        lastOutputLen = serialOutput.length;
    }
    return originalWb(addr, val);
};

cpu.step = function() {
    stepCount++;
    originalStep();
    
    // Log when PC doesn't advance
    if (cpu.reg.pc === prevPc && stepCount % 1000 === 0) {
        process.stderr.write(`PC stuck at 0x${cpu.reg.pc.toString(16).padStart(4, '0')} after ${stepCount} steps\n`);
    }
    prevPc = cpu.reg.pc;
    
    // Log when new output appears
    if (serialOutput.length > lastOutputLen) {
        let str = String.fromCharCode(...serialOutput);
        if (stepCount % 100000 === 0 || serialOutput.length > 100) {
            process.stderr.write(`[Step ${stepCount}] Output so far: ${serialOutput.length} bytes\n`);
        }
    }
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
    const maxFrames = 2000;
    let prevPc2 = 0;
    let prevPcCount = 0;
    
    for (let frame = 0; frame < maxFrames; frame++) {
        let frameCycles = 0;
        let stepsInFrame = 0;
        while (frameCycles < 17556 && stepsInFrame < 50000) {
            cpu.step();
            frameCycles += cpu.reg.m;
            stepsInFrame++;
        }
        
        frameCount++;
        
        if (cpu.reg.pc === prevPc2) {
            prevPcCount++;
            if (prevPcCount > 30) {
                process.stderr.write(`CPU stuck after frame ${frameCount}\n`);
                break;
            }
        } else {
            prevPcCount = 0;
        }
        prevPc2 = cpu.reg.pc;
        
        if (frameCount % 50 === 0) {
            let str = String.fromCharCode(...serialOutput);
            process.stderr.write(`Frame ${frameCount}: PC=0x${cpu.reg.pc.toString(16).padStart(4,'0')}, Output=${serialOutput.length} bytes\n`);
        }
        
        let str = String.fromCharCode(...serialOutput);
        if (str.includes('Failed') && str.includes('tests')) {
            break;
        }
    }
    
    let str = String.fromCharCode(...serialOutput);
    process.stderr.write(`\n=== FINAL RESULTS ===\n`);
    process.stderr.write(`Total steps: ${stepCount}\n`);
    process.stderr.write(`Total frames: ${frameCount}\n`);
    process.stderr.write(`Serial output length: ${serialOutput.length}\n`);
    process.stderr.write(`Final PC: 0x${cpu.reg.pc.toString(16).padStart(4, '0')}\n`);
    process.stdout.write(str);
}

testCpuInstrs().catch(console.error);
