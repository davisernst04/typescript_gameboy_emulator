
const fs = require('fs');
const content = fs.readFileSync('src/cpu.ts', 'utf8');

// Find the map initialization
const cbMapMatch = content.match(/cpu\.cbmap = \[([\s\S]*?)\];/);
if (!cbMapMatch) {
    console.log('Could not find cpu.cbmap');
    process.exit(1);
}

const mapContent = cbMapMatch[1];
const elements = mapContent.split(',').map(e => e.trim()).filter(e => e.length > 0 && !e.startsWith('//'));

console.log('cbMap length:', elements.length);
