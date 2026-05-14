const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let balance = 0;
let firstPositive = -1;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore braces in strings and comments (simple check)
    const sanitized = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/g, '').replace(/`.*?`/g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '');
    const open = (sanitized.match(/\{/g) || []).length;
    const close = (sanitized.match(/\}/g) || []).length;
    balance += open - close;
    if (balance > 0 && firstPositive === -1) firstPositive = i;
    if (balance === 0) firstPositive = -1;
}
console.log(`First mismatch starts around line: ${firstPositive + 1}`);
if (firstPositive !== -1) {
    for (let i = firstPositive; i < firstPositive + 20; i++) {
        console.log(`${i + 1}: ${balance} | ${lines[i]}`);
    }
}
