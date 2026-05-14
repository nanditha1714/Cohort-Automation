const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');

function countTags(text) {
    let open = 0;
    let close = 0;
    // Remove strings and comments
    const sanitized = text.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '');
    
    const openMatches = sanitized.match(/<div(?![a-z])/g) || [];
    const closeMatches = sanitized.match(/<\/div>/g) || [];
    
    return { open: openMatches.length, close: closeMatches.length };
}

const lines = content.split('\n');
let currentOpen = 0;
let currentClose = 0;

for (let i = 1973; i <= 2176; i++) {
    const res = countTags(lines[i]);
    currentOpen += res.open;
    currentClose += res.close;
}

console.log(`Block 1973-2176 -> Open: ${currentOpen}, Close: ${currentClose}, Diff: ${currentOpen - currentClose}`);
