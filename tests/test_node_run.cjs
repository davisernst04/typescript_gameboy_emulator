const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = { onload: () => {} };
global.document = {
    getElementById: () => ({
        getContext: () => ({
            createImageData: () => ({ data: new Uint8Array(160 * 144 * 4) }),
            putImageData: () => {}
        })
    })
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.alert = (msg) => {
    console.log('ALERT:', msg);
    process.exit(1);
};

// Mock fetch to load local ROMs
global.fetch = (url) => {
    console.log('Fetching:', url);
    const romPath = path.join(__dirname, '..', url);
    return Promise.resolve({
        ok: true,
        arrayBuffer: () => {
            const buffer = fs.readFileSync(romPath);
            return Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
    });
};

const { emulator, cpu, mmu, log } = require('../dist/node_test_bundle.cjs');

async function test() {
    emulator.init();
    const romUrl = 'ttt.gb'; // This is actually ttt.gb now
    const loaded = await emulator.loadRom(romUrl);
    if (!loaded) {
        console.error('Failed to load ROM');
        return;
    }

    console.log('Starting execution...');
    let reachedRom = false;
    let prevInBios = 1;
    for (let i = 0; i < 20000000; i++) {
        if (cpu.stop) {
            console.log('CPU STOPPED at instruction', i, 'PC:', cpu.reg.pc.toString(16));
            break;
        }
        cpu.step();
        if (prevInBios === 1 && mmu.inbios === 0) {
            console.log(`BIOS DISABLED at step ${i}, PC: ${cpu.reg.pc.toString(16)}!`);
            prevInBios = 0;
            reachedRom = true;
        }
        if (i % 2000000 === 0) {
            const { gpu } = require('../dist/node_test_bundle.cjs');
            const op = mmu.rb(cpu.reg.pc);
            console.log(`Step ${i}, PC: ${cpu.reg.pc.toString(16)}, op: ${op.toString(16)}, inbios: ${mmu.inbios}, LY: ${gpu.curline}`);
        }
    }
    if (!reachedRom) console.log('Still in BIOS after 10,000,000 steps.');
    console.log('Test finished successfully.');
}

test().catch(console.error);
