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
    const romPath = path.join(__dirname, '..', url);
    return Promise.resolve({
        ok: true,
        arrayBuffer: () => {
            const buffer = fs.readFileSync(romPath);
            return Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
    });
};

console.log = () => {};

const { emulator, cpu, mmu, gpu } = require('../dist/node_test_bundle.cjs');

let serialOutput = [];
const originalWb = mmu.wb.bind(mmu);

mmu.wb = (addr, val) => {
    if (addr === 0xFF01) {
        serialOutput.push(val);
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

    // Run for many more frames to get full output
    let frameCount = 0;
    const maxFrames = 5000;
    let prevPc = 0;
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
        
        if (cpu.reg.pc === prevPc) {
            prevPcCount++;
            if (prevPcCount > 60) {
                break;
            }
        } else {
            prevPcCount = 0;
        }
        prevPc = cpu.reg.pc;
        
        let str = String.fromCharCode(...serialOutput);
        if (str.includes('Failed') && str.includes('tests')) {
            break;
        }
    }
    
    let str = String.fromCharCode(...serialOutput);
    process.stdout.write(str);
}

testCpuInstrs().catch(console.error);
