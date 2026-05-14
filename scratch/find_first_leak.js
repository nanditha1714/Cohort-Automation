const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

function countTags(text) {
    const sanitized = text.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '');
    const open = (sanitized.match(/<div(?![a-z])/g) || []).length;
    const close = (sanitized.match(/<\/div>/g) || []).length;
    return { open, close };
}

let balance = 0;
for (let i = 0; i < 100; i++) {
    const res = countTags(lines[i]);
    balance += res.open - res.close;
    if (balance !== 0) {
        console.log(`Line ${i + 1}: ${balance} | ${lines[i].trim()}`);
    }
}
