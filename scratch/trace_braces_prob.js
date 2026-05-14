const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sanitized = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '');
    const open = (sanitized.match(/\{/g) || []).length;
    const close = (sanitized.match(/\}/g) || []).length;
    balance += open - close;
    if (i >= 2800 && i < 2810) {
        console.log(`${i + 1}: ${balance} | ${line.trim()}`);
    }
}
