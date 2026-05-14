const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let balance = 0;
let firstPositive = -1;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/\(/g) || []).length;
    const close = (line.match(/\)/g) || []).length;
    balance += open - close;
    if (balance > 0 && firstPositive === -1) firstPositive = i;
    if (balance === 0) firstPositive = -1;
}
console.log(`First mismatch starts around line: ${firstPositive + 1}`);
if (firstPositive !== -1) {
    for (let i = firstPositive; i < firstPositive + 20; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
