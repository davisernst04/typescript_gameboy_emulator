
import { cpu } from '../src/cpu';
import { mmu } from '../src/mmu';

async function testInterrupts() {
  console.log('Testing Interrupt Handling...');
  cpu.reset();
  mmu.reset();
  
  // Set IE to enable V-Blank (bit 0)
  mmu.inte = 0x01;
  // Set IF to request V-Blank
  mmu.intf = 0x01;
  // Set IME to 1
  cpu.reg.ime = 1;
  
  // Current PC should be 0x100
  console.log('PC before interrupt:', cpu.reg.pc.toString(16));
  
  // Step should trigger interrupt
  cpu.step();
  
  console.log('PC after interrupt (should be 0x40):', cpu.reg.pc.toString(16));
  console.log('IME (should be 0):', cpu.reg.ime);
  console.log('IF (should be 0):', mmu.intf);
  console.log('Cycles (should be 5):', cpu.reg.m);

  if (cpu.reg.pc === 0x40 && cpu.reg.ime === 0 && mmu.intf === 0 && cpu.reg.m === 5) {
    console.log('Interrupt handling test PASSED!');
  } else {
    console.error('Interrupt handling test FAILED!');
    process.exit(1);
  }
}

async function testEIDelay() {
  console.log('\nTesting EI Delay...');
  cpu.reset();
  // DI (ime=0)
  cpu.ops.DI();
  console.log('IME after DI:', cpu.reg.ime); // 0

  // EI (ime_cnt=2)
  cpu.ops.EI();
  console.log('IME after EI:', cpu.reg.ime); // 0
  console.log('IME_cnt after EI:', cpu.reg.ime_cnt); // 2

  // NOP (1st step after EI)
  cpu.step();
  console.log('IME after 1st step:', cpu.reg.ime); // 0
  console.log('IME_cnt after 1st step:', cpu.reg.ime_cnt); // 1

  // NOP (2nd step after EI)
  cpu.step();
  console.log('IME after 2nd step:', cpu.reg.ime); // 1
  console.log('IME_cnt after 2nd step:', cpu.reg.ime_cnt); // 0

  if (cpu.reg.ime === 1) {
    console.log('EI delay test PASSED!');
  } else {
    console.error('EI delay test FAILED!');
    process.exit(1);
  }
}

async function testHaltWakeup() {
  console.log('\nTesting HALT wakeup...');
  cpu.reset();
  cpu.reg.ime = 0;
  mmu.inte = 0x01;
  mmu.intf = 0x00;
  
  cpu.ops.HALT();
  console.log('HALT state:', cpu.halt); // 1
  
  // Step while halted (no interrupt)
  cpu.step();
  console.log('HALT state after step (no int):', cpu.halt); // 1
  console.log('Cycles during halt:', cpu.reg.m); // 1

  // Set IF to wake up
  mmu.intf = 0x01;
  cpu.step();
  console.log('HALT state after interrupt:', cpu.halt); // 0
  
  if (cpu.halt === 0) {
    console.log('HALT wakeup test PASSED!');
  } else {
    console.error('HALT wakeup test FAILED!');
    process.exit(1);
  }
}

async function runTests() {
  await testInterrupts();
  await testEIDelay();
  await testHaltWakeup();
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
