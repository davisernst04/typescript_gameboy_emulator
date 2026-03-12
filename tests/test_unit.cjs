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

// Unit tests for CPU instructions
console.log = console.error;

console.log('\n=== CPU Instruction Unit Tests ===\n');

emulator.init();

let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`✗ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// Test LD r,r
test('LD_r_r: A <- B', () => {
    cpu.reg.a = 0x00;
    cpu.reg.b = 0x42;
    cpu.ops.LD_r_r('a', 'b');
    assert(cpu.reg.a === 0x42, `Expected A=0x42, got A=0x${cpu.reg.a.toString(16)}`);
});

// Test INC r
test('INC_r: A (0xFF) should wrap', () => {
    cpu.reg.a = 0xFF;
    cpu.reg.f = 0;
    cpu.ops.INC_r('a');
    assert(cpu.reg.a === 0x00, `Expected A=0x00, got A=0x${cpu.reg.a.toString(16)}`);
    assert((cpu.reg.f & 0x80) !== 0, 'Expected Z flag set');
});

// Test DEC r
test('DEC_r: B (0x05) -= 1', () => {
    cpu.reg.b = 0x05;
    cpu.reg.f = 0;
    cpu.ops.DEC_r('b');
    assert(cpu.reg.b === 0x04, `Expected B=0x04, got B=0x${cpu.reg.b.toString(16)}`);
    assert((cpu.reg.f & 0x40) !== 0, 'Expected N flag set');
});

// Test ADD_a_r
test('ADD_a_r: A(0x02) + B(0x03) = 0x05', () => {
    cpu.reg.a = 0x02;
    cpu.reg.b = 0x03;
    cpu.ops.ADD_a_r('b');
    assert(cpu.reg.a === 0x05, `Expected A=0x05, got A=0x${cpu.reg.a.toString(16)}`);
    assert((cpu.reg.f & 0x80) === 0, 'Z flag should not be set');
});

// Test SUB_a_r
test('SUB_a_r: A(0x05) - B(0x03) = 0x02', () => {
    cpu.reg.a = 0x05;
    cpu.reg.b = 0x03;
    cpu.ops.SUB_a_r('b');
    assert(cpu.reg.a === 0x02, `Expected A=0x02, got A=0x${cpu.reg.a.toString(16)}`);
    assert((cpu.reg.f & 0x40) !== 0, 'N flag should be set');
    assert((cpu.reg.f & 0x10) === 0, 'C flag should not be set (no borrow)');
});

// Test SUB_a_r with underflow
test('SUB_a_r: A(0x03) - B(0x05) should set C', () => {
    cpu.reg.a = 0x03;
    cpu.reg.b = 0x05;
    cpu.ops.SUB_a_r('b');
    assert(cpu.reg.a === 0xFE, `Expected A=0xFE (254), got A=0x${cpu.reg.a.toString(16)}`);
    assert((cpu.reg.f & 0x10) !== 0, 'C flag should be set (borrow)');
});

// Test AND
test('AND_a_r: A(0xFF) & B(0x0F) = 0x0F', () => {
    cpu.reg.a = 0xFF;
    cpu.reg.b = 0x0F;
    cpu.ops.AND_a_r('b');
    assert(cpu.reg.a === 0x0F, `Expected A=0x0F, got A=0x${cpu.reg.a.toString(16)}`);
});

// Test OR
test('OR_a_r: A(0xF0) | B(0x0F) = 0xFF', () => {
    cpu.reg.a = 0xF0;
    cpu.reg.b = 0x0F;
    cpu.ops.OR_a_r('b');
    assert(cpu.reg.a === 0xFF, `Expected A=0xFF, got A=0x${cpu.reg.a.toString(16)}`);
});

// Test XOR
test('XOR_a_r: A(0xFF) ^ B(0xFF) = 0x00', () => {
    cpu.reg.a = 0xFF;
    cpu.reg.b = 0xFF;
    cpu.ops.XOR_a_r('b');
    assert(cpu.reg.a === 0x00, `Expected A=0x00, got A=0x${cpu.reg.a.toString(16)}`);
    assert((cpu.reg.f & 0x80) !== 0, 'Z flag should be set');
});

// Test CP (compare - like SUB but doesn't store result)
test('CP_a_r: A(0x05) compare B(0x05) should set Z', () => {
    cpu.reg.a = 0x05;
    cpu.reg.b = 0x05;
    cpu.ops.CP_a_r('b');
    assert(cpu.reg.a === 0x05, 'A should not be modified by CP');
    assert((cpu.reg.f & 0x80) !== 0, 'Z flag should be set');
});

console.log(`\n${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    process.exit(1);
}
