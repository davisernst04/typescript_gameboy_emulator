import { loadRom } from '../src/cartridge';

const test = async () => {
  console.log('--- Testing loadRom from disk (Node.js) ---');
  try {
    const cart = await loadRom('roms/test.gb');
    console.log('Cartridge loaded from disk:', cart.rom.length, 'bytes');
    console.log('Title:', cart.title);
    console.log('Header Checksum: 0x' + cart.headerChecksum.toString(16).toUpperCase());
    console.log('Is Checksum Valid:', cart.isHeaderChecksumValid);
    if (cart.rom.length > 0 && cart.isHeaderChecksumValid) {
      console.log('SUCCESS');
    } else {
      console.log('FAILURE');
    }
  } catch (error) {
    console.error('FAILURE (error):', error);
  }

  console.log('\n--- Testing loadRom from Uint8Array ---');
  try {
    const testData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const cart = await loadRom(testData);
    console.log('Cartridge loaded from Uint8Array:', cart.rom.length, 'bytes');
    if (cart.rom.length === 4) {
      console.log('SUCCESS');
    } else {
      console.log('FAILURE (incorrect length)');
    }
    const cartData = new Uint8Array(32768);
    // Fill header with some data
    for (let i = 0x0134; i <= 0x014C; i++) cartData[i] = i & 0xFF;
    // Calculate correct checksum
    let checksum = 0;
    for (let i = 0x0134; i <= 0x014C; i++) checksum = (checksum - cartData[i] - 1) & 0xFF;
    
    // Set INCORRECT checksum
    cartData[0x014D] = (checksum + 1) & 0xFF;
    
    const cartInvalid = await loadRom(cartData);
    console.log('Cartridge loaded with invalid checksum');
    console.log('Calculated expected checksum should be: 0x' + checksum.toString(16).toUpperCase());
    console.log('Stored checksum is: 0x' + cartInvalid.headerChecksum.toString(16).toUpperCase());
    console.log('Is Checksum Valid:', cartInvalid.isHeaderChecksumValid);
    if (!cartInvalid.isHeaderChecksumValid) {
      console.log('SUCCESS (properly identified invalid checksum)');
    } else {
      console.log('FAILURE (accepted invalid checksum)');
    }
  } catch (error) {
    console.error('FAILURE (error):', error);
  }
};

test();
