const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/\(/g) || []).length;
    const close = (line.match(/\)/g) || []).length;
    balance += open - close;
    if (i > 1900 && i < 2200) {
        console.log(`${i + 1}: ${balance} | ${line.trim()}`);
    }
}
console.log(`Final Balance: ${balance}`);
