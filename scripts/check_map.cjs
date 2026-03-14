
const fs = require('fs');
const content = fs.readFileSync('src/cpu.ts', 'utf8');

// Find the map initialization
const mapMatch = content.match(/cpu\.map = \[([\s\S]*?)\];/);
if (!mapMatch) {
    console.log('Could not find cpu.map');
    process.exit(1);
}

const mapContent = mapMatch[1];
const elements = mapContent.split(',').map(e => e.trim()).filter(e => e.length > 0 && !e.startsWith('//'));

console.log('Map length:', elements.length);
elements.forEach((el, i) => {
    if (el.includes('XX')) {
        console.log(`Index 0x${i.toString(16)} (${i}) is XX`);
    }
});
