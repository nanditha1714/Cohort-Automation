const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');

function countTags(text) {
    const sanitized = text.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '');
    const open = (sanitized.match(/<div(?![a-z])/g) || []).length;
    const close = (sanitized.match(/<\/div>/g) || []).length;
    return { open, close };
}

const lines = content.split('\n');
let balance = 0;
for (let i = 1973; i <= 2176; i++) {
    const res = countTags(lines[i]);
    balance += res.open - res.close;
    console.log(`${i + 1}: ${balance} | ${lines[i].trim()}`);
}
